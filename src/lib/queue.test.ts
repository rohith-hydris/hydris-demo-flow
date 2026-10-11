import { describe, expect, it } from "vitest";
import { claimRows, claimSummary, inspectionRows, parseClaimsTab, parseQueueFilters, reportRows, reportStateCounts } from "./queue";
import { scopeFor } from "./scope";

const brand = scopeFor("brand");
const supplier = scopeFor("supplier");
const ids = (rows: { project: { id: string } }[]) => rows.map((r) => r.project.id);

describe("project claims (PRODUCT 4.6)", () => {
  it("lists all 21 for the brand: Flagged first, then Pending validation, then Validated, then Not counted", () => {
    const rows = claimRows(brand);
    expect(rows).toHaveLength(21);
    expect(rows[0].project.id).toBe("PRJ-201");
    const statuses = rows.map((r) => r.project.status);
    const order = ["Flagged", "Pending validation", "Validated", "Not counted"];
    expect(statuses.map((s) => order.indexOf(s))).toEqual([...statuses.map((s) => order.indexOf(s))].sort((a, b) => a - b));
  });

  it("within a status the higher-priority site comes first (F12 rank 1, F02 rank 2, F01 rank 3 among the Pending claims)", () => {
    const pending = claimRows(brand, { status: "Pending validation" });
    expect(ids(pending).slice(0, 3)).toEqual(["PRJ-105", "PRJ-202", "PRJ-302"]);
    expect(pending.map((r) => r.site.rank)).toEqual([...pending.map((r) => r.site.rank)].sort((a, b) => a - b));
  });

  it("filters by supplier, factory, status, pillar and evidence grade", () => {
    expect(claimRows(brand, { supplierId: "SUP1" })).toHaveLength(6);
    expect(claimRows(brand, { factoryId: "F12" })).toHaveLength(8);
    expect(claimRows(brand, { status: "Flagged" }).map((r) => r.project.id)).toEqual(["PRJ-201"]);
    expect(claimRows(brand, { pillar: "P3" })).toHaveLength(5);
    expect(claimRows(brand, { pillar: "P2" })).toHaveLength(14); // 14 P2 + 5 P3 + 2 on-site P1 (PRJ-108, PRJ-303) = 21
    expect(claimRows(brand, { grade: "C" })).toHaveLength(7);
    expect(claimRows(brand, { grade: "none" })).toHaveLength(3);
    expect(claimRows(brand, { grade: "A" }).map((r) => r.project.id)).toEqual(["PRJ-901"]);
  });

  it("combines filters", () => {
    expect(ids(claimRows(brand, { supplierId: "SUP5", status: "Pending validation" })).sort()).toEqual(["PRJ-105", "PRJ-601"]);
    expect(claimRows(brand, { factoryId: "F12", pillar: "P3", grade: "C" }).map((r) => r.project.id)).toEqual(["PRJ-105"]);
    expect(claimRows(brand, { supplierId: "SUP1", factoryId: "F12" })).toHaveLength(0);
  });

  it("the supplier role sees only its own 10 claims, however it filters", () => {
    expect(claimRows(supplier)).toHaveLength(10);
    expect(new Set(claimRows(supplier).map((r) => r.site.id))).toEqual(new Set(["F12", "F13", "F14"]));
    expect(claimRows(supplier, { supplierId: "SUP1" })).toHaveLength(0);
    expect(claimRows(supplier, { factoryId: "F02" })).toHaveLength(0);
  });

  it("each row carries its site and computed benefit", () => {
    const r = claimRows(brand, { factoryId: "F12", status: "Validated", grade: "B", pillar: "P3" })[0];
    expect(r.project.id).toBe("PRJ-103");
    expect(r.site.name).toBe("Ambattur Denim Unit");
    expect(r.benefit.counted).toEqual({ unit: "m3", value: 25000 });
  });
});

