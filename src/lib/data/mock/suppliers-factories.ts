import type {
  CertBand, Finding, Factory, Health, PerformanceStatus, Supplier, SupplierSummary, ZdhcTier,
} from "../types";

export const brand = { id: "brand-1", name: "Aruna Apparel Co.", reportingPeriod: "October 2026 (1 to 10 October)" };
export const currentSupplierId = "sup-kaveri";

export const suppliers: Supplier[] = [
  { id: "sup-kaveri", name: "Kaveri Knits", country: "India", sharing: "Shared" },
  { id: "sup-coromandel", name: "Coromandel Textiles", country: "India", sharing: "Shared" },
  { id: "sup-nilgiri", name: "Nilgiri Garments", country: "India", sharing: "Shared" },
  { id: "sup-mysuru", name: "Mysuru Apparels", country: "India", sharing: "Not shared" },
  { id: "sup-tungabhadra", name: "Tungabhadra Fabrics", country: "India", sharing: "Shared" },
];

// Brand KPIs. Counts cover all 5 suppliers; portfolio PWI covers the suppliers that share data.
export const brandKpis = {
  suppliers: 5, sharingSuppliers: 4, onTrack: 2, needsAttention: 2, offTrack: 1, openCritical: 2,
  portfolioPwiSimple: 0.654, portfolioPwiRnWeighted: 0.58,
};

export const performanceDistribution: { status: PerformanceStatus; count: number; pct: number }[] = [
  { status: "On track", count: 2, pct: 40 },
  { status: "Needs attention", count: 2, pct: 40 },
  { status: "Off track", count: 1, pct: 20 },
];

// Used by the supplier dashboard.
export const supplierKpis: Record<string, { factories: number; avgPwi: number | null; band1Factories: number; offTrack: number; openAlerts: number; baselinePending: number }> = {
  "sup-kaveri": { factories: 3, avgPwi: 0.62, band1Factories: 2, offTrack: 1, openAlerts: 2, baselinePending: 0 },
  "sup-coromandel": { factories: 3, avgPwi: 0.72, band1Factories: 2, offTrack: 2, openAlerts: 1, baselinePending: 1 },
  "sup-nilgiri": { factories: 3, avgPwi: 0.776, band1Factories: 0, offTrack: 1, openAlerts: 1, baselinePending: 0 },
  "sup-mysuru": { factories: 3, avgPwi: 0.8, band1Factories: 0, offTrack: 0, openAlerts: 0, baselinePending: 0 },
  "sup-tungabhadra": { factories: 3, avgPwi: 0.454, band1Factories: 2, offTrack: 2, openAlerts: 1, baselinePending: 1 },
};

// Builders: only fill zero counts (module load).
const zero = <K extends string>(keys: K[], s: Partial<Record<K, number>>) =>
  Object.fromEntries(keys.map((k) => [k, s[k] ?? 0])) as Record<K, number>;
const CERTS: CertBand[] = ["Low confidence", "Self-certified", "Conditional", "In progress", "Not achieved"];
const HEALTHS: Health[] = ["Healthy", "Watch", "Critical"];
const TIERS: ZdhcTier[] = ["Aspirational", "Progressive", "Foundational", "Not conformant"];

type S = Omit<SupplierSummary, "name" | "country" | "sharing" | "certBandSpread" | "healthMix" | "tierMix" | "certBandSpreadPct" | "healthMixPct" | "tierMixPct"> & {
  cert: Partial<Record<CertBand, number>>; health: Partial<Record<Health, number>>; tiers: Partial<Record<ZdhcTier, number>>;
  certPct: Partial<Record<CertBand, number>>; healthPct: Partial<Record<Health, number>>; tiersPct: Partial<Record<ZdhcTier, number>>;
};
const sum = ({ cert, health, tiers, certPct, healthPct, tiersPct, ...r }: S): SupplierSummary => {
  const s = suppliers.find((x) => x.id === r.supplierId)!;
  return {
    ...r, name: s.name, country: s.country, sharing: s.sharing,
    certBandSpread: zero(CERTS, cert), healthMix: zero(HEALTHS, health), tierMix: zero(TIERS, tiers),
    certBandSpreadPct: zero(CERTS, certPct), healthMixPct: zero(HEALTHS, healthPct), tierMixPct: zero(TIERS, tiersPct),
  };
};

