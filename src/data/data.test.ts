import { describe, expect, it } from "vitest";
import { removals } from "./cells";
import { delivered } from "./delivered";
import { documents } from "./documents";
import { factories } from "./factories";
import { inspections } from "./inspections";
import { ledger } from "./ledger";
import { ops } from "./ops";
import { projects } from "./projects";
import { riskCatalogue, riskScores } from "./risks";
import { suppliers } from "./suppliers";
import { BRAND_TENANT, CURRENT_MONTH, DEMO_SUPPLIER_ID, REPORTING_PERIOD, SUPPLIER_TENANT, TODAY } from "./tenants";

const ids = factories.map((f) => f.id);

describe("dataset shape (PRODUCT 5.1 to 5.3)", () => {
  it("has the demo tenants and dates", () => {
    expect(BRAND_TENANT.name).toBe("Lumen Apparel Group");
    expect(SUPPLIER_TENANT.name).toBe("Coromandel Denim Mills");
    expect(DEMO_SUPPLIER_ID).toBe("SUP5");
    expect(REPORTING_PERIOD).toEqual({ label: "FY2025-26", status: "Locked" });
    expect(CURRENT_MONTH).toEqual({ label: "September 2026", status: "Draft" });
    expect(TODAY).toBe("10 Oct 2026");
  });

  it("has 5 suppliers and 14 factories F01 to F14 with unique ids", () => {
    expect(suppliers.map((s) => s.id)).toEqual(["SUP1", "SUP2", "SUP3", "SUP4", "SUP5"]);
    expect(ids).toEqual(Array.from({ length: 14 }, (_, i) => `F${String(i + 1).padStart(2, "0")}`));
  });

  it("each factory belongs to exactly one supplier and agrees with the supplier's list", () => {
    for (const f of factories) {
      const owners = suppliers.filter((s) => s.factoryIds.includes(f.id));
      expect(owners.map((s) => s.id)).toEqual([f.supplierId]);
    }
    expect(suppliers.flatMap((s) => s.factoryIds).sort()).toEqual([...ids].sort());
  });

  it("the demo supplier SUP5 owns F12, F13, F14", () => {
    expect(suppliers.find((s) => s.id === "SUP5")!.factoryIds).toEqual(["F12", "F13", "F14"]);
  });

  it("every factory has cell scores, removals, 14 risk scores and an ops row", () => {
    for (const id of ids) {
      expect(delivered.filter((c) => c.factoryId === id)).toHaveLength(id === "F12" ? 0 : 1); // F12 uses the worked example
      expect(removals.filter((r) => r.factoryId === id)).toHaveLength(1);
      expect(riskScores.filter((r) => r.factoryId === id)).toHaveLength(1);
      expect(ops.filter((o) => o.factoryId === id)).toHaveLength(1);
    }
    expect(riskCatalogue).toHaveLength(14);
  });

  it("scores are in range", () => {
    for (const c of delivered) {
      for (const v of Object.values(c.qualityScore)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    for (const r of riskScores) for (const v of Object.values(r.scores)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(5); }
    for (const f of factories) { expect(f.footprintI).toBeGreaterThan(0); expect(f.footprintI).toBeLessThanOrEqual(1); }
  });

  it("coordinates fall inside Tamil Nadu's bounding box", () => {
    for (const f of factories) {
      expect(f.lat).toBeGreaterThan(8); expect(f.lat).toBeLessThan(13.6);
      expect(f.lon).toBeGreaterThan(76); expect(f.lon).toBeLessThan(80.4);
    }
  });

  it("matches a few raw master values: F01 and F12", () => {
    expect(factories.find((f) => f.id === "F01")).toMatchObject({ footprintI: 0.78, replenishmentNeededM3: 98000, headcount: 2100, householdSize: 3.6, evidenceGrade: "B" });
    expect(factories.find((f) => f.id === "F12")).toMatchObject({ footprintI: 0.91, replenishmentNeededM3: 110000, headcount: 1200, householdSize: 3.9, evidenceGrade: "B" });
  });

  it("stores inputs only: no computed field (R, rank, tier, band, quadrant, PWI) is saved in the data", () => {
    const banned = /^(R|rank|tier|band|quadrant|pwi|sitePwi|volumetric|health|healthBand|offTrack)$/i;
    for (const list of [factories, delivered, ops, projects, suppliers] as object[][]) {
      for (const row of list) for (const key of Object.keys(row)) expect(key).not.toMatch(banned);
    }
  });
});

describe("references between datasets", () => {
  it("projects, documents, inspections and ledger point at real factories", () => {
    for (const list of [projects, documents, inspections, ledger]) for (const row of list) expect(ids).toContain(row.factoryId);
  });

  it("project ids are unique", () => {
    expect(new Set(projects.map((p) => p.id)).size).toBe(projects.length);
  });

  it("F12 has a ledger entry for each of the nine cells, plus the baseline and the Aug 2026 P2 entry", () => {
    expect(ledger.map((l) => l.id).sort()).toEqual(["LE-1880", "LE-2291", "LE-2341", "LE-2342", "LE-2343", "LE-2344", "LE-2345", "LE-2346", "LE-2347", "LE-2348", "LE-2349"]);
    expect(ledger.find((l) => l.id === "LE-1880")).toMatchObject({ entryStatus: "Audited", periodStatus: "Locked" });
  });

  it("the inspections are INS-0412 (F12), INS-0408 (F01), INS-0399 (F06) INS-0415 (F13, V2 14) and INS-0418 (F14, B8)", () => {
    expect(inspections.map((i) => [i.id, i.factoryId])).toEqual([["INS-0412", "F12"], ["INS-0408", "F01"], ["INS-0399", "F06"], ["INS-0415", "F13"], ["INS-0418", "F14"]]);
  });
});
