import type { LedgerEntry, ProjectRecord } from "@/src/data/types";
import { projectBenefit, projectsFor } from "./claims";
import { fmtCellScore, fmtInt, fmtPct1, fmtScore, fmtScore3, round } from "./format";
import { METHOD_VERSION } from "./impact";
import { fmtClaim, fmtMeasure, measureNote } from "./measure";
import { GRADE_FACTORS, PILLAR_NAMES, REMOVAL_TARGET, type PwiCell } from "./pwi";
import { DEFAULT_WEIGHTS, PILLAR_KEYS, PILLAR_LABELS } from "./risk";
import type { Site } from "./selectors";
import { CORRELATION_NOTE, INTERNAL_STATUS_NOTE, STATUS_BAND_LABEL, UNCERTAINTY_STATUS, uncertaintyRange } from "./statusCopy";
import type { CellGrade, Pillar } from "./types";

// Content for the "Where this number comes from" drawer (PRODUCT 1, DESIGN 4.12): value, formula, inputs with
// citations, method version and confidence grade. Every figure on the factory page links to one of these.

export interface TraceInput { label: string; value: string; cite?: string }
export interface Trace {
  title: string;
  value: string;
  formula: string[];
  inputs: TraceInput[];
  method: { name: string; version?: string };
  grade: { grade: CellGrade; meaning: string } | null;
  note?: string;
}

/** One line on what the evidence grade means for the figure (PRODUCT 6.5). */
export const GRADE_MEANING: Record<CellGrade, string> = {
  A: "Central value counts. Evidence is strong and independently verified.",
  B: "Central value counts. Evidence is on file.",
  C: "Lower bound counts. The central value is shown beside it.",
  D: "Shown, but scores zero until better evidence is on file.",
  none: "No evidence is on file, so nothing is counted.",
};
const gradeOf = (g: CellGrade) => ({ grade: g, meaning: GRADE_MEANING[g] });

const MODULE_IMPACT = "Module 03 · Impact";
const MODULE_RISK = "Module 01 · Basin Risk";
const PWI_METHOD = { name: "Positive Water Impact", version: METHOD_VERSION } as const;

export const cellLabel = (pillar: Pillar, dimension: string) => `${pillar} ${dimension}`;

/** What a cell shows on hover: target, delivered and the formula that gives its score. */
export function cellDetail(cell: PwiCell): { target: string | null; delivered: string | null; formula: string } {
  const target = cell.target ? `${fmtMeasure(cell.target)} ${measureNote(cell.target)}`.trim() : null;
  const delivered = cell.delivered ? `${fmtMeasure(cell.delivered)} ${measureNote(cell.delivered)}`.trim() : null;
  const formula =
    cell.pillar === "P1" && cell.dimension === "Quality"
      ? `Score = average of min(1, removal ÷ ${REMOVAL_TARGET * 100}%) for TSS, TN and TP = ${fmtCellScore(cell.score)}`
      : cell.target && cell.delivered
        ? `Score = min(1, delivered ÷ target) = ${fmtCellScore(cell.score)}`
        : `Entered cell score = ${fmtCellScore(cell.score)}`;
  return { target, delivered, formula };
}

export function traceSitePwi(site: Site): Trace {
  const p = site.pwi;
  return {
    title: "Site PWI (counted)",
    value: fmtPct1(p.sitePwi),
    formula: [
      "Site PWI = (P1 + P2 + P3) ÷ 3, from counted cell scores",
      "Counted cell score: the central score for evidence grade A and B, the low value (central × 0.70) for grade C, zero for grade D",
      "Pillar score P = 0.40 × Availability + 0.30 × Accessibility + 0.30 × Quality",
    ],
    inputs: [
      { label: "P1, site (counted)", value: fmtScore3(p.pillars.P1), cite: MODULE_IMPACT },
      { label: "P2, sub-basin (counted)", value: fmtScore3(p.pillars.P2), cite: MODULE_IMPACT },
      { label: "P3, basin (counted)", value: fmtScore3(p.pillars.P3), cite: MODULE_IMPACT },
      { label: "Site PWI, central", value: fmtPct1(p.sitePwiCentral), cite: MODULE_IMPACT },
      { label: "Site confidence", value: fmtScore(p.confidence), cite: "Factory master" },
    ],
    method: PWI_METHOD, grade: gradeOf(site.evidenceGrade),
    note: `Counted ${fmtPct1(p.sitePwi)}, central ${fmtPct1(p.sitePwiCentral)}, low value ${fmtPct1(p.sitePwiLow)}.`,
  };
}

