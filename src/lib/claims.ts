import { documents } from "@/src/data/documents";
import { inspections } from "@/src/data/inspections";
import { projects } from "@/src/data/projects";
import type { ClaimAmount, DocumentRecord, InspectionRecord, ProjectRecord } from "@/src/data/types";
import { lowValue } from "./pwi";
import type { FactoryId, ProjectStatus, ReadinessState } from "./types";

// PRODUCT 4.4 (Projects, Evidence), 4.6 (Claims) and 5.10 to 5.11. Counted and low values are computed here.

export const PROJECT_STATUSES: readonly ProjectStatus[] = ["Validated", "Pending validation", "Flagged", "Not counted"];
export const READINESS_STATES: readonly ReadinessState[] = ["Ready", "Missing", "Failed check", "Expired / out of period", "Low confidence"];

export interface ProjectBenefit {
  /** The claimed amount after attribution f: 50,000 x 50% = 25,000. */
  attributed: ClaimAmount;
  /** What counts today: the attributed amount for Validated claims, zero for Flagged and Not counted. */
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
  const counts = p.status === "Validated";
  const counted = counts ? attributed : scale(attributed, 0);
  const low = counts ? scale(attributed, lowValue(1, p.grade)) : scale(attributed, 0);
  return { attributed, counted, low, provisional: p.status === "Pending validation" };
}

export const projectsFor = (factoryId: FactoryId) => projects.filter((p) => p.factoryId === factoryId);

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
  return p.note;
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

/** Trust score of a field inspection: steps passed over steps taken. */
export const trustScore = (i: InspectionRecord) => i.passed / i.steps;

export const inspectionsFor = (factoryId: FactoryId) => inspections.filter((i) => i.factoryId === factoryId);