// Ranks are among the 4 suppliers that share data. Performance follows RN-weighted PWI (highest first).
// Priority follows Band 1 count, then average footprint. The two orders differ for every supplier here.
// Pre-sorted by priorityRank. The not-shared supplier carries empty metrics and sorts last.
export const supplierPriority: SupplierSummary[] = [
  sum({ supplierId: "sup-kaveri", factoryCount: 3, priorityRank: 1, performanceRank: 3, band1Count: 2, topRiskDriver: "Drought", avgPwiSimple: 0.62, avgPwiRnWeighted: 0.611, avgPwiRnWeightedPct: 61.1,
    cert: { Conditional: 2, "In progress": 1 }, certPct: { Conditional: 67, "In progress": 33 },
    health: { Healthy: 1, Watch: 1, Critical: 1 }, healthPct: { Healthy: 33, Watch: 33, Critical: 34 },
    tiers: { Progressive: 1, Foundational: 1, "Not conformant": 1 }, tiersPct: { Progressive: 33, Foundational: 33, "Not conformant": 34 },
    highestSeverity: "Critical", offTrackCount: 1, lastDataDate: "2026-10-09", plantsWithoutData7d: 0,
    performanceStatus: "Needs attention", attentionReason: "Tiruppur Mill dropped to Not conformant and has an open Critical alert." }),
  sum({ supplierId: "sup-tungabhadra", factoryCount: 3, priorityRank: 2, performanceRank: 4, band1Count: 2, topRiskDriver: "Water depletion", avgPwiSimple: 0.454, avgPwiRnWeighted: 0.445, avgPwiRnWeightedPct: 44.5,
    cert: { "Low confidence": 1, "In progress": 1 }, certPct: { "Low confidence": 50, "In progress": 50 },
    health: { Watch: 2, Critical: 1 }, healthPct: { Watch: 67, Critical: 33 },
    tiers: { Progressive: 1, Foundational: 2 }, tiersPct: { Progressive: 33, Foundational: 67 },
    highestSeverity: "Critical", offTrackCount: 2, lastDataDate: "2026-10-09", plantsWithoutData7d: 0,
    performanceStatus: "Off track", attentionReason: "Two of three plants are off track, and the average impact score is the lowest of all suppliers, at 45%." }),
  sum({ supplierId: "sup-coromandel", factoryCount: 3, priorityRank: 3, performanceRank: 2, band1Count: 2, topRiskDriver: "Coastal flood", avgPwiSimple: 0.72, avgPwiRnWeighted: 0.711, avgPwiRnWeightedPct: 71.1,
    cert: { "In progress": 1, Conditional: 1 }, certPct: { "In progress": 50, Conditional: 50 },
    health: { Healthy: 1, Watch: 1, Critical: 1 }, healthPct: { Healthy: 33, Watch: 33, Critical: 34 },
    tiers: { Progressive: 1, Foundational: 1, "Not conformant": 1 }, tiersPct: { Progressive: 33, Foundational: 33, "Not conformant": 34 },
    highestSeverity: "Critical", offTrackCount: 2, lastDataDate: "2026-10-10", plantsWithoutData7d: 1,
    performanceStatus: "Needs attention", attentionReason: "Ranipet Processing is Critical and has sent no data for 9 days." }),
  sum({ supplierId: "sup-nilgiri", factoryCount: 3, priorityRank: 4, performanceRank: 1, band1Count: 0, topRiskDriver: "Interannual variability", avgPwiSimple: 0.776, avgPwiRnWeighted: 0.742, avgPwiRnWeightedPct: 74.2,
    cert: { "Self-certified": 1, "In progress": 1, Conditional: 1 }, certPct: { "Self-certified": 33, "In progress": 33, Conditional: 34 },
    health: { Healthy: 2, Watch: 1 }, healthPct: { Healthy: 67, Watch: 33 },
    tiers: { Aspirational: 2, Foundational: 1 }, tiersPct: { Aspirational: 67, Foundational: 33 },
    highestSeverity: "High", offTrackCount: 1, lastDataDate: "2026-10-10", plantsWithoutData7d: 1,
    performanceStatus: "On track", attentionReason: null }),
  sum({ supplierId: "sup-mysuru", factoryCount: 3, priorityRank: 5, performanceRank: 5, band1Count: 0, topRiskDriver: "", avgPwiSimple: null, avgPwiRnWeighted: null, avgPwiRnWeightedPct: null,
    cert: {}, certPct: {}, health: {}, healthPct: {}, tiers: {}, tiersPct: {},
    highestSeverity: null, offTrackCount: 0, lastDataDate: "", plantsWithoutData7d: 0,
    performanceStatus: "On track", attentionReason: null }),
];

