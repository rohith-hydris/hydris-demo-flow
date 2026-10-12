import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { f12Example } from "@/src/data/f12Example";
import { ledger } from "@/src/data/ledger";
import type { LedgerEntry } from "@/src/data/types";
import { GENESIS_HASH, canonicalJson, chainStatusText, editEntry, hashEntry, inChainOrder, sealChain, verifyChain } from "./ledger";
import { ledgerFor } from "./impact";
import { sha256 } from "./sha256";

const withInput = (entries: LedgerEntry[], id: string, value: number) =>
  entries.map((e) => (e.id === id ? { ...e, inputs: e.inputs.map((x, i) => (i === 0 ? { ...x, value } : x)) } : e));

describe("sha256", () => {
  it("matches node:crypto, including the empty string, block boundaries and non-ASCII text", () => {
    for (const text of ["", "abc", "a".repeat(55), "a".repeat(56), "a".repeat(64), "a".repeat(1000), "RN = a × (W_fw − D_basin) ÷ 2", JSON.stringify(ledger)]) {
      expect(sha256(text)).toBe(createHash("sha256").update(text, "utf8").digest("hex"));
    }
  });
});

describe("canonical JSON", () => {
  it("sorts keys and drops whitespace, so key order never changes the hash", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 4, c: 3 }] })).toBe('{"a":[2,{"c":3,"d":4}],"b":1}');
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });
});

describe("Impact Ledger lineage (issue B4)", () => {
  it("F12 has an entry for every one of the nine cells, with lineage fields", () => {
    const cells = new Set(ledger.filter((e) => e.cell).map((e) => `${e.cell!.pillar}|${e.cell!.dimension}`));
    for (const p of ["P1", "P2", "P3"]) for (const d of ["Availability", "Accessibility", "Quality"]) expect(cells).toContain(`${p}|${d}`);
    for (const e of ledger) {
      expect(e.methodVersion).toBe("PWI-M 1.0");
      expect(e.formula.length).toBeGreaterThan(0);
      expect(e.inputs.length).toBeGreaterThan(0);
      expect(e.hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("the new entries' inputs are the F12 worked example's delivered and target amounts", () => {
    for (const e of ledger.filter((x) => x.id >= "LE-2341" && x.cell && x.id !== "LE-2347" && x.id !== "LE-2346")) {
      const w = f12Example.cells.find((c) => c.pillar === e.cell!.pillar && c.dimension === e.cell!.dimension)!;
      const get = (label: string) => e.inputs.find((i) => i.label === label)?.value;
      if (w.delivered.kind === "volume" && w.target.kind === "volume") { expect(get("Delivered")).toBe(w.delivered.m3); expect(get("Target")).toBe(w.target.m3); }
      if (w.delivered.kind === "people" && w.target.kind === "people") { expect(get("Delivered")).toBe(w.delivered.count); expect(get("Target")).toBe(w.target.count); }
      if (w.delivered.kind === "mass" && w.target.kind === "mass") {
        expect([get("TSS delivered"), get("TN delivered"), get("TP delivered")]).toEqual([w.delivered.tss, w.delivered.tn, w.delivered.tp]);
        expect([get("TSS target"), get("TN target"), get("TP target")]).toEqual([w.target.tss, w.target.tn, w.target.tp]);
      }
      if (w.delivered.kind === "removal") expect([get("TSS removal"), get("TN removal"), get("TP removal")]).toEqual([w.delivered.tss, w.delivered.tn, w.delivered.tp]);
    }
  });
});

describe("hash chain", () => {
  it("the seeded F12 chain verifies, starting from the genesis hash", () => {
    expect(verifyChain(ledger)).toEqual({ ok: true, length: 11 });
    expect(inChainOrder(ledger)[0].previousHash).toBe(GENESIS_HASH);
    expect(chainStatusText(verifyChain(ledger))).toBe("Chain verified");
    expect(verifyChain(ledgerFor("F12")).ok).toBe(true); // the order the timeline receives them in (newest first)
  });

  it("each entry's previous hash is the hash of the entry before it", () => {
    const o = inChainOrder(ledger);
    for (let i = 1; i < o.length; i++) expect(o[i].previousHash).toBe(o[i - 1].hash);
  });

  it("sealing the data again gives the stored hashes", () => {
    expect(sealChain(ledger).map((e) => e.hash)).toEqual(inChainOrder(ledger).map((e) => e.hash));
  });

  it("changing one input breaks verification at that entry", () => {
    for (const id of ["LE-2343", "LE-2291", "LE-1880", "LE-2349"]) {
      const r = verifyChain(withInput(ledger, id, 999999));
      expect(r).toEqual({ ok: false, brokenId: id, reason: "hash" });
      expect(chainStatusText(r)).toBe(`Chain broken at ${id}`);
    }
  });

  it("re-sealing only the changed entry still breaks the next one, because its previous hash no longer matches", () => {
    const o = inChainOrder(withInput(ledger, "LE-2343", 999999));
    const i = o.findIndex((e) => e.id === "LE-2343");
    o[i] = { ...o[i], hash: hashEntry(o[i]) };
    expect(verifyChain(o)).toEqual({ ok: false, brokenId: o[i + 1].id, reason: "previous hash" });
  });

  it("a tampered hash, a removed entry and a changed status are all caught", () => {
    expect(verifyChain(ledger.map((e) => (e.id === "LE-2345" ? { ...e, hash: "f".repeat(64) } : e))).ok).toBe(false);
    expect(verifyChain(ledger.filter((e) => e.id !== "LE-2344"))).toMatchObject({ ok: false, brokenId: "LE-2345" });
    expect(verifyChain(ledger.map((e) => (e.id === "LE-2291" ? { ...e, entryStatus: "Audited" as const } : e)))).toMatchObject({ ok: false, brokenId: "LE-2291" });
  });
});

describe("editing the ledger", () => {
  it("a Locked-period entry cannot be edited: the function returns an error", () => {
    const r = editEntry(ledger, "LE-1880", { what: "Changed baseline" });
    expect(r).toEqual({ ok: false, error: "LE-1880 is in a Locked period and cannot be edited." });
  });

  it("an edit that would re-seal a later Locked entry is refused too", () => {
    const lockedLater = ledger.map((e) => (e.id === "LE-2347" ? { ...e, periodStatus: "Locked" as const } : e));
    const r = editEntry(lockedLater, "LE-2343", { what: "x" });
    expect(r).toEqual({ ok: false, error: "Editing LE-2343 would change LE-2347, which is in a Locked period." });
  });

  it("a Draft entry can be edited and the chain is re-sealed so it still verifies, with the Locked entry untouched", () => {
    const r = editEntry(ledger, "LE-2343", { inputs: [{ label: "TSS removal", value: 93, unit: "%" }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(verifyChain(r.entries).ok).toBe(true);
    expect(r.entries.find((e) => e.id === "LE-1880")!.hash).toBe(ledger.find((e) => e.id === "LE-1880")!.hash);
    expect(r.entries.find((e) => e.id === "LE-2343")!.hash).not.toBe(ledger.find((e) => e.id === "LE-2343")!.hash);
  });

  it("an unknown entry is an error", () => {
    expect(editEntry(ledger, "LE-0000", {})).toEqual({ ok: false, error: "No ledger entry LE-0000." });
  });
});
