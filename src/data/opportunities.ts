import type { FactoryId, Pillar, Dimension } from "@/src/lib/types";

// V2 Sections 10 to 12. Hydris Lite findings, project opportunities and the catalogue. All forecast numbers, costs and
// scores are demonstration estimates. Weighted scores are computed in src/lib/catalogue.ts, never stored.

export interface LiteFinding {
  id: string; factoryId: FactoryId; finding: string;
  sourceAssessmentId: string; assessmentDate: string; version: string;
  /** The opportunity this finding becomes when imported. */
  candidate: string;
  /** Set when the demo data already holds an import of this finding. */
  importedAs?: string;
  /** Short input table kept with the imported opportunity. */
  inputData: [label: string, value: string][];
  evidenceLinks: string[];
}

export const liteFindings: LiteFinding[] = [
  {
    id: "LITE-0187", factoryId: "F12", finding: "Rinse-line water can be recovered (48 m3/day, TDS 1,800 mg/L)",
    sourceAssessmentId: "LA-0187", assessmentDate: "12 Aug 2026", version: "v3.2", candidate: "OPP-D",
    inputData: [["Rinse-line flow", "48 m3/day"], ["TDS", "1,800 mg/L"]], evidenceLinks: ["LA-0187 assessment report"],
  },
  {
    id: "LITE-0188", factoryId: "F12", finding: "Cooling blowdown can be recovered; shares a stream with LITE-0187",
    sourceAssessmentId: "LA-0187", assessmentDate: "12 Aug 2026", version: "v3.2", candidate: "OPP-E",
    inputData: [["Shared stream", "Rinse line (LITE-0187)"]], evidenceLinks: ["LA-0187 assessment report"],
  },
  {
    id: "LITE-0231", factoryId: "F04", finding: "Nitrogen removal 74% against 90% target",
    sourceAssessmentId: "LA-0231", assessmentDate: "30 Aug 2026", version: "v3.2", candidate: "OPP-0231",
    inputData: [["TN removal", "74%"], ["Target", "90%"]], evidenceLinks: ["LA-0231 assessment report"],
  },
  {
    id: "LITE-0302", factoryId: "F06", finding: "ETP aeration under-performs; OCEMS offline 9 days",
    sourceAssessmentId: "LA-0302", assessmentDate: "14 Sep 2026", version: "v3.1", candidate: "OPP-0302",
    inputData: [["OCEMS offline", "9 days"]], evidenceLinks: ["LA-0302 assessment report"],
  },
  {
    id: "LITE-0144", factoryId: "F02", finding: "Dye-bath reuse potential 18,000 m3/yr",
    sourceAssessmentId: "LA-0144", assessmentDate: "2 Jul 2026", version: "v3.0", candidate: "OPP-0144", importedAs: "OPP-0144",
    inputData: [["Reuse potential", "18,000 m3/yr"]], evidenceLinks: ["LA-0144 assessment report"],
  },
];

export type GateResult = "Pass" | "Fail" | "Unknown";
export interface Gates {
  insidePolygon: GateResult; hydrologicallyConnected: GateResult; collectiveAction: GateResult;
  baselineDefinable: GateResult; additional: GateResult; measurementFeasible: GateResult;
}
export const GATE_LABELS: Record<keyof Gates, string> = {
  insidePolygon: "Inside eligible pillar polygon", hydrologicallyConnected: "Hydrologically connected",
  collectiveAction: "Collective-action eligibility", baselineDefinable: "Baseline and counterfactual definable",
  additional: "Additional to legal requirement", measurementFeasible: "Measurement plan feasible",
};

export type ForecastBenefit =
  | { unit: "m3"; value: number }
  | { unit: "people"; value: number }
  | { unit: "kg"; tss: number; tn: number; tp: number }
  /** Added percentage points of pollutant removal at the ETP (P1 Quality), capped at 100% removal when scored. */
  | { unit: "removal"; tss: number; tn: number; tp: number };

export type OpportunityType = "Nature-based" | "Effluent treatment" | "Community / access" | "Reuse / efficiency";