export function tracePillar(site: Site, pillar: Pillar): Trace {
  const cells = site.pwi.cells.filter((c) => c.pillar === pillar);
  return {
    title: `Pillar ${pillar}, ${PILLAR_NAMES[pillar].toLowerCase()} (counted)`,
    value: fmtScore3(site.pwi.pillars[pillar]),
    formula: ["P = 0.40 × Availability + 0.30 × Accessibility + 0.30 × Quality, from counted cell scores"],
    inputs: cells.map((c) => ({ label: `${c.dimension} (counted)`, value: fmtCellScore(c.counted), cite: MODULE_IMPACT })),
    method: PWI_METHOD, grade: gradeOf(site.evidenceGrade),
    note: `Central ${fmtScore3(site.pwi.pillarsCentral[pillar])}. Counted equals central for evidence grade A and B.`,
  };
}

const feeding = (factoryId: string, cell: PwiCell): ProjectRecord[] =>
  projectsFor(factoryId).filter((p) => p.pillar === cell.pillar && p.dimension === cell.dimension && p.status !== "Not counted");

export function traceCell(site: Site, cell: PwiCell): Trace {
  const d = cellDetail(cell);
  const inputs: TraceInput[] = [];
  if (d.target) inputs.push({ label: "Target", value: d.target, cite: "Frozen baseline and targets" });
  if (d.delivered) inputs.push({ label: "Delivered (counted)", value: d.delivered, cite: MODULE_IMPACT });
  for (const b of cell.breakdown) inputs.push({ label: b.label, value: b.unit === "m3" ? `${fmtInt(b.value)} m³` : `${fmtInt(b.value)} ${b.unit}` });
  for (const p of feeding(site.id, cell)) inputs.push({ label: p.name, value: `${fmtClaim(p.claim)} claimed`, cite: p.id });
  if (cell.state !== "Scored") inputs.push({ label: "Cell state", value: cell.stateNote ? `${cell.state}: ${cell.stateNote}` : cell.state });
  return {
    title: `${cellLabel(cell.pillar, cell.dimension)} cell`,
    value: fmtCellScore(cell.score),
    formula: [d.formula],
    inputs, method: PWI_METHOD, grade: gradeOf(cell.grade),
    note: `Low value after the evidence grade rule: ${fmtCellScore(cell.low)}.`,
  };
}

export function traceVolumetric(site: Site): Trace {
  const a = (p: Pillar) => site.pwi.cells.find((c) => c.pillar === p && c.dimension === "Availability")!.counted;
  return {
    title: "Volumetric balance (counted)",
    value: fmtPct1(site.pwi.volumetricBalance),
    formula: ["(B_A1 + B_A2 + B_A3) ÷ RN = 0.2 × S_A1 + 0.4 × S_A2 + 0.4 × S_A3"],
    inputs: [
      { label: "Site Availability score, S_A1", value: fmtCellScore(a("P1")), cite: MODULE_IMPACT },
      { label: "Sub-basin Availability score, S_A2", value: fmtCellScore(a("P2")), cite: MODULE_IMPACT },
      { label: "Basin Availability score, S_A3", value: fmtCellScore(a("P3")), cite: MODULE_IMPACT },
      { label: "Replenishment needed, RN", value: `${fmtInt(site.replenishmentNeededM3)} m³`, cite: "Factory master" },
    ],
    method: PWI_METHOD, grade: gradeOf(site.evidenceGrade),
    note: `Central ${fmtPct1(site.pwi.volumetricBalanceCentral)}. Over 100% means more water was returned than consumed. It is shown apart from PWI and is not part of it.`,
  };
}

