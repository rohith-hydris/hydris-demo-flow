import { opportunities, type ForecastBenefit, type Opportunity } from "@/src/data/opportunities";
import { RS_PER_LAKH, WATER_VALUE_RS_PER_M3 } from "@/src/data/scenarios";
import type { Measure } from "@/src/data/types";
import { PILLARS, pillarScore, sitePwi, type FactoryPwi, type PwiCell } from "./pwi";
import type { Dimension, Pillar } from "./types";

// V2 Section 12: a bounded scenario calculator (no optimiser). Forecast benefit is added to the site grid as Forecast only,
// targets stay frozen at baseline, and Forecast never mixes into Measured or Validated totals. All numbers are demo estimates.

export type Payback = { kind: "years"; years: number } | { kind: "none" } | { kind: "n/a" };

export interface ScenarioResult {
  itemIds: string[];
  /** Site PWI with the forecast added (central) and with each opportunity's uncertainty applied (low), 0 to 1. */
  pwi: number; pwiLow: number;
  pillars: Record<Pillar, number>;
  /** (sum of Availability benefit) / RN. Uncapped, so it can pass 1. */
  volumetricBalance: number; volumetricBalanceLow: number;
  capexLakh: number; omLakh: number; grossSavingsLakh: number;
  /** Savings after the shared-water overlap is taken out once. */
  savingsLakh: number; netSavingsLakh: number;
  payback: Payback;
  /** Shared water reconciled (m3/yr), shown as a visible line, and its saving in lakh. */
  overlapM3: number; overlapSavingLakh: number;
  /** Separate outcome dimensions. Never blended into one score. */
  stewardship: { pwiChangePoints: number; balanceChangePoints: number; addedM3: number; addedPeople: number; addedKg: { tss: number; tn: number; tp: number } };
  /** Everything here is Forecast. */
  benefitState: "Forecast";
}

type Kg = { tss: number; tn: number; tp: number };
const ZERO_KG: Kg = { tss: 0, tn: 0, tp: 0 };

interface Increment { m3: number; people: number; kg: Kg }
const emptyInc = (): Increment => ({ m3: 0, people: 0, kg: { ...ZERO_KG } });

function addForecast(inc: Increment, f: ForecastBenefit, k: number) {
  if (f.unit === "m3") inc.m3 += f.value * k;
  else if (f.unit === "people") inc.people += f.value * k;
  else { inc.kg.tss += f.tss * k; inc.kg.tn += f.tn * k; inc.kg.tp += f.tp * k; }
}

const cellKey = (p: Pillar, d: Dimension) => `${p}|${d}`;

/** Score a grid cell with a forecast increment on top of the delivered benefit. Untouched cells keep their entered score. */
function forecastScore(cell: PwiCell, inc: Increment | undefined): number {
  if (!inc || !cell.target || !cell.delivered) return cell.score;
  const t = cell.target as Measure, d = cell.delivered as Measure;
  if (cell.dimension === "Availability" && t.kind === "volume" && d.kind === "volume") return Math.min(1, (d.m3 + inc.m3) / t.m3);
  if (cell.dimension === "Accessibility" && t.kind === "people" && d.kind === "people") return Math.min(1, (d.count + inc.people) / t.count);
  if (cell.dimension === "Quality" && t.kind === "mass" && d.kind === "mass") {
    const parts = [Math.min(1, (d.tss + inc.kg.tss) / t.tss), Math.min(1, (d.tn + inc.kg.tn) / t.tn), Math.min(1, (d.tp + inc.kg.tp) / t.tp)];
    return parts.reduce((a, b) => a + b, 0) / 3;
  }
  return cell.score;
}

/** Shared water between two chosen opportunities, counted once (V2 12). */
function overlapOf(chosen: Opportunity[]): number {
  let m3 = 0;
  for (const a of chosen) {
    if (!a.overlap) continue;
    const b = chosen.find((o) => o.id === a.overlap!.with);
    if (b && a.id < b.id) m3 += a.overlap.m3;
  }
  return m3;
}

