"use client";

import { useMemo, useState } from "react";
import { FileText, Lock, ShieldCheck } from "lucide-react";
import { useProjects } from "@/src/context/ProjectsContext";
import { useRole, useScope } from "@/src/context/RoleContext";
import type { ScenarioRecord } from "@/src/data/scenarios";
import { fmtPct1 } from "@/src/lib/format";
import { buildBusinessCase, DELIVERY_MONTH, deliveryRows, overlapLine, overlapSavingLine, stewardshipLines, DEMO_NOTE } from "@/src/lib/projectsView";
import { evaluateScenario, paybackLabel, type ScenarioResult } from "@/src/lib/scenarios";
import { opportunityById } from "@/src/lib/catalogue";
import { fundingNeedsLine } from "@/src/lib/funding";
import { approverLabel, canApproveBaseline, funderNames } from "@/src/lib/selectors";
import { getSite } from "@/src/lib/selectors";
import { CitationChip, StatusPill } from "@/src/components/ui";
import { ForecastTags } from "./ProjectsParts";

export const SCENARIO_FACTORY = "F12";

/** The F12 site, its no-project baseline and a result for any list of opportunities. Everything comes from src/lib. */
export function useScenarioModel() {
  const scope = useScope();
  const site = getSite(scope, SCENARIO_FACTORY);
  const evaluate = useMemo(
    () => (items: string[]): ScenarioResult => evaluateScenario(site!.pwi, site!.replenishmentNeededM3, items),
    [site],
  );
  const baseline = useMemo(() => evaluate([]), [evaluate]);
  return { site: site!, evaluate, baseline };
}

/** Result lines every scenario shows: shared water, stewardship value and the payback word. */
export function ResultNotes({ result, baseline }: { result: ScenarioResult; baseline: ScenarioResult }) {
  const shared = overlapLine(result);
  const noPayback = result.payback.kind === "none";
  return (
    <div className="space-y-2">
      {shared && (
        <p className="rounded-tile border border-panel-line bg-blue-50 px-3 py-2 font-semibold text-blue-600">
          {shared}
          <span className="block text-sm font-normal text-ink-500">{overlapSavingLine(result)}</span>
        </p>
      )}
      <p className="font-semibold text-ink-900">Payback: {paybackLabel(result.payback)}</p>
      {noPayback && (
        <div className="rounded-tile border border-line bg-card p-3">
          <p className="font-semibold text-ink-900">Stewardship value still counts</p>
          <ul className="mt-1 list-disc pl-5 text-[15px] text-ink-700">
            {stewardshipLines(result, baseline.pwi, baseline.volumetricBalance).map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function BusinessCaseView({ scenario }: { scenario: ScenarioRecord }) {
  const { site, evaluate, baseline } = useScenarioModel();
  const { scenarios, commitments, shortlist } = useProjects();
  const result = evaluate(scenario.items);
  const alternatives = scenarios.filter((s) => s.id !== "S0" && s.id !== scenario.id && s.factoryId === scenario.factoryId).map((s) => ({ id: s.id, name: s.name, result: evaluate(s.items) }));
  const bc = buildBusinessCase(scenario, result, baseline, alternatives, site.name);
  // Who pays and who has committed, added to "Funding needs" only. Every computed number above is unchanged.
  const fundingLine = fundingNeedsLine(scenario.items.map(opportunityById).filter((o) => !!o), commitments, (id) => funderNames(shortlist[id] ?? []));
  const sections = bc.sections.map((s) => (s.heading === "Funding needs" ? { ...s, lines: [...s.lines, fundingLine] } : s));
  return (
    <article className="card p-6" aria-label={bc.title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3>{bc.title}</h3>
        <span className="inline-flex flex-wrap items-center gap-2"><StatusPill tone="caution" shape="diamond" label={bc.note} /><ForecastTags /></span>
      </div>
      <dl className="mt-4 space-y-4">
        {sections.map((s) => (
          <div key={s.heading}>
            <dt className="font-semibold text-ink-900">{s.heading}</dt>
            <dd>
              <ul className="mt-1 space-y-1 text-ink-700">{s.lines.map((l) => <li key={l}>{l}</li>)}</ul>
              <span className="mt-1 flex flex-wrap gap-2">{[...new Set(s.cites)].map((c) => <CitationChip key={c} label={c} />)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

/** Generate business case, and Approve as delivery baseline when canApproveBaseline allows this role. Otherwise the approver is named. */
export function ScenarioActions({ scenario }: { scenario: ScenarioRecord }) {
  const { role } = useRole();
  const { approved, approve } = useProjects();
  const [showCase, setShowCase] = useState(false);
  const isApproved = approved.id === scenario.id;
  const none = scenario.items.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary min-h-11 px-5" disabled={none} aria-expanded={showCase} onClick={() => setShowCase((v) => !v)}>
          <FileText className="size-4" aria-hidden="true" /> {showCase ? "Hide business case" : "Generate business case"}
        </button>
        {none ? (
          <span className="text-ink-500">The no-project baseline has nothing to approve.</span>
        ) : isApproved ? (
          <StatusPill tone="positive" shape="circle" label="Approved as delivery baseline" />
        ) : role && canApproveBaseline(role) ? (
          <button type="button" className="btn btn-secondary min-h-11 px-5" onClick={() => approve(scenario)}>
            <ShieldCheck className="size-4" aria-hidden="true" /> Approve as delivery baseline
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink-500"><Lock className="size-4" aria-hidden="true" /> Approval by {approverLabel().replace("Approved by ", "")}</span>
        )}
      </div>
      {showCase && !none && <BusinessCaseView scenario={scenario} />}
    </div>
  );
}

/** Delivery strip: the frozen approved scenario against what has been measured to date. */
export function DeliveryStrip() {
  const { approved, scenarios } = useProjects();
  const { site, evaluate } = useScenarioModel();
  const scenario = scenarios.find((s) => s.id === approved.id);
  if (!scenario) return null;
  const result = evaluate(approved.items);
  const rows = deliveryRows(result, site.pwi.sitePwi);
  return (
    <section className="rounded-panel border border-panel-line bg-blue-50 p-5" aria-label="Delivery">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3>Delivery: {scenario.id} {scenario.name}</h3>
          <p className="text-ink-500">Approved baseline, frozen. Delivery month {DELIVERY_MONTH}. {DEMO_NOTE}</p>
        </div>
        <ForecastTags />
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[15px]">
          <caption className="sr-only">Approved forecast against measured to date</caption>
          <thead><tr className="bg-blue-50 text-ink-700"><th scope="col" className="px-4 py-3 font-semibold">Outcome</th><th scope="col" className="px-4 py-3 font-semibold">Approved forecast</th><th scope="col" className="px-4 py-3 font-semibold">Measured to date</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line">
                <th scope="row" className="px-4 py-3 font-semibold">{r.label}</th>
                <td className="num px-4 py-3">{r.forecast} <span className="text-sm text-ink-500">Forecast</span></td>
                <td className="num px-4 py-3">{r.measured}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-ink-500">Forecast is never shown as Measured or Validated. Site PWI today is {fmtPct1(site.pwi.sitePwi)}.</p>
    </section>
  );
}
