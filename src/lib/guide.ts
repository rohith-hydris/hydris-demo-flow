import { f12Example } from "@/src/data/f12Example";
import { factories } from "@/src/data/factories";
import { projects } from "@/src/data/projects";
import { fmtInt, fmtPct1, fmtScore3 } from "./format";
import { PILLARS, pillarScore, sitePwi, type FactoryPwi } from "./pwi";
import type { Dimension, Pillar } from "./types";

// PRD 4.10: the twelve Guide-compatible formulas (PWI Methodology and Calculation Guide, Hydris Formula Handbook v1.0), kept
// beside PWI-M 1.0 so a client sees how far each correction moves their score. Each row is one pure function. Everything here is
// the comparison figure, never the headline PWI. PRD 4.10 is the spec; where it is silent the choice is listed as an ASSUMPTION
// below and in the tests, not hidden.
//
// ASSUMPTIONS for the F12 comparison (the PRD table does not settle them):
//  A1. "Wastewater discharged" (row 2) is taken as the compliant same-basin discharge, 140,000 m3: the data holds no other
//      discharge figure. With it the Guide RN equals the PWI-M RN (110,000 m3).
//  A2. Third-party water counts in the Guide withdrawal as a surface supply (row 1), because the F12 sources only total 250,000 m3 with it.
//  A3. On-site recharge (2,000 m3) is read as "rainwater harvested" in P1, and the desilting volume (27,000 m3) as "rain harvesting" in P2 (row 4).
//  A4. The Guide has no attribution row, so the wetland keeps its 50% attribution (25,000 m3) in P3 (row 4).
//  A5. "Cumulative" quality targets (row 8): cumulative reduction at a pillar = kg removed at the ETP plus kg removed by the
//      projects at that pillar and below, over total influent load (row 6's mass-sum). P2 is scored against 95%, P3 against 100%.
//  A6. The unbaselined 6,000 m3 landscape recharge offset counts in the Guide's P2 benefit (row 4); PWI-M 1.0 gates it out.

export const GUIDE_DAYS_PER_MONTH = 30.4375;
/** Row 8: P1 90%; P2 95% cumulative; P3 100% cumulative. */
export const GUIDE_QUALITY_TARGETS: Record<Pillar, number> = { P1: 0.9, P2: 0.95, P3: 1.0 };

type Kg = { tss: number; tn: number; tp: number };

// ---- the twelve rows -------------------------------------------------------------------------------------------------------

/** Row 1: municipal + ground + surface + rainwater + condensate. Reused water is not counted. */
export const guideFreshwaterWithdrawal = (s: { municipal: number; groundwater: number; surface: number; rainwater: number; condensate: number }) =>
  s.municipal + s.groundwater + s.surface + s.rainwater + s.condensate;

/** Row 2: freshwater withdrawal minus wastewater discharged. */
export const guideReplenishmentNeeded = (withdrawal: number, wastewaterDischarged: number) => withdrawal - wastewaterDischarged;

/** Row 3: P1 = 0.20 RN; P2 = 0.40 RN; P3 = 0.40 RN. */
export const guideAvailabilityTargets = (rn: number): Record<Pillar, number> => ({ P1: 0.2 * rn, P2: 0.4 * rn, P3: 0.4 * rn });

export interface GuideAvailabilityBenefit {
  p1: { recycled: number; reclaimed: number; rainwaterHarvested: number };
  p2: { rainHarvesting: number; groundwaterRecharge: number; landscape: number };
  p3: { natureBased: number; wetlands: number; other: number };
}
/** Row 4: P1 = recycled + reclaimed + rainwater harvested; P2 = rain harvesting + recharge + landscape; P3 = nature-based + wetlands + other. */
export const guideAvailabilityBenefit = (b: GuideAvailabilityBenefit): Record<Pillar, number> => ({
  P1: b.p1.recycled + b.p1.reclaimed + b.p1.rainwaterHarvested,
  P2: b.p2.rainHarvesting + b.p2.groundwaterRecharge + b.p2.landscape,
  P3: b.p3.natureBased + b.p3.wetlands + b.p3.other,
});

/** Row 5: P1 = employees; P2 = P3 = employees x (average family size - 1) / 2. */
export const guideAccessibilityTargets = (employees: number, avgFamilySize: number): Record<Pillar, number> => {
  const off = (employees * (avgFamilySize - 1)) / 2;
  return { P1: employees, P2: off, P3: off };
};

