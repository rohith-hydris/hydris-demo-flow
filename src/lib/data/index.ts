// The only public entry of the data layer. Swap the mock imports for API calls later.
// Filtering and sorting happen here, and only by explicit parameters.
import type {
  Alert, Band, BrandKpis, EtpDetail, Factory, FactoryPwi, FactoryQuery, PerformanceStatus, RiskItem, RiskReport, RiskStatus,
  Severity, Supplier, SupplierDetail, SupplierQuery, SupplierSummary,
} from "./types";
import {
  attentionIds, brand, brandKpis, currentSupplierId, factoriesBase, performanceDistribution, supplierExtras, supplierKpis,
  supplierPerformance, supplierPriority, suppliers,
} from "./mock/suppliers-factories";
import { risksByFactory } from "./mock/risks";
import { pwiByFactory } from "./mock/pwi";
import { alerts, etpByFactory } from "./mock/etp";

export type * from "./types";

// Module-load wiring so each fact lives in one fixture only.
const factories: Factory[] = factoriesBase.map((f) => {
  const p = pwiByFactory[f.id];
  return {
    ...f,
    presentRiskCount: risksByFactory[f.id].filter((r) => r.status === "Present").length,
    sitePwi: p?.sitePwi ?? null, pwiLow: p?.sitePwiLow ?? null, certBand: p?.certBand ?? null,
    confidence: p?.confidence ?? null, volumetricBalance: p?.volumetricBalance ?? null, period: p?.period ?? "Draft",
  };
});
const brandOrdered = [...factories].sort((a, b) => a.priorityRankInBrand - b.priorityRankInBrand);

const isShared = (supplierId: string) => suppliers.find((s) => s.id === supplierId)?.sharing === "Shared";
// A not-shared supplier is visible only to itself.
const canSee = (supplierId: string) => supplierId === currentSupplierId || isShared(supplierId);

const TIER_ORDER = ["Aspirational", "Progressive", "Foundational", "Not conformant"];
const SEV_ORDER: Severity[] = ["Critical", "High", "Medium", "Info"];
const idx = (order: string[], v: string | null) => (v === null ? order.length : order.indexOf(v));
const matches = (text: string, needle?: string) => !needle || text.toLowerCase().includes(needle.trim().toLowerCase());

export async function getCurrentSupplierId(): Promise<string> { return currentSupplierId; }
export async function getBrand() { return brand; }
export async function getBrandKpis(): Promise<BrandKpis> { return brandKpis; }
export async function getPerformanceDistribution(): Promise<{ status: PerformanceStatus; count: number; pct: number }[]> { return performanceDistribution; }
export async function getSupplierKpis(supplierId: string) { return supplierKpis[supplierId]; }
export async function getSupplier(id: string): Promise<Supplier | null> { return suppliers.find((s) => s.id === id) ?? null; }

export async function listAttentionSuppliers(): Promise<SupplierSummary[]> {
  return attentionIds.map((id) => supplierPriority.find((s) => s.supplierId === id)!);
}

// Brand table. Includes not-shared suppliers (with empty metrics). Default order is performance rank.
export async function listSuppliers(q: SupplierQuery = {}): Promise<SupplierSummary[]> {
  const base = q.sortBy === "priority" ? supplierPriority
    : q.sortBy === "name" ? [...supplierPriority].sort((a, b) => a.name.localeCompare(b.name))
    : supplierPerformance;
  return base.filter((s) => matches(s.name, q.search) && (!q.status || s.performanceStatus === q.status));
}

export async function getSupplierDetail(id: string): Promise<SupplierDetail | null> {
  const summary = supplierPriority.find((s) => s.supplierId === id);
  if (!summary) return null;
  const x = supplierExtras[id];
  const k = supplierKpis[id];
  const shared = summary.sharing === "Shared";
  return {
    summary, rankOf: 4, onboardedDate: x.onboardedDate, contactName: x.contactName,
    strengths: shared ? x.strengths : [], concerns: shared ? x.concerns : [],
    kpis: shared
      ? { factories: k.factories, avgPwiRnWeighted: summary.avgPwiRnWeighted, band1Factories: k.band1Factories, offTrack: k.offTrack, openAlerts: k.openAlerts, baselinePending: k.baselinePending }
      : { factories: 0, avgPwiRnWeighted: null, band1Factories: 0, offTrack: 0, openAlerts: 0, baselinePending: 0 },
  };
}

