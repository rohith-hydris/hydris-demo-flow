export type Band = 1 | 2 | 3;
export type RiskStatus = "Present" | "Watch" | "Not present" | "No data";
export type CellState = "Scored" | "Missing input" | "Not additional" | "Low confidence";
export type Quadrant = "Act now" | "Build resilience" | "Reduce footprint" | "Monitor" | "Impact pending";
export type CertBand = "Low confidence" | "Self-certified" | "Conditional" | "In progress" | "Not achieved";
export type Health = "Healthy" | "Watch" | "Critical";
export type ZdhcTier = "Aspirational" | "Progressive" | "Foundational" | "Not conformant";
export type Severity = "Critical" | "High" | "Medium" | "Info";
export type Sharing = "Shared" | "Not shared";
export type Period = "Draft" | "Submitted" | "Verified" | "Locked";
export type Trend = "Upgraded" | "Same" | "Downgraded";
export type PerformanceStatus = "On track" | "Needs attention" | "Off track";

export interface Supplier { id: string; name: string; country: string; sharing: Sharing }

export interface Factory {
  id: string; supplierId: string; supplierName: string; name: string;
  district: string; state: string; basin: string; lat: number; lng: number;
  band: Band; riskScoreR: number; footprintI: number | null;
  priorityRankInSupplier: number; priorityRankInBrand: number;
  tier: 1 | 2 | 3; quadrant: Quadrant; presentRiskCount: number; waterStressed: boolean;
  healthScore: number; health: Health;
  zdhcTier: ZdhcTier; zdhcTrend: Trend;
  highestSeverity: Severity | null; offTrack: boolean; benefitVsTargetPct: number | null;
  sitePwi: number | null; pwiLow: number | null; certBand: CertBand | null; confidence: number | null;
  volumetricBalance: number | null; period: Period; lastDataDate: string; daysWithoutData: number;
}

export interface SupplierSummary {
  supplierId: string; name: string; country: string; sharing: Sharing; factoryCount: number;
  priorityRank: number; performanceRank: number; band1Count: number; topRiskDriver: string;
  avgPwiSimple: number | null; avgPwiRnWeighted: number | null;
  certBandSpread: Record<CertBand, number>;
  healthMix: Record<Health, number>; tierMix: Record<ZdhcTier, number>;
  highestSeverity: Severity | null; offTrackCount: number;
  lastDataDate: string; plantsWithoutData7d: number;
  performanceStatus: PerformanceStatus;
  attentionReason: string | null; // one plain sentence for Needs attention / Off track
  // Pre-computed bar widths (each group sums to 100). Zero for a supplier that does not share.
  healthMixPct: Record<Health, number>; tierMixPct: Record<ZdhcTier, number>;
  certBandSpreadPct: Record<CertBand, number>;
  avgPwiRnWeightedPct: number | null; // 0..100 for the progress bar
}

export interface Finding { title: string; detail: string }

export interface SupplierDetail {
  summary: SupplierSummary;
  rankOf: number; // number of suppliers that are ranked (those that share data)
  onboardedDate: string;
  contactName: string;
  strengths: Finding[];
  concerns: Finding[];
  kpis: { factories: number; avgPwiRnWeighted: number | null; band1Factories: number; offTrack: number; openAlerts: number; baselinePending: number };
}

export interface SupplierQuery { search?: string; status?: PerformanceStatus; sortBy?: "performance" | "priority" | "name" }

export interface Alert {
  id: string; factoryId: string; factoryName: string; supplierId: string; supplierName: string;
  severity: Severity; date: string; reason: string;
  status: "Open" | "Acknowledged" | "Assigned"; assignee: string | null;
}

export interface RiskItem {
  key: string; name: string; category: string; status: RiskStatus;
  score: number | null; scorePct: number | null; rawValue: string | null; reason: string;
  whatWouldChange: string; source: string; vintage: string;
}

// extra: pre-counted and pre-grouped so the UI only renders
export interface RiskReport {
  counts: Record<RiskStatus, number>;
  groups: { category: string; items: RiskItem[] }[];
}

export interface PwiCell {
  pillar: "P1" | "P2" | "P3";
  dimension: "Availability" | "Accessibility" | "Quality";
  target: string; delivered: string; score: number; scorePct: number; scoreLow: number; state: CellState;
  grade: "A" | "B" | "C" | "D" | "-";
}

export interface FactoryPwi {
  factoryId: string; sitePwi: number; sitePwiLow: number; confidence: number; certBand: CertBand;
  volumetricBalance: number; replenishmentNeededM3: number; period: Period;
  cells: PwiCell[]; // 9 cells, pillar-major order
}

export interface EtpDetail {
  factoryId: string;
  healthHistory: { date: string; score: number }[];
  tierHistory: { date: string; tier: ZdhcTier; change: Trend }[];
  benefitVsTargetPct: number | null;
}

export interface FactoryQuery {
  supplierId?: string; region?: string; tier?: ZdhcTier; severity?: Severity;
  sortBy?: "region" | "tier" | "severity" | "priority"; dir?: "asc" | "desc";
}

export interface BrandKpis {
  suppliers: number; sharingSuppliers: number; onTrack: number; needsAttention: number; offTrack: number;
  openCritical: number; portfolioPwiSimple: number; portfolioPwiRnWeighted: number;
}
