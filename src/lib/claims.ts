import { documents } from "@/src/data/documents";
import { inspections } from "@/src/data/inspections";
import { DEMO_TODAY } from "@/src/data/tenants";
import { projects } from "@/src/data/projects";
import type { ClaimAmount, DocumentRecord, InspectionRecord, InspectionReview, ProjectRecord } from "@/src/data/types";
import { countedValue, lowValue } from "./pwi";
import { countsTowardPwi } from "./states";
import type { FactoryId, InspectionStatus, ProjectStatus, ReadinessState } from "./types";

// PRODUCT 4.4 (Projects, Evidence), 4.6 (Claims) and 5.10 to 5.11. Counted and low values are computed here.

export const PROJECT_STATUSES: readonly ProjectStatus[] = ["Validated", "Pending validation", "Flagged", "Not counted"];
export const READINESS_STATES: readonly ReadinessState[] = ["Ready", "Missing", "Failed check", "Expired / out of period", "Low confidence"];

// ---- Monitoring expiry (V2 P17 C02, proposed and under review) -----------------------------------------------------------------

/** A claim stops counting when its monitoring check is this many days overdue. Default 90; proposed, listed on the Methodology page. */
export const MONITORING_EXPIRY_DAYS = 90;
/** Days between monitoring checks: "quarterly". An assumption: V2 names the cadence, not a day count. */
export const MONITORING_INTERVAL_DAYS = 91;

const DAY_MS = 86_400_000;
/** Whole days from one ISO date to another (b minus a), in UTC so daylight saving never shifts it. */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);

/**
 * Days a project's monitoring check is overdue on `today`: the next check fell due one interval after the last one, and each day
 * after that is a day overdue. 0 when the check is not yet due, or when no monitoring date is recorded.
 */
export function monitoringOverdueDays(p: Pick<ProjectRecord, "lastMonitoringCheck">, today: string = DEMO_TODAY): number {
  if (!p.lastMonitoringCheck) return 0;
  return Math.max(0, daysBetween(p.lastMonitoringCheck, today) - MONITORING_INTERVAL_DAYS);
}

/** phi: 0 when the monitoring check is 90 or more days overdue (the claim has lapsed), otherwise 1. Multiplies the counted benefit. */
export const phi = (p: Pick<ProjectRecord, "lastMonitoringCheck">, today: string = DEMO_TODAY): 0 | 1 =>
  monitoringOverdueDays(p, today) >= MONITORING_EXPIRY_DAYS ? 0 : 1;

/** The plain sentence for a project's monitoring state, or null when it has no overdue check. Generated from the dates, never typed. */
export function monitoringNote(p: Pick<ProjectRecord, "lastMonitoringCheck">, today: string = DEMO_TODAY): string | null {
  const days = monitoringOverdueDays(p, today);
  if (days === 0) return null;
  return phi(p, today) === 0
    ? `Monitoring check ${days} days overdue. The claim lapsed at ${MONITORING_EXPIRY_DAYS} days, so none of its benefit counts.`
    : `Monitoring check ${days} days overdue; claim lapses at ${MONITORING_EXPIRY_DAYS} days`;
}

export interface ProjectBenefit {
  /** True when the monitoring check is 90 or more days overdue, so the claim counts nothing (phi = 0). */
  lapsed: boolean;
  /** The claimed amount after attribution f: 50,000 x 50% = 25,000. */
  attributed: ClaimAmount;
  /** What counts today: the attributed amount after the evidence grade rule for Validated claims (grade C counts the low value), zero for Flagged and Not counted. */
  counted: ClaimAmount;
  /** Low value of the counted amount after the evidence grade rule. */
  low: ClaimAmount;
  /** True while the claim is Pending validation: shown at its attributed value but not yet accepted. */
  provisional: boolean;
}

const scale = (a: ClaimAmount, k: number): ClaimAmount =>
  a.unit === "kg" ? { unit: "kg", tss: a.tss * k, tn: a.tn * k, tp: a.tp * k } : { unit: a.unit, value: a.value * k };

export function projectBenefit(p: ProjectRecord): ProjectBenefit {
  const attributed = scale(p.claim, p.attribution);
  // V2 Section 2: a benefit counts only when it is Validated on an eligible claim. Evidence acceptance alone never counts it.
  const lapsed = phi(p) === 0;
  const counts = countsTowardPwi(p.states) && !lapsed;
  const counted = counts ? scale(attributed, countedValue(1, p.grade)) : scale(attributed, 0);
  const low = counts ? scale(attributed, lowValue(1, p.grade)) : scale(attributed, 0);
  return { attributed, counted, low, provisional: p.status === "Pending validation", lapsed };
}

/** "Attribution share 50%" for a shared claim, or null at full attribution. */
export const attributionNote = (p: ProjectRecord): string | null => (p.attribution < 1 ? `Attribution share ${Math.round(p.attribution * 100)}%` : null);

/** Accepted as a share of claimed; 0 when nothing is claimed. */
export const acceptedShare = (claimed: number, accepted: number) => (claimed ? accepted / claimed : 0);

export const projectsFor =(factoryId: FactoryId) => projects.filter((p) => p.factoryId === factoryId);

/**
 * The note shown on a claim. The data's note for a flagged claim is an internal pointer ("See validation script V1"),
 * so a person sees a plain sentence instead, written for their role. Every other note is shown as it is.
 */
export function displayNote(p: ProjectRecord, canValidate: boolean): string {
  if (p.status === "Flagged" && /validation script/i.test(p.note)) {
    return canValidate
      ? "Flagged. Open the Validation agent to see the checks behind this flag."
      : "Flagged by the brand. Upload evidence to respond.";
  }
  // The monitoring state is generated from the dates, after any typed note.
  return [p.note, monitoringNote(p)].filter(Boolean).join("; ");
}

