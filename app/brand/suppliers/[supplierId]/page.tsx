import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { getSupplierDetail, listAlerts, listSupplierFactoriesForBrand, listSuppliers, type Band, type Finding, type Severity } from "@/src/lib/data";
import {
  Breadcrumbs, EmptyState, FilterChips, KpiGrid, PageHeader, Panel, PerformancePill, SearchInput, Section, SharingPill, StackedBar, Toolbar, pct,
} from "@/src/components/ui";
import { AlertList, SeverityLegend } from "../../../_components/AlertList";
import { BrandFactoryTable } from "../../../_components/FactoryTable";
import { certSegments, healthSegments, tierSegments } from "../../../_components/mix";
import { one } from "../../../_components/url";

const BANDS: Band[] = [1, 2, 3];
const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Info"];

function Findings({ title, items, tone, empty }: { title: string; items: Finding[]; tone: "good" | "bad"; empty: string }) {
  const Icon = tone === "good" ? CheckCircle2 : AlertTriangle;
  return (
    <Panel>
      <h3 className={`mb-3 flex items-center gap-2 text-xl font-semibold ${tone === "good" ? "text-[var(--positive-fg)]" : "text-[var(--caution-fg)]"}`}>
        <Icon className="size-5" aria-hidden="true" /> {title}
      </h3>
      {items.length === 0 ? <p className="text-muted">{empty}</p> : (
        <ul className="space-y-4">
          {items.map((f) => (
            <li key={f.title}><p className="font-semibold">{f.title}</p><p className="text-muted">{f.detail}</p></li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default async function SupplierPage(props: PageProps<"/brand/suppliers/[supplierId]">) {
  const { supplierId } = await props.params;
  const sp = await props.searchParams;
  const detail = await getSupplierDetail(supplierId);
  if (!detail) notFound();
  const s = detail.summary;
  const crumbs = [{ label: "Brand", href: "/brand" }, { label: "Suppliers", href: "/brand#suppliers" }, { label: s.name }];

  if (s.sharing !== "Shared") {
    return (
      <>
        <Breadcrumbs items={crumbs} />
        <PageHeader title={s.name} subtitle={s.country} meta={<SharingPill sharing={s.sharing} />} />
        <EmptyState
          title={`${s.name} has not shared data with you`}
          text="You can see this supplier's details here once it chooses to share its data with you."
          action={{ label: "Back to suppliers", href: "/brand#suppliers" }}
        />
      </>
    );
  }

  const band = BANDS.find((b) => String(b) === one(sp.band));
  const severity = SEVERITIES.find((v) => v === one(sp.severity));
  const base = `/brand/suppliers/${supplierId}`;
  const [factories, alerts] = await Promise.all([
    listSupplierFactoriesForBrand(supplierId, { search: one(sp.q), band }),
    listAlerts({ supplierId, severity }),
  ]);
  const k = detail.kpis;

  return (
    <>
      <Breadcrumbs items={crumbs} />
      <div className="-mt-2 mb-2">
        <Link href="/brand#suppliers" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand hover:underline"><ArrowLeft className="size-4" aria-hidden="true" /> Back to suppliers</Link>
      </div>
      <PageHeader
        title={s.name}
        subtitle={s.country}
        meta={
          <>
            <PerformancePill status={s.performanceStatus} />
            <span>Performance rank <strong className="num">#{s.performanceRank} of {detail.rankOf}</strong></span>
            <span>Priority rank <strong className="num">#{s.priorityRank} of {detail.rankOf}</strong></span>
            <SharingPill sharing={s.sharing} />
            <span className="text-muted">Onboarded <span className="num">{detail.onboardedDate}</span></span>
            <span className="text-muted">Contact: {detail.contactName}</span>
          </>
        }
      />

      <KpiGrid items={[
        { label: "Factories", value: k.factories },
        { label: "Average PWI", value: pct(k.avgPwiRnWeighted), context: "Weighted by Replenishment Needed" },
        { label: "Band 1 factories", value: k.band1Factories, context: "Highest water risk" },
        { label: "Off-track plants", value: k.offTrack },
        { label: "Open alerts", value: k.openAlerts },
        { label: "Baseline pending", value: k.baselinePending, context: "No impact score yet" },
      ]} />

      <Section title="How this supplier is performing">
        <div className="grid gap-4 md:grid-cols-2">
          <Findings title="Performing well" items={detail.strengths} tone="good" empty="No strengths to report yet." />
          <Findings title="Needs attention" items={detail.concerns} tone="bad" empty="Nothing needs attention right now." />
        </div>
      </Section>

      <Section title="Breakdowns">
        <div className="grid gap-4 md:grid-cols-3">
          <Panel title="ETP health"><StackedBar segments={healthSegments(s)} ariaLabel="ETP health mix" /></Panel>
          <Panel title="ZDHC tier"><StackedBar segments={tierSegments(s)} ariaLabel="ZDHC tier mix" /></Panel>
          <Panel title="Certification band"><StackedBar segments={certSegments(s)} ariaLabel="Certification band spread" /></Panel>
        </div>
      </Section>

      <Section title="Factories" hint="In priority order: highest risk first, then the largest water footprint.">
        <Toolbar>
          <SearchInput label="Search factories" placeholder="Search by factory or district" />
          <FilterChips param="band" label="Filter by risk band" options={BANDS.map((b) => ({ value: String(b), label: `Band ${b}` }))} />
        </Toolbar>
        <BrandFactoryTable factories={factories} hrefBase="/brand/factories" emptyAction={{ label: "Clear filters", href: base }} />
      </Section>

      <Section title="Alerts" hint="Newest first.">
        <div className="mb-4 space-y-3">
          <SeverityLegend />
          <FilterChips param="severity" label="Filter alerts by severity" options={SEVERITIES.map((v) => ({ value: v, label: v }))} />
        </div>
        <AlertList
          alerts={alerts} factoryHref={(id) => `/brand/factories/${id}`}
          empty={severity ? { title: "No alerts at this severity", text: "Try another severity or show all alerts.", action: { label: "Show all alerts", href: base } } : { title: "No alerts", text: "This supplier has no alerts right now." }}
        />
      </Section>
    </>
  );
}


export async function generateStaticParams() {
  return (await listSuppliers()).map((s) => ({ supplierId: s.supplierId }));
}