/** Row 6: (TSS + N + P removed) / (TSS + N + P in influent) x 100. Mass is summed, so TSS can hide poor N and P removal. */
export const guidePercentReduction = (removedKg: Kg, influentKg: Kg) =>
  ((removedKg.tss + removedKg.tn + removedKg.tp) / (influentKg.tss + influentKg.tn + influentKg.tp)) * 100;

/**
 * Row 7: pollutant removed in kg per month = (influent mg/L - effluent mg/L) / 1,000,000 x 1,000 x V x 30.4375, with V in
 * m3 PER DAY. This is the unit fix: the source formula is 1,000 times too high when V is given in other units.
 */
export const guidePollutantRemovedKgPerMonth = (influentMgPerL: number, effluentMgPerL: number, vM3PerDay: number) =>
  ((influentMgPerL - effluentMgPerL) / 1_000_000) * 1_000 * vM3PerDay * GUIDE_DAYS_PER_MONTH;

/** Row 8: a quality cell scores the (cumulative) % reduction against the pillar's target: P1 90%, P2 95%, P3 100%. Capped at 1.0. */
export const guideQualityScore = (pillar: Pillar, cumulativeReductionPct: number) =>
  Math.min(1, cumulativeReductionPct / 100 / GUIDE_QUALITY_TARGETS[pillar]);

/** Row 9: benefit / target, capped at 1.0. A zero target is scored 1 (the Guide has no zero-target rule). */
export const guideCellScore = (benefit: number, target: number) => (target > 0 ? Math.min(1, benefit / target) : 1);

/** Row 10: Availability x 0.40 + Accessibility x 0.30 + Quality x 0.30. */
export const guidePillarScore = (availability: number, accessibility: number, quality: number) => 0.4 * availability + 0.3 * accessibility + 0.3 * quality;

/** Row 11: (P1 + P2 + P3) / 3. */
export const guideSiteScore = (p1: number, p2: number, p3: number) => (p1 + p2 + p3) / 3;

/** Row 12: sum of site PWI / number of sites x 100. Unweighted only: the Guide has no RN-weighted figure. */
export const guidePortfolioPwi = (sitePwis: readonly number[]) => (sitePwis.length ? (sitePwis.reduce((a, b) => a + b, 0) / sitePwis.length) * 100 : 0);

// ---- the F12 comparison ---------------------------------------------------------------------------------------------------

type CellKey = `${Pillar}|${Dimension}`;
const key = (p: Pillar, d: Dimension): CellKey => `${p}|${d}`;

export interface GuideRowDiff {
  n: number; topic: string;
  /** What the Guide gives and what PWI-M 1.0 gives, as text. */
  guide: string; pwim: string;
  /** Site PWI (0 to 1) with only this row on the Guide formula, minus the PWI-M 1.0 site PWI. Null where the row is not a site figure. */
  effectOnSitePwi: number | null;
  /** Why the rows differ, in one line. */
  note: string;
}

export interface GuideComparison {
  /** Site PWI with every Guide row applied (0 to 1), and the PWI-M 1.0 site PWI it is compared with (central scores). */
  guideSitePwi: number; pwimSitePwi: number;
  guideCells: Record<CellKey, number>;
  rows: GuideRowDiff[];
}

/** The Guide's own inputs for F12, built from the worked example (PRODUCT 5.8) and the assumptions A1 to A6 above. */
export function guideInputsF12() {
  const w = f12Example;
  const cell = (p: Pillar, d: Dimension) => w.cells.find((c) => c.pillar === p && c.dimension === d)!;
  const line = (p: Pillar, label: string) => cell(p, "Availability").breakdown?.find((b) => b.label.startsWith(label))?.value ?? 0;
  const landscape = projects.find((p) => p.id === "PRJ-107")!.claim;
  const s = w.withdrawalBySourceM3;
  const p2Quality = cell("P2", "Quality").delivered, p3Quality = cell("P3", "Quality").delivered;
  const kg = (m: typeof p2Quality): Kg => (m.kind === "mass" ? { tss: m.tss, tn: m.tn, tp: m.tp } : { tss: 0, tn: 0, tp: 0 });
  const removalPct = cell("P1", "Quality").delivered;
  const rem = removalPct.kind === "removal" ? removalPct : { tss: 0, tn: 0, tp: 0 };
  return {
    sources: { municipal: s.municipal, groundwater: s.groundwater, surface: s.thirdParty, rainwater: s.rainwaterUsed, condensate: s.condensate },
    wastewaterDischarged: w.compliantBasinDischargeM3,
    benefit: {
      p1: { recycled: line("P1", "Recycled"), reclaimed: line("P1", "Reclaimed"), rainwaterHarvested: line("P1", "On-site recharge") },
      p2: { rainHarvesting: line("P2", "Desilting"), groundwaterRecharge: line("P2", "Recharge"), landscape: landscape.unit === "m3" ? landscape.value : 0 },
      p3: { natureBased: 0, wetlands: line("P3", "Wetland"), other: 0 },
    } as GuideAvailabilityBenefit,
    employees: cell("P1", "Accessibility").target.kind === "people" ? (cell("P1", "Accessibility").target as { count: number }).count : 0,
    influentKg: w.baselineLoadsKg,
    etpRemovedKg: { tss: (w.baselineLoadsKg.tss * rem.tss) / 100, tn: (w.baselineLoadsKg.tn * rem.tn) / 100, tp: (w.baselineLoadsKg.tp * rem.tp) / 100 },
    projectKg: { P2: kg(p2Quality), P3: kg(p3Quality) },
    etpFlowM3PerDay: w.etpFlowM3 / 365.25,
    influentMgPerL: w.influentMgPerL, removalPct: rem,
  };
}

