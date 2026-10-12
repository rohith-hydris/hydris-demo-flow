import { factories } from "@/src/data/factories";
import type { OpsRecord } from "@/src/data/types";
import { BEHIND_TARGET_SHARE, type ProRatedBenefit } from "./pwi";
import type { FactoryId, Health, Severity, SupplierId, TierDirection, ZdhcTier } from "./types";

// PRODUCT 5.7 (Module 06) and 6.9. The plant signals are inputs in src/data/ops.ts; health, alerts and off-track are derived here.

/** Healthy 75 to 100, Watch 50 to 74, Critical under 50. */
export const healthBand = (score: number): Health => (score >= 75 ? "Healthy" : score >= 50 ? "Watch" : "Critical");

/**
 * Plant health (0 to 100), a weighted mix of three signals. PROPOSED weights: the PRD defines the health bands but gives no
 * formula, so these are a demo choice, listed as an open decision on the Methodology page (V2-HS).
 *
 *   health = 0.60 x outlet compliance % + 0.25 x monitoring uptime % + 0.15 x data freshness
 *   data freshness = 100 x max(0, 1 - days since last reading / 30)
 *
 * Rounded to a whole point, as the health score is shown.
 */
export const HEALTH_WEIGHTS = { compliance: 0.6, uptime: 0.25, freshness: 0.15 } as const;
export const FRESHNESS_WINDOW_DAYS = 30;
export const dataFreshness = (dataAgeDays: number) => 100 * Math.max(0, 1 - dataAgeDays / FRESHNESS_WINDOW_DAYS);

export function healthScore(inputs: Pick<OpsRecord, "outletCompliancePct" | "uptimePct" | "dataAgeDays">): number {
  const raw =
    HEALTH_WEIGHTS.compliance * inputs.outletCompliancePct + HEALTH_WEIGHTS.uptime * inputs.uptimePct + HEALTH_WEIGHTS.freshness * dataFreshness(inputs.dataAgeDays);
  return Math.round(Math.min(100, Math.max(0, raw)));
}

export const TIER_ORDER: readonly ZdhcTier[] = ["Not conformant", "Foundational", "Progressive", "Aspirational"];

export const tierDirection = (from: ZdhcTier, to: ZdhcTier): TierDirection | null => {
  const d = TIER_ORDER.indexOf(to) - TIER_ORDER.indexOf(from);
  return d > 0 ? "upgrade" : d < 0 ? "downgrade" : null;
};

export const SEVERITY_ORDER: readonly Severity[] = ["Critical", "High", "Medium", "Info"];
export const severityRank = (s: Severity) => SEVERITY_ORDER.indexOf(s);
export const highestSeverity = (list: (Severity | null)[]): Severity | null =>
  list.filter((s): s is Severity => s !== null).sort((a, b) => severityRank(a) - severityRank(b))[0] ?? null;

/** Seven or more days without data is a data gap (PRODUCT 5.7). */
export const DATA_GAP_DAYS = 7;

/**
 * The text of the "benefit behind target" alert, built from the pro-rated shares of the P3 Basin cells, or null when none is below
 * 80%. Availability and Quality kg are pro-rated, people are not (see proRatedBenefitShare).
 */
export function benefitBehindMessage(benefit: ProRatedBenefit): string | null {
  const behind = benefit.cells.filter((c) => c.pillar === "P3" && c.share < BEHIND_TARGET_SHARE).map((c) => c.dimension);
  if (!behind.length) return null;
  const list = behind.length === 1 ? behind[0] : `${behind.slice(0, -1).join(", ")} and ${behind[behind.length - 1]}`;
  return `Benefit behind target: P3 Basin ${list} below 80% of pro-rated target`;
}

// ---- Alerts: derived from the inputs by the PRODUCT 5.7 severity rules ----------------------------------------------------------

export type AlertRule = "not-conformant" | "critical-health" | "tier-downgrade" | "no-data" | "watch-health" | "benefit-behind" | "tier-upgrade";

export interface DerivedAlert {
  rule: AlertRule; severity: Severity;
  /** Plain text generated from the rule that fired and the inputs behind it. */
  message: string;
  /** Days since the event behind the rule: the tier change or the last reading. Null where the rule has no date. */
  ageDays: number | null;
}

/**
 * Every alert a plant's inputs raise, most severe first. Severity rules (PRODUCT 5.7):
 *   Critical: the ZDHC tier is Not conformant, or the plant health is Critical.
 *   High:     any ZDHC downgrade, or 7 or more days without data.
 *   Medium:   plant health in the Watch range, or benefit behind target (below 80% of the pro-rated target, issue A3).
 *   Info:     a ZDHC upgrade.
 * `benefit` is the pro-rated benefit from proRatedBenefitShare; the benefit rule applies to plants flagged benefitBehindAlert.
 */
