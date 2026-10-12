import { ops } from "@/src/data/ops";
import { factories } from "@/src/data/factories";
import type { OpsRecord } from "@/src/data/types";
import { BEHIND_TARGET_SHARE, type ProRatedBenefit } from "./pwi";
import type { FactoryId, Health, Severity, SupplierId, TierDirection, ZdhcTier } from "./types";

// PRODUCT 5.7 (Module 06) and 6.9.

/** Healthy 75 to 100, Watch 50 to 74, Critical under 50. */
export const healthBand = (score: number): Health => (score >= 75 ? "Healthy" : score >= 50 ? "Watch" : "Critical");

export const TIER_ORDER: readonly ZdhcTier[] = ["Not conformant", "Foundational", "Progressive", "Aspirational"];

export const tierDirection = (from: ZdhcTier, to: ZdhcTier): TierDirection | null => {
  const d = TIER_ORDER.indexOf(to) - TIER_ORDER.indexOf(from);
  return d > 0 ? "upgrade" : d < 0 ? "downgrade" : null;
};

export const SEVERITY_ORDER: readonly Severity[] = ["Critical", "High", "Medium", "Info"];
export const severityRank = (s: Severity) => SEVERITY_ORDER.indexOf(s);
export const highestSeverity = (list: (Severity | null)[]): Severity | null =>
  list.filter((s): s is Severity => s !== null).sort((a, b) => severityRank(a) - severityRank(b))[0] ?? null;

/**
 * Off-track: highest open alert is Critical or High, or the plant had a tier drop, or its benefit is below 80% of the
 * pro-rated target (PRODUCT 6.9). `benefitVsTargetPct` is the pro-rated Availability share from proRatedBenefitShare, as a
 * fraction. With the demo's months elapsed only F06 falls below it, so the off-track set is F06, F02 and F13 (PRODUCT 5.7).
 */
export function isOffTrack(row: OpsRecord, benefitVsTargetPct?: number | null): boolean {
  const severe = row.highestAlert === "Critical" || row.highestAlert === "High";
  const dropped = row.tierChange !== null && tierDirection(row.tierChange.from, row.tierChange.to) === "downgrade";
  const behind = benefitVsTargetPct != null && benefitVsTargetPct < BEHIND_TARGET_SHARE;
  return severe || dropped || behind;
}

/**
 * The "benefit behind target" alert text, built from the pro-rated shares of the P3 Basin cells, or null when none is below
 * 80%. Availability and Quality kg are pro-rated, people are not (see proRatedBenefitShare).
 */
export function benefitBehindMessage(benefit: ProRatedBenefit): string | null {
  const behind = benefit.cells.filter((c) => c.pillar === "P3" && c.share < BEHIND_TARGET_SHARE).map((c) => c.dimension);
  if (!behind.length) return null;
  const list = behind.length === 1 ? behind[0] : `${behind.slice(0, -1).join(", ")} and ${behind[behind.length - 1]}`;
  return `Benefit behind target: P3 Basin ${list} below 80% of pro-rated target`;
}

/** Fills in the derived benefit alert. With nothing behind target and no other message, a derived-only alert is dropped. */
export function resolveOpsRow(row: OpsRecord, benefit: ProRatedBenefit): OpsRecord {
  if (!row.benefitBehindAlert) return row;
  const message = [benefitBehindMessage(benefit), row.alertMessage].filter(Boolean).join("; ") || null;
  return { ...row, alertMessage: message, highestAlert: message ? row.highestAlert : null };
}

export interface Alert {
  id: string; factoryId: FactoryId; severity: Severity; message: string; ageDays: number | null;
}

/** One alert per plant with an open alert, most severe first, then newest. */
export function buildAlerts(rows: OpsRecord[] = ops): Alert[] {
  return rows
    .filter((r): r is OpsRecord & { highestAlert: Severity; alertMessage: string } => r.highestAlert !== null && r.alertMessage !== null)
    .map((r) => ({ id: `AL-${r.factoryId}`, factoryId: r.factoryId, severity: r.highestAlert, message: r.alertMessage, ageDays: r.alertAgeDays }))
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || (a.ageDays ?? Infinity) - (b.ageDays ?? Infinity) || a.factoryId.localeCompare(b.factoryId));
}

export const alertCounts = (alerts: Alert[]): Record<Severity, number> =>
  Object.fromEntries(SEVERITY_ORDER.map((s) => [s, alerts.filter((a) => a.severity === s).length])) as Record<Severity, number>;

export const supplierOfFactory = (factoryId: FactoryId): SupplierId => factories.find((f) => f.id === factoryId)!.supplierId;
