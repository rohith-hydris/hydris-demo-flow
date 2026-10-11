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