export interface Opportunity {
  id: string; factoryId: FactoryId; name: string; type: OpportunityType;
  pillar: Pillar; dimension: Dimension;
  forecast: ForecastBenefit; uncertainty: number;
  capexLakh: number; omLakh: number; savingsLakh: number; timingMonths: number;
  /** Criterion scores 0 to 5: Impact, Cost-effectiveness, Delivery readiness, Measurability, Community. */
  scores: [number, number, number, number, number];
  gates: Gates;
  /** Water shared with another opportunity (m3/yr), subtracted once when both are chosen. */
  overlap?: { with: string; m3: number };
  /** Lite finding this opportunity came from, if any. */
  sourceFindingId?: string;
  measurementNeeds: string;
  /** Who is expected to pay. Shares are 0 to 1. Missing means "To be agreed". Never creates claim entitlement (PRD V2 A05). */
  funding?: Funding;
}

export type Funder = "Supplier" | "Brand" | "Shared" | "To be agreed";
export interface Funding { funder: Funder; supplierShare: number | null; brandShare: number | null }

// Funding: illustrative, demo only. On-site savings-backed measures are supplier-funded; basin projects are shared.
const SUPPLIER_FUNDED: Funding = { funder: "Supplier", supplierShare: 1, brandShare: 0 };
const SHARED_HALF: Funding = { funder: "Shared", supplierShare: 0.5, brandShare: 0.5 };
const TO_BE_AGREED: Funding = { funder: "To be agreed", supplierShare: null, brandShare: null };

const ALL_PASS: Gates = {
  insidePolygon: "Pass", hydrologicallyConnected: "Pass", collectiveAction: "Pass",
  baselineDefinable: "Pass", additional: "Pass", measurementFeasible: "Pass",
};

export const opportunities: Opportunity[] = [
  { id: "OPP-A", factoryId: "F12", name: "Wetland phase 2, Pallikaranai buffer", type: "Nature-based", pillar: "P3", dimension: "Availability",
    forecast: { unit: "m3", value: 8000 }, uncertainty: 0.3, capexLakh: 95, omLakh: 5, savingsLakh: 0, timingMonths: 14, scores: [4, 3, 2, 3, 5], gates: ALL_PASS,
    funding: SHARED_HALF, measurementNeeds: "Annual satellite inundation and depth survey" },
  { id: "OPP-B", factoryId: "F12", name: "Constructed wetland polishing, Adyar tributary", type: "Effluent treatment", pillar: "P3", dimension: "Quality",
    forecast: { unit: "kg", tss: 1800, tn: 260, tp: 45 }, uncertainty: 0.3, capexLakh: 70, omLakh: 4, savingsLakh: 0, timingMonths: 9, scores: [4, 3, 3, 5, 3], gates: ALL_PASS,
    funding: SHARED_HALF, measurementNeeds: "Matched inlet and outlet flows with weekly lab results" },
  { id: "OPP-C", factoryId: "F12", name: "Community WASH extension, Adyar riverside", type: "Community / access", pillar: "P3", dimension: "Accessibility",
    forecast: { unit: "people", value: 600 }, uncertainty: 0.15, capexLakh: 40, omLakh: 2, savingsLakh: 0, timingMonths: 8, scores: [3, 4, 4, 4, 5], gates: ALL_PASS,
    funding: SHARED_HALF, measurementNeeds: "Quarterly functionality check and beneficiary list" },
  { id: "OPP-D", factoryId: "F12", name: "Rinse-water reuse", type: "Reuse / efficiency", pillar: "P1", dimension: "Availability",
    forecast: { unit: "m3", value: 6000 }, uncertainty: 0.15, capexLakh: 55, omLakh: 2, savingsLakh: 9, timingMonths: 6, scores: [3, 5, 5, 5, 1], gates: ALL_PASS,
    overlap: { with: "OPP-E", m3: 2500 }, sourceFindingId: "LITE-0187", funding: SUPPLIER_FUNDED, measurementNeeds: "Reuse meter on the rinse line" },
  { id: "OPP-E", factoryId: "F12", name: "Blowdown recovery", type: "Reuse / efficiency", pillar: "P1", dimension: "Availability",
    forecast: { unit: "m3", value: 4000 }, uncertainty: 0.15, capexLakh: 30, omLakh: 1.5, savingsLakh: 6, timingMonths: 5, scores: [2, 5, 5, 5, 1], gates: ALL_PASS,
    overlap: { with: "OPP-D", m3: 2500 }, sourceFindingId: "LITE-0188", funding: SUPPLIER_FUNDED, measurementNeeds: "Blowdown recovery meter" },
  { id: "OPP-F", factoryId: "F12", name: "Sub-basin recharge expansion", type: "Nature-based", pillar: "P2", dimension: "Availability",
    forecast: { unit: "m3", value: 5000 }, uncertainty: 0.3, capexLakh: 28, omLakh: 1, savingsLakh: 0, timingMonths: 7, scores: [3, 4, 4, 3, 3], gates: ALL_PASS,
    funding: TO_BE_AGREED, measurementNeeds: "Quarterly pit inspection and rainfall log" },
  { id: "OPP-H", factoryId: "F12", name: "ETP nitrogen upgrade", type: "Effluent treatment", pillar: "P1", dimension: "Quality",
    forecast: { unit: "removal", tss: 0, tn: 10, tp: 0 }, uncertainty: 0.3, capexLakh: 60, omLakh: 3.5, savingsLakh: 0, timingMonths: 9, scores: [3, 3, 4, 5, 2], gates: ALL_PASS,
    funding: SUPPLIER_FUNDED, measurementNeeds: "Weekly outlet TN lab results with the matched ETP flow log" },
  // V2 Section 11: scores well, but fails a mandatory gate, so it is listed after every eligible opportunity.
  { id: "OPP-G", factoryId: "F04", name: "Cauvery bank planting", type: "Nature-based", pillar: "P3", dimension: "Availability",
    forecast: { unit: "m3", value: 9000 }, uncertainty: 0.3, capexLakh: 22, omLakh: 1, savingsLakh: 0, timingMonths: 10, scores: [5, 4, 4, 4, 5],
    gates: { ...ALL_PASS, hydrologicallyConnected: "Fail", collectiveAction: "Unknown" },
    funding: TO_BE_AGREED, measurementNeeds: "Annual satellite inundation and depth survey" },
];

