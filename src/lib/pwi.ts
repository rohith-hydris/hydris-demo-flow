import { cellStateOverrides } from "@/src/data/cells";
import { confidenceOf } from "./confidence";
import type { DeliveredRecord, FactoryRecord, Measure, RemovalRecord, WorkedExample } from "@/src/data/types";
import type { CellGrade, CellState, StatusBand, Dimension, EvidenceGrade, FactoryId, Pillar, TargetState } from "./types";

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
const GRADE_ORDER: readonly CellGrade[] = ["A", "B", "C", "D"];

/**
 * The grade after the mass-balance rule (src/lib/boundary.ts balanceGradePenalty): one letter worse for each penalty step, D stays D,
 * and a cell with no grade stays without one.
 */
export function gradeAfterBalance(grade: CellGrade, penalty: number): CellGrade {
  const at = GRADE_ORDER.indexOf(grade);
  return at < 0 ? grade : GRADE_ORDER[Math.min(GRADE_ORDER.length - 1, at + penalty)];
}

export const lowValue = (value: number, grade: CellGrade) => value * GRADE_FACTORS[grade];

/**
 * Evidence grade rule applied to a value (PRODUCT 6.5): A and B count the central value, C counts the low value
 * (central x 0.70), D and no grade count zero. This is the value that feeds pillars, site PWI and the status band.
 */
export function countedValue(central: number, grade: CellGrade): number {
  return grade === "A" || grade === "B" ? central : lowValue(central, grade);
}

export interface CellScoreResult {
  /** The computed cell score, or null when no score is computed (Missing, Not applicable). */
  score: number | null;
  /** What the cell contributes to its pillar: 0 for Missing; null when the cell is excluded from the pillar. */
  rollup: number | null;
  /** Excluded from the pillar, with the remaining dimension weights renormalised. */
  excluded: boolean;
  /** Shown with a flag. Anything other than an ordinary defined target is flagged. */
  flagged: boolean;
  /** Needs an evidence requirement (Demonstrated zero). */
  needsEvidence: boolean;
  /** Carries the "Proposed, under review" badge (Not applicable and Demonstrated zero; V2 4.1). */
  proposed: boolean;
  label: "Scored" | "Missing input" | "Not applicable" | "Zero demonstrated";
}

/**
 * V2 4.1, replacing PRODUCT 6.1. S = min(1, B / T) for a target above zero. A target of zero never scores 1.0 on its own:
 * - Missing (the default for T = 0): no score, rolls up as 0, flagged ("no baseline, no benefit").
 * - Not applicable: no score, excluded from the pillar, flagged.
 * - Demonstrated zero: 1.0 with an evidence requirement, flagged.
 * Roll-up treatments are a demo default; the decision is pending (V2 P08 C01).
 */
export function cellScore(delivered: number, target: number, targetState: TargetState = "Defined"): CellScoreResult {
  if (target > 0) {
    return { score: Math.min(1, delivered / target), rollup: Math.min(1, delivered / target), excluded: false, flagged: false, needsEvidence: false, proposed: false, label: "Scored" };
  }
  if (targetState === "Not applicable") {
    return { score: null, rollup: null, excluded: true, flagged: true, needsEvidence: false, proposed: true, label: "Not applicable" };
  }
  if (targetState === "Demonstrated zero") {
    return { score: 1, rollup: 1, excluded: false, flagged: true, needsEvidence: true, proposed: true, label: "Zero demonstrated" };
  }
  return { score: null, rollup: 0, excluded: false, flagged: true, needsEvidence: false, proposed: false, label: "Missing input" };
}