export function statusCounts(list: ProjectRecord[] = projects): Record<ProjectStatus, number> {
  return Object.fromEntries(PROJECT_STATUSES.map((s) => [s, list.filter((p) => p.status === s).length])) as Record<ProjectStatus, number>;
}

/** Claims awaiting validation: projects that are Pending validation or Flagged. */
export const awaitingValidation = (list: ProjectRecord[] = projects) =>
  list.filter((p) => p.status === "Pending validation" || p.status === "Flagged").length;

/** Totals per unit, never mixed (m3, people, kg). Mass is summed per pollutant. */
export function totalsByUnit(list: ProjectRecord[], pick: "claimed" | "counted") {
  const total = { m3: 0, people: 0, kg: { tss: 0, tn: 0, tp: 0 } };
  for (const p of list) {
    const a = pick === "claimed" ? scale(p.claim, p.attribution) : projectBenefit(p).counted;
    if (a.unit === "kg") { total.kg.tss += a.tss; total.kg.tn += a.tn; total.kg.tp += a.tp; }
    else total[a.unit] += a.value;
  }
  return total;
}

/** Additionality Gate: counted benefits against those excluded, each exclusion with its reason. */
export function additionalityGate(factoryId: FactoryId) {
  const list = projectsFor(factoryId);
  return {
    counted: list.filter((p) => p.status !== "Not counted"),
    excluded: list.filter((p) => p.status === "Not counted").map((p) => ({ project: p, reason: p.gateReason ?? ("No baseline" as const) })),
  };
}

export const documentsForFactory = (factoryId: FactoryId): DocumentRecord[] => documents.filter((d) => d.factoryId === factoryId);

export function readinessCounts(list: DocumentRecord[]): Record<ReadinessState, number> {
  return Object.fromEntries(READINESS_STATES.map((s) => [s, list.filter((d) => d.state === s).length])) as Record<ReadinessState, number>;
}

/**
 * Readiness (V2 4.2): the share of a factory's documents that are Ready. Informational. It informs delivery sequencing only
 * and never filters, sorts by default, or reduces rank. 0 when a factory has no documents.
 */
export function readinessShare(factoryId: FactoryId): number {
  const list = documentsForFactory(factoryId);
  return list.length ? list.filter((d) => d.state === "Ready").length / list.length : 0;
}

/** Trust score of a field inspection: steps passed over steps taken. */
export const trustScore = (i: InspectionRecord) => i.passed / i.steps;

/** What is not a pass in a report: failed and warned steps from the step detail, and steps that did not pass with no detail recorded. */
export function inspectionIssues(i: InspectionRecord) {
  const detail = i.stepDetail ?? [];
  const fails = detail.filter((s) => s.result === "Fail").length;
  const warns = detail.filter((s) => s.result === "Warn").length;
  const unresolved = Math.max(0, i.steps - i.passed - fails - warns);
  return { fails, warns, unresolved };
}

/**
 * The status of a field inspection report, derived rather than stored:
 *  - the latest review action decides: a retake request gives "Rejected steps"; an override with a reason or a confirm gives "Validated";
 *  - with no review action, any failed step (or a step that did not pass and has no detail) or any warning gives "Needs review";
 *  - a report with every step passed is "Validated".
 */
export function inspectionStatus(i: InspectionRecord): InspectionStatus {
  const last = i.reviewLog?.[i.reviewLog.length - 1];
  if (last) return last.action === "retake" ? "Rejected steps" : "Validated";
  const { fails, warns, unresolved } = inspectionIssues(i);
  return fails + warns + unresolved > 0 ? "Needs review" : "Validated";
}

export type ReviewAction =
  | { action: "confirm"; user: string; time: string }
  | { action: "override"; user: string; time: string; reason: string }
  | { action: "retake"; user: string; time: string; step: number };
export type ReviewResult = { ok: true; inspection: InspectionRecord } | { ok: false; error: string };

/**
 * A manager's review action on a report: confirm, override with a reason, or request a retake. Returns the report with the action
 * logged (who, when, and the reason or step), or an error and no change.
 *  - confirm: only a report with no failed step can be confirmed.
 *  - override: a reason is required, and is logged with the user and time.
 *  - retake: names a failed or warned step from the step detail; the report becomes "Rejected steps".
 */
export function reviewInspection(i: InspectionRecord, a: ReviewAction): ReviewResult {
  if (!a.user.trim()) return { ok: false, error: "A reviewer name is required." };
  if (!a.time.trim()) return { ok: false, error: "A time is required." };
  const { fails, warns, unresolved } = inspectionIssues(i);
  if (fails + warns + unresolved === 0 && !i.reviewLog?.length) return { ok: false, error: `${i.id} has no failed or warned steps. There is nothing to review.` };
  let entry: InspectionReview;
  if (a.action === "confirm") {
    if (fails + unresolved > 0) return { ok: false, error: "A failed step cannot be confirmed. Override with a reason or request a retake." };
    entry = { action: "confirm", user: a.user, time: a.time };
  } else if (a.action === "override") {
    if (!a.reason.trim()) return { ok: false, error: "A reason is required to override." };
    entry = { action: "override", user: a.user, time: a.time, reason: a.reason.trim() };
  } else {
    const step = i.stepDetail?.find((s) => s.n === a.step && s.result !== "Pass");
    if (!step) return { ok: false, error: `Step ${a.step} is not a failed or warned step of ${i.id}.` };
    entry = { action: "retake", user: a.user, time: a.time, step: a.step };
  }
  return { ok: true, inspection: { ...i, reviewLog: [...(i.reviewLog ?? []), entry] } };
}

export const inspectionsFor = (factoryId: FactoryId) => inspections.filter((i) => i.factoryId === factoryId);
