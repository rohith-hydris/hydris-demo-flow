"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { MAX_COMPARE, useProjects } from "@/src/context/ProjectsContext";
import { opportunities } from "@/src/data/opportunities";
import { fmtPct1 } from "@/src/lib/format";
import { compareRows, fmtOutcome, fmtLakh } from "@/src/lib/projectsView";
import { reuseInsight, paybackLabel } from "@/src/lib/scenarios";
import { EmptyState, StatusPill } from "@/src/components/ui";
import { ForecastTags } from "./ProjectsParts";
import { DeliveryStrip, ResultNotes, ScenarioActions, SCENARIO_FACTORY, useScenarioModel } from "./ScenarioParts";

const NO_PROJECT_ID = "S0";

function Builder() {
  const { site, evaluate, baseline } = useScenarioModel();
  const { scenarios, saveScenario } = useProjects();
  const nameId = useId();
  const options = opportunities.filter((o) => o.factoryId === SCENARIO_FACTORY);
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const result = evaluate(picked);
  const toggle = (id: string) => { setNote(null); setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); };

  function onSave() {
    const { scenario, created } = saveScenario(SCENARIO_FACTORY, name, picked);
    setNote(created ? `Saved as ${scenario.id} ${scenario.name}.` : `Already saved as ${scenario.id} ${scenario.name}. No duplicate created.`);
    if (created) { setName(""); setPicked([]); }
  }

  return (
    <section className="card p-6" aria-labelledby="builder-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="builder-h">Build a scenario for {site.name}</h3>
        <ForecastTags />
      </div>
      <p className="mt-1 text-ink-500">Tick opportunities and the results update. Targets stay frozen at baseline, and a Forecast is never mixed into Measured or Validated totals.</p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <fieldset>
          <legend className="sr-only">Opportunities to include</legend>
          <ul className="space-y-2">
            {options.map((o) => (
              <li key={o.id}>
                <label className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-tile border p-3 ${picked.includes(o.id) ? "border-blue-500 bg-blue-50" : "border-line bg-card hover:bg-blue-50"}`}>
                  <input type="checkbox" className="mt-1 size-5 accent-[var(--blue-600)]" checked={picked.includes(o.id)} onChange={() => toggle(o.id)} />
                  <span>
                    <span className="block font-semibold text-ink-900">{o.id} · {o.name}</span>
                    <span className="block text-[15px] text-ink-500">{o.pillar} {o.dimension} · {fmtOutcome(o)} · capex {fmtLakh(o.capexLakh)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div aria-live="polite" className="space-y-3">
          <dl className="grid grid-cols-2 gap-3">
            {[
              ["Site PWI forecast (low)", `${fmtPct1(result.pwi)} (${fmtPct1(result.pwiLow)})`],
              ["Volumetric balance (low)", `${fmtPct1(result.volumetricBalance)} (${fmtPct1(result.volumetricBalanceLow)})`],
              ["Capex", fmtLakh(result.capexLakh)],
              ["Operating and monitoring", `${fmtLakh(result.omLakh)}/yr`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-tile border border-line bg-card p-3"><dt className="text-sm font-semibold text-ink-500">{k}</dt><dd className="num font-display text-xl font-bold text-ink-900">{v}</dd></div>
            ))}
          </dl>
          {picked.length === 0 ? <p className="text-ink-500">Nothing ticked: this is the no-project baseline, PWI {fmtPct1(baseline.pwi)}.</p> : <ResultNotes result={result} baseline={baseline} />}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={nameId} className="block text-sm font-semibold text-ink-500">Scenario name (optional)</label>
          <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Example: Wetland and WASH" className="min-h-11 w-80 max-w-full rounded-full border border-line bg-card px-4" />
        </div>
        <button type="button" className="btn btn-primary min-h-11 px-5" disabled={picked.length === 0} onClick={onSave}><Save className="size-4" aria-hidden="true" /> Save scenario</button>
        <span role="status" className="font-semibold text-blue-600">{note}</span>
      </div>
      <p className="sr-only">{scenarios.length} scenarios saved.</p>
    </section>
  );
}

function CompareTable({ ids }: { ids: string[] }) {
  const { evaluate, baseline } = useScenarioModel();
  const { scenarios } = useProjects();
  const picked = ids.map((id) => scenarios.find((s) => s.id === id)!).filter(Boolean);
  const results = [baseline, ...picked.map((s) => evaluate(s.items))];
  const rows = compareRows(results);
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-[15px]">
        <caption className="sr-only">Scenarios compared with the no-project baseline</caption>
        <thead>
          <tr className="bg-blue-50 text-ink-700">
            <th scope="col" className="px-4 py-3 font-semibold">Outcome (dimensions kept separate)</th>
            <th scope="col" className="px-4 py-3 font-semibold">S0 No-project baseline</th>
            {picked.map((s) => <th key={s.id} scope="col" className="px-4 py-3 font-semibold">{s.id} {s.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-line">
              <th scope="row" className="px-4 py-3 font-semibold">{r.label}</th>
              {r.values.map((v, i) => <td key={i} className={`num px-4 py-3 ${v === "No financial payback" ? "font-semibold text-[var(--caution-fg)]" : ""}`}>{v}</td>)}
            </tr>
          ))}
          <tr className="border-t border-line">
            <th scope="row" className="px-4 py-3 font-semibold">Shared water reconciled</th>
            {results.map((r, i) => <td key={i} className="num px-4 py-3">{r.overlapM3 ? `-${r.overlapM3.toLocaleString("en-US")} m³/yr` : "None"}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// V2 12: build, save and compare up to three scenarios against the no-project baseline, then business case and approval.
export default function ScenariosTab() {
  const { scenarios, approved } = useProjects();
  const { evaluate } = useScenarioModel();
  const saved = scenarios.filter((s) => s.id !== NO_PROJECT_ID);
  const [compare, setCompare] = useState<string[]>(() => saved.filter((s) => ["S1", "S2", "S3"].includes(s.id)).map((s) => s.id));
  const [focus, setFocus] = useState("S1");
  const focusScenario = scenarios.find((s) => s.id === focus) ?? saved[0];
  const toggle = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= MAX_COMPARE ? c : [...c, id]));
  const insight = reuseInsight(evaluate(scenarios.find((s) => s.id === "S2")!.items), evaluate(scenarios.find((s) => s.id === "S1")!.items));

  if (saved.length === 0) return <EmptyState title="No scenarios yet" text="Tick opportunities in the builder and save a scenario." />;

  return (
    <div className="space-y-8">
      <Builder />

      <section aria-labelledby="saved-h">
        <h3 id="saved-h" className="mb-1">Saved scenarios</h3>
        <p className="mb-3 text-ink-500">Tick up to {MAX_COMPARE} to compare against the no-project baseline.</p>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {saved.map((s) => {
            const r = evaluate(s.items);
            const on = compare.includes(s.id);
            return (
              <li key={s.id} className={`card flex flex-col p-5 ${focus === s.id ? "ring-2 ring-blue-500" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <h4>{s.id} · {s.name}</h4>
                  {approved.id === s.id && <StatusPill tone="positive" shape="circle" label="Approved baseline" />}
                </div>
                <p className="text-[15px] text-ink-500">{s.blurb}</p>
                <p className="mt-2 text-[15px] text-ink-700">{s.items.join(" + ")}</p>
                <p className="num mt-2 font-display text-xl font-bold text-ink-900">PWI {fmtPct1(r.pwi)} <span className="text-sm font-normal text-ink-500">({fmtPct1(r.pwiLow)} low)</span></p>
                <p className="text-[15px] text-ink-700">Payback: {paybackLabel(r.payback)}</p>
                <div className="mt-2"><ForecastTags /></div>
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3">
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
                    <input type="checkbox" className="size-5 accent-[var(--blue-600)]" checked={on} disabled={!on && compare.length >= MAX_COMPARE} onChange={() => toggle(s.id)} /> Compare
                  </label>
                  <button type="button" className="btn btn-tertiary text-sm" onClick={() => setFocus(s.id)} aria-pressed={focus === s.id}>{focus === s.id ? "Selected" : "Select"}</button>
                  <Link href={`/projects/scenarios/${s.id}`} className="btn btn-tertiary text-sm">Open</Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="compare-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 id="compare-h">Compare with the no-project baseline</h3><ForecastTags /></div>
        {compare.length === 0 ? <EmptyState title="Nothing to compare" text="Tick at least one saved scenario." /> : <CompareTable ids={compare} />}
        {compare.includes("S1") && compare.includes("S2") && (
          <p className="mt-3 rounded-tile border border-panel-line bg-blue-50 px-4 py-3 font-semibold text-blue-600">
            Efficiency and reuse raise volumetric balance ({insight.reuseBalanceGain >= 0 ? "+" : ""}{insight.reuseBalanceGain.toFixed(1)} points) but barely move PWI ({insight.reusePwiGain >= 0 ? "+" : ""}{insight.reusePwiGain.toFixed(1)} points). Basin projects move PWI ({insight.basinPwiGain >= 0 ? "+" : ""}{insight.basinPwiGain.toFixed(1)} points).
          </p>
        )}
      </section>

      <section aria-labelledby="case-h" className="rounded-panel border border-panel-line bg-blue-50 p-5">
        <h3 id="case-h" className="mb-1">Business case and approval: {focusScenario.id} {focusScenario.name}</h3>
        <p className="mb-4 text-ink-500">Select a saved scenario above, then generate its one-page business case or approve it as the delivery baseline.</p>
        <ResultNotesFor id={focusScenario.id} />
        <div className="mt-4"><ScenarioActions key={focusScenario.id} scenario={focusScenario} /></div>
      </section>

      <DeliveryStrip />
    </div>
  );
}

function ResultNotesFor({ id }: { id: string }) {
  const { scenarios } = useProjects();
  const { evaluate, baseline } = useScenarioModel();
  const s = scenarios.find((x) => x.id === id)!;
  return <ResultNotes result={evaluate(s.items)} baseline={baseline} />;
}
