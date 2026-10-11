import { f12Example } from "@/src/data/f12Example";
import { opportunities, type Opportunity } from "@/src/data/opportunities";
import { scenarios } from "@/src/data/scenarios";
import type { ProjectRecord } from "@/src/data/types";
import { fmtInt } from "./format";
import { METHOD_VERSION } from "./impact";
import { projectsFor } from "./claims";
import { PILLARS, REMOVAL_TARGET, type PwiCell } from "./pwi";
import type { Site } from "./selectors";
import { GRADE_MEANING, type Trace, type TraceInput } from "./trace";
import type { CellGrade, Dimension, FactoryId, Pillar } from "./types";

// V2 Section 9: the Impact destination. Quantity, Quality (per pollutant) and Access stay separate and are never blended.
// Each value carries a state: Validated, Measured or Forecast. Forecast comes only from opportunities and scenarios and
// never enters a Measured or Validated total. No new maths: values come from the same cells, projects and opportunities.

export type ImpactDimension = "Quantity" | "Quality" | "Access";
export type ValueState = "Forecast" | "Measured" | "Validated";
export type Pollutant = "tss" | "tn" | "tp";
export const POLLUTANT_KEYS: readonly Pollutant[] = ["tss", "tn", "tp"];
export const POLLUTANT_LABEL: Record<Pollutant, string> = { tss: "TSS", tn: "TN", tp: "TP" };
export const VALUE_STATES: readonly ValueState[] = ["Validated", "Measured", "Forecast"];

/** The scenario whose items show as Forecast: S1 is the demo's approved delivery baseline (V2 12). Demo estimates. */
export const FORECAST_SCENARIO_ID = "S1";

const DIMENSION_OF: Record<Dimension, ImpactDimension> = { Availability: "Quantity", Quality: "Quality", Accessibility: "Access" };
type Amount = { m3: number; people: number; kg: Record<Pollutant, number> };
const zero = (): Amount => ({ m3: 0, people: 0, kg: { tss: 0, tn: 0, tp: 0 } });

export interface StateSplit { Validated: number; Measured: number; Forecast: number }
export interface PillarRow { pillar: Pillar; target: number | null; split: StateSplit }

export interface OutcomeRow {
  id: string; factoryId: FactoryId; factoryName: string;
  outcome: string; dimension: ImpactDimension; pillar: Pillar;
  value: string; state: ValueState; stateNote: string | null;
  project: string | null; method: string; period: string; evidence: string;
  trace: Trace;
}

export interface ImpactSummary {
  quantity: PillarRow[]; access: PillarRow[];
  quality: Record<Pollutant, PillarRow[]>;
  /** Plant removal in kg needs the baseline influent load, which the demo records for some sites only. */
  qualityP1: { withLoads: number; of: number };
  outcomes: OutcomeRow[];
}

interface Entry {
  factoryId: FactoryId; pillar: Pillar; dimension: ImpactDimension; state: ValueState; amount: Amount;
}

const scaleAmount = (a: ProjectRecord["claim"], k: number): Amount => {
  const r = zero();
  if (a.unit === "m3") r.m3 = a.value * k;
  else if (a.unit === "people") r.people = a.value * k;
  else r.kg = { tss: a.tss * k, tn: a.tn * k, tp: a.tp * k };
  return r;
};

function cellAmount(cell: PwiCell["delivered"]): Amount | null {
  if (!cell) return null;
  const r = zero();
  if (cell.kind === "volume") r.m3 = cell.m3;
  else if (cell.kind === "people") r.people = cell.count;
  else if (cell.kind === "mass") r.kg = { tss: cell.tss, tn: cell.tn, tp: cell.tp };
  else return null;
  return r;
}

const fmtAmount = (dim: ImpactDimension, a: Amount) =>
  dim === "Quantity" ? `${fmtInt(a.m3)} m³` : dim === "Access" ? `${fmtInt(a.people)} people`
    : `${fmtInt(a.kg.tss)} / ${fmtInt(a.kg.tn)} / ${fmtInt(a.kg.tp)} kg (TSS / TN / TP)`;

/** The approved delivery baseline: its scenario id and the opportunities in it. Defaults to the demo's S1. */
export interface ApprovedBaseline { id: string; items: string[] }
export const defaultBaseline = (): ApprovedBaseline => ({ id: FORECAST_SCENARIO_ID, items: scenarios.find((x) => x.id === FORECAST_SCENARIO_ID)?.items ?? [] });

const forecastOpps = (factoryId: FactoryId, baseline: ApprovedBaseline): Opportunity[] => {
  return baseline.items.map((id) => opportunities.find((o) => o.id === id)).filter((o): o is Opportunity => !!o && o.factoryId === factoryId);
};