// Pre-sorted by performanceRank (hand-ordered). The not-shared supplier sorts last.
export const supplierPerformance: SupplierSummary[] = [
  supplierPriority[3], supplierPriority[2], supplierPriority[0], supplierPriority[1], supplierPriority[4],
];

// Hardcoded selection: Off track first, then Needs attention. Never a supplier that does not share.
export const attentionIds = ["sup-tungabhadra", "sup-kaveri", "sup-coromandel"];

export const supplierExtras: Record<string, { onboardedDate: string; contactName: string; strengths: Finding[]; concerns: Finding[] }> = {
  "sup-kaveri": {
    onboardedDate: "2024-03-12", contactName: "Meera Krishnan",
    strengths: [
      { title: "Palladam Dye House is improving", detail: "Its ZDHC tier went up to Progressive and its health score is 81 (Healthy)." },
      { title: "Data arrives on time", detail: "All 3 plants sent data in the last 2 days." },
      { title: "Two plants are close to their impact target", detail: "Palladam Dye House (96%) and Avinashi Unit (85%) are at 85% or more of the pro-rated target." },
    ],
    concerns: [
      { title: "Tiruppur Mill dropped to Not conformant", detail: "Its health score is 42 (Critical) and it has an open Critical alert." },
      { title: "1 of 3 plants is off track", detail: "Tiruppur Mill is also the highest-priority factory, in Band 1 with a footprint of 0.82." },
      { title: "2 of 3 factories are in Band 1", detail: "Tiruppur Mill and Avinashi Unit are in the highest risk band. Drought is the top driver." },
    ],
  },
  "sup-coromandel": {
    onboardedDate: "2024-06-04", contactName: "Arun Prakash",
    strengths: [
      { title: "Impact score is above 70%", detail: "Average PWI is 72% across the 2 factories that have a baseline." },
      { title: "Sriperumbudur Unit is healthy", detail: "Health score 77, ZDHC tier Progressive and no open alerts." },
      { title: "Two plants sent data today", detail: "Site A (Chennai) and Sriperumbudur Unit both reported on 2026-10-10." },
    ],
    concerns: [
      { title: "Ranipet Processing is Critical", detail: "Its health score is 38, its ZDHC tier is Not conformant and it has an open Critical alert." },
      { title: "1 plant has had no data for 7+ days", detail: "Ranipet Processing last sent data on 2026-10-01, 9 days ago." },
      { title: "2 of 3 plants are off track", detail: "Site A (Chennai) and Ranipet Processing are both off track." },
      { title: "Ranipet Processing has no baseline yet", detail: "Its water impact cannot be scored until it submits a baseline." },
    ],
  },
  "sup-nilgiri": {
    onboardedDate: "2024-01-22", contactName: "Lakshmi Narayanan",
    strengths: [
      { title: "Strong effluent treatment", detail: "2 of 3 plants are Healthy: Coimbatore Spinning (88) and Karur Unit (91)." },
      { title: "Top ZDHC tiers", detail: "2 of 3 plants are at Aspirational." },
      { title: "No factories in Band 1", detail: "None of the 3 factories is in the highest risk band." },
    ],
    concerns: [
      { title: "Erode Dyeing Works has had no data for 8 days", detail: "It last sent data on 2026-10-02 and has an open High alert." },
      { title: "1 of 3 plants is off track", detail: "Erode Dyeing Works has a health score of 63 (Watch) and 72% of its impact target." },
    ],
  },
  "sup-mysuru": { onboardedDate: "2024-09-18", contactName: "Divya Gowda", strengths: [], concerns: [] },
  "sup-tungabhadra": {
    onboardedDate: "2024-08-05", contactName: "Suresh Patil",
    strengths: [
      { title: "Data arrives on time", detail: "All 3 plants sent data in the last 4 days." },
      { title: "No plant lost a ZDHC tier", detail: "All 3 plants are at Foundational or better and none was downgraded." },
    ],
    concerns: [
      { title: "Ballari Weave is Critical", detail: "Health score 47, 59% of its impact target, in Band 1 and water-stressed." },
      { title: "2 of 3 plants are off track", detail: "Ballari Weave and Hubballi Unit are both off track." },
      { title: "Lowest impact scores", detail: "Average PWI is 45%, the lowest of the suppliers that share data." },
      { title: "Davangere Processing has no baseline yet", detail: "Its water impact cannot be scored until it submits a baseline." },
    ],
  },
};

