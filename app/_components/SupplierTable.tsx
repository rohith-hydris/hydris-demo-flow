import type { SupplierSummary } from "@/src/lib/data";
import {
  DataTable, EmptyState, PerformancePill, ProgressBar, RowLink, SeverityPill, SharingPill, StackedBar, StatusPill, Tooltip, pct,
  type Column,
} from "@/src/components/ui";
import { healthSegments, tierSegments } from "./mix";
import { href, type Params } from "./url";

const PRIORITY_NOTE = "Where risk and impact call for action first. This is not a performance judgement.";
const hrefOf = (s: SupplierSummary) => (s.sharing === "Shared" ? `/brand/suppliers/${s.supplierId}` : undefined);

// Metric cell: the value for a supplier that shares data, otherwise a dash with the reason.
const metric = (s: SupplierSummary, node: React.ReactNode) =>
  s.sharing === "Shared" ? node : <span className="text-muted"><span aria-hidden="true">–</span> Not shared</span>;

function PwiCell({ s }: { s: SupplierSummary }) {
  return (
    <div className="ml-auto w-32">
      <div className="text-base font-bold">{pct(s.avgPwiRnWeighted)}</div>
      <ProgressBar pct={s.avgPwiRnWeightedPct ?? 0} label="Average PWI weighted by Replenishment Needed" className="mt-1" />
      <div className="mt-1 text-sm text-muted">Simple average {pct(s.avgPwiSimple)}</div>
    </div>
  );
}

const staleChip = (s: SupplierSummary) =>
  s.plantsWithoutData7d > 0 && <StatusPill tone="caution" shape="triangle" label={`${s.plantsWithoutData7d} ${s.plantsWithoutData7d === 1 ? "plant" : "plants"}: 7+ days`} className="mt-1" />;

function Card({ s }: { s: SupplierSummary }) {
  if (s.sharing !== "Shared") {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-lg">{s.name}</strong><SharingPill sharing={s.sharing} /></div>
        <p className="text-sm text-muted">{s.country}</p>
        <p className="mt-2 text-muted">This supplier has not shared data with you.</p>
      </>
    );
  }
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><RowLink href={hrefOf(s)!}>{s.name}</RowLink><p className="-mt-2 text-sm text-muted">{s.country}</p></div>
        <PerformancePill status={s.performanceStatus} />
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div><dt className="text-muted">Performance</dt><dd className="num text-xl font-bold text-brand-dark">#{s.performanceRank}</dd></div>
        <div><dt className="text-muted">Priority</dt><dd className="num text-xl font-bold text-brand-dark">#{s.priorityRank}</dd></div>
        <div><dt className="text-muted">Average PWI</dt><dd className="num text-xl font-bold text-brand-dark">{pct(s.avgPwiRnWeighted)}</dd></div>
      </dl>
      <details className="mt-1">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-brand">More details</summary>
        <dl className="space-y-3 pb-1 text-sm">
          <div><dt className="text-muted">Factories</dt><dd>{s.factoryCount}, with {s.band1Count} in Band 1</dd></div>
          <div><dt className="mb-1 text-muted">ETP health</dt><dd><StackedBar segments={healthSegments(s)} ariaLabel="ETP health mix" size="sm" legend /></dd></div>
          <div><dt className="mb-1 text-muted">ZDHC tier</dt><dd><StackedBar segments={tierSegments(s)} ariaLabel="ZDHC tier mix" size="sm" legend /></dd></div>
          <div><dt className="text-muted">Highest open alert</dt><dd><SeverityPill severity={s.highestSeverity} /></dd></div>
          <div><dt className="text-muted">Off-track plants</dt><dd>{s.offTrackCount}</dd></div>
          <div><dt className="text-muted">Last data</dt><dd>{s.lastDataDate}{staleChip(s)}</dd></div>
          <div><dt className="text-muted">Data sharing</dt><dd><SharingPill sharing={s.sharing} /></dd></div>
        </dl>
      </details>
    </>
  );
}

export default function SupplierTable({ rows, current, sort }: { rows: SupplierSummary[]; current: Params; sort: "performance" | "priority" | "name" }) {
  if (rows.length === 0) {
    return <EmptyState title="No suppliers match" text="Try a different name or clear the status filter." action={{ label: "Clear filters", href: "/brand" }} />;
  }
  const link = (v: string) => href("/brand", current, { sort: v === "performance" ? undefined : v });
  const state = (v: string) => (sort === v ? ("ascending" as const) : ("none" as const));
  const columns: Column<SupplierSummary>[] = [
    {
      key: "name", header: "Supplier", sortHref: link("name"), sort: state("name"),
      cell: (s) => (
        <div className="min-w-44">
          {hrefOf(s) ? <RowLink href={hrefOf(s)!}>{s.name}</RowLink> : <span className="inline-flex min-h-11 items-center font-bold">{s.name}</span>}
          <div className="-mt-2 text-sm text-muted">{s.country}</div>
          {s.sharing !== "Shared" && <div className="mt-1"><SharingPill sharing={s.sharing} /></div>}
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (s) => (s.sharing === "Shared" ? <PerformancePill status={s.performanceStatus} /> : metric(s, null)) },
    { key: "perf", header: "Performance rank", align: "right", sortHref: link("performance"), sort: state("performance"), cell: (s) => metric(s, <span className="text-xl font-bold text-brand-dark">#{s.performanceRank}</span>) },
    {
      key: "prio", header: "Priority rank", align: "right", sortHref: link("priority"), sort: state("priority"),
      headerExtra: <Tooltip text={PRIORITY_NOTE} label="What priority rank means" />,
      cell: (s) => metric(s, <span className="text-xl font-bold text-brand-dark">#{s.priorityRank}</span>),
    },
    { key: "pwi", header: "Average PWI", align: "right", cell: (s) => metric(s, <PwiCell s={s} />) },
    { key: "fact", header: "Factories", align: "right", cell: (s) => metric(s, <><div className="font-bold">{s.factoryCount}</div><div className="text-sm text-muted">{s.band1Count} in Band 1</div></>) },
    { key: "health", header: "ETP health", cell: (s) => metric(s, <div className="w-28"><StackedBar segments={healthSegments(s)} ariaLabel="ETP health mix" size="sm" legend="compact" /></div>) },
    { key: "tier", header: "ZDHC tier", cell: (s) => metric(s, <div className="w-32"><StackedBar segments={tierSegments(s)} ariaLabel="ZDHC tier mix" size="sm" legend="compact" /></div>) },
    { key: "alert", header: "Highest alert", cell: (s) => metric(s, <SeverityPill severity={s.highestSeverity} />) },
    { key: "off", header: "Off-track plants", align: "right", cell: (s) => metric(s, <span className="font-bold">{s.offTrackCount}</span>) },
    { key: "last", header: "Last data", cell: (s) => metric(s, <div><div className="num">{s.lastDataDate}</div>{staleChip(s)}</div>) },
    { key: "share", header: "Data sharing", cell: (s) => <SharingPill sharing={s.sharing} /> },
  ];
  return (
    <DataTable
      columns={columns} rows={rows} rowKey={(s) => s.supplierId} rowHref={hrefOf}
      caption="Suppliers, with performance status, ranks and key measures" minWidth="1280px"
      renderCard={(s) => <Card s={s} />}
    />
  );
}