const traceFor = (
  site: Site, title: string, value: string, formula: string[], inputs: TraceInput[], grade: CellGrade | null, note?: string,
): Trace => ({
  title: `${title} (${site.name})`, value, formula, inputs,
  method: { name: "Positive Water Impact", version: METHOD_VERSION },
  grade: grade ? { grade, meaning: GRADE_MEANING[grade] } : null, note,
});

/** Everything one factory contributes, as outcome rows plus the entries the panels add up. */
function factoryOutcomes(site: Site, baseline: ApprovedBaseline): { rows: OutcomeRow[]; entries: Entry[] } {
  const rows: OutcomeRow[] = [];
  const entries: Entry[] = [];
  const add = (
    pillar: Pillar, dimension: ImpactDimension, state: ValueState, amount: Amount, r: Omit<OutcomeRow, "id" | "factoryId" | "factoryName" | "dimension" | "pillar" | "state" | "value" | "trace"> & { value?: string; trace: Trace },
  ) => {
    entries.push({ factoryId: site.id, pillar, dimension, state, amount });
    rows.push({ id: `${site.id}-${rows.length}`, factoryId: site.id, factoryName: site.name, dimension, pillar, state, value: r.value ?? fmtAmount(dimension, amount), ...r });
  };
  const pwi = site.pwi;

  // P1: on-site measures, read from the grid cells. A cell that scored counts as Validated (internal verification).
  for (const cell of pwi.cells.filter((c) => c.pillar === "P1" && c.dimension !== "Quality")) {
    const a = cellAmount(cell.delivered);
    if (!a || (a.m3 === 0 && a.people === 0)) continue;
    const dim = DIMENSION_OF[cell.dimension];
    const state: ValueState = cell.state === "Scored" || cell.state === "Partially scored" ? "Validated" : "Measured";
    const label = cell.breakdown.length ? cell.breakdown.map((b) => b.label).join(", ") : dim === "Quantity" ? "On-site water measures" : "Headcount with WASH access";
    add("P1", dim, state, a, {
      outcome: label, stateNote: state === "Validated" ? "internal verification" : cell.state,
      project: null, method: "Site measurement", period: "FY2025-26", evidence: `Grade ${cell.grade}, internal verification`,
      trace: traceFor(site, `Site P1 ${cell.dimension}`, fmtAmount(dim, a), ["Delivered = cell score × target", `Score ${cell.score.toFixed(3)}`],
        [{ label: "Cell state", value: cell.state }, { label: "Period", value: "FY2025-26" }, { label: "Evidence", value: `Grade ${cell.grade}, internal verification` }, { label: "Source opportunity", value: "None recorded" }], cell.grade),
    });
  }
  // P1 Quality: plant removal. Shown as percentages because that is how the cell is scored; kg needs the baseline load.
  if (site.id === f12Example.factoryId) {
    const rem = site.pwi.cells.find((c) => c.pillar === "P1" && c.dimension === "Quality");
    const pct = rem?.delivered && rem.delivered.kind === "removal" ? rem.delivered : null;
    if (pct) {
      const kg: Record<Pollutant, number> = {
        tss: (f12Example.baselineLoadsKg.tss * pct.tss) / 100, tn: (f12Example.baselineLoadsKg.tn * pct.tn) / 100, tp: (f12Example.baselineLoadsKg.tp * pct.tp) / 100,
      };
      add("P1", "Quality", "Validated", { ...zero(), kg }, {
        outcome: "ETP removal TSS / TN / TP", stateNote: "internal verification", value: `${pct.tss}% / ${pct.tn}% / ${pct.tp}% removal`,
        project: null, method: "WQBA Treatment System", period: "FY2025-26", evidence: `Grade ${rem!.grade}, internal verification`,
        trace: traceFor(site, "Site P1 Quality", `${pct.tss}% / ${pct.tn}% / ${pct.tp}%`,
          ["Removal kg = baseline influent load × removal %", `Target ${REMOVAL_TARGET * 100}% per pollutant`],
          [{ label: "Baseline load (TSS / TN / TP)", value: `${fmtInt(f12Example.baselineLoadsKg.tss)} / ${fmtInt(f12Example.baselineLoadsKg.tn)} / ${fmtInt(f12Example.baselineLoadsKg.tp)} kg` },
            { label: "Period", value: "FY2025-26" }, { label: "Source opportunity", value: "None recorded" }], rem!.grade),
      });
    }
  }

  // P2 and P3: registered projects, by their benefit state. Not validated and Not eligible benefits are left out.
  for (const p of projectsFor(site.id).filter((x) => x.pillar !== "P1")) {
    const bs = p.states.benefitState;
    if (bs !== "Validated" && bs !== "Measured") continue;
    const a = scaleAmount(p.claim, p.attribution);
    const dim = DIMENSION_OF[p.dimension];
    add(p.pillar, dim, bs, a, {
      outcome: p.name, stateNote: null, project: p.id, method: p.method, period: p.operatingPeriod,
      evidence: `Grade ${p.grade === "none" ? "none" : p.grade}, evidence ${p.states.evidenceAcceptance.toLowerCase()}`,
      trace: traceFor(site, p.name, fmtAmount(dim, a),
        ["Attributed benefit = claimed benefit × attribution share f", `${bs}: ${bs === "Measured" ? "measured but not yet validated" : "validated on an eligible claim"}`],
        [{ label: "Project", value: p.id }, { label: "Method", value: p.method }, { label: "Attribution share f", value: `${Math.round(p.attribution * 100)}%` },
          { label: "Period", value: p.operatingPeriod }, { label: "Evidence", value: `Grade ${p.grade === "none" ? "none" : p.grade}, ${p.states.evidenceAcceptance}` },
          { label: "Monitoring", value: p.monitoringRequirement }, { label: "Source opportunity", value: "None recorded" }], p.grade, p.note || undefined),
    });
  }

  // Forecast: opportunities in the approved scenario. Never added to Measured or Validated.
  for (const o of forecastOpps(site.id, baseline)) {
    const a = scaleAmount(o.forecast.unit === "kg" ? { unit: "kg", tss: o.forecast.tss, tn: o.forecast.tn, tp: o.forecast.tp } : o.forecast, 1);
    const dim = DIMENSION_OF[o.dimension];
    add(o.pillar, dim, "Forecast", a, {
      outcome: o.name, stateNote: "Demo estimate", project: null, method: o.type, period: `${o.timingMonths} months to deliver`,
      evidence: "Forecast, no delivery evidence yet",
      trace: traceFor(site, o.name, fmtAmount(dim, a),
        ["Forecast benefit from the opportunity, central value", `Uncertainty ±${Math.round(o.uncertainty * 100)}%`, "A forecast never counts as Measured or Validated."],
        [{ label: "Opportunity", value: o.id }, { label: "Scenario", value: `${baseline.id} (delivery baseline)` },
          ...(o.sourceFindingId ? [{ label: "Lite finding", value: o.sourceFindingId }] : []), { label: "Measurement needs", value: o.measurementNeeds },
          { label: "Source opportunity", value: o.id }], null, "Demo estimate. Forecast only."),
    });
  }
  return { rows, entries };
}

