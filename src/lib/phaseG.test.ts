import { describe, expect, it } from "vitest";
import { scripts, type ScriptId } from "@/src/data/copilotScripts";
import { inspections } from "@/src/data/inspections";
import { liteFindings } from "@/src/data/opportunities";
import { replayPack } from "@/src/data/replay";
import { buildAnswer, copilotScope, interpretText, type ResolvedBlock } from "./copilot";
import { importMany, initialImports } from "./catalogue";
import { JOURNEY_STEPS } from "./journey";
import { eventsOn, eventsUpTo } from "./replay";
import { inspectionRows } from "./queue";
import { scopeFor } from "./scope";
import { makeTokenCtx } from "./tokens";

const brand = copilotScope("brand");
const supplier = copilotScope("supplier");
const answer = (id: ScriptId, scope = brand, params = {}) => buildAnswer(scripts.find((s) => s.id === id)!, makeTokenCtx(scope, params));
const texts = (a: ReturnType<typeof answer>) => a.blocks.filter((b): b is Extract<ResolvedBlock, { kind: "text" }> => b.kind === "text").map((b) => b.text);
const block = <K extends ResolvedBlock["kind"]>(a: ReturnType<typeof answer>, k: K) => a.blocks.find((b) => b.kind === k) as Extract<ResolvedBlock, { kind: K }>;
const f12 = liteFindings.filter((f) => f.factoryId === "F12");

describe("V2 14: replay pack", () => {
  it("fires F06 on day 4, F02 on day 5 and F13 from day 6, and nothing before day 4", () => {
    expect(eventsOn(4)[0]).toMatchObject({ factoryId: "F06", severity: "Critical" });
    expect(eventsOn(5)[0]).toMatchObject({ factoryId: "F02", severity: "High" });
    expect(eventsOn(6)[0]).toMatchObject({ factoryId: "F13" });
    expect(eventsUpTo(3)).toEqual([]);
    expect(eventsUpTo(4).map((e) => e.factoryId)).toEqual(["F06"]);
    expect(eventsUpTo(14)).toHaveLength(replayPack.length);
  });
});

describe("V2 14: field inspections have a source", () => {
  it("INS-0415 is a field upload at F13, 9 steps, Validated, trust 100%", () => {
    const i = inspections.find((x) => x.id === "INS-0415")!;
    expect(i).toMatchObject({ factoryId: "F13", date: "5 Oct 2026", steps: 9, status: "Validated", source: "Field upload (phone or web)" });
    const row = inspectionRows(scopeFor("brand")).find((r) => r.inspection.id === "INS-0415")!;
    expect(row.trust).toBe(1);
  });
  it("the others come from Field Glasses, and a supplier sees only its own reports", () => {
    expect(inspections.filter((i) => i.id !== "INS-0415").every((i) => i.source === "Field Glasses")).toBe(true);
    const ids = inspectionRows(scopeFor("supplier")).map((r) => r.inspection.id).sort();
    expect(ids).toEqual(["INS-0412", "INS-0415"]);
  });
});

describe("V2 15: copilot C7, C8, C9", () => {
  it("C7 compares S1 to S3 with the check values, labelled Forecast and demo estimates", () => {
    const a = answer("C7");
    expect(a.tools).toEqual(["get_scenarios", "get_pwi_grid"]);
    const t = block(a, "table");
    expect(t.rows).toEqual([
      ["S1 Basin first", "OPP-A + OPP-B + OPP-C", "81.6% (78.6%)", "80.9% (78.7%)", "₹205 lakh", "No financial payback"],
      ["S2 Efficiency and reuse", "OPP-D + OPP-E", "70.4% (70.4%)", "80.5% (79.4%)", "₹85 lakh", "11.0 years"],
      ["S3 Balanced", "OPP-A + OPP-C + OPP-F + OPP-D", "77.8% (76.1%)", "90.9% (86.5%)", "₹218 lakh", "No financial payback"],
    ]);
    expect(texts(a)[0]).toContain("**Forecast** and a **Demo estimate**");
    expect(texts(a)[1]).toContain("raise volumetric balance");
    expect(texts(a)[1]).toContain("barely move PWI");
    expect(a.blocks.find((b) => b.kind === "actions")).toMatchObject({ items: [{ label: "Open scenarios" }] });
  });
  it("C8 says the released snapshot is unchanged and two draft outputs are flagged", () => {
    const a = answer("C8");
    expect(a.tools).toEqual(["get_ledger_diff", "get_affected_outputs"]);
    expect(texts(a)[0]).toContain("snapshot is **unchanged**");
    expect(texts(a)[0]).toContain("from 1.6 to 1.5 fills per year");
    expect(texts(a)[0]).toContain("**2 draft outputs are flagged for review**");
    const rows = block(a, "affected").rows;
    expect(rows.map((r) => r.state.split(" (")[0])).toEqual(["Recalculated, Valid", "Flagged for review", "Flagged for review", "Not altered"]);
    expect(texts(a)[1]).toBe("A changed baseline does not alter a released report. Review whether a restatement is needed.");
  });
  it("C9 imports LITE-0187 and LITE-0188, and asking again creates no duplicates", () => {
    const first = importMany(initialImports(), f12);
    expect(first.outcomes.map((o) => [o.findingId, o.opportunityId, o.created])).toEqual([["LITE-0187", "OPP-D", true], ["LITE-0188", "OPP-E", true]]);
    const a1 = answer("C9", brand, { lite: first.outcomes });
    expect(texts(a1)[0]).toBe("Imported **LITE-0187** and **LITE-0188** as project opportunities.");
    const second = importMany(first.imports, f12);
    expect(second.outcomes.every((o) => !o.created)).toBe(true);
    expect(Object.keys(second.imports)).toHaveLength(Object.keys(first.imports).length);
    expect(texts(answer("C9", brand, { lite: second.outcomes }))[0]).toBe("Both are already imported. No duplicates were created.");
  });
  it("typed questions select C7, C8 and C9; a supplier can use them", () => {
    expect(interpretText("Which projects would close Ambattur's gaps?", "brand", "copilot", brand).play?.script.id).toBe("C7");
    expect(interpretText("What changed since the BRSR report was released?", "brand", "copilot", brand).play?.script.id).toBe("C8");
    expect(interpretText("Import the Lite findings for Ambattur", "supplier", "copilot", supplier).play?.script.id).toBe("C9");
  });
  it("every token in the new and updated scripts resolves for brand and supplier", () => {
    for (const id of ["C2", "C7", "C8", "C9"] as ScriptId[]) for (const s of [brand, supplier]) expect(() => answer(id, s)).not.toThrow();
  });
});

describe("V2 16: journey strip", () => {
  it("has the eight steps in order, each a link to an existing page", () => {
    expect(JOURNEY_STEPS.map((s) => s.label)).toEqual(["Risk", "Assessment (Lite finding)", "Opportunity", "Project comparison", "Business case", "Evidence review", "Impact", "Reporting"]);
    expect(JOURNEY_STEPS.every((s) => s.href.startsWith("/"))).toBe(true);
  });
});