export function traceConfidence(site: Site): Trace {
  return {
    title: "Site confidence",
    value: fmtScore(site.pwi.confidence),
    formula: [
      "Internal status band, checked in order:",
      "Under 0.50: Low confidence",
      "PWI of 1.00 or more and confidence of 0.75 or more: Self-certified (internal only)",
      "PWI of 0.80 or more and confidence of 0.75 or more: Conditional",
      "PWI of 0.60 or more and confidence of 0.50 or more: In progress",
      "Otherwise: Not achieved",
    ],
    inputs: [
      { label: "Site PWI (counted)", value: fmtPct1(site.pwi.sitePwi), cite: MODULE_IMPACT },
      { label: "Site PWI (central)", value: fmtPct1(site.pwi.sitePwiCentral), cite: MODULE_IMPACT },
      { label: STATUS_BAND_LABEL, value: `${site.pwi.statusBand}. ${INTERNAL_STATUS_NOTE}` },
      { label: "Evidence grade", value: site.evidenceGrade },
      { label: "Uncertainty range", value: `${fmtPct1(uncertaintyRange(site.pwi.sitePwiCentral, site.evidenceGrade).low)} to ${fmtPct1(uncertaintyRange(site.pwi.sitePwiCentral, site.evidenceGrade).high)} (${UNCERTAINTY_STATUS})` },
      { label: "Correlations", value: CORRELATION_NOTE },
    ],
    method: PWI_METHOD, grade: gradeOf(site.evidenceGrade),
    note: "Net Positive claims need external assurance.",
  };
}

export function traceRisk(site: Site): Trace {
  return {
    title: "Risk score R",
    value: fmtScore(site.R),
    formula: [
      "R = sum of weight × pillar value",
      "Each pillar is its worst indicator on the 0 to 5 scale, divided by 5.",
      "Country-level risks, coastal eutrophication and the textile composite are never used in R.",
    ],
    inputs: PILLAR_KEYS.map((k) => ({
      label: `${PILLAR_LABELS[k]} (weight ${fmtScore(DEFAULT_WEIGHTS[k])})`,
      value: fmtScore(site.pillars[k]), cite: MODULE_RISK,
    })),
    method: { name: "Basin Risk, Aqueduct 4.0 indicators" }, grade: null,
    note: `Band ${site.band}: R of 0.60 or more is Band 1, 0.40 up to 0.60 is Band 2, below 0.40 is Band 3.`,
  };
}

export function traceFootprint(site: Site): Trace {
  return {
    title: "Footprint I",
    value: site.footprintI === null ? "Pending" : fmtScore(site.footprintI),
    formula: ["I is the site's impact score, from 0 to 1. A footprint of 0.50 or more is large."],
    inputs: [{ label: "Impact score I", value: site.footprintI === null ? "Pending" : fmtScore(site.footprintI), cite: "Factory master" }],
    method: { name: "Site Prioritisation" }, grade: null,
    note: "In this demo I is a fixed input. How I is normalised is still open in the PRD.",
  };
}

/** A ledger entry as a traceable figure (used by the copilot's "why did P2 drop" answer). */
export function traceLedgerEntry(e: LedgerEntry): Trace {
  return {
    title: `Ledger entry ${e.id}`,
    value: e.p2Availability !== undefined ? fmtCellScore(e.p2Availability) : e.period,
    formula: [e.what],
    inputs: [
      { label: "Period", value: e.period, cite: "Impact Ledger" },
      { label: "Entry status", value: e.entryStatus },
      { label: "Period status", value: e.periodStatus },
      ...(e.desiltingFills !== undefined ? [{ label: "Desilting fills per year", value: String(e.desiltingFills) }] : []),
    ],
    method: PWI_METHOD, grade: null,
  };
}

export function traceProject(p: ProjectRecord): Trace {
  const b = projectBenefit(p);
  const factor = GRADE_FACTORS[p.grade];
  return {
    title: `${p.name} (${p.id})`,
    value: fmtClaim(b.counted),
    formula: [
      "Attributed benefit = claimed benefit × attribution share f",
      "Counted = attributed benefit once the claim is Validated, after the evidence grade rule (grade C counts the low value); zero if Flagged or Not counted",
      `Low value = counted × grade factor (${p.grade === "none" ? "none" : p.grade}: ${round(factor, 2)})`,
    ],
    inputs: [
      { label: "Claimed", value: fmtClaim(p.claim), cite: p.id },
      { label: "Attribution share f", value: `${Math.round(p.attribution * 100)}%` },
      { label: "Attributed", value: fmtClaim(b.attributed) },
      { label: "Status", value: p.status },
      { label: "Low value", value: fmtClaim(b.low) },
      { label: "Method", value: p.method },
    ],
    method: PWI_METHOD, grade: gradeOf(p.grade),
    note: p.note || undefined,
  };
}
