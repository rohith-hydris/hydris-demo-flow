import { cellStateOverrides } from "@/src/data/cells";
import type { CellScoreRecord, FactoryRecord, Measure, RemovalRecord, WorkedExample } from "@/src/data/types";
import type { CellGrade, CellState, CertBand, Dimension, EvidenceGrade, FactoryId, Pillar } from "./types";

// PRODUCT 6.1 to 6.7 and 5.9: the PWI Engine and Impact Module (Module 03). Pure functions, full precision.

export const PILLARS: readonly Pillar[] = ["P1", "P2", "P3"];
export const DIMENSIONS: readonly Dimension[] = ["Availability", "Accessibility", "Quality"];
export const PILLAR_NAMES: Record<Pillar, string> = { P1: "Site", P2: "Sub-basin", P3: "Basin" };

/** P_k = 0.40 S(k,A) + 0.30 S(k,W) + 0.30 S(k,Q). */
export const DIMENSION_WEIGHTS: Record<Dimension, number> = { Availability: 0.4, Accessibility: 0.3, Quality: 0.3 };

/** P1 Quality target: 90% removal for each pollutant. */
export const REMOVAL_TARGET = 0.9;

/**
 * Evidence grade rule (PRODUCT 6.5): A and B count the central value, C counts a lower bound, D scores zero.
 * The factors turn a central value into the low value. Only B (0.85, from validation script V2) and C (0.70,
 * from PRJ-401's 8,400 of 12,000) are implied by the spec; A and D are our illustrative constants. Configurable.
 */
export const GRADE_FACTORS: Record<CellGrade, number> = { A: 0.95, B: 0.85, C: 0.7, D: 0, none: 0 };
export const lowValue = (value: number, grade: CellGrade) => value * GRADE_FACTORS[grade];

/** S = min(1, B / T). A zero target scores 1 and is flagged "target is zero". */
export function cellScore(delivered: number, target: number): { score: number; targetIsZero: boolean } {
  if (target === 0) return { score: 1, targetIsZero: true };
  return { score: Math.min(1, delivered / target), targetIsZero: false };
}

/** S(Q,1) = mean over TSS, TN and TP of min(1, removal / 0.90). Averaged by score so TSS cannot hide poor nitrogen removal. */
export function p1Quality(removalPct: { tss: number; tn: number; tp: number }): number {
  const parts = [removalPct.tss, removalPct.tn, removalPct.tp].map((r) => Math.min(1, r / 100 / REMOVAL_TARGET));
  return parts.reduce((a, b) => a + b, 0) / 3;
}

export const pillarScore = (availability: number, accessibility: number, quality: number) =>
  DIMENSION_WEIGHTS.Availability * availability + DIMENSION_WEIGHTS.Accessibility * accessibility + DIMENSION_WEIGHTS.Quality * quality;

/** Site PWI as a 0 to 1 value; display as a percentage. */
export const sitePwi = (p1: number, p2: number, p3: number) => (p1 + p2 + p3) / 3;

/** (B_A1 + B_A2 + B_A3) / RN, equal to 0.2 S_A1 + 0.4 S_A2 + 0.4 S_A3. Over 1 means more returned than consumed. */
export const volumetricBalance = (sA1: number, sA2: number, sA3: number) => 0.2 * sA1 + 0.4 * sA2 + 0.4 * sA3;

/** RN = a x (freshwater withdrawal - compliant same-basin discharge). */
export const replenishmentNeeded = (withdrawalM3: number, basinDischargeM3: number, share = 1) =>
  share * (withdrawalM3 - basinDischargeM3);

/** Checked in this order (PRODUCT 6.5). */
export function certificationBand(pwi: number, confidence: number): CertBand {
  if (confidence < 0.5) return "Low confidence";
  if (pwi >= 1.0 && confidence >= 0.75) return "Self-certified";
  if (pwi >= 0.8 && confidence >= 0.75) return "Conditional";
  if (pwi >= 0.6 && confidence >= 0.5) return "In progress";
  return "Not achieved";
}

