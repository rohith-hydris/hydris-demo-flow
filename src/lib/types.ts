// Shared vocabularies from PRODUCT.md. Labels match the spec exactly (OQ-X2: demo uses the Section 5 labels).

export type SupplierId = string; // "SUP1".."SUP5"
export type FactoryId = string; // "F01".."F14"

export type Band = 1 | 2 | 3;
export type Tier = 1 | 2 | 3;
export type Quadrant = "Act now" | "Build resilience" | "Reduce footprint" | "Monitor" | "Impact pending";

export type RiskStatus = "Present" | "Watch" | "Not present";
export type RiskCode =
  | "bws" | "bwd" | "iav" | "sev" | "gtd" | "drr" | "rfr" | "cfr" | "udw" | "usa" | "ucw" | "rri" | "cep" | "tex";
export type RiskCategory = "Physical quantity" | "Physical quality" | "Downstream" | "Regulatory and reputational" | "Composite";
export type PillarKey = "scarcity" | "groundwater" | "drought" | "flood" | "community";

export type Pillar = "P1" | "P2" | "P3";
export type Dimension = "Availability" | "Accessibility" | "Quality";
export type EvidenceGrade = "A" | "B" | "C" | "D";
export type CellGrade = EvidenceGrade | "none";
export type CellState = "Scored" | "Partially scored" | "Missing input" | "Blocked" | "Not additional" | "Low confidence";
export type CertBand = "Low confidence" | "Self-certified" | "Conditional" | "In progress" | "Not achieved";

export type Health = "Healthy" | "Watch" | "Critical";
export type ZdhcTier = "Aspirational" | "Progressive" | "Foundational" | "Not conformant";
export type TierDirection = "upgrade" | "downgrade";
export type Severity = "Critical" | "High" | "Medium" | "Info";
export type Period = "Draft" | "Submitted" | "Verified" | "Locked";
export type LedgerStatus = "Validated" | "Audited";

export type ProjectStatus = "Validated" | "Pending validation" | "Flagged" | "Not counted";
export type ReadinessState = "Ready" | "Missing" | "Failed check" | "Expired / out of period" | "Low confidence";
export type InspectionStatus = "Needs review" | "Validated";
export type CheckResult = "Pass" | "Warn" | "Fail";
