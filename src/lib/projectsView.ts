import { CRITERIA, type ForecastBenefit, type Opportunity } from "@/src/data/opportunities";
import { WATER_VALUE_RS_PER_M3 } from "@/src/data/scenarios";
import { fmtInt, fmtPct1 } from "./format";
import { opportunityById, type RankedOpportunity } from "./catalogue";
import { paybackLabel, type ScenarioResult } from "./scenarios";

// V2 Sections 11 and 12: the text and tables behind the Catalogue and Scenarios tabs. Every figure is formatted from the
// data in src/data and the results of src/lib/scenarios.ts. Everything here is a Forecast and a demo estimate.

export const FORECAST_TAG = "Forecast";
export const DEMO_ESTIMATE_TAG = "Demo estimate";
export const DEMO_NOTE = "Forecast. Demo estimates, not measured results.";

export const fmtLakh = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(2).replace(/0$/, "")} lakh`;
const signedLakh = (n: number) => (n < 0 ? `-${fmtLakh(-n)}` : fmtLakh(n));

export function fmtForecast(f: ForecastBenefit): string {
  return f.unit === "m3" ? `+${fmtInt(f.value)} m³/yr` : f.unit === "people" ? `+${fmtInt(f.value)} people`
    : f.unit === "removal" ? fmtRemoval(f, 1)
    : `TSS ${fmtInt(f.tss)}, TN ${fmtInt(f.tn)}, TP ${fmtInt(f.tp)} kg/yr`;
}
/** Added percentage points of removal, naming only the pollutants that move. */
const fmtRemoval = (f: { tss: number; tn: number; tp: number }, k: number) =>
  [["TSS", f.tss], ["TN", f.tn], ["TP", f.tp]].filter(([, v]) => (v as number) > 0).map(([n, v]) => `${n} +${fmtInt((v as number) * k)}`).join(", ") + " points of removal";
const pctOf = (u: number) => `±${Math.round(u * 100)}%`;
export const fmtOutcome = (o: Opportunity) => `${fmtForecast(o.forecast)} (${pctOf(o.uncertainty)})`;
const lowOf = (o: Opportunity): string => {
  const k = 1 - o.uncertainty, f = o.forecast;
  return f.unit === "m3" ? `${fmtInt(f.value * k)} m³/yr` : f.unit === "people" ? `${fmtInt(f.value * k)} people` : f.unit === "removal" ? fmtRemoval(f, k) : `TSS ${fmtInt(f.tss * k)}, TN ${fmtInt(f.tn * k)}, TP ${fmtInt(f.tp * k)} kg/yr`;
};

/** Payback for one opportunity on its own, using the same rule as a scenario. */
const standalonePayback = (o: Opportunity) => {
  const net = o.savingsLakh - o.omLakh;
  return net > 0 ? `${(o.capexLakh / net).toFixed(1)} years` : "No financial payback";
};

// ---- Catalogue card (V2 11): suitability, expected outcome, cost, timing, measurement needs, scoring reasons -------------

const CRITERION_REASON: Record<string, (o: Opportunity) => string> = {
  impact: (o) => `Forecast ${fmtForecast(o.forecast)} into ${o.pillar} ${o.dimension}.`,
  cost: (o) => `Capex ${fmtLakh(o.capexLakh)}, operating ${fmtLakh(o.omLakh)}/yr, savings ${fmtLakh(o.savingsLakh)}/yr.`,
  readiness: (o) => `About ${o.timingMonths} months to deliver.`,
  measurability: (o) => `Needs: ${o.measurementNeeds.charAt(0).toLowerCase()}${o.measurementNeeds.slice(1)}.`,
  community: (o) => (o.dimension === "Accessibility" ? "Directly reaches people living in the basin." : o.pillar === "P1" ? "On-site measure, little direct community benefit." : "Basin-level benefit shared with the wider community."),
};

export interface CatalogueCardView {
  id: string; name: string; eligible: boolean; weighted: number;
  suitability: string; outcome: string; cost: string; timing: string; measurement: string;
  reasons: { label: string; weight: number; score: number; reason: string }[];
  failedGates: { label: string; result: "Fail" | "Unknown" }[];
}

export function catalogueCard(r: RankedOpportunity): CatalogueCardView {
  const o = r.opportunity;
  const suitability = r.eligible
    ? `All six mandatory gates pass. Feeds ${o.pillar} ${o.dimension} at ${o.factoryId}.`
    : `Not eligible: ${r.failed.map((g) => `${g.label.toLowerCase()} (${g.result})`).join("; ")}. A high score does not cancel a failed gate.`;
  return {
    id: o.id, name: o.name, eligible: r.eligible, weighted: r.weighted, suitability,
    outcome: `${fmtOutcome(o)}. Low value ${lowOf(o)}.`,
    cost: `Capex ${fmtLakh(o.capexLakh)}, operating ${fmtLakh(o.omLakh)}/yr, savings ${fmtLakh(o.savingsLakh)}/yr. Payback: ${standalonePayback(o)}.`,
    timing: `${o.timingMonths} months`,
    measurement: o.measurementNeeds,
    reasons: CRITERIA.map((c, i) => ({ label: c.label, weight: c.weight, score: o.scores[i], reason: CRITERION_REASON[c.key](o) })),
    failedGates: r.failed.map((g) => ({ label: g.label, result: g.result })),
  };
}

// ---- Scenario comparison (V2 12): separate outcome dimensions, no blended score --------------------------------------------

export interface CompareRow { label: string; values: string[] }

const kg = (r: ScenarioResult, k: "tss" | "tn" | "tp") => (r.stewardship.addedKg[k] ? `+${fmtInt(r.stewardship.addedKg[k])} kg` : "None");

/** One column per result. The first result is the no-project baseline. */
export function compareRows(results: ScenarioResult[]): CompareRow[] {
  const row = (label: string, f: (r: ScenarioResult) => string): CompareRow => ({ label, values: results.map(f) });
  return [
    row("Site PWI forecast (low value)", (r) => `${fmtPct1(r.pwi)} (${fmtPct1(r.pwiLow)})`),
    row("Volumetric balance (low value)", (r) => `${fmtPct1(r.volumetricBalance)} (${fmtPct1(r.volumetricBalanceLow)})`),
    row("Quantity added", (r) => (r.stewardship.addedM3 ? `+${fmtInt(r.stewardship.addedM3)} m³/yr` : "None")),
    row("Quality added: TSS", (r) => kg(r, "tss")),
    row("Quality added: TN", (r) => kg(r, "tn")),
    row("Quality added: TP", (r) => kg(r, "tp")),
    row("Access added", (r) => (r.stewardship.addedPeople ? `+${fmtInt(r.stewardship.addedPeople)} people` : "None")),
    row("Capex", (r) => fmtLakh(r.capexLakh)),
    row("Operating and monitoring", (r) => `${fmtLakh(r.omLakh)}/yr`),
    row("Net savings", (r) => `${signedLakh(r.netSavingsLakh)}/yr`),
    row("Payback", (r) => paybackLabel(r.payback)),
  ];
}

/** The visible reconciliation line when two opportunities share a stream, or null. */
export const overlapLine = (r: ScenarioResult) => (r.overlapM3 > 0 ? `Shared water reconciled: -${fmtInt(r.overlapM3)} m³/yr` : null);
export const overlapSavingLine = (r: ScenarioResult) =>
  r.overlapM3 > 0 ? `Savings reduced by ${fmtLakh(r.overlapSavingLakh)}/yr (${fmtInt(r.overlapM3)} m³ at ₹${WATER_VALUE_RS_PER_M3}/m³)` : null;

/** Stewardship value, shown whether or not the scenario pays back (V2 12). */
export const stewardshipLines = (r: ScenarioResult, baselinePwi: number, baselineBalance: number): string[] => [
  `Site PWI ${fmtPct1(baselinePwi)} to ${fmtPct1(r.pwi)} (${r.stewardship.pwiChangePoints >= 0 ? "+" : ""}${r.stewardship.pwiChangePoints.toFixed(1)} points)`,
  `Volumetric balance ${fmtPct1(baselineBalance)} to ${fmtPct1(r.volumetricBalance)} (${r.stewardship.balanceChangePoints >= 0 ? "+" : ""}${r.stewardship.balanceChangePoints.toFixed(1)} points)`,
  `People reached: ${fmtInt(r.stewardship.addedPeople)}`,
];

// ---- Business case (V2 12) -----------------------------------------------------------------------------------------------

export interface BusinessCaseSection { heading: string; lines: string[]; cites: string[] }
export interface BusinessCase { title: string; note: string; sections: BusinessCaseSection[] }

export function buildBusinessCase(
  scenario: { id: string; name: string; items: string[] },
  result: ScenarioResult,
  baseline: ScenarioResult,
  alternatives: { id: string; name: string; result: ScenarioResult }[],
  siteName: string,
): BusinessCase {
  const opps = scenario.items.map(opportunityById).filter((o): o is Opportunity => !!o);
  const noPayback = result.payback.kind !== "years";
  const sections: BusinessCaseSection[] = [
    {
      heading: "Scope",
      lines: [`${siteName}. Scenario ${scenario.id}, ${scenario.name}.`, ...opps.map((o) => `${o.id} ${o.name}: ${fmtOutcome(o)}`)],
      cites: opps.map((o) => o.id),
    },
    {
      heading: "Alternatives compared",
      lines: [
        `No-project baseline: PWI ${fmtPct1(baseline.pwi)}, volumetric balance ${fmtPct1(baseline.volumetricBalance)}.`,
        ...alternatives.map((a) => `${a.id} ${a.name}: PWI ${fmtPct1(a.result.pwi)}, volumetric balance ${fmtPct1(a.result.volumetricBalance)}, payback ${paybackLabel(a.result.payback)}.`),
      ],
      cites: ["Scenario comparison", ...alternatives.map((a) => a.id)],
    },
    { heading: "Funding needs", lines: [`Capex ${fmtLakh(result.capexLakh)} over ${Math.max(0, ...opps.map((o) => o.timingMonths))} months.`], cites: ["Opportunity capex"] },
    {
      heading: "Operating and monitoring costs",
      lines: [`${fmtLakh(result.omLakh)} a year. Net savings ${signedLakh(result.netSavingsLakh)} a year after operating costs${overlapLine(result) ? `, with ${overlapLine(result)!.toLowerCase()}` : ""}.`],
      cites: ["Opportunity O&M"],
    },
    {
      heading: "Assumptions",
      lines: [`Water saved is valued at ₹${WATER_VALUE_RS_PER_M3}/m³.`, "Targets stay frozen at baseline.", "Forecast benefit is never added to Measured or Validated totals.", "Criterion weights are demonstration weights; rubric adaptation is pending."],
      cites: ["V2 Section 12"],
    },
    {
      heading: "Risks",
      lines: opps.map((o) => `${o.id}: uncertainty ${pctOf(o.uncertainty)}. ${o.measurementNeeds}.`),
      cites: opps.map((o) => o.id),
    },
    { heading: "Responsibilities", lines: ["Brand approves the delivery baseline. The supplier delivers and uploads monitoring evidence."], cites: ["Roles"] },
    { heading: "Timing", lines: opps.map((o) => `${o.id}: ${o.timingMonths} months`), cites: opps.map((o) => o.id) },
    {
      heading: "Uncertainty",
      lines: [`Site PWI ${fmtPct1(result.pwi)} central, ${fmtPct1(result.pwiLow)} low.`, `Volumetric balance ${fmtPct1(result.volumetricBalance)} central, ${fmtPct1(result.volumetricBalanceLow)} low.`],
      cites: ["Module 03 · Impact"],
    },
  ];
  if (noPayback) {
    sections.push({
      heading: "Stewardship value (no financial payback)",
      lines: ["Savings do not exceed operating costs, so this case rests on stewardship value.", ...stewardshipLines(result, baseline.pwi, baseline.volumetricBalance)],
      cites: ["Module 03 · Impact"],
    });
  }
  return { title: `Business case: ${scenario.name}`, note: "Draft for review. Demo estimates.", sections };
}

// ---- Delivery baseline (V2 12): approved forecast against measured to date -----------------------------------------------

/** The demo is at delivery month 0, so nothing has been measured against the approved forecast yet. */
export const DELIVERY_MONTH = 0;

export interface DeliveryRow { label: string; forecast: string; measured: string }

export function deliveryRows(result: ScenarioResult, measuredPwi: number): DeliveryRow[] {
  const none = "0 (Not yet measured)";
  return [
    { label: "Site PWI", forecast: fmtPct1(result.pwi), measured: `${fmtPct1(measuredPwi)} (today, no project benefit yet)` },
    { label: "Quantity added", forecast: `${fmtInt(result.stewardship.addedM3)} m³/yr`, measured: none },
    { label: "Quality added: TSS", forecast: `${fmtInt(result.stewardship.addedKg.tss)} kg/yr`, measured: none },
    { label: "Quality added: TN", forecast: `${fmtInt(result.stewardship.addedKg.tn)} kg/yr`, measured: none },
    { label: "Quality added: TP", forecast: `${fmtInt(result.stewardship.addedKg.tp)} kg/yr`, measured: none },
    { label: "Access added", forecast: `${fmtInt(result.stewardship.addedPeople)} people`, measured: none },
  ];
}

// ---- Lineage strip (V2 10) -----------------------------------------------------------------------------------------------

export type LineageState = "done" | "next" | "pending";

/**
 * How far an opportunity has travelled: Lite finding, Opportunity, Scenario, Business case, Delivery, Measured result.
 * "Business case" counts as reached once the opportunity sits in the approved baseline, because approval follows the case.
 * Nothing has a measured result yet at delivery month 0.
 */
export function lineageStates(imported: boolean, inScenario: boolean, inApproved: boolean): LineageState[] {
  const reached = [true, imported, imported && inScenario, imported && inApproved, imported && inApproved, false];
  const firstOpen = reached.indexOf(false);
  return reached.map((r, i) => (r ? "done" : i === firstOpen ? "next" : "pending"));
}
