import Link from "next/link";
import {
  getBrand, getBrandKpis, getPerformanceDistribution, listAlerts, listAttentionSuppliers, listSuppliers,
  type PerformanceStatus,
} from "@/src/lib/data";
import {
  EmptyState, FilterChips, KpiGrid, PageHeader, Panel, PerformancePill, SearchInput, Section, SelectControl, StackedBar, Toolbar,
  performanceMeta, pct,
} from "@/src/components/ui";
import { RecentAlerts } from "../_components/AlertList";
import SupplierTable from "../_components/SupplierTable";
import { one } from "../_components/url";

const STATUSES: PerformanceStatus[] = ["On track", "Needs attention", "Off track"];
const SORTS = ["performance", "priority", "name"] as const;

export default async function BrandPage({ searchParams }: PageProps<"/brand">) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === one(sp.status));
  const sort = SORTS.find((s) => s === one(sp.sort)) ?? "performance";
  const search = one(sp.q);

  const [brand, kpis, distribution, attention, suppliers, alerts] = await Promise.all([
    getBrand(), getBrandKpis(), getPerformanceDistribution(), listAttentionSuppliers(),
    listSuppliers({ search, status, sortBy: sort }),
    listAlerts({ minSeverity: "High", limit: 5 }),
  ]);

  return (
    <>
      <PageHeader
        title="Supplier performance"
        subtitle="See how each supplier is doing, who is on track and who needs your attention."
        meta={<p className="text-muted">Reporting period: <strong className="text-ink">{brand.reportingPeriod}</strong></p>}
      />

      <KpiGrid items={[
        { label: "Suppliers", value: kpis.suppliers, context: `${kpis.sharingSuppliers} share data with you` },
        { label: "On track", value: kpis.onTrack, context: "Doing well overall" },
        { label: "Needs attention", value: kpis.needsAttention, context: "Some plants need a closer look" },
        { label: "Off track", value: kpis.offTrack, context: "Act on these first" },
        { label: "Open Critical alerts", value: kpis.openCritical, context: "Across all suppliers" },
        {
          label: "Portfolio PWI", value: pct(kpis.portfolioPwiSimple), valueLabel: "Simple average",
          extra: [{ label: "Weighted by Replenishment Needed", value: pct(kpis.portfolioPwiRnWeighted) }],
          context: "Suppliers that share data",
        },
      ]} />

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_3fr]">
        <Panel title="How suppliers are performing">
          <StackedBar
            size="lg" ariaLabel="Suppliers by performance status"
            segments={distribution.map((d) => ({ label: d.status, count: d.count, pct: d.pct, ...performanceMeta[d.status] }))}
          />
        </Panel>
        <Panel title="Needs attention">
          {attention.length === 0 ? (
            <EmptyState title="All suppliers are on track" text="No supplier needs your attention right now." />
          ) : (
            <ul className="divide-y divide-line">
              {attention.map((s) => (
                <li key={s.supplierId} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><strong>{s.name}</strong><PerformancePill status={s.performanceStatus} /></div>
                    <p className="text-muted">{s.attentionReason}</p>
                  </div>
                  <Link href={`/brand/suppliers/${s.supplierId}`} className="inline-flex min-h-11 shrink-0 items-center font-semibold text-brand hover:underline">View supplier</Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Section id="suppliers" title="All suppliers" hint="Select a supplier to see its factories, alerts and what is driving its performance.">
        <Toolbar>
          <SearchInput label="Search suppliers" placeholder="Search by supplier name" />
          <SelectControl param="sort" label="Sort by" defaultValue="performance" options={[
            { value: "performance", label: "Performance rank" }, { value: "priority", label: "Priority rank" }, { value: "name", label: "Name" },
          ]} />
        </Toolbar>
        <div className="mb-4">
          <FilterChips param="status" label="Filter by status" options={STATUSES.map((s) => ({ value: s, label: s }))} />
        </div>
        <SupplierTable rows={suppliers} current={sp} sort={sort} />
      </Section>

      <Section title="Recent alerts" hint="The latest Critical and High alerts across your suppliers.">
        <RecentAlerts alerts={alerts} />
      </Section>
    </>
  );
}