/** V2 11 criteria and demonstration weights (rubric adaptation pending). */
export const CRITERIA = [
  { key: "impact", label: "Impact potential", weight: 0.3 },
  { key: "cost", label: "Cost-effectiveness", weight: 0.25 },
  { key: "readiness", label: "Delivery readiness and timing", weight: 0.15 },
  { key: "measurability", label: "Measurability", weight: 0.15 },
  { key: "community", label: "Community and co-benefit", weight: 0.15 },
] as const;

export type CatalogueKind = "Reference case study" | "Reusable template" | "Actual opportunity";
export type CatalogueType = "Effluent treatment" | "Reuse" | "Efficiency" | "Nature-based" | "Community / access" | "Hybrid";
export interface CatalogueItem { id: string; kind: CatalogueKind; type: CatalogueType; name: string; note?: string }

export const catalogueItems: CatalogueItem[] = [
  { id: "TPL-01", kind: "Reusable template", type: "Nature-based", name: "Tank desilting" },
  { id: "TPL-02", kind: "Reusable template", type: "Nature-based", name: "Recharge pits" },
  { id: "TPL-03", kind: "Reusable template", type: "Effluent treatment", name: "Constructed wetland polishing" },
  { id: "TPL-04", kind: "Reusable template", type: "Community / access", name: "Community water point and toilets" },
  { id: "TPL-05", kind: "Reusable template", type: "Reuse", name: "Rinse-water recovery" },
  { id: "TPL-06", kind: "Reusable template", type: "Effluent treatment", name: "Tertiary polishing module" },
  { id: "TPL-07", kind: "Reusable template", type: "Hybrid", name: "Reuse plus recharge" },
  { id: "CS-01", kind: "Reference case study", type: "Nature-based", name: "Korattur tank desilting", note: "Result of PRJ-101" },
  { id: "CS-02", kind: "Reference case study", type: "Nature-based", name: "Pallikaranai marsh", note: "Result of PRJ-103" },
  { id: "CS-03", kind: "Reference case study", type: "Effluent treatment", name: "Tertiary polishing pilot plant", note: "TN removal 74% to 86%, illustrative" },
];

/** Per-opportunity tags used by the catalogue list. */
export const OPPORTUNITY_CATALOGUE_TYPE: Record<string, CatalogueType> = {
  "Nature-based": "Nature-based", "Effluent treatment": "Effluent treatment", "Community / access": "Community / access", "Reuse / efficiency": "Reuse",
};
