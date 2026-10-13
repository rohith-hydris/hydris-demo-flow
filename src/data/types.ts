import type { EligibilityChecks } from "@/src/lib/states";
import type {
  CellGrade, CellState, CheckResult, Dimension, EvidenceGrade, FactoryId, LedgerStatus, Period, Pillar,
  ParticipantRole, ProjectStatus, ReadinessState, ReviewStates, RiskCode, RiskGap, Severity, SupplierId, ZdhcTier,
} from "@/src/lib/types";

// Input records only. Ranks, tiers, bands, R, I-derived labels, PWI and roll-ups are computed in src/lib/.

export interface SupplierRecord { id: SupplierId; name: string; cluster: string; factoryIds: FactoryId[]; sizeClass: "MSME" | "Large" }

/** PRODUCT 5.3 inputs. R is an output (computed from the risk scores), so it is not stored here. */
export interface FactoryRecord {
  id: FactoryId; name: string; supplierId: SupplierId; district: string;
  lat: number; lon: number;
  /** Impact score I (0 to 1). Fixed input in the demo (OQ-X1). `null` means "Impact pending". */
  footprintI: number | null;
  /** Replenishment Needed, m3 per year. */
  replenishmentNeededM3: number;
  headcount: number;
  /** Plant attributes for technology matching (Module 06). Demo values. Processes run, effluent profile, ETP type, and ETP flow in m3 per day. */
  processes: string[]; effluentProfile: string; etpType: string; etpFlowM3PerDay: number;
  /** Household size h. */
  householdSize: number;
  evidenceGrade: EvidenceGrade;
}

/**
 * What a site delivered (PRODUCT 5.4, 5.9). Availability in m3 and Accessibility in people, per pillar; cell scores are
 * computed from these against the targets. P1 Quality is derived from pollutant removal. P2 and P3 Quality carry no kg data,
 * so `qualityScore` (0 to 1) is entered as before.
 */
export interface DeliveredRecord {
  factoryId: FactoryId;
  availabilityM3: Record<Pillar, number>;
  accessibilityPeople: Record<Pillar, number>;
  qualityScore: { P2: number; P3: number };
}
export interface RemovalRecord { factoryId: FactoryId; tss: number; tn: number; tp: number } // percent

/** Aqueduct 4.0 outlook scores (0 to 5) for water stress, depletion and the two variability indicators. 2080 is not in the dataset. */
export type OutlookScores = { bws30: number; bws50: number; bwd30: number; bwd50: number; iav30: number; iav50: number; sev30: number; sev50: number };
export type RiskScores = Record<RiskCode, number> & OutlookScores;
export interface RiskScoreRecord {
  factoryId: FactoryId; scores: RiskScores;
  /** V2 4.2: indicators with no usable reading. The score stays in `scores` for the record but is not used. */
  gaps?: Partial<Record<RiskCode, RiskGap>>;
  /** PRD 5.1: an arid area. The scarcity pillar is 1.0 and the scarcity risks are Present. */
  arid?: boolean;
  /** PRD 5.1: groundwater table decline "Insignificant Trend" sets the groundwater pillar to 0 and the risk to Not present. */
  gtdTrend?: "Insignificant Trend" | "Trend";
  /** PRD 5.2: coastal flood category "No Risk" is Not present whatever the score. */
  cfrNoRisk?: boolean;
  /** PRD 5.2: distance in km to the nearest Aqueduct area. 0 to 5 km is "snapped"; null means no area, so every indicator is No data. */
  snapDistanceKm?: number | null;
  /** Raw baseline water stress as a percent. 40 or more is water-stressed. */
  bwsPercent?: number | null;
}

export interface TierChange { from: ZdhcTier; to: ZdhcTier; daysAgo: number }
/**
 * Module 06 plant signals, as inputs. Health score, band, alerts, severity and off-track are derived in src/lib/ops.ts.
 */
export interface OpsRecord {
  factoryId: FactoryId;
  /** Share of outlet readings within consent limits, 0 to 100. */
  outletCompliancePct: number;
  /** Monitoring uptime (OCEMS and meters), 0 to 100. */
  uptimePct: number;
  /** Days since the last reading. 7 or more is a data gap. */
  dataAgeDays: number;
  zdhcTier: ZdhcTier;
  tierChange: TierChange | null;
  /** The plant tracks "benefit behind target" from its pro-rated benefit shares (issue A3). */
  benefitBehindAlert?: boolean;
  /** A project monitoring check that is overdue, named in the benefit alert. */
  /** A project whose overdue monitoring check is named in the benefit alert. The days overdue are computed from the project (claims.ts). */
  overdueMonitoring?: { project: string };
}

export type Measure =
  | { kind: "volume"; m3: number }
  | { kind: "people"; count: number }
  | { kind: "mass"; tss: number; tn: number; tp: number }
  | { kind: "removal"; tss: number; tn: number; tp: number };

export interface BreakdownLine { label: string; value: number; unit: "m3" | "people" | "kg" }

/** PRODUCT 5.8: one worked-example cell. `score` here is the entered cell score S from 5.4. */
export interface WorkedCell {
  pillar: Pillar; dimension: Dimension;
  target: Measure; delivered: Measure; breakdown?: BreakdownLine[];
  grade: CellGrade; state: CellState; stateNote?: string;
}

