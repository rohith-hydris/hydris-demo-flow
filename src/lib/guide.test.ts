import { describe, expect, it } from "vitest";
import { removals } from "@/src/data/cells";
import { factories } from "@/src/data/factories";
import { f12Example } from "@/src/data/f12Example";
import { pct1 } from "./format";
import {
  GUIDE_DAYS_PER_MONTH, GUIDE_QUALITY_TARGETS, guideAccessibilityTargets, guideAvailabilityBenefit, guideAvailabilityTargets, guideCellScore, guideComparison,
  guideFreshwaterWithdrawal, guideInputsF12, guidePercentReduction, guidePillarScore, guidePollutantRemovedKgPerMonth, guidePortfolioPwi, guideQualityScore,
  guideReplenishmentNeeded, guideSitePwi, guideSiteScore,
} from "./guide";
import { buildFactoryPwi } from "./pwi";
import { getSites } from "./selectors";
import { scopeFor } from "./scope";

const f12 = () => buildFactoryPwi(factories.find((f) => f.id === "F12")!, undefined, removals.find((r) => r.factoryId === "F12")!, f12Example);

describe("the twelve Guide rows (PRD 4.10)", () => {
  it("1 and 2: withdrawal is the five sources, and RN is withdrawal minus wastewater discharged", () => {
    expect(guideFreshwaterWithdrawal({ municipal: 120000, groundwater: 90000, surface: 30000, rainwater: 10000, condensate: 0 })).toBe(250000);
    expect(guideReplenishmentNeeded(250000, 140000)).toBe(110000);
  });
  it("3: availability targets are 0.20 / 0.40 / 0.40 of RN", () => {
    expect(guideAvailabilityTargets(110000)).toEqual({ P1: 22000, P2: 44000, P3: 44000 });
  });
  it("4: availability benefit sums the Guide's lines per pillar, including landscape in P2", () => {
    expect(guideAvailabilityBenefit({
      p1: { recycled: 15000, reclaimed: 4000, rainwaterHarvested: 2000 }, p2: { rainHarvesting: 27000, groundwaterRecharge: 8000, landscape: 6000 }, p3: { natureBased: 0, wetlands: 25000, other: 0 },
    })).toEqual({ P1: 21000, P2: 41000, P3: 25000 });
  });
  it("5: accessibility targets are employees, then employees x (family size - 1) / 2", () => {
    const t = guideAccessibilityTargets(1200, 3.9);
    expect([t.P1, Math.round(t.P2 * 1e6) / 1e6, Math.round(t.P3 * 1e6) / 1e6]).toEqual([1200, 1740, 1740]);
  });
  it("6: percent reduction sums the mass, so F12's 63,450 of 70,500 kg is 90.0% and hides 75% nitrogen removal", () => {
    expect(guidePercentReduction({ tss: 55500, tn: 6750, tp: 1200 }, { tss: 60000, tn: 9000, tp: 1500 })).toBeCloseTo(90, 9);
  });
  it("7: kg per month uses V in m3/day: 400 to 30 mg/L at 410.7 m3/day removes about 4,625 kg of TSS a month", () => {
    const v = 150000 / 365.25;
    expect(GUIDE_DAYS_PER_MONTH).toBe(30.4375);
    expect(guidePollutantRemovedKgPerMonth(400, 30, v)).toBeCloseTo(4625, 0);
    expect(guidePollutantRemovedKgPerMonth(400, 30, v) * 12).toBeCloseTo(55500, 0); // the annual TSS removed at 92.5%
    expect(guidePollutantRemovedKgPerMonth(400, 30, 1000)).toBeCloseTo(0.37 * 1000 * GUIDE_DAYS_PER_MONTH, 6);
  });
  it("8: quality targets are P1 90%, P2 95% cumulative, P3 100% cumulative, capped at 1.0", () => {
    expect(GUIDE_QUALITY_TARGETS).toEqual({ P1: 0.9, P2: 0.95, P3: 1.0 });
    expect(guideQualityScore("P1", 90)).toBeCloseTo(1, 12);
    expect(guideQualityScore("P2", 47.5)).toBeCloseTo(0.5, 12);
    expect(guideQualityScore("P3", 50)).toBeCloseTo(0.5, 12);
    expect(guideQualityScore("P2", 99)).toBe(1);
  });
  it("9 to 12: cell score is benefit over target capped at 1, then the pillar, site and portfolio formulas", () => {
    expect(guideCellScore(30, 20)).toBe(1);
    expect(guideCellScore(10, 20)).toBe(0.5);
    expect(guideCellScore(5, 0)).toBe(1);
    expect(guidePillarScore(1, 0, 0)).toBeCloseTo(0.4, 12);
    expect(guidePillarScore(0, 1, 1)).toBeCloseTo(0.6, 12);
    expect(guideSiteScore(1, 0.5, 0)).toBeCloseTo(0.5, 12);
    expect(guidePortfolioPwi([0.5, 0.7])).toBeCloseTo(60, 12);
    expect(guidePortfolioPwi([])).toBe(0);
  });
});

