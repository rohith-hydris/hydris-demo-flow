import type {
  CellGrade, CellState, CheckResult, Dimension, EvidenceGrade, FactoryId, InspectionStatus, LedgerStatus, Period, Pillar,
  ProjectStatus, ReadinessState, RiskCode, Severity, SupplierId, ZdhcTier,
} from "@/src/lib/types";

// Input records only. Ranks, tiers, bands, R, I-derived labels, PWI and roll-ups are computed in src/lib/.

export interface SupplierRecord { id: SupplierId; name: string; cluster: string; factoryIds: FactoryId[] }

/** PRODUCT 5.3 inputs. R is an output (computed from the risk scores), so it is not stored here. */
export interface FactoryRecord {
  id: FactoryId; name: string; supplierId: SupplierId; district: string;
  lat: number; lon: number;
  /** Impact score I (0 to 1). Fixed input in the demo (OQ-X1). `null` means "Impact pending". */
  footprintI: number | null;
  /** Replenishment Needed, m3 per year. */
  replenishmentNeededM3: number;
  headcount: number;
  /** Household size h. */
  householdSize: number;
  confidence: number;
  evidenceGrade: EvidenceGrade;
}

/** PRODUCT 5.4. P1 Quality is derived from pollutant removal, so it is not entered. */
export interface CellScoreRecord {
  factoryId: FactoryId;
  availability: Record<Pillar, number>;
  accessibility: Record<Pillar, number>;
  quality: { P2: number; P3: number };
}
export interface RemovalRecord { factoryId: FactoryId; tss: number; tn: number; tp: number } // percent

export type RiskScores = Record<RiskCode, number> & { bws50: number };
export interface RiskScoreRecord { factoryId: FactoryId; scores: RiskScores }

export interface TierChange { from: ZdhcTier; to: ZdhcTier; daysAgo: number }
export interface OpsRecord {
  factoryId: FactoryId;
  healthScore: number;
  zdhcTier: ZdhcTier;
  tierChange: TierChange | null;
  highestAlert: Severity | null;
  alertMessage: string | null;
  /** Age of the alert in days where the spec states it. */
  alertAgeDays: number | null;
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
  status: ProjectStatus; grade: CellGrade; note: string;
  /** Present for Not counted projects: why the Additionality Gate excludes it. */
  gateReason?: "Compliance only" | "No baseline" | "Outside basin" | "Not connected";
}

export interface DocumentRecord {
  id: string; factoryId: FactoryId; order: number; name: string;
  period: string; state: ReadinessState; detail: string;
  /** True for audit and compliance reports shown on the Claims and Evidence page. */
  isReport: boolean;
}

export interface InspectionStep { n: number; instruction: string; result: CheckResult; check?: string; reason?: string }
/** Trust score is computed as passed / steps. `stepDetail` lists only the non-pass steps the spec describes. */
export interface InspectionRecord {
  id: string; factoryId: FactoryId; date: string; steps: number; passed: number;
  status: InspectionStatus; stepDetail?: InspectionStep[];
}

export interface LedgerEntry {
  id: string; factoryId: FactoryId; period: string; what: string;
  entryStatus: LedgerStatus; periodStatus: Period;
}
