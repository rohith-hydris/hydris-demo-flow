import { describe, expect, it } from "vitest";
import { pct1, round } from "./format";
import { rollup } from "./rollup";
import { getPortfolio, getSuppliers } from "./selectors";
import { scopeFor } from "./scope";
import { portfolioCheck, supplierChecks } from "./specCheckValues";

const brand = scopeFor("brand");

describe("supplier roll-ups (PRODUCT 5.5, 6.7)", () => {
  const suppliers = getSuppliers(brand);

  it("lists the 5 suppliers in order", () => {
    expect(suppliers.map((s) => s.id)).toEqual(["SUP1", "SUP2", "SUP3", "SUP4", "SUP5"]);
  });

  describe.each(supplierChecks)("$id", (c) => {
    const s = suppliers.find((x) => x.id === c.id)!;
    // Two supplier averages move with the C1 gaps (F02 in SUP1: 0.66 to 0.65; F11 in SUP4: 0.47 to 0.46).
    const avgR = ({ SUP1: 0.65, SUP4: 0.46 } as Record<string, number>)[c.id] ?? c.avgR;
    it(`average R ${avgR}`, () => expect(round(s.rollup.avgR, 2)).toBe(avgR));
    it(`central PWI unweighted ${c.pwiUnweighted}`, () => expect(pct1(s.rollup.pwiUnweightedCentral)).toBe(c.pwiUnweighted));
    it(`central PWI RN-weighted ${c.pwiRnWeighted}`, () => expect(pct1(s.rollup.pwiRnWeightedCentral)).toBe(c.pwiRnWeighted));
    it(`total RN ${c.totalRn} m3`, () => expect(s.rollup.totalRnM3).toBe(c.totalRn));
  });

  it("Coromandel Denim Mills has the highest average risk (0.75)", () => {
    const top = [...suppliers].sort((a, b) => b.rollup.avgR - a.rollup.avgR)[0];
    expect(top.id).toBe("SUP5");
  });

  it("supplier average health: SUP5 is 73 (81, 55, 83)", () => {
    expect(round(suppliers.find((s) => s.id === "SUP5")!.rollup.avgHealth, 0)).toBe(73);
  });
});

describe("brand portfolio (PRODUCT 4.2, 5.5)", () => {
  const p = getPortfolio(brand);

  it("shows both PWI figures: 68.9 unweighted and 62.6 RN-weighted", () => {
    expect(pct1(p.rollup.pwiUnweightedCentral)).toBe(portfolioCheck.pwiUnweighted);
    expect(pct1(p.rollup.pwiRnWeightedCentral)).toBe(portfolioCheck.pwiRnWeighted);
  });

  it("the headline counted figures are lower than the central ones because grade C sites count the low value", () => {
    expect(p.rollup.pwiUnweighted).toBeLessThan(p.rollup.pwiUnweightedCentral);
    expect(p.rollup.pwiRnWeighted).toBeLessThan(p.rollup.pwiRnWeightedCentral);
  });

  it("the RN-weighted figure is the weaker one", () => {
    expect(p.rollup.pwiRnWeighted).toBeLessThan(p.rollup.pwiUnweighted);
  });

  it("covers 5 suppliers, 14 factories and 1,011,000 m3 of Replenishment Needed", () => {
    expect([p.supplierCount, p.factoryCount, p.rollup.totalRnM3]).toEqual([5, 14, portfolioCheck.totalRn]);
  });

  it("has 8 sites in Band 1", () => {
    expect(p.band1Count).toBe(8);
  });

  it("supplier volumetric balance is RN-weighted: delivered over needed", () => {
    const s = getSuppliers(brand).find((x) => x.id === "SUP5")!;
    const delivered = s.sites.reduce((sum, site) => sum + site.pwi.volumetricBalance * site.replenishmentNeededM3, 0);
    expect(s.rollup.volumetricBalance).toBeCloseTo(delivered / s.rollup.totalRnM3, 12);
  });
});

describe("rollup()", () => {
  it("returns zeros for no sites instead of NaN", () => {
    expect(rollup([])).toMatchObject({ count: 0, avgR: 0, pwiUnweighted: 0, pwiRnWeighted: 0, totalRnM3: 0 });
  });

  it("RN weighting lets a large weak site pull the figure down", () => {
    const small = { R: 0.5, pwi: 0.9, pwiCentral: 0.9, volumetricBalance: 0.9, replenishmentNeededM3: 1000, healthScore: 90 };
    const large = { R: 0.5, pwi: 0.3, pwiCentral: 0.3, volumetricBalance: 0.3, replenishmentNeededM3: 99000, healthScore: 50 };
    const r = rollup([small, large]);
    expect(r.pwiUnweighted).toBeCloseTo(0.6, 12);
    expect(r.pwiRnWeighted).toBeCloseTo(0.306, 12);
  });
});