/** PRODUCT 5.9 targets: T_A1 = 0.20 RN; T_A2 = T_A3 = 0.40 RN; T_W1 = E; T_W2 = T_W3 = E (h - 1) / 2. */
export function cellTargets(rn: number, headcount: number, householdSize: number) {
  const offSitePeople = (headcount * (householdSize - 1)) / 2;
  return {
    availability: { P1: 0.2 * rn, P2: 0.4 * rn, P3: 0.4 * rn } as Record<Pillar, number>,
    accessibility: { P1: headcount, P2: offSitePeople, P3: offSitePeople } as Record<Pillar, number>,
  };
}

/** PRODUCT 6.6: the Guide's mass-sum rule scores P1 Quality as 1.0 when total removed mass reaches 90% of total load. */
export function guideP1Quality(loadsKg: { tss: number; tn: number; tp: number }, removalPct: { tss: number; tn: number; tp: number }): number {
  const total = loadsKg.tss + loadsKg.tn + loadsKg.tp;
  const removed = (loadsKg.tss * removalPct.tss + loadsKg.tn * removalPct.tn + loadsKg.tp * removalPct.tp) / 100;
  return Math.min(1, removed / total / REMOVAL_TARGET);
}

// Gap text: plain words naming the fact or document that is needed (PRODUCT 5.9, DESIGN 4.6). No numbers except the target.
const GAP_TEXT: Record<Pillar, Record<Dimension, string>> = {
  P1: {
    Availability: "Add on-site recycling, reclaim or recharge volumes, backed by the water meter log",
    Accessibility: "Update the headcount roster, including contract workers",
    Quality: `Raise removal of each of TSS, TN and TP toward ${REMOVAL_TARGET * 100}% at the ETP`,
  },
  P2: {
    Availability: "Register a sub-basin Availability project with a baseline and monitoring log",
    Accessibility: "Upload the quarterly WASH audit for the sub-basin project",
    Quality: "Register a sub-basin Quality project with inlet and outlet lab data",
  },
  P3: {
    Availability: "Register a basin Availability project with a baseline and monitoring log",
    Accessibility: "Upload the quarterly WASH audit for the basin project",
    Quality: "Register a basin Quality project with a baseline and lab data",
  },
};

export function gapText(pillar: Pillar, dimension: Dimension, state: CellState, score: number): string | null {
  if (score >= 1) return null;
  if (state === "Low confidence") return "Renew the overdue monitoring check and upload the log";
  if (state === "Partially scored") return "Resolve the gated or flagged project so its benefit can count";
  return GAP_TEXT[pillar][dimension];
}

export interface PwiCell {
  pillar: Pillar; dimension: Dimension;
  /** Central cell score S, 0 to 1. */
  score: number;
  /** Low value of the score after the evidence grade rule. */
  low: number;
  state: CellState; stateNote: string | null;
  grade: CellGrade;
  target: Measure | null; delivered: Measure | null;
  breakdown: { label: string; value: number; unit: "m3" | "people" | "kg" }[];
  /** What is needed to reach 1.0, or null when the cell is full. */
  gap: string | null;
}

export interface FactoryPwi {
  factoryId: FactoryId;
  cells: PwiCell[]; // 9 cells, pillar-major
  pillars: Record<Pillar, number>;
  pillarsLow: Record<Pillar, number>;
  sitePwi: number; sitePwiLow: number;
  volumetricBalance: number;
  confidence: number; certBand: CertBand;
  evidenceGrade: EvidenceGrade;
  /** Only the F12 worked example carries the Guide-compatible comparison (PRODUCT 6.6). */
  guide: { p1Quality: number; p1: number; sitePwi: number } | null;
}

