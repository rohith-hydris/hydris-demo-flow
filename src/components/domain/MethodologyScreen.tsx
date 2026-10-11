"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  GROUPED_ISSUES, HIGH_ISSUES, ISSUES_NOTE, METHOD_FIELDS_NOTE, METHOD_LIBRARY_NOTE, METHOD_LIBRARY_STATUS, THEMES_NOTE,
  issuesRegister, methodLibrary, openDecisions, type DecisionRow, type IssueRow, type MethodEntry,
} from "@/src/data/methodology";
import { METHODOLOGY_TABS, methodologyHref, parameterRows, parseMethodologyTab, statusBadge } from "@/src/lib/methodology";
import { METHOD_VERSION } from "@/src/lib/impact";
import { AppMain, CitationChip, DataTable, PageHeader, ProposedBadge, StatusPill, Tabs, tabIds, type Column } from "@/src/components/ui";
import type { ParameterRow } from "@/src/data/methodology";

const ID_PREFIX = "methodology";

function StatusCell({ row }: { row: ParameterRow }) {
  const b = statusBadge(row.status);
  return (
    <div className="flex flex-col items-start gap-1 py-2">
      {b.kind === "proposed" ? <ProposedBadge />
        : b.kind === "reference" ? <StatusPill tone="info" shape="ring" label={b.label} />
        : <StatusPill tone="neutral" shape={b.kind === "question" ? "ring" : "dash"} label={b.label} />}
      {row.statusNote && <span className="text-sm text-ink-500">{row.statusNote}</span>}
    </div>
  );
}

const parameterColumns: Column<ParameterRow>[] = [
  { key: "parameter", header: "Parameter", className: "min-w-52 font-semibold text-ink-900", cell: (r) => r.parameter },
  { key: "value", header: "Value", className: "min-w-72 py-2 text-ink-700", cell: (r) => r.value },
  { key: "status", header: "Status", className: "min-w-60", cell: (r) => <StatusCell row={r} /> },
];

function ParametersTab() {
  const rows = useMemo(parameterRows, []);
  return (
    <>
      <p className="mb-4 max-w-3xl text-ink-700">
        Parameters of {METHOD_VERSION}. The nine-cell structure stays visible: three pillars (Site P1, Sub-basin P2, Basin P3) by three dimensions (Availability, Accessibility, Quality).
        Most values are proposals under review, not approved policy.
      </p>
      <DataTable columns={parameterColumns} rows={rows} rowKey={(r) => r.id} caption="PWI-M 1.0 parameters with status" minWidth="860px" />
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const gap = value.startsWith("To be defined");
  return (
    <div>
      <dt className="text-sm font-semibold text-ink-500">{label}</dt>
      <dd className={gap ? "text-ink-500" : "text-ink-900"}>{value}</dd>
    </div>
  );
}

function MethodCard({ m }: { m: MethodEntry }) {
  return (
    <li className="card flex flex-col p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4>{m.name}</h4>
        <StatusPill tone="info" shape="square" label={m.family} />
      </div>
      <p className="mt-1 text-ink-500">{m.indicator}{m.appliesTo ? ` · ${m.appliesTo}` : ""}</p>
      <div className="mt-4 rounded-tile bg-blue-50 p-4 text-ink-900">
        <p className="num font-semibold">{m.formula}</p>
        <p className="mt-1 text-sm text-ink-700">{m.inputs}</p>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <Field label="Boundary" value={m.boundary} />
        <Field label="Units" value={m.units} />
        <Field label="Counterfactual" value={m.counterfactual} />
        <Field label="Operating period" value={m.operatingPeriod} />
        <div className="sm:col-span-2"><Field label="Monitoring requirement" value={m.monitoring} /></div>
      </dl>
      {m.example && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-500">Example values from <CitationChip label={m.example} /></p>
      )}
      <div className="mt-4 flex flex-col items-start gap-2 border-t border-line pt-4">
        <ProposedBadge label={METHOD_LIBRARY_STATUS} />
        <p className="text-sm text-ink-500">{METHOD_LIBRARY_NOTE}</p>
      </div>
    </li>
  );
}

function MethodsTab() {
  return (
    <>
      <p className="max-w-3xl text-ink-700">
        The nine benefit methods from the PRD method library (v1). {METHOD_LIBRARY_NOTE} Each formula still needs validating with its boundary, units, counterfactual, operating period and monitoring requirement.
      </p>
      <p className="mt-2 max-w-3xl text-sm text-ink-500">{METHOD_FIELDS_NOTE}</p>
      <ul className="mt-5 grid gap-5 lg:grid-cols-2">{methodLibrary.map((m) => <MethodCard key={m.id} m={m} />)}</ul>
    </>
  );
}