const sum3 = (k: Kg) => k.tss + k.tn + k.tp;

/**
 * The Guide's twelve rows applied to F12, with per-row and total effect on site PWI. Only the worked example carries the raw inputs,
 * so any other site returns null. `site` supplies the PWI-M 1.0 cell scores (central values).
 */
export function guideComparison(site: FactoryPwi): GuideComparison | null {
  if (site.factoryId !== f12Example.factoryId) return null;
  const g = guideInputsF12();
  const pwim = Object.fromEntries(site.cells.map((c) => [key(c.pillar, c.dimension), c.score])) as Record<CellKey, number>;

  // Rows 1 to 3
  const withdrawal = guideFreshwaterWithdrawal(g.sources);
  const rn = guideReplenishmentNeeded(withdrawal, g.wastewaterDischarged);
  const availTargets = guideAvailabilityTargets(rn);
  // Row 4 and 9: Availability scores
  const benefit = guideAvailabilityBenefit(g.benefit);
  const guideA = Object.fromEntries(PILLARS.map((p) => [p, guideCellScore(benefit[p], availTargets[p])])) as Record<Pillar, number>;
  // Row 5: Accessibility (same targets and delivered as PWI-M)
  const accTargets = guideAccessibilityTargets(g.employees, factories.find((f) => f.id === site.factoryId)!.householdSize);
  // Rows 6 and 8: quality. P1 from the mass-sum % reduction against 90%; P2 and P3 from cumulative % reduction.
  const pctP1 = guidePercentReduction(g.etpRemovedKg, g.influentKg);
  const cumulative = (p: "P2" | "P3") => {
    const removed = { ...g.etpRemovedKg };
    const add = (k: Kg) => { removed.tss += k.tss; removed.tn += k.tn; removed.tp += k.tp; };
    add(g.projectKg.P2);
    if (p === "P3") add(g.projectKg.P3);
    return guidePercentReduction(removed, g.influentKg);
  };
  const guideQ: Record<Pillar, number> = { P1: guideQualityScore("P1", pctP1), P2: guideQualityScore("P2", cumulative("P2")), P3: guideQualityScore("P3", cumulative("P3")) };

  const guideCells: Record<CellKey, number> = { ...pwim };
  for (const p of PILLARS) { guideCells[key(p, "Availability")] = guideA[p]; guideCells[key(p, "Quality")] = guideQ[p]; }

  const siteWith = (cells: Record<CellKey, number>) => {
    const P = PILLARS.map((p) => pillarScore(cells[key(p, "Availability")], cells[key(p, "Accessibility")], cells[key(p, "Quality")]));
    return sitePwi(P[0], P[1], P[2]);
  };
  const base = siteWith(pwim);
  const only = (over: Partial<Record<CellKey, number>>) => siteWith({ ...pwim, ...over }) - base;

  // Row 7: a check on the unit fix. Monthly kg from the m3/day formula, times 12, equals the annual load removed.
  const tssPerMonth = guidePollutantRemovedKgPerMonth(g.influentMgPerL.tss, g.influentMgPerL.tss * (1 - g.removalPct.tss / 100), g.etpFlowM3PerDay);

  const m3 = (n: number) => `${fmtInt(n)} m³`;
  const rows: GuideRowDiff[] = [
    { n: 1, topic: "Freshwater withdrawal", guide: m3(withdrawal), pwim: m3(f12Example.baselineWithdrawalM3), effectOnSitePwi: 0, note: "Same sum. Reused water is not counted in either." },
    { n: 2, topic: "Replenishment Needed (RN)", guide: m3(rn), pwim: m3(f12Example.baselineWithdrawalM3 - f12Example.compliantBasinDischargeM3),
      effectOnSitePwi: 0, note: "The Guide subtracts all wastewater discharged; PWI-M 1.0 subtracts only compliant same-basin discharge, times a. Equal here (assumption A1)." },
    { n: 3, topic: "Availability targets", guide: PILLARS.map((p) => fmtInt(availTargets[p])).join(" / ") + " m³", pwim: "22,000 / 44,000 / 44,000 m³", effectOnSitePwi: 0, note: "Same 0.20 / 0.40 / 0.40 split of RN." },
    { n: 4, topic: "Availability benefit", guide: PILLARS.map((p) => fmtInt(benefit[p])).join(" / ") + " m³",
      pwim: PILLARS.map((p) => fmtInt((site.cells.find((c) => c.pillar === p && c.dimension === "Availability")!.delivered as { m3: number }).m3)).join(" / ") + " m³",
      effectOnSitePwi: only(Object.fromEntries(PILLARS.map((p) => [key(p, "Availability"), guideA[p]]))),
      note: "The Guide counts the 6,000 m³ landscape offset that has no baseline; PWI-M 1.0 excludes it (Additionality Gate)." },
    { n: 5, topic: "Accessibility targets", guide: PILLARS.map((p) => fmtInt(accTargets[p])).join(" / ") + " people",
      pwim: PILLARS.map((p) => fmtInt((site.cells.find((c) => c.pillar === p && c.dimension === "Accessibility")!.target as { count: number }).count)).join(" / ") + " people", effectOnSitePwi: 0, note: "Same: employees, and employees x (family size - 1) / 2." },
    { n: 6, topic: "Pollutant reduction (%)", guide: `${fmtPct1(pctP1 / 100)} of mass, P1 Quality ${fmtScore3(guideQ.P1)}`, pwim: `Per-pollutant mean, P1 Quality ${fmtScore3(pwim[key("P1", "Quality")])}`,
      effectOnSitePwi: only({ [key("P1", "Quality")]: guideQ.P1 }), note: "Summing kg lets TSS hide the 75% nitrogen removal. PWI-M 1.0 averages the per-pollutant scores." },
    { n: 7, topic: "Pollutant removed (kg/month)", guide: `TSS ${fmtInt(tssPerMonth)} kg/month with V in m³/day`, pwim: "kg = mg/L × m³ ÷ 1,000 on monthly volumes", effectOnSitePwi: 0,
      note: "The unit fix: the source formula is 1,000 times too high unless V is in m³/day. Same kg once fixed." },
    { n: 8, topic: "Quality targets", guide: "P1 90%, P2 95% cumulative, P3 100% cumulative", pwim: "P1 90% per pollutant; P2 and P3 5% of baseline load in kg",
      effectOnSitePwi: only({ [key("P2", "Quality")]: guideQ.P2, [key("P3", "Quality")]: guideQ.P3 }),
      note: "Cumulative targets are met largely by the ETP, so the Guide scores P2 and P3 Quality high with almost no basin project (assumption A5)." },
    { n: 9, topic: "Cell score", guide: "Benefit ÷ target, capped at 1.0", pwim: "Same, with a zero-target policy (proposed)", effectOnSitePwi: 0, note: "Same for every defined target." },
    { n: 10, topic: "Pillar score", guide: "0.40 A + 0.30 W + 0.30 Q", pwim: "Same", effectOnSitePwi: 0, note: "Same weights." },
    { n: 11, topic: "Site PWI", guide: "(P1 + P2 + P3) ÷ 3", pwim: "Same", effectOnSitePwi: 0, note: "Same." },
    { n: 12, topic: "Portfolio PWI", guide: "Sum of site PWI ÷ sites × 100", pwim: "Unweighted and RN-weighted, both shown", effectOnSitePwi: null, note: "Not a site figure. The Guide has only the unweighted mean." },
  ];

  return { guideSitePwi: siteWith(guideCells), pwimSitePwi: base, guideCells, rows };
}

/** Site PWI with every Guide row applied (0 to 1), or null for a site without the worked-example inputs. */
export const guideSitePwi = (site: FactoryPwi): number | null => guideComparison(site)?.guideSitePwi ?? null;