function deriveState(factoryId: FactoryId, pillar: Pillar, dimension: Dimension, score: number): { state: CellState; note: string | null } {
  // A cell with a score of 0 is always "Missing input", even where a site-wide override applies.
  if (score === 0) return { state: "Missing input", note: null };
  const o = cellStateOverrides.find(
    (x) => x.factoryId === factoryId && (x.pillar === "all" || x.pillar === pillar) && (x.dimension === "all" || x.dimension === dimension),
  );
  return o ? { state: o.state, note: o.reason } : { state: "Scored", note: null };
}

export function buildFactoryPwi(
  factory: FactoryRecord, scores: CellScoreRecord, removal: RemovalRecord, worked: WorkedExample | null,
): FactoryPwi {
  const targets = cellTargets(factory.replenishmentNeededM3, factory.headcount, factory.householdSize);
  const p1q = p1Quality(removal);
  const cells: PwiCell[] = [];

  for (const pillar of PILLARS) {
    for (const dimension of DIMENSIONS) {
      const score =
        dimension === "Quality"
          ? (pillar === "P1" ? p1q : scores.quality[pillar])
          : scores[dimension === "Availability" ? "availability" : "accessibility"][pillar];
      const w = worked?.cells.find((c) => c.pillar === pillar && c.dimension === dimension);

      let target: Measure | null = null;
      let delivered: Measure | null = null;
      if (w) {
        target = w.target; delivered = w.delivered;
      } else if (dimension === "Availability") {
        target = { kind: "volume", m3: targets.availability[pillar] };
        delivered = { kind: "volume", m3: score * targets.availability[pillar] };
      } else if (dimension === "Accessibility") {
        target = { kind: "people", count: targets.accessibility[pillar] };
        delivered = { kind: "people", count: score * targets.accessibility[pillar] };
      } else if (pillar === "P1") {
        target = { kind: "removal", tss: REMOVAL_TARGET * 100, tn: REMOVAL_TARGET * 100, tp: REMOVAL_TARGET * 100 };
        delivered = { kind: "removal", tss: removal.tss, tn: removal.tn, tp: removal.tp };
      }

      const derived = deriveState(factory.id, pillar, dimension, score);
      const state = w ? w.state : derived.state;
      const grade: CellGrade = w ? w.grade : score === 0 ? "none" : factory.evidenceGrade;
      cells.push({
        pillar, dimension, score, low: lowValue(score, grade), state,
        stateNote: w ? (w.stateNote ?? null) : derived.note,
        grade, target, delivered, breakdown: w?.breakdown ?? [],
        gap: gapText(pillar, dimension, state, score),
      });
    }
  }

  const get = (p: Pillar, d: Dimension, key: "score" | "low") => cells.find((c) => c.pillar === p && c.dimension === d)![key];
  const pillarsBy = (key: "score" | "low") =>
    Object.fromEntries(PILLARS.map((p) => [p, pillarScore(get(p, "Availability", key), get(p, "Accessibility", key), get(p, "Quality", key))])) as Record<Pillar, number>;
  const pillars = pillarsBy("score");
  const pillarsLow = pillarsBy("low");
  const pwi = sitePwi(pillars.P1, pillars.P2, pillars.P3);

  let guide: FactoryPwi["guide"] = null;
  if (worked) {
    const gq = guideP1Quality(worked.baselineLoadsKg, removal);
    const p1 = pillarScore(get("P1", "Availability", "score"), get("P1", "Accessibility", "score"), gq);
    guide = { p1Quality: gq, p1, sitePwi: sitePwi(p1, pillars.P2, pillars.P3) };
  }

  return {
    factoryId: factory.id, cells, pillars, pillarsLow, sitePwi: pwi,
    sitePwiLow: sitePwi(pillarsLow.P1, pillarsLow.P2, pillarsLow.P3),
    volumetricBalance: volumetricBalance(get("P1", "Availability", "score"), get("P2", "Availability", "score"), get("P3", "Availability", "score")),
    confidence: factory.confidence, certBand: certificationBand(pwi, factory.confidence),
    evidenceGrade: factory.evidenceGrade, guide,
  };
}
