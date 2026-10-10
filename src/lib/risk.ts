import { riskCatalogue, rawRiskValues } from "@/src/data/risks";
import type { RiskScores } from "@/src/data/types";
import type { FactoryId, PillarKey, RiskCategory, RiskCode, RiskStatus } from "./types";

// PRODUCT 5.6: Basin Risk (Module 01). ucw, rri, cep and tex are never used in R.

export type Pillars = Record<PillarKey, number>;
export type Weights = Record<PillarKey, number>;

export const PILLAR_KEYS: readonly PillarKey[] = ["scarcity", "groundwater", "drought", "flood", "community"];

export const PILLAR_LABELS: Record<PillarKey, string> = {
  scarcity: "Scarcity", groundwater: "Groundwater", drought: "Drought", flood: "Flood", community: "Community",
};

export const DEFAULT_WEIGHTS: Weights = { scarcity: 0.3, groundwater: 0.2, drought: 0.2, flood: 0.15, community: 0.15 };

/** Each pillar is the worst of its indicators on the 0 to 5 scale, divided by 5. */
export function riskPillars(s: RiskScores): Pillars {
  return {
    scarcity: Math.max(s.bws, s.bwd, s.iav, s.sev) / 5,
    groundwater: s.gtd / 5,
    drought: s.drr / 5,
    flood: Math.max(s.rfr, s.cfr) / 5,
    community: Math.max(s.udw, s.usa) / 5,
  };
}

/** Scale weights to sum to 1 (the live weights panel renormalises to 100%). */
export function normaliseWeights(w: Weights): Weights {
  const total = PILLAR_KEYS.reduce((sum, k) => sum + w[k], 0);
  if (total <= 0) return { ...DEFAULT_WEIGHTS };
  return Object.fromEntries(PILLAR_KEYS.map((k) => [k, w[k] / total])) as Weights;
}

/** R = sum of weight x pillar. */
export function riskR(p: Pillars, w: Weights = DEFAULT_WEIGHTS): number {
  return PILLAR_KEYS.reduce((sum, k) => sum + w[k] * p[k], 0);
}

/** 2050 rise in water stress, used as the last ranking tie-break. */
export const bwsRise = (s: RiskScores) => s.bws50 - s.bws;

export const PRESENT_AT = 3.0;
export const WATCH_AT = 2.0;

/** Present at 3.0 and above, Watch from 2.0 up to 3.0, otherwise Not present. `ucw` is always Watch. */
export function riskStatus(code: RiskCode, score: number): RiskStatus {
  if (code === "ucw") return "Watch";
  if (score >= PRESENT_AT - 1e-9) return "Present";
  if (score >= WATCH_AT - 1e-9) return "Watch";
  return "Not present";
}

/** The composite is labelled "Extremely High" at 4.0 and above. The spec names no other label. */
export const textileLabel = (score: number): "Extremely High" | null => (score >= 4.0 - 1e-9 ? "Extremely High" : null);

export interface RiskResult {
  code: RiskCode; name: string; shortName: string; category: RiskCategory;
  score: number; scorePct: number; status: RiskStatus;
  countryLevel: boolean;
  /** Shown separately and left out of the Present and Watch counts (coastal eutrophication). */
  excludedFromCounts: boolean;
  compositeLabel: string | null;
  rawValue: string | null;
}

/** How many risks there are, and how many are counted (coastal eutrophication is shown separately). */
export const RISK_TOTAL = riskCatalogue.length;
export const RISK_COUNTED = riskCatalogue.filter((c) => c.code !== "cep").length;

export function evaluateRisks(factoryId: FactoryId, s: RiskScores): RiskResult[] {
  return riskCatalogue.map((c) => {
    const score = s[c.code];
    return {
      code: c.code, name: c.name, shortName: c.shortName, category: c.category,
      score, scorePct: (score / 5) * 100, status: riskStatus(c.code, score),
      countryLevel: c.countryLevel, excludedFromCounts: c.code === "cep",
      compositeLabel: c.code === "tex" ? textileLabel(score) : null,
      rawValue: rawRiskValues[factoryId]?.[c.code] ?? null,
    };
  });
}

export interface RiskCounts { present: number; watch: number; notPresent: number }

/** Counts over the 13 risks, excluding coastal eutrophication. */
export function riskCounts(results: RiskResult[]): RiskCounts {
  const counted = results.filter((r) => !r.excludedFromCounts);
  return {
    present: counted.filter((r) => r.status === "Present").length,
    watch: counted.filter((r) => r.status === "Watch").length,
    notPresent: counted.filter((r) => r.status === "Not present").length,
  };
}

/** The two highest pillars, used as the "drivers" column on the ranking table. */
export function topDrivers(p: Pillars, n = 2): PillarKey[] {
  return [...PILLAR_KEYS].sort((a, b) => p[b] - p[a] || PILLAR_KEYS.indexOf(a) - PILLAR_KEYS.indexOf(b)).slice(0, n);
}

/**
 * Chips for a factory card (PRODUCT 4.3): the highest-scoring Present risks that are specific to the site, up to
 * `max`, plus how many more Present risks there are. Country-level and composite risks are counted in "more"
 * but not shown as chips.
 */
export function headlineRisks(results: RiskResult[], max = 4): { chips: RiskResult[]; more: number } {
  const present = results.filter((r) => r.status === "Present" && !r.excludedFromCounts);
  const chips = present
    .filter((r) => !r.countryLevel && r.category !== "Composite")
    .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
    .slice(0, max);
  return { chips, more: present.length - chips.length };
}
