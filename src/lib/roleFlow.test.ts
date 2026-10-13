import { describe, expect, it } from "vitest";
import { scenarios } from "@/src/data/scenarios";
import caseBaseline from "./businessCase.baseline.json";
import { buildBusinessCase } from "./projectsView";
import { rolePageHeading } from "./roleFlow";
import { evaluateScenario } from "./scenarios";
import { factoryIdsInView, getSite, projectsHeading, supplierFilterOptions } from "./selectors";
import { scopeFor } from "./scope";

const BRAND = "Lumen Apparel Group";
describe("page heading and supplier filter (AC-6, AC-7)", () => {
  it("brand and supplier headings, counts read from the scope", () => {
    expect(projectsHeading("brand", scopeFor("brand"))).toEqual({ breadcrumbRoot: "Portfolio", showSupplierFilter: true, scopeLine: "Lumen Apparel Group · 5 suppliers · 14 factories" });
    expect(projectsHeading("supplier", scopeFor("supplier"))).toEqual({ breadcrumbRoot: "My factories", showSupplierFilter: false, scopeLine: "Coromandel Denim Mills · 3 factories. Showing only your factories." });
    expect(rolePageHeading("supplier", { brandName: BRAND, supplierName: "X", supplierCount: 1, factoryCount: 1 }).scopeLine).toBe("X · 1 factory. Showing only your factories.");
  });
  it("factoryIdsInView", () => {
    const brand = scopeFor("brand"), supplier = scopeFor("supplier");
    expect(factoryIdsInView(brand, null)).toEqual(brand.factoryIds);
    expect(factoryIdsInView(brand, "all")).toEqual(brand.factoryIds);
    expect(factoryIdsInView(brand, "SUP5")).toEqual(["F12", "F13", "F14"]);
    expect(factoryIdsInView(supplier, "SUP1")).toEqual([]);
    expect(factoryIdsInView(brand, "SUP99")).toEqual([]);
  });
  it("filter options: All suppliers first, then each supplier with its factory count", () => {
    const opts = supplierFilterOptions(scopeFor("brand"));
    expect(opts[0]).toEqual({ value: "all", label: "All suppliers" });
    expect(opts).toHaveLength(6);
    expect(opts.find((o) => o.value === "SUP5")!.label).toBe("Coromandel Denim Mills (3 factories)");
  });
});

describe("regression (AC-18)", () => {
  it("the S1 business case text is identical to before", () => {
    const site = getSite(scopeFor("brand"), "F12")!;
    const ev = (items: string[]) => evaluateScenario(site.pwi, site.replenishmentNeededM3, items);
    const s1 = scenarios.find((s) => s.id === "S1")!;
    const alts = scenarios.filter((s) => s.id !== "S0" && s.id !== "S1" && s.factoryId === s1.factoryId).map((s) => ({ id: s.id, name: s.name, result: ev(s.items) }));
    expect(buildBusinessCase(s1, ev(s1.items), ev([]), alts, site.name)).toEqual(caseBaseline);
  });
});
