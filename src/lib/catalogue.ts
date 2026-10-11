import { CRITERIA, GATE_LABELS, liteFindings, opportunities, type Gates, type LiteFinding, type Opportunity } from "@/src/data/opportunities";

// V2 Sections 10 and 11. Two-stage evaluation: mandatory gates first, weighted attractiveness second.
// A failed gate is never cancelled by a high score. Scores are demonstration weights; rubric adaptation is pending.

export const failedGates = (g: Gates): { key: keyof Gates; label: string; result: "Fail" | "Unknown" }[] =>
  (Object.keys(g) as (keyof Gates)[]).filter((k) => g[k] !== "Pass").map((k) => ({ key: k, label: GATE_LABELS[k], result: g[k] as "Fail" | "Unknown" }));

export const gatesPass = (g: Gates) => failedGates(g).length === 0;

/** Weighted attractiveness on a 0 to 5 scale. */
export const weightedScore = (scores: readonly number[]) => CRITERIA.reduce((sum, c, i) => sum + c.weight * scores[i], 0);

export interface RankedOpportunity { opportunity: Opportunity; eligible: boolean; weighted: number; failed: ReturnType<typeof failedGates> }

/** Eligible opportunities first (highest score first), then the ineligible ones (highest score first). */
export function rankOpportunities(list: Opportunity[] = opportunities): RankedOpportunity[] {
  const rows = list.map((o) => ({ opportunity: o, eligible: gatesPass(o.gates), weighted: weightedScore(o.scores), failed: failedGates(o.gates) }));
  return rows.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.weighted - a.weighted || a.opportunity.id.localeCompare(b.opportunity.id));
}

export const opportunityById = (id: string) => opportunities.find((o) => o.id === id);

// ---- Hydris Lite import (V2 Section 10) ---------------------------------------------------------------------------------

/** Idempotent import key: source assessment, finding and factory. */
export const importKey = (f: Pick<LiteFinding, "sourceAssessmentId" | "id" | "factoryId">) => `${f.sourceAssessmentId}|${f.id}|${f.factoryId}`;

export type ImportMap = Record<string, string>;

/** Imports already present in the demo data (LITE-0144 is imported as OPP-0144). */
export const initialImports = (): ImportMap =>
  Object.fromEntries(liteFindings.filter((f) => f.importedAs).map((f) => [importKey(f), f.importedAs as string]));

export interface ImportResult { imports: ImportMap; opportunityId: string; created: boolean; message: string }

/** Importing the same finding twice creates no duplicate: the second call returns the existing record. */
export function importFinding(imports: ImportMap, finding: LiteFinding): ImportResult {
  const key = importKey(finding);
  const existing = imports[key];
  if (existing) return { imports, opportunityId: existing, created: false, message: `Already imported as ${existing}. No duplicate created.` };
  return { imports: { ...imports, [key]: finding.candidate }, opportunityId: finding.candidate, created: true, message: `Imported as ${finding.candidate}.` };
}

/** Lineage strip (V2 10): Lite finding, Opportunity, Scenario, Business case, Delivery, Measured result. */
export const LINEAGE_STEPS = ["Lite finding", "Opportunity", "Scenario", "Business case", "Delivery", "Measured result"] as const;
