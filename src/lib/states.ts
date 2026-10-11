import type { CheckOutcome, ProjectStatus, ReviewStates } from "./types";

// V2 Section 2. Pure rules for the five review states. Types only, so data files can use them without a cycle.

/** True when a benefit counts toward PWI today: validated benefit on an eligible claim. Evidence acceptance alone never does. */
export const countsTowardPwi = (s: ReviewStates) => s.benefitState === "Validated" && s.claimEligibility === "Eligible";

/** The old single badge, computed from the five fields (V2 Section 2 "summary"). */
export function summaryStatus(s: ReviewStates): ProjectStatus {
  if (s.claimEligibility === "Not eligible") return "Not counted";
  if (s.claimEligibility === "Allocation conflict" || s.evidenceAcceptance === "Rejected") return "Flagged";
  if (countsTowardPwi(s)) return "Validated";
  return "Pending validation";
}

/**
 * A passed evidence check never validates an impact claim (V2 14). This only ever moves evidenceAcceptance;
 * benefitState is returned unchanged.
 */
export function acceptEvidence(s: ReviewStates, warning = false): ReviewStates {
  return { ...s, evidenceAcceptance: warning ? "Accepted with warning" : "Accepted" };
}

/** A Forecast can only be shown as Forecast; Measured and Validated need delivery evidence. */
export const displayBenefitState = (s: ReviewStates) => s.benefitState;
export const isForecastOnly = (s: ReviewStates) => s.benefitState === "Forecast";

/** V2 5.1: geography alone never makes a project eligible. */
export interface EligibilityChecks { insidePolygon: CheckOutcome; hydrologicallyConnected: CheckOutcome; collectiveAction: CheckOutcome }
export const geographyOnly = (c: EligibilityChecks) =>
  c.insidePolygon === "Pass" && c.hydrologicallyConnected === "Pass" && c.collectiveAction !== "Pass";
export const eligibilityPasses = (c: EligibilityChecks) =>
  c.insidePolygon === "Pass" && c.hydrologicallyConnected === "Pass" && c.collectiveAction === "Pass";

// ---- Display rules for the five-pill strip and the validation verdicts (V2 2 and 14) -----------------------------------

export const STATE_FIELDS: { key: keyof ReviewStates; label: string; name: string; meaning: string }[] = [
  { key: "evidenceAcceptance", label: "Evidence", name: "Evidence acceptance", meaning: "Whether the documents and photos were accepted. It never validates an impact claim on its own." },
  { key: "calculationValidity", label: "Calculation", name: "Calculation validity", meaning: "Whether the benefit calculation is current, or needs recalculating after a changed input." },
  { key: "benefitState", label: "Benefit", name: "Benefit state", meaning: "Forecast, Measured or Validated. A Forecast never shows as Measured or Validated." },
  { key: "claimEligibility", label: "Eligibility", name: "Claim eligibility", meaning: "Whether this claim may count: Eligible, Under review, Not eligible or an Allocation conflict." },
  { key: "reportRelease", label: "Report", name: "Report release", meaning: "Whether a report includes it. A Released report keeps its snapshot." },
];

/**
 * Documents, audit reports and inspections have no benefit to calculate, so only evidence acceptance applies to them.
 * This mapping is a demo rule: V2 Section 2 migrates projects only. Every other field is shown as not applicable.
 */
export const DOCUMENT_ACCEPTANCE = {
  Ready: "Accepted", "Low confidence": "Accepted with warning", "Failed check": "Rejected", "Expired / out of period": "Rejected", Missing: "Pending",
} as const;
export const reportStates = (readiness: keyof typeof DOCUMENT_ACCEPTANCE): Partial<ReviewStates> => ({ evidenceAcceptance: DOCUMENT_ACCEPTANCE[readiness] });
export const inspectionStates = (status: "Needs review" | "Validated"): Partial<ReviewStates> => ({ evidenceAcceptance: status === "Validated" ? "Accepted" : "Pending" });

/** V2 14: closes every validation verdict. */
export const VERDICT_CLOSING = "This checks the evidence. It does not by itself prove environmental impact.";

export interface StateEffect {
  key: keyof ReviewStates; name: string;
  /** "set": this verdict sets the field. "unchanged": it leaves the field alone. */
  outcome: "set" | "unchanged";
  /** The value set, or (for an unchanged project field) the value it keeps. Null when there is no record to read it from. */
  value: string | null;
}

/** Which of the five states a verdict changes. Fields it does not name are unchanged, and show their current value when known. */
export function stateEffects(sets: Partial<ReviewStates>, current: ReviewStates | null): StateEffect[] {
  return STATE_FIELDS.map((f) => {
    const set = sets[f.key];
    return set ? { key: f.key, name: f.name, outcome: "set", value: set } : { key: f.key, name: f.name, outcome: "unchanged", value: current ? current[f.key] : null };
  });
}
