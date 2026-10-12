import type { EvidenceGrade } from "./types";

// V2 4.3 and 4.4: wording for the internal status band, the uncertainty range and the Guide comparison.

export const STATUS_BAND_LABEL = "Internal status band";
export const INTERNAL_STATUS_NOTE = "Internal status. Not an external certification.";
/** Which band values need which wording is in the trace drawer; Self-certified stays an internal value (V2 4.3). */
export const SELF_CERTIFIED_NOTE = "Self-certified is internal. Net Positive claims need external assurance.";

/** V2 4.4: the 20 source issues are proposed corrections, and reconciliation is pending. */
export const SOURCE_ISSUE_COUNT = 20;
export const GUIDE_CAPTION = `Shows the effect of the proposed PWI-M 1.0 corrections. Reconciliation of the ${SOURCE_ISSUE_COUNT} source issues is pending.`;

// V2 4.3: evidence grade (A to D) and numerical uncertainty are separate fields. The old plus or minus 5, 15, 30 and 50
// percent by grade is kept only as a placeholder.
export const UNCERTAINTY_BY_GRADE: Record<EvidenceGrade, number> = { A: 0.05, B: 0.15, C: 0.3, D: 0.5 };
export const UNCERTAINTY_STATUS = "Demo assumption, not yet justified";
export const CORRELATION_NOTE = "Correlation assumptions: not yet defined";

/** Uncertainty range around a 0 to 1 value: central x (1 minus u) up to central x (1 plus u), capped at 1. */
export function uncertaintyRange(value: number, grade: EvidenceGrade): { low: number; high: number; fraction: number } {
  const u = UNCERTAINTY_BY_GRADE[grade];
  return { low: value * (1 - u), high: Math.min(1, value * (1 + u)), fraction: u };
}

// V2 4.2 and 6: Ranking columns.
export const FOOTPRINT_TOOLTIP = "Footprint measures pressure on the basin. Delivering benefit never changes it.";
export const COVERAGE_READINESS_NOTE =
  "Coverage is the share of risk indicators with a reading. Readiness is the share of documents that are Ready. Both are for information and for sequencing delivery. They never filter, sort or lower a site's rank, and Band 1 sites always stay visible.";