const issueColumns: Column<IssueRow>[] = [
  { key: "n", header: "#", align: "right", className: "w-12 text-ink-500", cell: (r) => r.n },
  { key: "issue", header: "Issue", className: "min-w-60 py-2 font-semibold text-ink-900", cell: (r) => r.issue },
  { key: "severity", header: "Severity", className: "min-w-36", cell: (r) => (r.severity === "High" ? <StatusPill tone="high" shape="square" label="High" /> : <StatusPill tone="caution" shape="diamond" label="Medium or Low" />) },
  { key: "resolution", header: "Proposed resolution", className: "min-w-60 py-2 text-ink-700", cell: (r) => r.resolution },
  { key: "test", header: "Validating test", className: "min-w-48 py-2 text-ink-700", cell: (r) => r.test },
  { key: "status", header: "Status", className: "min-w-32", cell: (r) => <StatusPill tone="caution" shape="diamond" label={r.status} /> },
];

function IssuesTab() {
  return (
    <>
      <div role="note" className="mb-4 flex max-w-3xl items-start gap-3 rounded-tile border border-[var(--caution-line)] bg-[var(--caution-bg)] p-4 text-[var(--caution-fg)]">
        <ProposedBadge label="Proposed" className="shrink-0" />
        <p className="font-semibold">{ISSUES_NOTE}</p>
      </div>
      <p className="mb-4 max-w-3xl text-ink-700">
        The PWI Engine review found {HIGH_ISSUES + GROUPED_ISSUES} issues in the source formulas: {HIGH_ISSUES} High, listed one by one, and {GROUPED_ISSUES} Medium or Low, grouped into twelve themes. {THEMES_NOTE}
      </p>
      <DataTable columns={issueColumns} rows={issuesRegister} rowKey={(r) => String(r.n)} caption="Source formula issues register, all proposed" minWidth="980px" />
    </>
  );
}

const decisionColumns: Column<DecisionRow>[] = [
  { key: "id", header: "Reference", className: "w-28 font-semibold text-ink-900", cell: (r) => r.id },
  { key: "decision", header: "Decision", className: "min-w-80 py-2 text-ink-700", cell: (r) => r.decision },
  { key: "appearsIn", header: "Where it shows in the app", className: "min-w-52 py-2 text-ink-700", cell: (r) => r.appearsIn },
  { key: "owner", header: "Owner", className: "min-w-32 text-ink-500", cell: (r) => r.owner },
  { key: "status", header: "Status", className: "min-w-48", cell: (r) => (r.status === "Open" ? <StatusPill tone="neutral" shape="ring" label="Open" /> : <ProposedBadge />) },
];

function DecisionsTab() {
  return (
    <>
      <p className="mb-4 max-w-3xl text-ink-700">Decisions the team has not yet made. Until each one is settled, the app shows the current behaviour as a proposal, not as approved policy.</p>
      <DataTable columns={decisionColumns} rows={openDecisions} rowKey={(r) => r.id} caption="Open decisions with owner and status" minWidth="940px" />
    </>
  );
}

// Methodology (V2 ADDENDUM 3): read-only for both roles. Four tabs, addressed as /methodology?tab=...
export default function MethodologyScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = parseMethodologyTab(params.get("tab"));
  const ids = tabIds(ID_PREFIX, tab);

  return (
    <>
      <PageHeader
        title="Methodology"
        subtitle={`How ${METHOD_VERSION} works and what is still under review. Read-only. Most methods here are proposals, not approved policy.`}
        crumbs={[{ label: "Portfolio", href: "/portfolio" }, { label: "Methodology" }]}
        meta={<ProposedBadge label="V2 review draft" />}
      />
      <AppMain>
        <Tabs
          tabs={[...METHODOLOGY_TABS]} value={tab} label="Methodology sections" idPrefix={ID_PREFIX}
          onChange={(id) => router.replace(id === "parameters" ? pathname : methodologyHref(parseMethodologyTab(id)), { scroll: false })}
        />
        <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} key={tab} className="tab-fade mt-6">
          {tab === "parameters" ? <ParametersTab /> : tab === "methods" ? <MethodsTab /> : tab === "issues" ? <IssuesTab /> : <DecisionsTab />}
        </div>
      </AppMain>
    </>
  );
}
