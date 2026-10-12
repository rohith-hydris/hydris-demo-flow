import { riskCatalogue, rawRiskValues } from "@/src/data/risks";
import type { RiskScoreRecord, RiskScores } from "@/src/data/types";
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
/** Module 01 special rules (PRD 5.1, 5.2). All optional; a site without them is scored as before. */
export interface RiskFlags {
  arid?: boolean; gtdTrend?: "Insignificant Trend" | "Trend"; cfrNoRisk?: boolean; bwsPercent?: number | null;
}
export interface PillarResult {
  pillars: Pillars; missingPillars: PillarKey[]; coverage: RiskCoverage;
  /** Pillars set by a special rule rather than read from an indicator: groundwater on an Insignificant Trend, scarcity on an arid area. */
  flagged: PillarKey[];
}

const SCARCITY_CODES: readonly RiskCode[] = PILLAR_INDICATORS.scarcity;

/**
 * V2 4.2 missing-data policy. A missing indicator drops out of its pillar and the pillar takes the max of the rest.
 * A pillar with no indicator left drops out (value 0 here, listed in missingPillars) and the weights renormalise.
 * Coverage is indicators available over indicators required.
 */
export function riskPillarsPolicy(s: RiskScores, gaps: RiskGaps = {}, flags: RiskFlags = {}): PillarResult {
  let available = 0;
  const missingPillars: PillarKey[] = [];
  const flagged: PillarKey[] = [];
  const pillars = Object.fromEntries(PILLAR_KEYS.map((k) => {
    const usable = PILLAR_INDICATORS[k].filter((c) => !gaps[c]);
    available += usable.length;
    // Special rules (PRD 5.1): an arid area is the maximum scarcity; an Insignificant Trend means no groundwater decline to score.
    if (k === "scarcity" && flags.arid) { flagged.push(k); return [k, 1]; }
    if (k === "groundwater" && flags.gtdTrend === "Insignificant Trend") { flagged.push(k); return [k, 0]; }
    if (usable.length === 0) { missingPillars.push(k); return [k, 0]; }
    return [k, Math.max(...usable.map((c) => s[c])) / 5];
  })) as Pillars;
  return { pillars, missingPillars, flagged, coverage: { available, required: REQUIRED_INDICATORS, share: available / REQUIRED_INDICATORS } };
}

/** Each pillar is the worst of its available indicators on the 0 to 5 scale, divided by 5. */
export const riskPillars = (s: RiskScores, gaps: RiskGaps = {}, flags: RiskFlags = {}): Pillars => riskPillarsPolicy(s, gaps, flags).pillars;

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

/** Raw baseline water stress at or above this percent is water-stressed (CDP, GRI 303, BRSR). */
export const WATER_STRESSED_PERCENT = 40;
export const WATER_STRESSED_LABEL = "Water-stressed for BRSR, CDP, GRI 303";
export const waterStressed = (bwsPercent: number | null | undefined) => bwsPercent != null && bwsPercent >= WATER_STRESSED_PERCENT;

/** Snapping range in km (PRD 5.2): a site within it of an Aqueduct area takes that area's scores and is flagged. */
export const SNAP_MAX_KM = 5;
export const isSnapped = (km: number | null | undefined) => km != null && km > 0 && km <= SNAP_MAX_KM;
export const snappedNote = (km: number) => `Snapped to the nearest area, ${km} km away`;

/** Everything a record's special rules add, in one place: the flags the pillar and status rules read, and what the pages show. */
export interface SiteRiskFlags extends RiskFlags {
  /** Distance to the snapped-to area in km, when 0 to 5 km away; otherwise null. */
  snappedKm: number | null;
  /** No Aqueduct area was found, so no indicator has a score. */
  noAreaData: boolean;
  /** Pillars set by a rule instead of an indicator. */
  flaggedPillars: PillarKey[];
  waterStressed: boolean;
}

