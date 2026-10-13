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
  opportunityName, supplierFilterOptions, WHERE_ORDER, whereCountLine, brandAmountText, outsideBrandSummary,
} from "@/src/lib/selectors";
import { AppMain, DataTable, EmptyState, PageHeader, SelectControl, StatusPill, Toolbar, type Column } from "@/src/components/ui";
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

  const columns: Column<InitiativeRow>[] = [
    { key: "supplier", header: "Supplier", className: "min-w-44 py-2", cell: (r) => supplierFilterOptions(scope).find((o) => o.value === r.supplierId)?.label.replace(/ \(\d+ factor(y|ies)\)$/, "") ?? r.supplierId },
    { key: "factory", header: "Factory", className: "min-w-44 py-2", cell: (r) => r.factoryName },
    { key: "where", header: "Where", className: "min-w-40 py-2", cell: (r) => <StatusPill tone="neutral" shape={r.where === "Inside the factory" ? "square" : "ring"} label={r.where} /> },
    {
      key: "action", header: "Action", className: "min-w-64 py-2",
      cell: (r) => (
        <div>
          <span className="font-semibold text-ink-900">{r.kind === "Site measurement" ? r.name : `${r.id} · ${r.name}`}</span>
          {r.kind === "Site measurement" && (
            <div className="text-sm text-ink-500">
              <p>Cell score {r.score === null ? "n/a" : fmtScore(r.score!)}{r.counted !== null && r.counted !== r.score ? `, counted ${fmtScore(r.counted!)}` : ""}. Target {r.target}.</p>
              {r.breakdown && r.breakdown.length > 0 && <p>{r.breakdown.map((b) => `${b.label} ${fmtInt(b.value)}`).join(", ")}</p>}
              <p>{r.note}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "stage", header: "Stage", className: "min-w-52 py-2",
      cell: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StagePill stage={r.stage} />
          {r.forecast && <ForecastTags />}
          {r.gateReason && <span className="text-sm text-ink-500">{r.gateReason}</span>}
        </div>
      ),
    },
    { key: "value", header: "Value", className: "min-w-52 py-2 font-semibold text-ink-900", cell: (r) => (r.forecast ? `${FORECAST_TAG}: ${r.value}` : r.value) },
    { key: "fundedBy", header: "Funded by", className: "min-w-56 py-2 text-ink-700", cell: (r) => r.fundedBy },
    {
      key: "brand", header: "Brand funding", className: "min-w-44 py-2",
      cell: (r) => {
        const c = r.brandFunding;
        if (c.status !== "share") {
          return (
            <div>
              <span className="text-ink-700">{c.text}</span>
              {c.status === "not-recorded" && <span className="block text-sm text-ink-500">The demo has not recorded who funds this project.</span>}
            </div>
          );
        }
        const amount = brandAmountText(c);
        return (
          <div>
            <span className="font-semibold text-ink-900">{c.text}</span>
            <span aria-hidden="true" className="mt-1 block h-1.5 w-24 rounded-full bg-[var(--neutral-bg)] ring-1 ring-[var(--neutral-line)]"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.round((c.share ?? 0) * 100)}%` }} /></span>
            {amount && <span className="block text-sm text-ink-500">{amount}</span>}
          </div>
        );
      },
    },
    { key: "funders", header: "Funding sources shortlisted", className: "min-w-56 py-2 text-ink-700", cell: (r) => (r.shortlistedFunders.length ? r.shortlistedFunders.join(", ") : "None") },
    { key: "grade", header: "Evidence grade", className: "min-w-32 text-ink-700", cell: (r) => gradeText(r.grade) },
    { key: "attribution", header: "Attribution", className: "min-w-28 text-ink-700", cell: (r) => r.attribution ?? "n/a" },
    {
      key: "open", header: "Details", className: "min-w-40 py-2",
      cell: (r) => {
        const p = r.projectId ? getProject(r.projectId) : undefined;
        return p ? <ProjectDrawerButton project={p} siteName={factoryName(p.factoryId)} />
          : <Link href={`/impact?factory=${r.factoryId}`} className="btn btn-secondary min-h-11 px-4 text-sm">See in Impact</Link>;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Supplier actions"
        subtitle="What your suppliers have done, at which stage, and who is funding it. Validation happens in Claims & Evidence."
        crumbs={[{ label: "Portfolio", href: "/portfolio" }, { label: "Supplier actions" }]}
      />
      <AppMain>
        <div className="card p-5">
          <Toolbar>
            <SelectControl param="supplier" label="Supplier" defaultValue="all" options={supplierFilterOptions(scope)} />
            <SelectControl param="factory" label="Factory" defaultValue="all" options={[{ value: "all", label: "All factories" }, ...factoryOptions]} />
            <SelectControl param="where" label="Where" defaultValue="all" options={[{ value: "all", label: "All locations" }, ...WHERE_ORDER.map((w) => ({ value: w, label: w }))]} />
            <SelectControl param="stage" label="Stage" defaultValue="all" options={[{ value: "all", label: "All stages" }, ...INITIATIVE_STAGES.map((s) => ({ value: s, label: s }))]} />
          </Toolbar>
          <p className="font-semibold text-ink-900" aria-live="polite">{initiativeCountLine(initiativeCounts(rows))}</p>
          <p className="text-ink-700">{whereCountLine(rows)}</p>
          {outside.outsideActions > 0 && <p className="text-ink-700">Brand co-funds {outside.brandCoFunded} of {outside.outsideActions} outside actions; {outside.notRecorded} not recorded or to be agreed.</p>}
        </div>
        <div className="mt-5">
          {rows.length === 0
            ? <EmptyState title="No supplier actions" text="No action matches these filters." action={{ label: "Clear filters", href: "/actions" }} />
            : <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} caption="Supplier actions with stage, value, funding, evidence grade and attribution" minWidth="1600px" />}
        </div>
        <DeliveryPlan />
      </AppMain>
    </>
  );
}
