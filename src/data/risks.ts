import type { RiskCategory, RiskCode } from "@/src/lib/types";
import type { RiskScoreRecord, RiskScores } from "./types";

// PRODUCT 5.6: Aqueduct 0 to 5 scores. `bws50` is the 2050 water stress score.
const s = (
  bws: number, bwd: number, iav: number, sev: number, gtd: number, drr: number, rfr: number,
  cfr: number, udw: number, usa: number, ucw: number, rri: number, cep: number, tex: number, bws50: number,
): RiskScores => ({ bws, bwd, iav, sev, gtd, drr, rfr, cfr, udw, usa, ucw, rri, cep, tex, bws50 });

// V2 4.2: F10 coastal flood has no data (R unchanged: the flood pillar still has riverine flood). F11 coastal eutrophication
// could not be assessed (it is outside R and the counts). Scores are kept for the record but not used where a gap is set.
export const riskScores: RiskScoreRecord[] = [
  { factoryId: "F01", scores: s(2.09, 2.6, 3.0, 3.9, 3.8, 4.05, 3.0, 0.0, 2.4, 3.4, 2.5, 3.6, 1.91, 4.05, 2.59) },
  { factoryId: "F02", scores: s(4.0, 3.6, 3.1, 3.4, 3.95, 3.75, 2.5, 0.0, 1.9, 2.9, 2.5, 3.6, 1.86, 3.85, 4.5) },
  { factoryId: "F03", scores: s(2.5, 2.1, 1.6, 1.9, 2.5, 3.0, 2.0, 0.0, 2.0, 3.0, 2.5, 3.6, 1.58, 2.9, 3.0) },
  { factoryId: "F04", scores: s(3.75, 3.35, 2.85, 3.15, 3.75, 3.5, 2.5, 0.0, 2.0, 3.0, 2.5, 3.6, 1.82, 3.7, 4.25) },
  { factoryId: "F05", scores: s(3.0, 2.6, 2.1, 2.4, 2.95, 3.0, 2.5, 0.0, 1.9, 2.9, 2.5, 3.6, 1.67, 3.2, 3.5) },
  { factoryId: "F06", scores: s(3.75, 3.35, 2.85, 3.15, 3.45, 3.0, 2.5, 0.0, 2.4, 3.4, 2.5, 3.6, 1.79, 3.6, 4.25) },
  { factoryId: "F07", scores: s(2.0, 1.6, 1.1, 1.4, 2.45, 2.5, 1.5, 0.0, 1.9, 2.9, 2.5, 3.6, 1.48, 2.55, 2.5) },
  { factoryId: "F08", scores: s(1.5, 1.1, 0.6, 0.9, 1.5, 2.0, 1.25, 0.0, 0.75, 1.75, 2.5, 3.6, 1.28, 1.9, 2.0) },
  { factoryId: "F09", scores: s(3.0, 2.6, 2.1, 2.4, 3.5, 3.25, 2.25, 0.0, 2.75, 3.75, 2.5, 3.6, 1.75, 3.45, 3.5) },
  { factoryId: "F10", scores: s(2.75, 2.35, 1.85, 2.15, 2.75, 2.75, 2.0, 0.0, 2.5, 3.5, 2.5, 3.6, 1.62, 3.05, 3.25), gaps: { cfr: "No data" } },
  { factoryId: "F11", scores: s(1.75, 1.35, 0.85, 1.15, 1.7, 2.25, 1.5, 0.0, 1.4, 2.4, 2.5, 3.6, 1.37, 2.2, 2.25), gaps: { cep: "Error" } },
  { factoryId: "F12", scores: s(4.75, 4.35, 3.85, 4.15, 3.95, 4.0, 4.5, 3.6, 2.4, 3.4, 2.5, 3.6, 2.06, 4.5, 5.0) },
  { factoryId: "F13", scores: s(4.25, 3.85, 3.35, 3.65, 3.7, 3.75, 4.5, 0.0, 2.4, 3.4, 2.5, 3.6, 1.99, 4.25, 4.75) },
  { factoryId: "F14", scores: s(3.0, 2.6, 2.1, 2.4, 2.7, 3.25, 3.75, 2.85, 1.65, 2.65, 2.5, 3.6, 1.72, 3.35, 3.5) },
];

export interface RiskCatalogueEntry {
  code: RiskCode; name: string; shortName: string; category: RiskCategory;
  /** Country-level indicators are identical across sites and not used for within-country ranking. */
  countryLevel: boolean;
}

// Names and chip labels follow PRODUCT 4.2 and 4.4. The category split is my reading of the Aqueduct groups
// and the five groups named in 4.4; the spec does not assign each indicator to a group.
export const riskCatalogue: RiskCatalogueEntry[] = [
  { code: "bws", name: "Baseline water stress", shortName: "Water stress", category: "Physical quantity", countryLevel: false },
  { code: "bwd", name: "Baseline water depletion", shortName: "Water depletion", category: "Physical quantity", countryLevel: false },
  { code: "iav", name: "Interannual variability", shortName: "Interannual variability", category: "Physical quantity", countryLevel: false },
  { code: "sev", name: "Seasonal variability", shortName: "Seasonal variability", category: "Physical quantity", countryLevel: false },
  { code: "gtd", name: "Groundwater table decline", shortName: "Groundwater decline", category: "Physical quantity", countryLevel: false },
  { code: "drr", name: "Drought risk", shortName: "Drought", category: "Physical quantity", countryLevel: false },
  { code: "rfr", name: "Riverine flood risk", shortName: "Flood", category: "Physical quantity", countryLevel: false },
  { code: "cfr", name: "Coastal flood risk", shortName: "Coastal flood", category: "Physical quantity", countryLevel: false },
  { code: "ucw", name: "Untreated connected wastewater", shortName: "Untreated wastewater", category: "Physical quality", countryLevel: true },
  { code: "cep", name: "Coastal eutrophication potential", shortName: "Coastal eutrophication", category: "Physical quality", countryLevel: false },
  { code: "udw", name: "Unimproved and no drinking water", shortName: "Drinking water", category: "Downstream", countryLevel: false },
  { code: "usa", name: "Unimproved and no sanitation", shortName: "Sanitation", category: "Downstream", countryLevel: false },
  { code: "rri", name: "RepRisk country ESG risk index", shortName: "Reputational risk", category: "Regulatory and reputational", countryLevel: true },
  { code: "tex", name: "Overall water risk, textile weighting", shortName: "Overall textile risk", category: "Composite", countryLevel: false },
];

/** PRODUCT 4.4 golden test: the only raw (non-score) values the spec gives. Other sites show the score only. */
export const rawRiskValues: Record<string, Partial<Record<RiskCode, string>>> = {
  F01: { bws: "20.9%", drr: "0.81", usa: "47.8%" },
};