/** Score of a delivered measure against its target: min(1, B / T) per cell, per pollutant for mass, averaged. 0 for a missing measure. */
export function measureScore(target: Measure, delivered: Measure): number {
  if (target.kind === "volume" && delivered.kind === "volume") return cellScore(delivered.m3, target.m3).rollup ?? 0;
  if (target.kind === "people" && delivered.kind === "people") return cellScore(delivered.count, target.count).rollup ?? 0;
  if (target.kind === "mass" && delivered.kind === "mass") {
    const parts = (["tss", "tn", "tp"] as const).map((k) => cellScore(delivered[k], target[k]).rollup ?? 0);
    return parts.reduce((a, b) => a + b, 0) / 3;
  }
  return 0;
}

/** S(Q,1) = mean over TSS, TN and TP of min(1, removal / 0.90). Averaged by score so TSS cannot hide poor nitrogen removal. */
export function p1Quality(removalPct: { tss: number; tn: number; tp: number }): number {
  const parts = [removalPct.tss, removalPct.tn, removalPct.tp].map((r) => Math.min(1, r / 100 / REMOVAL_TARGET));
  return parts.reduce((a, b) => a + b, 0) / 3;
}

/** P = 0.40 A + 0.30 W + 0.30 Q. A null dimension (Not applicable) drops out and the other weights renormalise. */
export function pillarScore(availability: number | null, accessibility: number | null, quality: number | null): number {
  const parts: [number, number | null][] = [
    [DIMENSION_WEIGHTS.Availability, availability], [DIMENSION_WEIGHTS.Accessibility, accessibility], [DIMENSION_WEIGHTS.Quality, quality],
  ];
  const kept = parts.filter((p): p is [number, number] => p[1] !== null);
  const weight = kept.reduce((sum, [w]) => sum + w, 0);
  return weight === 0 ? 0 : kept.reduce((sum, [w, v]) => sum + w * v, 0) / weight;
}

/** Site PWI as a 0 to 1 value; display as a percentage. */
export const sitePwi = (p1: number, p2: number, p3: number) => (p1 + p2 + p3) / 3;

/**
 * PRODUCT 6.4: (B_A1 + B_A2 + B_A3) / RN, from delivered m3 and RN in m3. Deliberately uncapped: unlike a cell score, a
 * balance above 1 means more water was returned than consumed. 0 when RN is 0.
 */
export const volumetricBalance = (deliveredA1: number, deliveredA2: number, deliveredA3: number, rnM3: number) =>
  rnM3 > 0 ? (deliveredA1 + deliveredA2 + deliveredA3) / rnM3 : 0;

/** RN = a x (freshwater withdrawal - compliant same-basin discharge). */
export const replenishmentNeeded = (withdrawalM3: number, basinDischargeM3: number, share = 1) =>
  share * (withdrawalM3 - basinDischargeM3);