export function deriveAlerts(row: OpsRecord, benefit?: ProRatedBenefit | null): DerivedAlert[] {
  const health = healthScore(row);
  const band = healthBand(health);
  const change = row.tierChange;
  const direction = change ? tierDirection(change.from, change.to) : null;
  const out: DerivedAlert[] = [];

  if (row.zdhcTier === "Not conformant") {
    out.push({
      rule: "not-conformant", severity: "Critical", ageDays: change && change.to === "Not conformant" ? change.daysAgo : null,
      message: change && change.to === "Not conformant" ? "Dropped to Not conformant" : "ZDHC tier is Not conformant",
    });
  }
  if (band === "Critical") out.push({ rule: "critical-health", severity: "Critical", ageDays: null, message: `Plant health is Critical (${health} out of 100)` });
  if (change && direction === "downgrade") {
    out.push({ rule: "tier-downgrade", severity: "High", ageDays: change.daysAgo, message: `ZDHC downgrade, ${change.from} to ${change.to}` });
  }
  if (row.dataAgeDays >= DATA_GAP_DAYS) out.push({ rule: "no-data", severity: "High", ageDays: row.dataAgeDays, message: `No data for ${row.dataAgeDays} days` });
  if (band === "Watch") out.push({ rule: "watch-health", severity: "Medium", ageDays: null, message: `Plant health in Watch range (${health} out of 100)` });
  if (row.benefitBehindAlert && benefit) {
    const behind = benefitBehindMessage(benefit);
    if (behind) {
      const overdue = row.overdueMonitoring ? `; ${row.overdueMonitoring.project} monitoring check ${row.overdueMonitoring.days} days overdue` : "";
      out.push({ rule: "benefit-behind", severity: "Medium", ageDays: null, message: behind + overdue });
    }
  }
  if (change && direction === "upgrade") out.push({ rule: "tier-upgrade", severity: "Info", ageDays: change.daysAgo, message: `ZDHC upgrade to ${change.to}` });

  return out.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

/** The plant's highest severity, and the message and age of the rules that fired at that severity. */
export function topAlert(alerts: DerivedAlert[]): { severity: Severity; message: string; ageDays: number | null } | null {
  if (alerts.length === 0) return null;
  const top = alerts.filter((a) => a.severity === alerts[0].severity);
  return { severity: alerts[0].severity, message: top.map((a, i) => (i > 0 && /^[A-Z][a-z]/.test(a.message) ? a.message[0].toLowerCase() + a.message.slice(1) : a.message)).join("; "), ageDays: top.find((a) => a.ageDays !== null)?.ageDays ?? null };
}

/**
 * Off-track: highest open alert is Critical or High, or the plant had a tier drop, or its benefit is below 80% of the
 * pro-rated target (PRODUCT 6.9). `benefitVsTargetPct` is the pro-rated Availability share from proRatedBenefitShare, as a
 * fraction. With the demo's months elapsed only F06 falls below it, so the off-track set is F06, F02 and F13 (PRODUCT 5.7).
 */
export function isOffTrack(row: OpsRecord, benefitVsTargetPct?: number | null, benefit?: ProRatedBenefit | null): boolean {
  const top = topAlert(deriveAlerts(row, benefit));
  const severe = top?.severity === "Critical" || top?.severity === "High";
  const dropped = row.tierChange !== null && tierDirection(row.tierChange.from, row.tierChange.to) === "downgrade";
  const behind = benefitVsTargetPct != null && benefitVsTargetPct < BEHIND_TARGET_SHARE;
  return severe || dropped || behind;
}

export interface Alert {
  id: string; factoryId: FactoryId; severity: Severity; message: string; ageDays: number | null;
}

/** One alert per plant with an open alert, most severe first, then newest. */
export function buildAlerts(plants: { factoryId: FactoryId; alerts: DerivedAlert[] }[]): Alert[] {
  return plants
    .flatMap((p) => {
      const t = topAlert(p.alerts);
      return t ? [{ id: `AL-${p.factoryId}`, factoryId: p.factoryId, severity: t.severity, message: t.message, ageDays: t.ageDays }] : [];
    })
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || (a.ageDays ?? Infinity) - (b.ageDays ?? Infinity) || a.factoryId.localeCompare(b.factoryId));
}

export const alertCounts = (alerts: Alert[]): Record<Severity, number> =>
  Object.fromEntries(SEVERITY_ORDER.map((s) => [s, alerts.filter((a) => a.severity === s).length])) as Record<Severity, number>;

export const supplierOfFactory = (factoryId: FactoryId): SupplierId => factories.find((f) => f.id === factoryId)!.supplierId;