export async function listFactories(q: FactoryQuery = {}): Promise<Factory[]> {
  // Brand view: shared suppliers only.
  let rows = brandOrdered.filter((f) => isShared(f.supplierId));
  if (q.supplierId) rows = rows.filter((f) => f.supplierId === q.supplierId);
  if (q.region) rows = rows.filter((f) => f.state === q.region || f.district === q.region);
  if (q.tier) rows = rows.filter((f) => f.zdhcTier === q.tier);
  if (q.severity) rows = rows.filter((f) => f.highestSeverity === q.severity);
  const sign = q.dir === "desc" ? -1 : 1;
  const key = {
    region: (a: Factory, b: Factory) => a.state.localeCompare(b.state) || a.district.localeCompare(b.district),
    tier: (a: Factory, b: Factory) => idx(TIER_ORDER, a.zdhcTier) - idx(TIER_ORDER, b.zdhcTier),
    severity: (a: Factory, b: Factory) => idx(SEV_ORDER, a.highestSeverity) - idx(SEV_ORDER, b.highestSeverity),
    priority: (a: Factory, b: Factory) => a.priorityRankInBrand - b.priorityRankInBrand,
  }[q.sortBy ?? "priority"];
  return [...rows].sort((a, b) => sign * key(a, b) || a.priorityRankInBrand - b.priorityRankInBrand);
}

// Every factory id, shared or not. For static route generation only; getFactory still hides not-shared ones.
export async function listFactoryIds(): Promise<string[]> { return factories.map((f) => f.id); }

export async function listSupplierFactories(supplierId: string): Promise<Factory[]> {
  return factories.filter((f) => f.supplierId === supplierId).sort((a, b) => a.priorityRankInSupplier - b.priorityRankInSupplier);
}

// Brand view of one supplier's factories. Empty for a supplier that does not share data.
export async function listSupplierFactoriesForBrand(supplierId: string, q: { search?: string; band?: Band } = {}): Promise<Factory[]> {
  if (!isShared(supplierId)) return [];
  return factories
    .filter((f) => f.supplierId === supplierId && (!q.band || f.band === q.band) && (matches(f.name, q.search) || matches(f.district, q.search)))
    .sort((a, b) => a.priorityRankInSupplier - b.priorityRankInSupplier);
}

// Null for factories of a supplier that does not share data (unless it is the signed-in supplier's own).
export async function getFactory(id: string): Promise<Factory | null> {
  const f = factories.find((x) => x.id === id);
  return f && canSee(f.supplierId) ? f : null;
}
export async function getFactoryRisks(id: string): Promise<RiskItem[]> { return risksByFactory[id] ?? []; }
export async function getFactoryPwi(id: string): Promise<FactoryPwi | null> { return pwiByFactory[id] ?? null; }
export async function getEtpDetail(id: string): Promise<EtpDetail | null> { return etpByFactory[id] ?? null; }

// Newest first (fixture order). minSeverity keeps that severity and anything more severe.
export async function listAlerts(q: { supplierId?: string; factoryId?: string; severity?: Severity; minSeverity?: Severity; limit?: number } = {}): Promise<Alert[]> {
  const rows = alerts.filter((a) =>
    canSee(a.supplierId) &&
    (!q.supplierId || a.supplierId === q.supplierId) &&
    (!q.factoryId || a.factoryId === q.factoryId) &&
    (!q.severity || a.severity === q.severity) &&
    (!q.minSeverity || SEV_ORDER.indexOf(a.severity) <= SEV_ORDER.indexOf(q.minSeverity)));
  return q.limit ? rows.slice(0, q.limit) : rows;
}

// Extra: counts and category groups, so components never count or group.
export async function getFactoryRiskReport(id: string): Promise<RiskReport> {
  const items = risksByFactory[id] ?? [];
  const counts: Record<RiskStatus, number> = { Present: 0, Watch: 0, "Not present": 0, "No data": 0 };
  const groups: RiskReport["groups"] = [];
  for (const it of items) {
    counts[it.status]++;
    const g = groups.find((x) => x.category === it.category);
    if (g) g.items.push(it); else groups.push({ category: it.category, items: [it] });
  }
  return { counts, groups };
}