/** Checked in this order (PRODUCT 6.5). */
export function internalStatusBand(pwi: number, confidence: number): StatusBand {
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

/** Below this share of the pro-rated target a benefit is "behind target" (PRODUCT 6.9). */
export const BEHIND_TARGET_SHARE = 0.8;

export interface ProRatedBenefit {
  /** Delivered Availability m3 over the pro-rated target, RN x months / 12. The figure used for the off-track test. */
  availability: number;
  /** Delivered Quality kg over the pro-rated kg target, pooled over cells that have kg; null when no cell has kg. Informational. */
  quality: number | null;
  /** Each cell's share of its target: volume and kg pro-rated, people not pro-rated, score-only Quality cells use their score. */
  cells: { pillar: Pillar; dimension: Dimension; share: number }[];
}

/**
 * Benefit against the pro-rated target after `monthsElapsed` of 12 (PRODUCT 6.9). Availability volumes and Quality kg are
 * pro-rated the same way; people targets are not, because headcount served does not accrue over the year.
 * The Availability targets sum to RN, so the denominator is RN x months / 12.
 */
export function proRatedBenefitShare(site: FactoryPwi, monthsElapsed: number): ProRatedBenefit {
  const k = monthsElapsed / 12;
  let delivered = 0, target = 0, kgDelivered = 0, kgTarget = 0;
  const cells: ProRatedBenefit["cells"] = [];
  for (const c of site.cells) {
    const t = c.target, d = c.delivered;
    let share = c.score;
    if (c.dimension === "Availability" && t?.kind === "volume" && d?.kind === "volume") {
      delivered += d.m3; target += t.m3;
      share = t.m3 > 0 ? d.m3 / (t.m3 * k) : 1;
    } else if (c.dimension === "Accessibility" && t?.kind === "people" && d?.kind === "people") {
      share = t.count > 0 ? d.count / t.count : 1;
    } else if (c.dimension === "Quality" && t?.kind === "mass" && d?.kind === "mass") {
      const tk = t.tss + t.tn + t.tp, dk = d.tss + d.tn + d.tp;
      kgDelivered += dk; kgTarget += tk;
      share = tk > 0 ? dk / (tk * k) : 1;
    }
    cells.push({ pillar: c.pillar, dimension: c.dimension, share });
  }
  return {
    availability: target > 0 ? delivered / (target * k) : 1,
    quality: kgTarget > 0 ? kgDelivered / (kgTarget * k) : null,
    cells,
  };
}

export interface PwiCell {
  pillar: Pillar; dimension: Dimension;
  /** Central cell score S, 0 to 1. */
  score: number;
  /** Low value of the score after the evidence grade rule. */
  low: number;
  /** Counted score after the evidence grade rule: central for A and B, low for C, zero for D. Feeds the pillars. */
  counted: number;
  state: CellState; stateNote: string | null;
  /** V2 4.1: every cell carries a target state. Demo cells all have a defined target above zero. */
  targetState: TargetState;
  grade: CellGrade;
  target: Measure | null; delivered: Measure | null;
  /** Availability cells only: delivered m3, kept apart from the capped score so over-delivery survives. Null on other cells. */
  deliveredM3: number | null;
  breakdown: { label: string; value: number; unit: "m3" | "people" | "kg" }[];
  /** What is needed to reach 1.0, or null when the cell is full. */
  gap: string | null;
}

export interface FactoryPwi {
  factoryId: FactoryId;
  cells: PwiCell[]; // 9 cells, pillar-major
  /** Pillars from counted cell scores (the headline), and from central scores for comparison. */
  pillars: Record<Pillar, number>;
  pillarsCentral: Record<Pillar, number>;
  pillarsLow: Record<Pillar, number>;
  /** Headline site PWI from counted cell scores. sitePwiCentral is the same site before the evidence grade rule. */
  sitePwi: number; sitePwiCentral: number; sitePwiLow: number;
  /** From counted Availability scores; volumetricBalanceCentral is before the evidence grade rule. */
  volumetricBalance: number; volumetricBalanceCentral: number;
  /** Internal status band, from counted PWI. */
  confidence: number; statusBand: StatusBand;
  evidenceGrade: EvidenceGrade;
  /** 1 when the mass-balance error is above 10%, so every cell grade was lowered one letter. */
  gradePenalty: number;
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
  factory: FactoryRecord, delivered: DeliveredRecord | undefined, removal: RemovalRecord, worked: WorkedExample | null,
  /** 1 when the site's balance error is above 10% (balanceGradePenalty): every cell grade drops one letter. */
  gradePenalty: number = 0,
): FactoryPwi {
  const confidence = confidenceOf(factory.id).confidence; // PRD 4.8: computed from the self-assessment and cross-checks
  const targets = cellTargets(factory.replenishmentNeededM3, factory.headcount, factory.householdSize);
  const p1q = p1Quality(removal);
  const cells: PwiCell[] = [];

  for (const pillar of PILLARS) {
    for (const dimension of DIMENSIONS) {
      const w = worked?.cells.find((c) => c.pillar === pillar && c.dimension === dimension);
      if (!w && !delivered) throw new Error(`No delivered record or worked example for ${factory.id}`);

      let target: Measure | null = null;
      let got: Measure | null = null;
      if (w) {
        target = w.target; got = w.delivered;
      } else if (dimension === "Availability") {
        target = { kind: "volume", m3: targets.availability[pillar] };
        got = { kind: "volume", m3: delivered!.availabilityM3[pillar] };
      } else if (dimension === "Accessibility") {
        target = { kind: "people", count: targets.accessibility[pillar] };
        got = { kind: "people", count: delivered!.accessibilityPeople[pillar] };
      } else if (pillar === "P1") {
        target = { kind: "removal", tss: REMOVAL_TARGET * 100, tn: REMOVAL_TARGET * 100, tp: REMOVAL_TARGET * 100 };
        got = { kind: "removal", tss: removal.tss, tn: removal.tn, tp: removal.tp };
      }

      // Every cell score is computed: min(1, delivered / target); P1 Quality from removal; the entered score where no kg data exists.
      const score =
        dimension === "Quality" && pillar === "P1" ? p1q
        : target && got && target.kind !== "removal" ? measureScore(target, got)
        : delivered!.qualityScore[pillar as "P2" | "P3"];

      const derived = deriveState(factory.id, pillar, dimension, score);
      const state = w ? w.state : derived.state;
      const grade: CellGrade = gradeAfterBalance(w ? w.grade : score === 0 ? "none" : factory.evidenceGrade, gradePenalty);
      cells.push({
        pillar, dimension, score, low: lowValue(score, grade), counted: countedValue(score, grade), state, targetState: "Defined",
        stateNote: w ? (w.stateNote ?? null) : derived.note,
        grade, target, delivered: got, deliveredM3: dimension === "Availability" && got?.kind === "volume" ? got.m3 : null, breakdown: w?.breakdown ?? [],
        gap: gapText(pillar, dimension, state, score),
      });
    }
  }

  const get = (p: Pillar, d: Dimension, key: "score" | "low" | "counted") => cells.find((c) => c.pillar === p && c.dimension === d)![key];
  const pillarsBy = (key: "score" | "low" | "counted") =>
    Object.fromEntries(PILLARS.map((p) => [p, pillarScore(get(p, "Availability", key), get(p, "Accessibility", key), get(p, "Quality", key))])) as Record<Pillar, number>;
  // Uncapped: sums delivered m3 (not capped scores) over RN. Counted applies the evidence grade rule to each cell's delivered volume.
  const balanceOf = (counted: boolean) => {
    const m3 = (p: Pillar) => {
      const c = cells.find((x) => x.pillar === p && x.dimension === "Availability")!;
      return counted ? countedValue(c.deliveredM3 ?? 0, c.grade) : (c.deliveredM3 ?? 0);
    };
    return volumetricBalance(m3("P1"), m3("P2"), m3("P3"), factory.replenishmentNeededM3);
  };
  const pillars = pillarsBy("counted");
  const pillarsCentral = pillarsBy("score");
  const pillarsLow = pillarsBy("low");
  const pwi = sitePwi(pillars.P1, pillars.P2, pillars.P3);
  const pwiCentral = sitePwi(pillarsCentral.P1, pillarsCentral.P2, pillarsCentral.P3);

  let guide: FactoryPwi["guide"] = null;
  if (worked) {
    const gq = guideP1Quality(worked.baselineLoadsKg, removal);
    const p1 = pillarScore(get("P1", "Availability", "score"), get("P1", "Accessibility", "score"), gq);
    guide = { p1Quality: gq, p1, sitePwi: sitePwi(p1, pillarsCentral.P2, pillarsCentral.P3) };
  }

  return {
    factoryId: factory.id, cells, pillars, pillarsCentral, pillarsLow, sitePwi: pwi, sitePwiCentral: pwiCentral,
    sitePwiLow: sitePwi(pillarsLow.P1, pillarsLow.P2, pillarsLow.P3),
    volumetricBalance: balanceOf(true), volumetricBalanceCentral: balanceOf(false),
    confidence, statusBand: internalStatusBand(pwi, confidence),
    evidenceGrade: factory.evidenceGrade, gradePenalty, guide,
  };
}