describe("Handbook example (PRD 4.10)", () => {
  // From the PRD: unbaselined 6,000 m3 recharge offset, P2 Availability 0, P2 pillar 0.27, site PWI (0.87 + 0.27 + 0.16) / 3 = 43%,
  // and 50% once the baseline is accepted. P1 0.87 and P3 0.16 are given.
  //
  // ASSUMPTIONS (not in the PRD, so none of them is a spec value):
  //  H1. P2 Accessibility and P2 Quality are not given, only that 0.30 W + 0.30 Q = 0.27 when A = 0. We take W = 0.5 and Q = 0.4.
  //  H2. The PRD gives no P2 Availability target. A site PWI of 50% needs P2 = 0.47, so A = 0.5 once the 6,000 m3 counts;
  //      that implies a target of 12,000 m3. We take 12,000 m3 (the PRD's 50% fixes the ratio, not the target itself).
  const P1 = 0.87, P3 = 0.16, W = 0.5, Q = 0.4, TARGET = 12000, OFFSET = 6000;

  it("excluding the unbaselined offset gives P2 Availability 0, P2 pillar 0.27 and site PWI 43%", () => {
    const a = guideCellScore(0, TARGET);
    const p2 = guidePillarScore(a, W, Q);
    expect(a).toBe(0);
    expect(p2).toBeCloseTo(0.27, 12);
    expect(guideSiteScore(P1, p2, P3)).toBeCloseTo((0.87 + 0.27 + 0.16) / 3, 12);
    expect(Math.round(guideSiteScore(P1, p2, P3) * 100)).toBe(43);
  });

  it("accepting the baseline counts the 6,000 m3 and raises site PWI to 50%", () => {
    const a = guideCellScore(OFFSET, TARGET);
    const p2 = guidePillarScore(a, W, Q);
    expect(a).toBe(0.5);
    expect(p2).toBeCloseTo(0.47, 12);
    expect(Math.round(guideSiteScore(P1, p2, P3) * 100)).toBe(50);
  });
});

describe("Guide comparison for F12", () => {
  const c = guideComparison(f12())!;

  it("has the twelve rows, in order", () => {
    expect(c.rows.map((r) => r.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const r of c.rows) { expect(r.guide.length).toBeGreaterThan(0); expect(r.pwim.length).toBeGreaterThan(0); expect(r.note.length).toBeGreaterThan(0); }
  });

  it("is built only for F12, the site with the worked-example inputs", () => {
    const other = getSites(scopeFor("brand")).find((s) => s.id === "F01")!;
    expect(guideComparison(other.pwi)).toBeNull();
    expect(guideSitePwi(other.pwi)).toBeNull();
  });

  it("reads the Guide's inputs from the worked example: withdrawal 250,000, RN 110,000 and the 63,450 / 70,500 kg", () => {
    const g = guideInputsF12();
    expect(guideFreshwaterWithdrawal(g.sources)).toBe(250000);
    expect(guideReplenishmentNeeded(250000, g.wastewaterDischarged)).toBe(110000);
    expect(guideAvailabilityBenefit(g.benefit)).toEqual({ P1: 21000, P2: 41000, P3: 25000 });
    expect(g.etpRemovedKg.tss + g.etpRemovedKg.tn + g.etpRemovedKg.tp).toBeCloseTo(63450, 6);
  });

  it("rows that are the same in both methods have no effect on site PWI, and the portfolio row is not a site figure", () => {
    for (const n of [1, 2, 3, 5, 7, 9, 10, 11]) expect(c.rows[n - 1].effectOnSitePwi).toBe(0);
    expect(c.rows[11].effectOnSitePwi).toBeNull();
  });

  it("row 6 alone reproduces the existing Guide-compatible figure: 69.8% to 70.7%", () => {
    const p = f12();
    expect(pct1(c.pwimSitePwi)).toBe(69.8);
    expect(pct1(c.pwimSitePwi + c.rows[5].effectOnSitePwi!)).toBe(70.7);
    expect(c.rows[5].effectOnSitePwi!).toBeCloseTo(p.guide!.sitePwi - p.sitePwiCentral, 12);
  });

  it("row 4 raises site PWI because the Guide counts the 6,000 m3 landscape offset", () => {
    // P2 Availability 41,000 / 44,000 against 35,000 / 44,000: 0.4 x (6,000 / 44,000) / 3
    expect(c.rows[3].effectOnSitePwi!).toBeCloseTo((0.4 * (6000 / 44000)) / 3, 6);
  });

  it("row 8 raises site PWI: cumulative targets are met largely by the ETP", () => {
    expect(c.rows[7].effectOnSitePwi!).toBeGreaterThan(0.05);
    expect(c.guideCells["P2|Quality"]).toBeGreaterThan(0.95);
    expect(c.guideCells["P3|Quality"]).toBeGreaterThan(0.9);
  });

  it("the Guide site PWI is higher than PWI-M 1.0, and no larger than 1", () => {
    expect(guideSitePwi(f12())).toBe(c.guideSitePwi);
    expect(c.guideSitePwi).toBeGreaterThan(c.pwimSitePwi);
    expect(c.guideSitePwi).toBeLessThanOrEqual(1);
  });
});