export interface WorkedExample {
  factoryId: FactoryId; methodVersion: string;
  baselineWithdrawalM3: number; compliantBasinDischargeM3: number; attributableShare: number;
  etpFlowM3: number; influentMgPerL: { tss: number; tn: number; tp: number };
  baselineLoadsKg: { tss: number; tn: number; tp: number };
  withdrawalBySourceM3: { municipal: number; groundwater: number; rainwaterUsed: number; thirdParty: number; condensate: number };
  priorMonthSitePwi: number;
  cells: WorkedCell[];
}

export interface CellStateOverride { factoryId: FactoryId; pillar: Pillar | "all"; dimension: Dimension | "all"; state: CellState; reason: string }

export type ClaimAmount =
  | { unit: "m3"; value: number }
  | { unit: "people"; value: number }
  | { unit: "kg"; tss: number; tn: number; tp: number };

export interface ProjectRecord {
  id: string; factoryId: FactoryId; name: string;
  pillar: Pillar; dimension: Dimension;
  method: string; claim: ClaimAmount; claimBasis?: string;
  /** Attribution share f, 0 to 1. */
  attribution: number;
  /** Summary badge, computed from `states` by summaryStatus() in src/lib/states.ts. Never entered by hand. */
  status: ProjectStatus; grade: CellGrade; note: string;
  /** V2 Section 2: five independent review states. */
  states: ReviewStates;
  /** V2 5.1. */
  boundary: string; counterfactual: string; operatingPeriod: string; monitoringRequirement: string;
  /** ISO date of the last monitoring check. Overdue days and the 90-day lapse are computed from it (src/lib/claims.ts). Absent: no monitoring cadence recorded. */
  lastMonitoringCheck?: string;
  /** Share of funding paid by this participant. Separate from `attribution`, the eligible benefit attribution. null = not recorded. */
  fundingShare: number | null;
  eligibilityChecks: EligibilityChecks;
  participants: Participant[];
  /** Present for Not counted projects: why the Additionality Gate excludes it. */
  gateReason?: "Compliance only" | "No baseline" | "Outside basin" | "Not connected";
}

export interface DocumentRecord {
  id: string; factoryId: FactoryId; order: number; name: string;
  period: string; state: ReadinessState; detail: string;
  /** True for audit and compliance reports shown on the Claims and Evidence page. */
  isReport: boolean;
  /** A Ready document that still needs a person to look at it (for example F01's OCEMS and lab COD variance). */
  needsAttention?: boolean;
}

export type InspectionSource = "Field Glasses" | "Field upload (phone or web)";
/** A manager's review action on an inspection report, logged with who and when. An override carries its reason; a retake names the step. */
export interface InspectionReview {
  action: "confirm" | "override" | "retake";
  user: string; time: string; reason?: string; step?: number;
}
export interface InspectionStep { n: number; instruction: string; result: CheckResult; check?: string; reason?: string }
/** Trust score is computed as passed / steps. `stepDetail` lists only the non-pass steps the spec describes. */
export interface InspectionRecord {
  id: string; factoryId: FactoryId; date: string; steps: number; passed: number;
  /** Every review action taken on the report, oldest first. The status is derived from the steps and this log (claims.ts inspectionStatus). */
  reviewLog?: InspectionReview[];
  /** V2 14: ordinary field uploads are allowed. They do not need Field Glasses hardware. */
  source: InspectionSource; stepDetail?: InspectionStep[];
}

export interface LedgerEntry {
  id: string; factoryId: FactoryId; period: string; what: string;
  entryStatus: LedgerStatus; periodStatus: Period;
  /** The two inputs the "why did P2 drop" answer compares, taken from the entry text in PRODUCT 5.8. */
  p2Availability?: number; desiltingFills?: number;
  /** The grid cell this entry records, where it records one. */
  cell?: { pillar: Pillar; dimension: Dimension };
  /** Lineage: the facts the entry read, the method version and formula, and the inputs behind it. */
  factIds: string[]; methodVersion: string; formula: string;
  inputs: { label: string; value: number; unit: string }[];
  /** Demo hash chain: the previous entry's hash (64 zeros for the first) and this entry's own hash. Sealed by src/lib/ledger.ts. */
  previousHash: string; hash: string;
}

/** V2 5.2: one physical project has many participation records. Physical benefit is stored once, on the project. */
export interface Participant {
  participant: string; role: ParticipantRole;
  fundingShare: number; eligiblePillarRole: string;
  /** Eligibility of this participant's claim: Eligible, or the reason it is not. */
  eligibility: string;
  /** The share of the physical benefit this participant claims (0 to 1). Funding does not create entitlement. */
  claimAllocation: number;
  claimState: "Eligible" | "Conflict" | "n/a";
  /** True marks the brand's own funding participant (role Contributor). Funding only: it never creates a claim. */
  isBrand?: boolean;
  /** True for the participants who are Lumen supply-chain sites in the demo. */
  factoryId?: FactoryId;
}

/** PRD 4.8: one self-assessment answer, scored 0 to 3, with the confidence in its evidence (1.0, 0.7 or 0.5). */
export type AssessmentAnswer = readonly [score: number, evidence: number];

/** The confidence inputs for one site: 52 answers in question order, and the ids of the cross-checks XV-01 to XV-10 it fails. */
export interface SelfAssessmentRecord {
  factoryId: FactoryId;
  answers: readonly AssessmentAnswer[];
  failedChecks: readonly string[];
}
