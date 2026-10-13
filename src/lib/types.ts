// Shared vocabularies from PRODUCT.md. Labels match the spec exactly (OQ-X2: demo uses the Section 5 labels).

export type SupplierId = string; // "SUP1".."SUP5"
export type FactoryId = string; // "F01".."F14"

export type Band = 1 | 2 | 3;
export type Tier = 1 | 2 | 3;
export type Quadrant = "Act now" | "Build resilience" | "Reduce footprint" | "Monitor" | "Impact pending";

export type RiskStatus = "Present" | "Watch" | "Not present" | "No data" | "Error";
export type RiskCode =
  | "bws" | "bwd" | "iav" | "sev" | "gtd" | "drr" | "rfr" | "cfr" | "udw" | "usa" | "ucw" | "rri" | "cep" | "tex";
export type RiskCategory = "Physical quantity" | "Physical quality" | "Downstream" | "Regulatory and reputational" | "Composite";
export type PillarKey = "scarcity" | "groundwater" | "drought" | "flood" | "community";

export type Pillar = "P1" | "P2" | "P3";
export type Dimension = "Availability" | "Accessibility" | "Quality";
export type EvidenceGrade = "A" | "B" | "C" | "D";
export type CellGrade = EvidenceGrade | "none";
export type CellState = "Scored" | "Partially scored" | "Missing input" | "Blocked" | "Not additional" | "Low confidence";
export type StatusBand = "Low confidence" | "Self-certified" | "Conditional" | "In progress" | "Not achieved";

export type Health = "Healthy" | "Watch" | "Critical";
export type ZdhcTier = "Aspirational" | "Progressive" | "Foundational" | "Not conformant";
export type TierDirection = "upgrade" | "downgrade";
export type Severity = "Critical" | "High" | "Medium" | "Info";
export type Period = "Draft" | "Submitted" | "Verified" | "Locked";
export type LedgerStatus = "Validated" | "Audited";

export type ProjectStatus = "Validated" | "Pending validation" | "Flagged" | "Not counted";
export type ReadinessState = "Ready" | "Missing" | "Failed check" | "Expired / out of period" | "Low confidence";
/** Derived in src/lib/claims.ts inspectionStatus from the steps and the review log. "Rejected steps": a retake was requested. */
export type InspectionStatus = "Needs review" | "Validated" | "Rejected steps";
export type CheckResult = "Pass" | "Warn" | "Fail";

// ---- V2 addendum vocabularies -----------------------------------------------------------------------------------------
/** V2 Section 2: five independent review states. The old single status is a summary computed from these. */
export type EvidenceAcceptance = "Pending" | "Accepted" | "Accepted with warning" | "Rejected";
export type CalculationValidity = "Valid" | "Needs recalculation" | "Blocked";
export type BenefitState = "Forecast" | "Measured" | "Validated" | "Not validated";
export type ClaimEligibility = "Eligible" | "Under review" | "Not eligible" | "Allocation conflict";
export type ReportRelease = "Not included" | "Draft" | "Released (snapshot)";
export interface ReviewStates {
  evidenceAcceptance: EvidenceAcceptance; calculationValidity: CalculationValidity;
  benefitState: BenefitState; claimEligibility: ClaimEligibility; reportRelease: ReportRelease;
}

/** V2 4.1. "Defined" is an ordinary target above zero; the other three describe a target of zero. */
export type TargetState = "Defined" | "Missing" | "Not applicable" | "Demonstrated zero";
/** V2 4.2: a risk indicator with no usable reading. */
export type RiskGap = "No data" | "Error";

export type CheckOutcome = "Pass" | "Fail" | "Unknown";
export type ParticipantRole = "Host" | "Implementing partner" | "Contributor";

/** Why a funder did not match an opportunity (src/lib/funders.ts). */
export type Blocker = "project-type" | "region" | "supplier-size" | "minimum-ticket";
/** Where a supplier initiative stands, for the brand's Initiatives view and the Outcomes table (src/lib/initiatives.ts). */
export type InitiativeStage = "Proposed" | "Planned" | "Claimed" | "Validated" | "Under review" | "Not counted" | "Measured on site";
/** Whether every party expected to pay for an opportunity has recorded a commitment (src/lib/funding.ts). */
export type CommitmentStatus = "Not committed" | "Partly committed" | "Committed";
/** Where an action happens: inside the factory (P1), or outside it in the sub-basin (P2) or the basin (P3). */
export type Where = "Inside the factory" | "Outside: sub-basin" | "Outside: basin";
export type InitiativeKind = "Project" | "Opportunity" | "Site measurement";