describe("summary tiles (PRODUCT 4.6)", () => {
  it("brand: Validated 11, Pending 6, Flagged 1, Not counted 3", () => {
    const s = claimSummary(brand);
    expect(s.counts).toEqual({ Validated: 11, "Pending validation": 6, Flagged: 1, "Not counted": 3 });
    expect(s.total).toBe(21);
  });

  it("claimed against accepted benefit, per unit and never mixed", () => {
    const s = claimSummary(brand);
    expect(s.claimed.m3).toBe(255600);
    expect(s.accepted.m3).toBe(153000);
    expect(s.claimed.people).toBe(4350);
    expect(s.accepted.people).toBe(2550);
    expect(s.claimed.kg).toEqual({ tss: 2500, tn: 200, tp: 40 });
    expect(s.accepted.kg).toEqual({ tss: 2500, tn: 200, tp: 40 });
  });

  it("accepted never exceeds claimed in any unit", () => {
    for (const scope of [brand, supplier]) {
      const s = claimSummary(scope);
      expect(s.accepted.m3).toBeLessThanOrEqual(s.claimed.m3);
      expect(s.accepted.people).toBeLessThanOrEqual(s.claimed.people);
    }
  });

  it("supplier: Validated 6, Pending 2, Flagged 0, Not counted 2", () => {
    expect(claimSummary(supplier).counts).toEqual({ Validated: 6, "Pending validation": 2, Flagged: 0, "Not counted": 2 });
  });

  it("narrows by supplier and factory but not by status", () => {
    expect(claimSummary(brand, { supplierId: "SUP5" }).total).toBe(10);
    expect(claimSummary(brand, { factoryId: "F02" }).counts).toEqual({ Validated: 0, "Pending validation": 1, Flagged: 1, "Not counted": 0 });
  });
});

describe("audit and compliance reports", () => {
  it("has 4 per factory, 56 for the brand: 51 Ready, 3 Failed check, 2 Expired", () => {
    const rows = reportRows(brand);
    expect(rows).toHaveLength(56);
    const c = reportStateCounts(rows);
    expect([c["Ready"], c["Failed check"], c["Expired / out of period"], c["Missing"], c["Low confidence"]]).toEqual([51, 3, 2, 0, 0]);
  });

  it("problems come first: the Failed check reports before the Ready ones", () => {
    const rows = reportRows(brand);
    expect(rows.slice(0, 3).every((r) => r.doc.state === "Failed check")).toBe(true);
    expect(rows.at(-1)!.doc.state).toBe("Ready");
  });

  it("filters by supplier, factory and status", () => {
    expect(reportRows(brand, { supplierId: "SUP1" })).toHaveLength(12);
    expect(reportRows(brand, { factoryId: "F01", status: "Failed check" }).map((r) => r.doc.name)).toEqual(["NABL lab reports, weekly TSS / TN / TP"]);
    expect(reportRows(brand, { status: "Expired / out of period" }).map((r) => r.site.id).sort()).toEqual(["F02", "F06"]);
  });

  it("the supplier role sees only its three factories' 12 reports", () => {
    expect(reportRows(supplier)).toHaveLength(12);
    expect(reportRows(supplier, { supplierId: "SUP1" })).toHaveLength(0);
  });
});

describe("field inspections", () => {
  it("brand: four, with the ones that need review first", () => {
    const rows = inspectionRows(brand);
    expect(rows.map((r) => r.inspection.id)).toEqual(["INS-0412", "INS-0399", "INS-0408", "INS-0415"]);
    expect(rows.map((r) => r.inspection.status)).toEqual(["Needs review", "Needs review", "Validated", "Validated"]);
  });
  it("supplier: INS-0412 and INS-0415 (a field upload)", () => {
    expect(inspectionRows(supplier).map((r) => r.inspection.id)).toEqual(["INS-0412", "INS-0415"]);
  });
  it("filters by status and factory", () => {
    expect(inspectionRows(brand, { status: "Validated" }).map((r) => r.inspection.id)).toEqual(["INS-0408", "INS-0415"]);
    expect(inspectionRows(brand, { factoryId: "F06" }).map((r) => r.inspection.id)).toEqual(["INS-0399"]);
  });
});

describe("reading filters from the address bar", () => {
  const from = (q: Record<string, string>) => parseQueueFilters((k) => q[k] ?? null);
  it("keeps valid values and drops invalid ones", () => {
    expect(from({ supplier: "SUP2", factory: "F04", status: "Flagged", pillar: "P3", grade: "C" })).toEqual({ supplierId: "SUP2", factoryId: "F04", status: "Flagged", pillar: "P3", grade: "C" });
    expect(from({ pillar: "P1", grade: "Z" })).toEqual({});
    expect(from({ supplier: "all", status: "all" })).toEqual({});
  });
  it("tab defaults to project claims", () => {
    expect(parseClaimsTab(null)).toBe("claims");
    expect(parseClaimsTab("reports")).toBe("reports");
    expect(parseClaimsTab("x")).toBe("claims");
  });
});