export function evaluateScenario(site: FactoryPwi, replenishmentNeededM3: number, itemIds: string[], pool: Opportunity[] = opportunities): ScenarioResult {
  const chosen = itemIds.map((id) => pool.find((o) => o.id === id)).filter((o): o is Opportunity => !!o);
  const overlapM3 = overlapOf(chosen);
  const pairU = (a: Opportunity) => { const b = chosen.find((o) => o.id === a.overlap?.with); return b ? (a.uncertainty + b.uncertainty) / 2 : a.uncertainty; };

  const central = new Map<string, Increment>();
  const low = new Map<string, Increment>();
  for (const o of chosen) {
    const key = cellKey(o.pillar, o.dimension);
    if (!central.has(key)) { central.set(key, emptyInc()); low.set(key, emptyInc()); }
    addForecast(central.get(key)!, o.forecast, 1);
    addForecast(low.get(key)!, o.forecast, 1 - o.uncertainty);
    // The shared stream is taken out once, from both the central and the low value.
    if (o.overlap && chosen.some((x) => x.id === o.overlap!.with) && o.id < o.overlap.with) {
      central.get(key)!.m3 -= o.overlap.m3;
      low.get(key)!.m3 -= o.overlap.m3 * (1 - pairU(o));
    }
  }

  const scoreWith = (incs: Map<string, Increment>) => {
    const byCell = (p: Pillar, d: Dimension) => forecastScore(site.cells.find((c) => c.pillar === p && c.dimension === d)!, incs.get(cellKey(p, d)));
    const pillars = Object.fromEntries(PILLARS.map((p) => [p, pillarScore(byCell(p, "Availability"), byCell(p, "Accessibility"), byCell(p, "Quality"))])) as Record<Pillar, number>;
    return { pillars, pwi: sitePwi(pillars.P1, pillars.P2, pillars.P3) };
  };
  const c = scoreWith(central), l = scoreWith(low);

  const availabilityDelivered = (p: Pillar) => {
    const d = site.cells.find((x) => x.pillar === p && x.dimension === "Availability")!.delivered;
    return d && d.kind === "volume" ? d.m3 : 0;
  };
  const baseB = PILLARS.reduce((sum, p) => sum + availabilityDelivered(p), 0);
  const addedB = (incs: Map<string, Increment>) => PILLARS.reduce((sum, p) => sum + (incs.get(cellKey(p, "Availability"))?.m3 ?? 0), 0);

  const capexLakh = chosen.reduce((s, o) => s + o.capexLakh, 0);
  const omLakh = chosen.reduce((s, o) => s + o.omLakh, 0);
  const grossSavingsLakh = chosen.reduce((s, o) => s + o.savingsLakh, 0);
  const overlapSavingLakh = (overlapM3 * WATER_VALUE_RS_PER_M3) / RS_PER_LAKH;
  const savingsLakh = grossSavingsLakh - overlapSavingLakh;
  const netSavingsLakh = savingsLakh - omLakh;
  const payback: Payback = chosen.length === 0 ? { kind: "n/a" } : netSavingsLakh > 0 ? { kind: "years", years: capexLakh / netSavingsLakh } : { kind: "none" };

  const total = emptyInc();
  for (const inc of central.values()) { total.m3 += inc.m3; total.people += inc.people; total.kg.tss += inc.kg.tss; total.kg.tn += inc.kg.tn; total.kg.tp += inc.kg.tp; }

  const baseBalance = baseB / replenishmentNeededM3;
  const balance = (baseB + addedB(central)) / replenishmentNeededM3;
  return {
    itemIds: chosen.map((o) => o.id), pwi: c.pwi, pwiLow: l.pwi, pillars: c.pillars,
    volumetricBalance: balance, volumetricBalanceLow: (baseB + addedB(low)) / replenishmentNeededM3,
    capexLakh, omLakh, grossSavingsLakh, savingsLakh, netSavingsLakh, payback, overlapM3, overlapSavingLakh,
    stewardship: {
      pwiChangePoints: (c.pwi - site.sitePwi) * 100, balanceChangePoints: (balance - baseBalance) * 100,
      addedM3: total.m3, addedPeople: total.people, addedKg: total.kg,
    },
    benefitState: "Forecast",
  };
}

/** "No financial payback" or "11.0 years"; stewardship value is shown either way. */
export const paybackLabel = (p: Payback) => (p.kind === "years" ? `${p.years.toFixed(1)} years` : p.kind === "none" ? "No financial payback" : "n/a");

/** The surfaced insight (V2 12): reuse raises the balance more than PWI. Computed, not typed. */
export function reuseInsight(reuse: ScenarioResult, basin: ScenarioResult) {
  return { reuseBalanceGain: reuse.stewardship.balanceChangePoints, reusePwiGain: reuse.stewardship.pwiChangePoints, basinPwiGain: basin.stewardship.pwiChangePoints };
}

