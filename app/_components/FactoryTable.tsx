import type { Factory } from "@/src/lib/data";
import { BandPill, DataTable, EmptyState, HealthPill, RowLink, SeverityPill, StatusPill, pct, trendText, type Column } from "@/src/components/ui";

const nameLink = (f: Factory, base: string) => (
  <div className="min-w-44">
    <RowLink href={`${base}/${f.id}`}>{f.name}</RowLink>
    <div className="-mt-2 text-sm text-muted">{f.district}, {f.state}</div>
  </div>
);
const footprint = (f: Factory) => (f.footprintI === null ? "Impact pending" : f.footprintI.toFixed(2));
const stressed = (f: Factory) =>
  f.waterStressed ? <StatusPill tone="negative" shape="triangle" label="Water-stressed" /> : <span className="text-muted">Not stressed</span>;
const sub = (t: React.ReactNode) => <div className="text-sm text-muted">{t}</div>;

// Supplier dashboard: priority list, one row per factory.
export function SupplierFactoryTable({ factories, hrefBase }: { factories: Factory[]; hrefBase: string }) {
  if (factories.length === 0) return <EmptyState title="No factories yet" text="Factories will appear here once they are added." />;
  const columns: Column<Factory>[] = [
    { key: "name", header: "Factory", cell: (f) => nameLink(f, hrefBase) },
    { key: "rank", header: "Rank", align: "right", cell: (f) => <span className="text-xl font-bold text-brand-dark">#{f.priorityRankInSupplier}</span> },
    { key: "tier", header: "Tier", align: "right", cell: (f) => f.tier },
    { key: "band", header: "Risk band", cell: (f) => <BandPill band={f.band} /> },
    { key: "r", header: "Risk score R", align: "right", cell: (f) => f.riskScoreR.toFixed(2) },
    { key: "i", header: "Footprint I", align: "right", cell: (f) => footprint(f) },
    { key: "quad", header: "What to do", cell: (f) => <span className="font-semibold">{f.quadrant}</span> },
    { key: "present", header: "Present risks", align: "right", cell: (f) => f.presentRiskCount },
    { key: "health", header: "ETP health", cell: (f) => <div className="flex items-center gap-2"><span className="num font-bold">{f.healthScore}</span><HealthPill health={f.health} /></div> },
    { key: "zdhc", header: "ZDHC tier", cell: (f) => f.zdhcTier },
    { key: "sev", header: "Highest alert", cell: (f) => <SeverityPill severity={f.highestSeverity} /> },
    { key: "pwi", header: "Site PWI", align: "right", cell: (f) => (f.sitePwi === null ? <span className="text-muted">Baseline pending</span> : <span className="font-bold">{pct(f.sitePwi)}</span>) },
  ];
  return <DataTable columns={columns} rows={factories} rowKey={(f) => f.id} rowHref={(f) => `${hrefBase}/${f.id}`} caption="Your factories in priority order" minWidth="1280px" />;
}

// Brand supplier page: every measure of the brief, grouped into 12 columns.
export function BrandFactoryTable({ factories, hrefBase, emptyAction }: { factories: Factory[]; hrefBase: string; emptyAction?: { label: string; href: string } }) {
  if (factories.length === 0) {
    return <EmptyState title="No factories match" text="Try a different name or clear the band filter." action={emptyAction} />;
  }
  const columns: Column<Factory>[] = [
    { key: "name", header: "Factory", cell: (f) => nameLink(f, hrefBase) },
    { key: "prio", header: "Priority and tier", align: "right", cell: (f) => <><div className="text-lg font-bold text-brand-dark">#{f.priorityRankInSupplier}</div>{sub(`Tier ${f.tier}`)}</> },
    { key: "band", header: "Risk band", cell: (f) => <BandPill band={f.band} /> },
    { key: "ri", header: "Risk R and footprint I", align: "right", cell: (f) => <><div className="font-bold">R {f.riskScoreR.toFixed(2)}</div>{sub(`I ${footprint(f)}`)}</> },
    { key: "quad", header: "What to do", cell: (f) => <span className="font-semibold">{f.quadrant}</span> },
    { key: "risk", header: "Present risks", align: "right", cell: (f) => <><div className="font-bold">{f.presentRiskCount} of 14</div><div className="mt-0.5 flex justify-end">{stressed(f)}</div></> },
    { key: "health", header: "ETP health", cell: (f) => <div className="space-y-0.5"><div className="num font-bold">{f.healthScore} / 100</div><HealthPill health={f.health} /></div> },
    { key: "zdhc", header: "ZDHC tier", cell: (f) => <><div className="font-semibold">{f.zdhcTier}</div>{sub(trendText[f.zdhcTrend])}</> },
    { key: "sev", header: "Highest alert", cell: (f) => <SeverityPill severity={f.highestSeverity} /> },
    {
      key: "pwi", header: "Site PWI", align: "right",
      cell: (f) => f.sitePwi === null ? <span className="text-muted">Baseline pending</span> : <><div className="font-bold">{pct(f.sitePwi)}</div>{sub(`${f.certBand}, confidence ${f.confidence?.toFixed(2)}`)}</>,
    },
    {
      key: "bal", header: "Balance and benefit", align: "right",
      cell: (f) => <><div>Balance {f.volumetricBalance === null ? "pending" : pct(f.volumetricBalance)}</div>{sub(`Benefit ${f.benefitVsTargetPct === null ? "not available" : `${f.benefitVsTargetPct}% of target`}`)}</>,
    },
    { key: "last", header: "Last data and period", cell: (f) => <><div className="num">{f.lastDataDate}</div>{sub(`${f.period} period`)}</> },
  ];
  return <DataTable columns={columns} rows={factories} rowKey={(f) => f.id} rowHref={(f) => `${hrefBase}/${f.id}`} caption="Factories of this supplier in priority order" minWidth="1500px" />;
}
