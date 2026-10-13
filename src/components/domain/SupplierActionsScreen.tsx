"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useProjects } from "@/src/context/ProjectsContext";
import { useRole, useScope } from "@/src/context/RoleContext";
import { fmtInt, fmtScore } from "@/src/lib/format";
import { FORECAST_TAG } from "@/src/lib/projectsView";
import {
  approverLabel, BASELINE_APPROVER, factoryName, getProject, getSupplierInitiatives, INITIATIVE_STAGES, initiativeCountLine, initiativeCounts,
  opportunityName, supplierFilterOptions, supplierName, WHERE_ORDER, whereCountLine, brandAmountText, outsideBrandSummary,
} from "@/src/lib/selectors";
import { AppMain, EmptyState, PageHeader, SelectControl, StatusPill } from "@/src/components/ui";
import type { InitiativeRow } from "@/src/lib/initiatives";
import ProjectDrawerButton from "./ProjectDrawer";
import { ForecastTags, StagePill } from "./ProjectsParts";

const gradeText = (g: InitiativeRow["grade"]) => (g === null ? "n/a" : g === "none" ? "None" : `Grade ${g}`);

function DeliveryPlan() {
  const { approved, scenarios, approve } = useProjects();
  const current = scenarios.find((s) => s.id === approved.id);
  const others = scenarios.filter((s) => s.id !== approved.id && s.items.length > 0);
  return (
    <section className="card mt-6 p-6" aria-labelledby="plan-h">
      <h3 id="plan-h">Delivery plan</h3>
      {current ? (
        <div className="mt-2">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">{current.id} · {current.name} <StatusPill tone="positive" shape="circle" label={approverLabel()} /> <ForecastTags /></p>
          <ul className="mt-2 list-disc pl-5 text-ink-700">{current.items.map((id) => <li key={id}>{id} · {opportunityName(id)}</li>)}</ul>
        </div>
      ) : <p className="mt-2 text-ink-500">No delivery plan has been approved yet.</p>}
      {BASELINE_APPROVER === "brand" && others.length > 0 && (
        <ul className="mt-4 space-y-2">
          {others.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3">
              <span className="text-ink-700">{s.id} · {s.name}</span>
              <button type="button" className="btn btn-secondary min-h-11 px-4 text-sm" onClick={() => approve(s)}>Approve</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0"><span className="block text-sm text-ink-500">{label}</span><span className="block font-semibold text-ink-900">{children}</span></div>
);

function BrandFunding({ row }: { row: InitiativeRow }) {
  const c = row.brandFunding;
  if (c.status !== "share") {
    return (
      <>
        {c.text}
        {c.status === "not-recorded" && <span className="block text-sm font-normal text-ink-500">The demo has not recorded who funds this project.</span>}
      </>
    );
  }
  const amount = brandAmountText(c);
  return (
    <>
      {c.text}
      <span aria-hidden="true" className="mt-1 block h-1.5 w-24 rounded-full bg-[var(--neutral-bg)] ring-1 ring-[var(--neutral-line)]"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.round((c.share ?? 0) * 100)}%` }} /></span>
      {amount && <span className="block text-sm font-normal text-ink-500">{amount}</span>}
    </>
  );
}

function ActionItem({ row: r }: { row: InitiativeRow }) {
  const site = r.kind === "Site measurement";
  const project = r.projectId ? getProject(r.projectId) : undefined;
  return (
    <li className="card p-4">
      <div className="grid items-start gap-x-5 gap-y-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1.6fr)_auto_auto]">
        <div className="min-w-0">
          <h4>{site ? r.name : `${r.id} · ${r.name}`}</h4>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <StatusPill tone="neutral" shape={r.where === "Inside the factory" ? "square" : "ring"} label={r.where} />
            {r.forecast && <ForecastTags />}
          </p>
          {r.gateReason && <p className="mt-1 text-sm text-ink-500">{r.gateReason}</p>}
          {site && (
            <div className="mt-1 text-sm text-ink-500">
              <p>Cell score {r.score === null ? "n/a" : fmtScore(r.score!)}{r.counted !== null && r.counted !== r.score ? `, counted ${fmtScore(r.counted!)}` : ""}. Target {r.target}.</p>
              {r.breakdown && r.breakdown.length > 0 && <p>{r.breakdown.map((b) => `${b.label} ${fmtInt(b.value)}`).join(", ")}</p>}
              <p>{r.note}</p>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <Link href={`/factories/${r.factoryId}?tab=evidence`} className="block font-semibold text-ink-900 hover:underline">{r.factoryName}</Link>
          <span className="block text-sm text-ink-500">{supplierName(r.supplierId)}</span>
        </div>
        <div className="grid gap-2">
          <Field label="Value">{r.forecast ? `${FORECAST_TAG}: ${r.value}` : r.value}</Field>
          <Field label="Evidence grade and attribution">{gradeText(r.grade)} · {r.attribution ?? "n/a"}</Field>
        </div>
        <div className="grid gap-2">
          <Field label="Funded by">{r.fundedBy}</Field>
          <Field label="Brand funding"><BrandFunding row={r} /></Field>
          <Field label="Funding sources shortlisted">{r.shortlistedFunders.length ? r.shortlistedFunders.join(", ") : "None"}</Field>
        </div>
        <StagePill stage={r.stage} />
        <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
          {project
            ? <ProjectDrawerButton project={project} siteName={factoryName(project.factoryId)} />
            : <Link href={`/impact?factory=${r.factoryId}`} className="btn btn-secondary min-h-11 px-4 text-sm">See in Impact</Link>}
        </div>
      </div>
    </li>
  );
}

// Brand only: what suppliers have done, at which stage, who funds it and what evidence stands behind it. Read-only.
export default function SupplierActionsScreen() {
  const { role } = useRole();
  const scope = useScope();
  const router = useRouter();
  const params = useSearchParams();
  const { approved, commitments, shortlist } = useProjects();
  useEffect(() => {
    if (role === "supplier") router.replace("/portfolio");
  }, [role, router]);

  const all = useMemo(() => getSupplierInitiatives(scope, approved.items, commitments, shortlist), [scope, approved.items, commitments, shortlist]);
  if (role !== "brand") return null;

  const supplier = params.get("supplier") ?? "all";
  const factory = params.get("factory") ?? "all";
  const stage = params.get("stage") ?? "all";
  const where = params.get("where") ?? "all";
  const inSupplier = all.filter((r) => supplier === "all" || r.supplierId === supplier);
  const rows = inSupplier.filter((r) => (factory === "all" || r.factoryId === factory) && (stage === "all" || r.stage === stage) && (where === "all" || r.where === where));
  const outside = outsideBrandSummary(rows);
  const factoryOptions = [...new Map(inSupplier.map((r) => [r.factoryId, r.factoryName])).entries()].map(([value, label]) => ({ value, label }));

  return (
    <>
      <PageHeader
        title="Supplier actions"
        subtitle="What your suppliers have done, at which stage, and who is funding it. Validation happens in Claims & Evidence."
        crumbs={[{ label: "Portfolio", href: "/portfolio" }, { label: "Supplier actions" }]}
      />
      <AppMain>
        <div className="card p-5">
          <p className="font-semibold text-ink-900" aria-live="polite">{initiativeCountLine(initiativeCounts(rows))}</p>
          <p className="text-ink-700">{whereCountLine(rows)}</p>
          {outside.outsideActions > 0 && <p className="text-ink-700">Brand co-funds {outside.brandCoFunded} of {outside.outsideActions} outside actions; {outside.notRecorded} not recorded or to be agreed.</p>}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3" role="group" aria-label="Filters">
            <SelectControl param="supplier" label="Supplier" defaultValue="all" options={supplierFilterOptions(scope)} />
            <SelectControl param="factory" label="Factory" defaultValue="all" options={[{ value: "all", label: "All factories" }, ...factoryOptions]} />
            <SelectControl param="where" label="Where" defaultValue="all" options={[{ value: "all", label: "All locations" }, ...WHERE_ORDER.map((w) => ({ value: w, label: w }))]} />
            <SelectControl param="stage" label="Stage" defaultValue="all" options={[{ value: "all", label: "All stages" }, ...INITIATIVE_STAGES.map((s) => ({ value: s, label: s }))]} />
          </div>
          <p className="text-ink-500" aria-live="polite">{rows.length} {rows.length === 1 ? "action" : "actions"}</p>
        </div>
        <div className="mt-4">
          {rows.length === 0
            ? <EmptyState title="Nothing matches these filters" text="Choose different filters, or clear them to see every supplier action." action={{ label: "Clear filters", href: "/actions" }} />
            : <ul className="space-y-4">{rows.map((r) => <ActionItem key={r.id} row={r} />)}</ul>}
        </div>
        <DeliveryPlan />
      </AppMain>
    </>
  );
}