type Derived = "supplierName" | "state" | "presentRiskCount" | "sitePwi" | "pwiLow" | "certBand" | "confidence" | "volumetricBalance" | "period";
type Row = Omit<Factory, Derived>;
const K = "sup-kaveri", C = "sup-coromandel", N = "sup-nilgiri", M = "sup-mysuru", T = "sup-tungabhadra";
// Derived fields are filled in mock/index wiring from the risk and PWI fixtures.
const mk = (state: string, r: Row): Omit<Factory, Exclude<Derived, "supplierName" | "state">> & Pick<Factory, "supplierName" | "state"> => ({
  ...r, state, supplierName: suppliers.find((s) => s.id === r.supplierId)!.name,
});
export type FactoryBase = ReturnType<typeof mk>;

// Health bands: 75+ Healthy, 50-74 Watch, below 50 Critical.
export const factoriesBase: FactoryBase[] = [
  mk("Tamil Nadu", { id: "tiruppur-mill", supplierId: K, name: "Tiruppur Mill", district: "Tiruppur", basin: "Noyyal-Cauvery (sub-basin 453803)", lat: 11.1085, lng: 77.3411, band: 1, riskScoreR: 0.78, footprintI: 0.82, priorityRankInSupplier: 1, priorityRankInBrand: 1, tier: 1, quadrant: "Act now", waterStressed: false, healthScore: 42, health: "Critical", zdhcTier: "Not conformant", zdhcTrend: "Downgraded", highestSeverity: "Critical", offTrack: true, benefitVsTargetPct: 64, lastDataDate: "2026-10-09", daysWithoutData: 1 }),
  mk("Tamil Nadu", { id: "avinashi-unit", supplierId: K, name: "Avinashi Unit", district: "Tiruppur", basin: "Noyyal-Cauvery", lat: 11.193, lng: 77.268, band: 1, riskScoreR: 0.71, footprintI: 0.55, priorityRankInSupplier: 2, priorityRankInBrand: 3, tier: 2, quadrant: "Act now", waterStressed: false, healthScore: 58, health: "Watch", zdhcTier: "Foundational", zdhcTrend: "Same", highestSeverity: "Medium", offTrack: false, benefitVsTargetPct: 85, lastDataDate: "2026-10-09", daysWithoutData: 1 }),
  mk("Tamil Nadu", { id: "palladam-dye-house", supplierId: K, name: "Palladam Dye House", district: "Tiruppur", basin: "Noyyal-Cauvery", lat: 10.991, lng: 77.287, band: 2, riskScoreR: 0.52, footprintI: 0.64, priorityRankInSupplier: 3, priorityRankInBrand: 8, tier: 2, quadrant: "Reduce footprint", waterStressed: false, healthScore: 81, health: "Healthy", zdhcTier: "Progressive", zdhcTrend: "Upgraded", highestSeverity: "Info", offTrack: false, benefitVsTargetPct: 96, lastDataDate: "2026-10-08", daysWithoutData: 2 }),
  mk("Tamil Nadu", { id: "site-a-chennai", supplierId: C, name: "Site A (Chennai)", district: "Chennai", basin: "Adyar-Cooum", lat: 13.0827, lng: 80.2707, band: 1, riskScoreR: 0.66, footprintI: 0.41, priorityRankInSupplier: 1, priorityRankInBrand: 4, tier: 1, quadrant: "Build resilience", waterStressed: false, healthScore: 66, health: "Watch", zdhcTier: "Foundational", zdhcTrend: "Downgraded", highestSeverity: "High", offTrack: true, benefitVsTargetPct: 78, lastDataDate: "2026-10-10", daysWithoutData: 0 }),
  mk("Tamil Nadu", { id: "ranipet-processing", supplierId: C, name: "Ranipet Processing", district: "Ranipet", basin: "Palar", lat: 12.9224, lng: 79.3333, band: 1, riskScoreR: 0.63, footprintI: null, priorityRankInSupplier: 2, priorityRankInBrand: 6, tier: 3, quadrant: "Impact pending", waterStressed: true, healthScore: 38, health: "Critical", zdhcTier: "Not conformant", zdhcTrend: "Same", highestSeverity: "Critical", offTrack: true, benefitVsTargetPct: null, lastDataDate: "2026-10-01", daysWithoutData: 9 }),
  mk("Tamil Nadu", { id: "sriperumbudur-unit", supplierId: C, name: "Sriperumbudur Unit", district: "Kancheepuram", basin: "Palar", lat: 12.9675, lng: 79.9416, band: 2, riskScoreR: 0.47, footprintI: 0.58, priorityRankInSupplier: 3, priorityRankInBrand: 9, tier: 2, quadrant: "Reduce footprint", waterStressed: false, healthScore: 77, health: "Healthy", zdhcTier: "Progressive", zdhcTrend: "Same", highestSeverity: null, offTrack: false, benefitVsTargetPct: 91, lastDataDate: "2026-10-10", daysWithoutData: 0 }),
  mk("Tamil Nadu", { id: "coimbatore-spinning", supplierId: N, name: "Coimbatore Spinning", district: "Coimbatore", basin: "Noyyal-Cauvery", lat: 11.0168, lng: 76.9558, band: 2, riskScoreR: 0.44, footprintI: 0.36, priorityRankInSupplier: 2, priorityRankInBrand: 10, tier: 2, quadrant: "Monitor", waterStressed: false, healthScore: 88, health: "Healthy", zdhcTier: "Aspirational", zdhcTrend: "Same", highestSeverity: null, offTrack: false, benefitVsTargetPct: 104, lastDataDate: "2026-10-09", daysWithoutData: 1 }),
  mk("Tamil Nadu", { id: "erode-dyeing-works", supplierId: N, name: "Erode Dyeing Works", district: "Erode", basin: "Bhavani-Cauvery", lat: 11.341, lng: 77.7172, band: 2, riskScoreR: 0.58, footprintI: 0.71, priorityRankInSupplier: 1, priorityRankInBrand: 7, tier: 1, quadrant: "Reduce footprint", waterStressed: false, healthScore: 63, health: "Watch", zdhcTier: "Foundational", zdhcTrend: "Same", highestSeverity: "High", offTrack: true, benefitVsTargetPct: 72, lastDataDate: "2026-10-02", daysWithoutData: 8 }),
  mk("Tamil Nadu", { id: "karur-unit", supplierId: N, name: "Karur Unit", district: "Karur", basin: "Amaravathi-Cauvery", lat: 10.9601, lng: 78.0766, band: 3, riskScoreR: 0.31, footprintI: 0.28, priorityRankInSupplier: 3, priorityRankInBrand: 12, tier: 3, quadrant: "Monitor", waterStressed: false, healthScore: 91, health: "Healthy", zdhcTier: "Aspirational", zdhcTrend: "Upgraded", highestSeverity: "Info", offTrack: false, benefitVsTargetPct: 110, lastDataDate: "2026-10-10", daysWithoutData: 0 }),
  mk("Karnataka", { id: "mysuru-cut-and-sew", supplierId: M, name: "Mysuru Cut & Sew", district: "Mysuru", basin: "Kabini-Cauvery", lat: 12.2958, lng: 76.6394, band: 3, riskScoreR: 0.36, footprintI: 0.33, priorityRankInSupplier: 2, priorityRankInBrand: 14, tier: 2, quadrant: "Monitor", waterStressed: false, healthScore: 90, health: "Healthy", zdhcTier: "Aspirational", zdhcTrend: "Upgraded", highestSeverity: "Info", offTrack: false, benefitVsTargetPct: 102, lastDataDate: "2026-10-09", daysWithoutData: 1 }),
  mk("Karnataka", { id: "bengaluru-hub", supplierId: M, name: "Bengaluru Hub", district: "Bengaluru Urban", basin: "Arkavathy-Cauvery", lat: 12.9716, lng: 77.5946, band: 2, riskScoreR: 0.49, footprintI: 0.44, priorityRankInSupplier: 1, priorityRankInBrand: 13, tier: 3, quadrant: "Monitor", waterStressed: false, healthScore: 84, health: "Healthy", zdhcTier: "Progressive", zdhcTrend: "Same", highestSeverity: null, offTrack: false, benefitVsTargetPct: 93, lastDataDate: "2026-10-10", daysWithoutData: 0 }),
  mk("Karnataka", { id: "nanjangud-unit", supplierId: M, name: "Nanjangud Unit", district: "Mysuru", basin: "Kabini-Cauvery", lat: 12.1186, lng: 76.6819, band: 3, riskScoreR: 0.33, footprintI: 0.3, priorityRankInSupplier: 3, priorityRankInBrand: 15, tier: 3, quadrant: "Monitor", waterStressed: false, healthScore: 80, health: "Healthy", zdhcTier: "Progressive", zdhcTrend: "Same", highestSeverity: null, offTrack: false, benefitVsTargetPct: 97, lastDataDate: "2026-10-10", daysWithoutData: 0 }),
  mk("Karnataka", { id: "ballari-weave", supplierId: T, name: "Ballari Weave", district: "Ballari", basin: "Tungabhadra", lat: 15.1394, lng: 76.9214, band: 1, riskScoreR: 0.74, footprintI: 0.69, priorityRankInSupplier: 1, priorityRankInBrand: 2, tier: 1, quadrant: "Act now", waterStressed: true, healthScore: 47, health: "Critical", zdhcTier: "Foundational", zdhcTrend: "Same", highestSeverity: "Critical", offTrack: true, benefitVsTargetPct: 59, lastDataDate: "2026-10-09", daysWithoutData: 1 }),
  mk("Karnataka", { id: "hubballi-unit", supplierId: T, name: "Hubballi Unit", district: "Dharwad", basin: "Malaprabha", lat: 15.3647, lng: 75.124, band: 1, riskScoreR: 0.61, footprintI: 0.38, priorityRankInSupplier: 2, priorityRankInBrand: 5, tier: 2, quadrant: "Build resilience", waterStressed: false, healthScore: 69, health: "Watch", zdhcTier: "Foundational", zdhcTrend: "Same", highestSeverity: "Medium", offTrack: true, benefitVsTargetPct: 76, lastDataDate: "2026-10-08", daysWithoutData: 2 }),
  mk("Karnataka", { id: "davangere-processing", supplierId: T, name: "Davangere Processing", district: "Davangere", basin: "Tungabhadra", lat: 14.4644, lng: 75.9218, band: 2, riskScoreR: 0.55, footprintI: null, priorityRankInSupplier: 3, priorityRankInBrand: 11, tier: 3, quadrant: "Impact pending", waterStressed: false, healthScore: 71, health: "Watch", zdhcTier: "Progressive", zdhcTrend: "Same", highestSeverity: "Medium", offTrack: false, benefitVsTargetPct: null, lastDataDate: "2026-10-06", daysWithoutData: 4 }),
];
