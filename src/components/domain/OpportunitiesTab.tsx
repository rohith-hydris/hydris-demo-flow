"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { useProjects } from "@/src/context/ProjectsContext";
import { useScope } from "@/src/context/RoleContext";
import { liteFindings, type LiteFinding } from "@/src/data/opportunities";
import { importKey, opportunityById } from "@/src/lib/catalogue";
import { inScope } from "@/src/lib/scope";
import { lineageStates } from "@/src/lib/projectsView";
import { getSites } from "@/src/lib/selectors";
import { CitationChip, EmptyState, StatusPill } from "@/src/components/ui";
import { LineageStrip } from "./ProjectsParts";

// V2 10: Hydris Lite findings and a one-click import. Importing is idempotent on source assessment + finding + factory.
export default function OpportunitiesTab() {
  const scope = useScope();
  const { imports, importLite } = useProjects();
  const names = Object.fromEntries(getSites(scope).map((s) => [s.id, s.name]));
  const findings = inScope(scope, liteFindings);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; created: boolean } | null>(null);

  function onImport(f: LiteFinding) {
    const res = importLite(f);
    setMessage({ text: `${f.id}: ${res.message}`, created: res.created });
    setSelected(f.id);
  }

  if (findings.length === 0) return <EmptyState title="No Lite findings" text="Hydris Lite has no findings for the factories you can see." />;
  const detail = findings.find((f) => f.id === selected) ?? null;

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-ink-500">
        Hydris Lite is the operational assessment tool. A finding becomes a candidate project when you import it. Importing the same finding again never creates a second record.
      </p>

      <div role="status" aria-live="polite" className="min-h-0">
        {message && (
          <p className={`rounded-tile border px-4 py-3 font-semibold ${message.created ? "border-[var(--positive-line)] bg-[var(--positive-bg)] text-[var(--positive-fg)]" : "border-panel-line bg-blue-50 text-blue-600"}`}>{message.text}</p>
        )}
      </div>

      <ul className="space-y-3">
        {findings.map((f) => {
          const oppId = imports[importKey(f)];
          return (
            <li key={f.id} className={`card p-5 ${selected === f.id ? "ring-2 ring-blue-500" : ""}`}>
              <div className="grid items-center gap-x-5 gap-y-3 lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1.2fr)_auto]">
                <div>
                  <p className="font-semibold text-ink-900">{f.id} · {names[f.factoryId]}</p>
                  <p className="text-ink-700">{f.finding}</p>
                  <p className="mt-2">
                    {oppId
                      ? <StatusPill tone="positive" shape="circle" label={`Imported as ${oppId}`} />
                      : <StatusPill tone="info" shape="ring" label={`New: candidate ${f.candidate}`} />}
                  </p>
                </div>
                <p className="text-[15px] text-ink-500">Source {f.sourceAssessmentId} ({f.assessmentDate}), version {f.version}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn btn-primary min-h-11 px-5 text-sm" onClick={() => onImport(f)}>
                    <Download className="size-4" aria-hidden="true" /> Import as project opportunity
                  </button>
                  <button type="button" className="btn btn-tertiary text-sm" aria-expanded={selected === f.id} onClick={() => setSelected(selected === f.id ? null : f.id)}>
                    {selected === f.id ? "Hide detail" : "Show detail"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {detail && <OpportunityDetail finding={detail} siteName={names[detail.factoryId]} />}
    </div>
  );
}

function OpportunityDetail({ finding: f, siteName }: { finding: LiteFinding; siteName: string }) {
  const { imports, scenarios, approved } = useProjects();
  const oppId = imports[importKey(f)] ?? null;
  const inScenario = !!oppId && scenarios.some((s) => s.items.includes(oppId));
  const inApproved = !!oppId && approved.items.includes(oppId);
  const catalogued = oppId ? opportunityById(oppId) : undefined;

  return (
    <section className="rounded-panel border border-panel-line bg-blue-50 p-5" aria-label={`Detail for ${f.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3>{oppId ? `${oppId} from ${f.id}` : `${f.id}, not imported yet`}</h3>
        {catalogued && <Link href="/projects?tab=catalogue" className="btn btn-secondary min-h-11 px-4 text-sm">Open in Catalogue</Link>}
      </div>
      <div className="mt-4"><LineageStrip states={lineageStates(!!oppId, inScenario, inApproved)} /></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h4 className="mb-2">Kept with the opportunity</h4>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
            <dt className="text-ink-500">Source assessment</dt><dd>{f.sourceAssessmentId} ({f.assessmentDate})</dd>
            <dt className="text-ink-500">Site</dt><dd>{siteName}</dd>
            <dt className="text-ink-500">Method version</dt><dd>Hydris Lite {f.version}</dd>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">{f.evidenceLinks.map((e) => <CitationChip key={e} label={e} />)}</div>
        </div>
        <div className="card p-5">
          <h4 className="mb-2">Input data</h4>
          <table className="w-full text-left text-[15px]">
            <caption className="sr-only">Input data from {f.sourceAssessmentId}</caption>
            <tbody>
              {f.inputData.map(([k, v]) => (
                <tr key={k} className="border-b border-line last:border-0"><th scope="row" className="py-2 pr-4 font-normal text-ink-500">{k}</th><td className="py-2 font-semibold">{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