/** Indicators that come from an Aqueduct area. The country-level ucw and rri do not. */
const AREA_CODES: readonly RiskCode[] = riskCatalogue.filter((c) => !c.countryLevel).map((c) => c.code);

/** Gaps for a record: its own, plus "No data" on every area indicator when no area was found (snapDistanceKm is null). */
export function recordGaps(rec: Pick<RiskScoreRecord, "gaps" | "snapDistanceKm">): RiskGaps {
  const noArea = rec.snapDistanceKm === null;
  return { ...(noArea ? Object.fromEntries(AREA_CODES.map((c) => [c, "No data" as RiskGap])) : {}), ...(rec.gaps ?? {}) };
}

export function siteRiskFlags(rec: RiskScoreRecord): SiteRiskFlags {
  const flags: RiskFlags = { arid: rec.arid, gtdTrend: rec.gtdTrend, cfrNoRisk: rec.cfrNoRisk, bwsPercent: rec.bwsPercent };
  return {
    ...flags,
    snappedKm: isSnapped(rec.snapDistanceKm) ? (rec.snapDistanceKm as number) : null,
    noAreaData: rec.snapDistanceKm === null,
    flaggedPillars: riskPillarsPolicy(rec.scores, recordGaps(rec), flags).flagged,
    waterStressed: waterStressed(rec.bwsPercent),
  };
}

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
  /** Aqueduct 4.0 scores for 2030 and 2050: only water stress, depletion and the two variability indicators have them. */
  outlook: { y2030: number; y2050: number } | null;
  /** A special rule decided this status: "Arid area", "Insignificant Trend" or "No Risk". */
  rule: "Arid area" | "Insignificant Trend" | "No Risk" | null;
}

/** How many risks there are, and how many are counted (coastal eutrophication is shown separately). */
export const RISK_TOTAL = riskCatalogue.length;
export const RISK_COUNTED = riskCatalogue.filter((c) => c.code !== "cep").length;

const OUTLOOK_CODES = ["bws", "bwd", "iav", "sev"] as const;
type OutlookCode = (typeof OUTLOOK_CODES)[number];
const outlookOf = (code: RiskCode, s: RiskScores): RiskResult["outlook"] =>
  (OUTLOOK_CODES as readonly RiskCode[]).includes(code)
    ? { y2030: s[`${code as OutlookCode}30`], y2050: s[`${code as OutlookCode}50`] }
    : null;

/** Status after the special rules: arid scarcity risks are Present; an Insignificant Trend and a "No Risk" coast are Not present. */
function ruleOf(code: RiskCode, flags: RiskFlags): RiskResult["rule"] {
  if (flags.arid && SCARCITY_CODES.includes(code)) return "Arid area";
  if (code === "gtd" && flags.gtdTrend === "Insignificant Trend") return "Insignificant Trend";
  if (code === "cfr" && flags.cfrNoRisk) return "No Risk";
  return null;
}
const RULE_STATUS = { "Arid area": "Present", "Insignificant Trend": "Not present", "No Risk": "Not present" } as const;

export function evaluateRisks(factoryId: FactoryId, s: RiskScores, gaps: RiskGaps = {}, flags: RiskFlags = {}): RiskResult[] {
  return riskCatalogue.map((c) => {
    const score = s[c.code];
    const rule = gaps[c.code] ? null : ruleOf(c.code, flags);
    return {
      code: c.code, name: c.name, shortName: c.shortName, category: c.category, rule, outlook: outlookOf(c.code, s),
      score, scorePct: (score / 5) * 100, gap: gaps[c.code] ?? null, status: gaps[c.code] ?? (rule ? RULE_STATUS[rule] : riskStatus(c.code, score)),
      countryLevel: c.countryLevel, excludedFromCounts: c.code === "cep",
      compositeLabel: c.code === "tex" ? textileLabel(score) : null,
      rawValue: c.code === "bws" && flags.bwsPercent != null ? `${flags.bwsPercent}%` : (rawRiskValues[factoryId]?.[c.code] ?? null),
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
