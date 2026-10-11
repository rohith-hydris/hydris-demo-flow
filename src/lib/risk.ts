import { riskCatalogue, rawRiskValues } from "@/src/data/risks";
import type { RiskScores } from "@/src/data/types";
import type { FactoryId, PillarKey, RiskCategory, RiskCode, RiskGap, RiskStatus } from "./types";

// PRODUCT 5.6: Basin Risk (Module 01). ucw, rri, cep and tex are never used in R.

export type Pillars = Record<PillarKey, number>;
export type Weights = Record<PillarKey, number>;

export const PILLAR_KEYS: readonly PillarKey[] = ["scarcity", "groundwater", "drought", "flood", "community"];

export const PILLAR_LABELS: Record<PillarKey, string> = {
  scarcity: "Scarcity", groundwater: "Groundwater", drought: "Drought", flood: "Flood", community: "Community",
};

export const DEFAULT_WEIGHTS: Weights = { scarcity: 0.3, groundwater: 0.2, drought: 0.2, flood: 0.15, community: 0.15 };

/** The indicators behind each pillar (PRODUCT 5.6). ucw, rri, cep and tex are never part of R. */
export const PILLAR_INDICATORS: Record<PillarKey, readonly RiskCode[]> = {
  scarcity: ["bws", "bwd", "iav", "sev"], groundwater: ["gtd"], drought: ["drr"], flood: ["rfr", "cfr"], community: ["udw", "usa"],
};
export const REQUIRED_INDICATORS = PILLAR_KEYS.reduce((n, k) => n + PILLAR_INDICATORS[k].length, 0);

export type RiskGaps = Partial<Record<RiskCode, RiskGap>>;

export interface RiskCoverage { available: number; required: number; share: number }
export interface PillarResult { pillars: Pillars; missingPillars: PillarKey[]; coverage: RiskCoverage }

/**
 * V2 4.2 missing-data policy. A missing indicator drops out of its pillar and the pillar takes the max of the rest.
 * A pillar with no indicator left drops out (value 0 here, listed in missingPillars) and the weights renormalise.
 * Coverage is indicators available over indicators required.
 */
export function riskPillarsPolicy(s: RiskScores, gaps: RiskGaps = {}): PillarResult {
  let available = 0;
  const missingPillars: PillarKey[] = [];
  const pillars = Object.fromEntries(PILLAR_KEYS.map((k) => {
    const usable = PILLAR_INDICATORS[k].filter((c) => !gaps[c]);
    available += usable.length;
    if (usable.length === 0) { missingPillars.push(k); return [k, 0]; }
    return [k, Math.max(...usable.map((c) => s[c])) / 5];
  })) as Pillars;
  return { pillars, missingPillars, coverage: { available, required: REQUIRED_INDICATORS, share: available / REQUIRED_INDICATORS } };
}

/** Each pillar is the worst of its available indicators on the 0 to 5 scale, divided by 5. */
export const riskPillars = (s: RiskScores, gaps: RiskGaps = {}): Pillars => riskPillarsPolicy(s, gaps).pillars;

/** Scale weights to sum to 1 (the live weights panel renormalises to 100%). */
export function normaliseWeights(w: Weights): Weights {
  const total = PILLAR_KEYS.reduce((sum, k) => sum + w[k], 0);
  if (total <= 0) return { ...DEFAULT_WEIGHTS };
  return Object.fromEntries(PILLAR_KEYS.map((k) => [k, w[k] / total])) as Weights;
}

/** R = sum of weight x pillar. Missing pillars drop out and the remaining weights renormalise (V2 4.2). */
export function riskR(p: Pillars, w: Weights = DEFAULT_WEIGHTS, missing: readonly PillarKey[] = []): number {
  if (missing.length === 0) return PILLAR_KEYS.reduce((sum, k) => sum + w[k] * p[k], 0);
  const kept = Object.fromEntries(PILLAR_KEYS.map((k) => [k, missing.includes(k) ? 0 : w[k]])) as Weights;
  if (PILLAR_KEYS.every((k) => kept[k] === 0)) return 0;
  const n = normaliseWeights(kept);
  return PILLAR_KEYS.reduce((sum, k) => sum + n[k] * p[k], 0);
}

/**
 * The effect of renormalisation: R under the policy minus R if each missing pillar were scored at the mean of the
 * available pillars. It can be positive or negative; it is never claimed to be neutral.
 */
export function renormalisationDelta(p: Pillars, w: Weights = DEFAULT_WEIGHTS, missing: readonly PillarKey[] = []): number {
  if (missing.length === 0) return 0;
  const present = PILLAR_KEYS.filter((k) => !missing.includes(k));
  if (present.length === 0) return 0;
  const mean = present.reduce((sum, k) => sum + p[k], 0) / present.length;
  const imputed = Object.fromEntries(PILLAR_KEYS.map((k) => [k, missing.includes(k) ? mean : p[k]])) as Pillars;
  return riskR(p, w, missing) - riskR(imputed, w);
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
  /** V2 4.2: No data or Error. Such a card shows no score and is left out of R and the counts. */
  gap: RiskGap | null;
  countryLevel: boolean;
  /** Shown separately and left out of the Present and Watch counts (coastal eutrophication). */
  excludedFromCounts: boolean;
  compositeLabel: string | null;
  rawValue: string | null;
}

/** How many risks there are, and how many are counted (coastal eutrophication is shown separately). */
export const RISK_TOTAL = riskCatalogue.length;
export const RISK_COUNTED = riskCatalogue.filter((c) => c.code !== "cep").length;

export function evaluateRisks(factoryId: FactoryId, s: RiskScores, gaps: RiskGaps = {}): RiskResult[] {
  return riskCatalogue.map((c) => {
    const score = s[c.code];
    return {
      code: c.code, name: c.name, shortName: c.shortName, category: c.category,
      score, scorePct: (score / 5) * 100, gap: gaps[c.code] ?? null, status: gaps[c.code] ?? riskStatus(c.code, score),
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
