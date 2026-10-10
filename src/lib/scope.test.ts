import { describe, expect, it } from "vitest";
import { documents } from "@/src/data/documents";
import { projects } from "@/src/data/projects";
import { canSeeFactory, canSeeSupplier, inScope, OUT_OF_SCOPE_REPLY, scopeFor, VALIDATION_BRAND_ONLY_REPLY } from "./scope";
import { getAlerts, getPortfolio, getSite, getSites, getSupplier, getSuppliers } from "./selectors";

const brand = scopeFor("brand");
const supplier = scopeFor("supplier");

describe("data scoping (PRODUCT 2)", () => {
  it("brand sees all 5 suppliers and 14 factories and may validate", () => {
    expect(brand.supplierIds).toHaveLength(5);
    expect(brand.factoryIds).toHaveLength(14);
    expect(brand.canValidate).toBe(true);
    expect(brand.canSeeValidationAgent).toBe(true);
  });

  it("supplier sees SUP5 only: F12, F13, F14; cannot validate; never sees the Validation agent", () => {
    expect(supplier.supplierIds).toEqual(["SUP5"]);
    expect(supplier.factoryIds).toEqual(["F12", "F13", "F14"]);
    expect(supplier.canValidate).toBe(false);
    expect(supplier.canSeeValidationAgent).toBe(false);
  });

  it("canSee checks", () => {
    expect(canSeeFactory(supplier, "F12")).toBe(true);
    expect(canSeeFactory(supplier, "F01")).toBe(false);
    expect(canSeeSupplier(supplier, "SUP1")).toBe(false);
    expect(canSeeSupplier(brand, "SUP1")).toBe(true);
  });

  it("inScope filters any list that has a factoryId", () => {
    expect(new Set(inScope(supplier, projects).map((p) => p.factoryId))).toEqual(new Set(["F12", "F13", "F14"]));
    expect(inScope(supplier, projects)).toHaveLength(10); // 8 + 1 + 1
    expect(new Set(inScope(supplier, documents).map((d) => d.factoryId))).toEqual(new Set(["F12", "F13", "F14"]));
    expect(inScope(brand, projects)).toHaveLength(21);
  });

  it("the supplier role gets only its own sites, suppliers and alerts from the selectors", () => {
    expect(getSites(supplier).map((s) => s.id).sort()).toEqual(["F12", "F13", "F14"]);
    expect(getSuppliers(supplier).map((s) => s.id)).toEqual(["SUP5"]);
    expect(getAlerts(supplier).map((a) => a.factoryId).sort()).toEqual(["F12", "F13"]);
  });

  it("a supplier cannot read another supplier's site or supplier page", () => {
    expect(getSite(supplier, "F01")).toBeUndefined();
    expect(getSupplier(supplier, "SUP1")).toBeUndefined();
    expect(getSite(supplier, "F12")?.name).toBe("Ambattur Denim Unit");
    expect(getSite(brand, "F01")?.name).toBe("Tiruppur Mill");
  });

  it("portfolio totals for the supplier cover its 3 factories only", () => {
    const p = getPortfolio(supplier);
    expect(p.factoryCount).toBe(3);
    expect(p.supplierCount).toBe(1);
    expect(p.band1Count).toBe(3);
    expect(p.rollup.totalRnM3).toBe(262000);
    expect(p.offTrackCount).toBe(1); // F13
    expect(p.claimsAwaitingValidation).toBe(2); // PRJ-105 and PRJ-601
  });

  it("scripted replies use the exact spec wording", () => {
    expect(OUT_OF_SCOPE_REPLY).toBe("I can only show data for Coromandel Denim Mills.");
    expect(VALIDATION_BRAND_ONLY_REPLY).toBe("Claim and report validation is available to brand accounts. You can upload evidence from Claims & Evidence.");
  });
});

describe("portfolio for the brand", () => {
  const p = getPortfolio(brand);

  it("alerts: 1 Critical, 2 High, 4 Medium, 2 Info", () => {
    expect(p.alerts).toEqual({ Critical: 1, High: 2, Medium: 4, Info: 2 });
  });

  it("claims awaiting validation: 7; plants off-track: 3", () => {
    expect(p.claimsAwaitingValidation).toBe(7);
    expect(p.offTrackCount).toBe(3);
  });
});
