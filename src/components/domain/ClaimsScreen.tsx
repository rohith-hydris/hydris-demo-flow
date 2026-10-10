"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileCheck2, Sparkles, Upload } from "lucide-react";
import { useRole, useScope } from "@/src/context/RoleContext";
import { suppliers } from "@/src/data/suppliers";
import { READINESS_STATES, attributionNote, displayNote } from "@/src/lib/claims";
import { fmtPct1 } from "@/src/lib/format";
import { claimNote, fmtClaim } from "@/src/lib/measure";
import {
  CLAIMS_TABS, CLAIM_STATUSES, claimRows, claimSummary, inspectionRows, parseClaimsTab, parseQueueFilters, reportRows, unitLines, type ClaimRow, type InspectionRow, type ReportRow,
} from "@/src/lib/queue";
import { getSites } from "@/src/lib/selectors";
import {
  AppMain, CitationChip, EmptyState, PageHeader, ProjectStatusPill, ReadinessPill, ScoreBar, SelectControl, StatusPill, Tabs, tabIds, projectStatusMeta,
} from "@/src/components/ui";
import MockAction from "./MockAction";
import TrustRing from "./TrustRing";

const ID_PREFIX = "claims";
const REPORTS_COLLAPSED = 20;
const KEEP_ON_TAB_CHANGE = ["supplier", "factory"];

function GradeChip({ grade }: { grade: string }) {
  return (
    <span className="inline-flex min-h-7 items-center whitespace-nowrap rounded-full border border-panel-line bg-card px-2.5 text-sm font-semibold text-blue-600">
      {grade === "none" ? "No grade" : `Grade ${grade}`}
    </span>
  );
}

function ClaimItem({ row, canValidate }: { row: ClaimRow; canValidate: boolean }) {
  const { project: p, site } = row;
  const flagged = p.status === "Flagged";
  const notCounted = p.status === "Not counted";
  return (
    <li className={`card p-4 ${flagged ? "border-l-4 border-l-[var(--negative-fill)]" : notCounted ? "border-dashed border-[var(--neutral-line)] bg-[var(--neutral-bg)] shadow-none" : ""}`}>
      <div className="grid items-center gap-x-5 gap-y-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.4fr)_auto_auto_auto]">
        <div className="min-w-0">
          <h4>{p.name}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <CitationChip label={p.id} />
            <span className="text-sm text-ink-500">Feeds {p.pillar} {p.dimension}</span>
          </div>
        </div>
        <div className="min-w-0">
          <Link href={`/factories/${site.id}?tab=projects`} className="block truncate font-semibold text-ink-900 hover:underline">{site.name}</Link>
          <span className="block truncate text-sm text-ink-500">{site.supplierName}</span>
        </div>
        <div className="min-w-0">
          <p className="num font-semibold text-ink-900">{fmtClaim(p.claim)} <span className="font-normal text-ink-500">claimed</span></p>
          <p className="text-sm text-ink-500">{[claimNote(p.claim), attributionNote(p)].filter(Boolean).join(" ")}</p>
        </div>
        <ProjectStatusPill status={p.status} />
        <GradeChip grade={p.grade} />
        <div className="flex justify-start lg:justify-end">
          {notCounted ? <span className="text-sm text-ink-500">Excluded: {p.gateReason}</span>
            : canValidate ? <Link href={`/copilot?agent=validation&claim=${p.id}`} className="btn btn-secondary min-h-11 px-4 text-sm"><Sparkles className="size-4" aria-hidden="true" /> Validate with agent</Link>
            : <MockAction label="Upload evidence" done="Uploaded (demo)" icon={Upload} />}
        </div>
      </div>
      {flagged && <p className="mt-3 rounded-tile bg-[var(--negative-bg)] p-3 text-ink-700">{displayNote(p, canValidate)}</p>}
    </li>
  );
}