const targetOf = (site: Site, pillar: Pillar, dim: Dimension): Amount | null => {
  const cell = site.pwi.cells.find((c) => c.pillar === pillar && c.dimension === dim);
  if (cell?.target && cell.target.kind !== "removal") return cellAmount(cell.target);
  if (pillar === "P1" && dim === "Quality" && site.id === f12Example.factoryId) {
    const b = f12Example.baselineLoadsKg;
    const r = zero(); r.kg = { tss: b.tss * REMOVAL_TARGET, tn: b.tn * REMOVAL_TARGET, tp: b.tp * REMOVAL_TARGET };
    return r;
  }
  return null;
};

/** `sites` are the factories in scope, already filtered by role. */
export function buildImpact(sites: Site[], baseline: ApprovedBaseline = defaultBaseline()): ImpactSummary {
  const all = sites.map((s) => factoryOutcomes(s, baseline));
  const entries = all.flatMap((x) => x.entries);

  const row = (dim: ImpactDimension, pick: (a: Amount) => number, targetDim: Dimension): PillarRow[] =>
    PILLARS.map((pillar) => {
      const split: StateSplit = { Validated: 0, Measured: 0, Forecast: 0 };
      for (const e of entries) if (e.dimension === dim && e.pillar === pillar) split[e.state] += pick(e.amount);
      const targets = sites.map((s) => targetOf(s, pillar, targetDim)).filter((t): t is Amount => t !== null);
      const target = targets.length ? targets.reduce((n, t) => n + pick(t), 0) : null;
      return { pillar, target, split };
    });

  return {
    quantity: row("Quantity", (a) => a.m3, "Availability"),
    access: row("Access", (a) => a.people, "Accessibility"),
    quality: Object.fromEntries(POLLUTANT_KEYS.map((k) => [k, row("Quality", (a) => a.kg[k], "Quality")])) as Record<Pollutant, PillarRow[]>,
    qualityP1: { withLoads: sites.filter((s) => s.id === f12Example.factoryId).length, of: sites.length },
    outcomes: all.flatMap((x) => x.rows),
  };
}

/** Total of Validated and Measured only: what PWI may use. A forecast is never in it. */
export const countedTotal = (s: StateSplit) => s.Validated + s.Measured;
