"use client";

import Link from "next/link";
import { FileCheck2, FileText, Sparkles, Upload } from "lucide-react";
import type { DocumentRecord, InspectionRecord } from "@/src/data/types";
import { documentsForFactory, inspectionsFor, READINESS_STATES, readinessCounts, trustScore } from "@/src/lib/claims";
import type { Site } from "@/src/lib/selectors";
import { inspectionStates, reportStates } from "@/src/lib/states";
import { ReadinessPill, Shape, StateStrip, StatusPill, readinessMeta } from "@/src/components/ui";
import AffectedOutputsPanel from "./AffectedOutputsPanel";
import MockAction from "./MockAction";
import TrustRing from "./TrustRing";

function DocRow({ d }: { d: DocumentRecord }) {
  const tone = readinessMeta[d.state].tone;
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className={`tone-${tone} mt-1 text-[var(--t-fill)]`}><Shape kind={readinessMeta[d.state].shape} className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-900">{d.name}</p>
        <p className="text-sm text-ink-500">{d.period}{d.detail ? ` · ${d.detail}` : ""}</p>
      </div>
      <ReadinessPill state={d.state} />
    </li>
  );
}

function ReportRow({ d, canValidate }: { d: DocumentRecord; canValidate: boolean }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="font-semibold text-ink-900">{d.name}</p>
        <p className="text-sm text-ink-500">{d.period}{d.detail ? ` · ${d.detail}` : ""}</p>
        <div className="mt-1.5"><ReadinessPill state={d.state} /></div>
        <StateStrip states={reportStates(d.state)} className="mt-1.5" />
      </div>
      {canValidate ? (
        <Link href={`/copilot?agent=validation&report=${d.id}`} className="btn btn-secondary min-h-11 px-4 text-sm"><Sparkles className="size-4" aria-hidden="true" /> Validate with agent</Link>
      ) : (
        <div className="flex flex-wrap gap-2">
          <MockAction label="Upload" done="Uploaded (demo)" icon={Upload} />
          <MockAction label="Request review" done="Review requested (demo)" icon={FileCheck2} />
        </div>
      )}
    </li>
  );
}

function InspectionRow({ i, canValidate }: { i: InspectionRecord; canValidate: boolean }) {
  const score = trustScore(i);
  const ok = i.status === "Validated";
  return (
    <li className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
      <TrustRing value={score} ok={ok} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-900">{i.id} <span className="font-normal text-ink-500">· {i.date}</span></p>
        <p className="text-sm text-ink-500">{i.passed} of {i.steps} steps passed</p>
        <StateStrip states={inspectionStates(i.status)} className="mt-1.5" />
        <div className="mt-1.5">{ok ? <StatusPill tone="positive" shape="circle" label="Validated" /> : <StatusPill tone="caution" shape="diamond" label="Needs review" />}</div>
      </div>
      {canValidate ? (
        <Link href={`/copilot?agent=validation&inspection=${i.id}`} className="btn btn-secondary min-h-11 px-4 text-sm"><Sparkles className="size-4" aria-hidden="true" /> Validate with agent</Link>
      ) : (
        <div className="flex flex-wrap gap-2"><MockAction label="Request review" done="Review requested (demo)" icon={FileCheck2} /></div>
      )}
    </li>
  );
}

export default function EvidenceTab({ site, canValidate }: { site: Site; canValidate: boolean }) {
  const docs = documentsForFactory(site.id);
  const counts = readinessCounts(docs);
  const reports = docs.filter((d) => d.isReport);
  const inspections = inspectionsFor(site.id);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="space-y-5 lg:col-span-8">
        <ul aria-label="Document readiness" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {READINESS_STATES.map((s) => (
            <li key={s} className={`tone-${readinessMeta[s].tone} rounded-tile border border-[var(--t-line)] bg-[var(--t-bg)] px-4 py-3 text-[var(--t-fg)]`}>
              <p className="num font-display text-numlg">{counts[s]}</p>
              <p className="text-sm font-semibold">{s}</p>
            </li>
          ))}
        </ul>

        <div className="card p-6">
          <h3>Documents</h3>
          <p className="mt-1 text-ink-500">{docs.length} documents for this site. A figure only counts when its document is ready.</p>
          <ul className="mt-4 divide-y divide-line">{docs.map((d) => <DocRow key={d.id} d={d} />)}</ul>
        </div>

        <AffectedOutputsPanel site={site} />

        <div className="card p-6">
          <h3>Audit and compliance reports</h3>
          <ul className="mt-4 divide-y divide-line">{reports.map((d) => <ReportRow key={d.id} d={d} canValidate={canValidate} />)}</ul>
        </div>

        <div className="card p-6">
          <h3>Field inspection reports</h3>
          {inspections.length === 0 ? (
            <p className="mt-3 text-ink-700">No field inspection reports for this site yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">{inspections.map((i) => <InspectionRow key={i.id} i={i} canValidate={canValidate} />)}</ul>
          )}
        </div>
      </div>

      <aside className="space-y-5 lg:col-span-4" aria-label="Evidence and Disclosure agent">
        <div className="card p-6">
          <span className="grid size-10 place-items-center rounded-tile bg-[var(--positive-bg)] text-[var(--positive-fg)]"><FileText className="size-5" aria-hidden="true" /></span>
          <h3 className="mt-3">BRSR Principle 6 draft</h3>
          <p className="mt-1 text-ink-700">Checks readiness, then drafts the water report with a source on every figure. No evidence, no number.</p>
          <Link href={`/copilot?agent=evidence&task=brsr-p6&factory=${site.id}`} className="btn btn-primary mt-4">Generate BRSR Principle 6 draft</Link>
        </div>
        <div className="card p-6">
          <span className="grid size-10 place-items-center rounded-tile bg-[var(--positive-bg)] text-[var(--positive-fg)]"><FileCheck2 className="size-5" aria-hidden="true" /></span>
          <h3 className="mt-3">Evidence gap report</h3>
          <p className="mt-1 text-ink-700">Lists what is missing, expired or failed, with an owner and an action.</p>
          <Link href={`/copilot?agent=evidence&task=gap-report&factory=${site.id}`} className="btn btn-primary mt-4">Evidence gap report</Link>
        </div>
      </aside>
    </div>
  );
}