function ReportItem({ row, canValidate }: { row: ReportRow; canValidate: boolean }) {
  const { doc, site } = row;
  return (
    <li className="card p-4">
      <div className="grid items-center gap-x-5 gap-y-3 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.5fr)_auto_auto]">
        <div className="min-w-0">
          <h4>{doc.name}</h4>
          <p className="text-sm text-ink-500">{doc.period}{doc.detail ? ` · ${doc.detail}` : ""}</p>
        </div>
        <div className="min-w-0">
          <Link href={`/factories/${site.id}?tab=evidence`} className="block truncate font-semibold text-ink-900 hover:underline">{site.name}</Link>
          <span className="block truncate text-sm text-ink-500">{site.supplierName}</span>
        </div>
        <ReadinessPill state={doc.state} />
        <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
          {canValidate ? (
            <Link href={`/copilot?agent=validation&report=${doc.id}`} className="btn btn-secondary min-h-11 px-4 text-sm"><Sparkles className="size-4" aria-hidden="true" /> Validate with agent</Link>
          ) : (
            <>
              <MockAction label="Upload" done="Uploaded (demo)" icon={Upload} />
              <MockAction label="Request review" done="Review requested (demo)" icon={FileCheck2} />
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function InspectionItem({ row, canValidate }: { row: InspectionRow; canValidate: boolean }) {
  const { inspection: i, site, trust } = row;
  const ok = i.status === "Validated";
  return (
    <li className="card p-4">
      <div className="grid items-center gap-x-5 gap-y-3 lg:grid-cols-[auto_minmax(0,2fr)_minmax(0,1.5fr)_auto_auto]">
        <TrustRing value={trust} ok={ok} />
        <div>
          <h4>{i.id}</h4>
          <p className="text-sm text-ink-500">{i.date} · {i.passed} of {i.steps} steps passed</p>
        </div>
        <div className="min-w-0">
          <Link href={`/factories/${site.id}?tab=evidence`} className="block truncate font-semibold text-ink-900 hover:underline">{site.name}</Link>
          <span className="block truncate text-sm text-ink-500">{site.supplierName}</span>
        </div>
        {ok ? <StatusPill tone="positive" shape="circle" label="Validated" /> : <StatusPill tone="caution" shape="diamond" label="Needs review" />}
        <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
          {canValidate ? (
            <Link href={`/copilot?agent=validation&inspection=${i.id}`} className="btn btn-secondary min-h-11 px-4 text-sm"><Sparkles className="size-4" aria-hidden="true" /> Validate with agent</Link>
          ) : (
            <MockAction label="Request review" done="Review requested (demo)" icon={FileCheck2} />
          )}
        </div>
      </div>
    </li>
  );
}

// Claims and Evidence (PRODUCT 4.6): the review queue. The brand can validate; a supplier sees its own items and can upload evidence.
export default function ClaimsScreen() {
  const { role } = useRole();
  const scope = useScope();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [showAll, setShowAll] = useState(false);

  const tab = parseClaimsTab(params.get("tab"));
  const filters = useMemo(() => parseQueueFilters((k) => params.get(k)), [params]);
  const sites = useMemo(() => getSites(scope), [scope]);
  const factoryOptions = sites.filter((s) => !filters.supplierId || s.supplierId === filters.supplierId);

  const claims = useMemo(() => claimRows(scope, filters), [scope, filters]);
  const reports = useMemo(() => reportRows(scope, filters), [scope, filters]);
  const inspectionsList = useMemo(() => inspectionRows(scope, filters), [scope, filters]);
  const summary = useMemo(() => claimSummary(scope, { supplierId: filters.supplierId, factoryId: filters.factoryId }), [scope, filters.supplierId, filters.factoryId]);

  const hrefWith = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) q.set(k, v); else q.delete(k); }
    const s = q.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
  const changeTab = (id: string) => {
    const q = new URLSearchParams();
    q.set("tab", id);
    for (const k of KEEP_ON_TAB_CHANGE) { const v = params.get(k); if (v) q.set(k, v); }
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    setShowAll(false);
  };

  const canValidate = scope.canValidate;
  const statusOptions =
    tab === "claims" ? CLAIM_STATUSES.map((s) => ({ value: s, label: s }))
    : tab === "reports" ? READINESS_STATES.map((s) => ({ value: s, label: s }))
    : [{ value: "Needs review", label: "Needs review" }, { value: "Validated", label: "Validated" }];
  const count = tab === "claims" ? claims.length : tab === "reports" ? reports.length : inspectionsList.length;
  const ids = tabIds(ID_PREFIX, tab);
  const visibleReports = showAll ? reports : reports.slice(0, REPORTS_COLLAPSED);

  const tiles = CLAIM_STATUSES.map((s) => ({ status: s, n: summary.counts[s], tone: projectStatusMeta[s].tone }));
  const units = unitLines(summary);

  return (
    <>
      <PageHeader
        title="Claims and evidence"
        subtitle={role === "brand"
          ? "The review queue. Validate project claims, audit reports and field inspections before they count as evidence."
          : "Your claims, reports and inspections. Upload evidence and respond to flags. Validation is done by the brand."}
      />
      <AppMain>
        <ul className="grid grid-cols-2 gap-5 lg:grid-cols-4" aria-label="Claims by status">
          {tiles.map((t) => {
            const on = tab === "claims" && filters.status === t.status;
            return (
              <li key={t.status}>
                <Link
                  href={hrefWith({ tab: "claims", status: on ? undefined : t.status, pillar: undefined, grade: undefined })} scroll={false} aria-current={on ? "true" : undefined}
                  className={`tone-${t.tone} card card-link block p-6 ${on ? "ring-2 ring-[var(--t-fill)]" : ""}`}
                >
                  <span className="text-sm font-semibold text-ink-500">{t.status}</span>
                  <span className="kpi num mt-1 block font-display text-kpi text-ink-900">{t.n}</span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--t-fg)]">{on ? "Showing these. Select to clear." : "Select to filter"}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 card p-6">
          <h3>Claimed against accepted</h3>
          <p className="mt-1 text-ink-500">Each project&rsquo;s attributable share (claim times attribution) against what counts today. Units are never added together.</p>
          <ul className="mt-4 grid gap-5 md:grid-cols-3">
            {units.map((u) => (
              <li key={u.label} className="rounded-tile border border-line bg-blue-50 p-4">
                <p className="font-semibold text-ink-900">{u.label}</p>
                <p className="mt-2 text-sm text-ink-500">Claimed</p>
                <p className="num font-semibold text-ink-900">{u.claimed}</p>
                <p className="mt-1 text-sm text-ink-500">Accepted</p>
                <p className="num font-semibold text-ink-900">{u.accepted}</p>
                <ScoreBar className="mt-3" value={u.share} label={`${u.label} accepted`} valueText={fmtPct1(u.share)} />
                <p className="mt-1 text-sm text-ink-500">{fmtPct1(u.share)} accepted</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <Tabs tabs={[...CLAIMS_TABS]} value={tab} onChange={changeTab} label="Review queue" idPrefix={ID_PREFIX} />
          <p className="text-ink-500" aria-live="polite">{count} {count === 1 ? "item" : "items"}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3" role="group" aria-label="Filters">
          {role === "brand" && (
            <SelectControl param="supplier" label="Supplier" defaultValue="all" options={[{ value: "all", label: "All suppliers" }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
          )}
          <SelectControl param="factory" label="Factory" defaultValue="all" options={[{ value: "all", label: "All factories" }, ...factoryOptions.map((s) => ({ value: s.id, label: s.name }))]} />
          <SelectControl param="status" label="Status" defaultValue="all" options={[{ value: "all", label: "All statuses" }, ...statusOptions]} />
          {tab === "claims" && (
            <>
              <SelectControl param="pillar" label="Pillar" defaultValue="all" options={[{ value: "all", label: "All pillars" }, { value: "P2", label: "Sub-basin (P2)" }, { value: "P3", label: "Basin (P3)" }]} />
              <SelectControl param="grade" label="Evidence grade" defaultValue="all" options={[{ value: "all", label: "All grades" }, { value: "A", label: "Grade A" }, { value: "B", label: "Grade B" }, { value: "C", label: "Grade C" }, { value: "none", label: "No grade" }]} />
            </>
          )}
        </div>

        <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} key={tab} className="tab-fade mt-5">
          {count === 0 ? (
            <EmptyState title="Nothing matches these filters" text="Choose different filters, or clear them to see everything in this list." action={{ label: "Clear filters", href: `${pathname}?tab=${tab}` }} />
          ) : tab === "claims" ? (
            <ul className="space-y-4">{claims.map((r) => <ClaimItem key={r.project.id} row={r} canValidate={canValidate} />)}</ul>
          ) : tab === "reports" ? (
            <>
              <ul className="space-y-4">{visibleReports.map((r) => <ReportItem key={r.doc.id} row={r} canValidate={canValidate} />)}</ul>
              {reports.length > REPORTS_COLLAPSED && (
                <button type="button" onClick={() => setShowAll((s) => !s)} className="btn btn-tertiary mt-4">
                  {showAll ? "Show fewer reports" : `Show all ${reports.length} reports`}
                </button>
              )}
            </>
          ) : (
            <ul className="space-y-4">{inspectionsList.map((r) => <InspectionItem key={r.inspection.id} row={r} canValidate={canValidate} />)}</ul>
          )}
        </div>
      </AppMain>
    </>
  );
}
