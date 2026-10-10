import { describe, expect, it } from "vitest";
import { cellScores, removals } from "./cells";
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
      expect(cellScores.filter((c) => c.factoryId === id)).toHaveLength(1);
      expect(removals.filter((r) => r.factoryId === id)).toHaveLength(1);
      expect(riskScores.filter((r) => r.factoryId === id)).toHaveLength(1);
      expect(ops.filter((o) => o.factoryId === id)).toHaveLength(1);
    }
    expect(riskCatalogue).toHaveLength(14);
  });

  it("scores are in range", () => {
    for (const c of cellScores) {
      for (const v of [...Object.values(c.availability), ...Object.values(c.accessibility), ...Object.values(c.quality)]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    for (const r of riskScores) for (const v of Object.values(r.scores)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(5); }
    for (const f of factories) { expect(f.footprintI).toBeGreaterThan(0); expect(f.footprintI).toBeLessThanOrEqual(1); expect(f.confidence).toBeLessThanOrEqual(1); }
  });

  it("coordinates fall inside Tamil Nadu's bounding box", () => {
    for (const f of factories) {
      expect(f.lat).toBeGreaterThan(8); expect(f.lat).toBeLessThan(13.6);
      expect(f.lon).toBeGreaterThan(76); expect(f.lon).toBeLessThan(80.4);
    }
  });

  it("matches a few raw master values: F01 and F12", () => {
    expect(factories.find((f) => f.id === "F01")).toMatchObject({ footprintI: 0.78, replenishmentNeededM3: 98000, headcount: 2100, householdSize: 3.6, confidence: 0.72, evidenceGrade: "B" });
    expect(factories.find((f) => f.id === "F12")).toMatchObject({ footprintI: 0.91, replenishmentNeededM3: 110000, headcount: 1200, householdSize: 3.9, confidence: 0.78, evidenceGrade: "B" });
  });

  it("stores inputs only: no computed field (R, rank, tier, band, quadrant, PWI) is saved in the data", () => {
    const banned = /^(R|rank|tier|band|quadrant|pwi|sitePwi|volumetric|health|healthBand|offTrack)$/i;
    for (const list of [factories, cellScores, ops, projects, suppliers] as object[][]) {
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

  it("F12 has the three ledger entries: LE-2291, LE-2347, LE-1880", () => {
    expect(ledger.map((l) => l.id)).toEqual(["LE-2291", "LE-2347", "LE-1880"]);
    expect(ledger.find((l) => l.id === "LE-1880")).toMatchObject({ entryStatus: "Audited", periodStatus: "Locked" });
  });

  it("the three inspections are INS-0412 (F12), INS-0408 (F01), INS-0399 (F06)", () => {
    expect(inspections.map((i) => [i.id, i.factoryId])).toEqual([["INS-0412", "F12"], ["INS-0408", "F01"], ["INS-0399", "F06"]]);
  });
});
