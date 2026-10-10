import { getCurrentSupplierId, getSupplier, getSupplierKpis, listAlerts, listSupplierFactories } from "@/src/lib/data";
import { KpiGrid, PageHeader, Section, SharingPill, pct } from "@/src/components/ui";
import { AlertList, SeverityLegend } from "../_components/AlertList";
import FactoryMap from "../_components/FactoryMap";
import { SupplierFactoryTable } from "../_components/FactoryTable";

export default async function SupplierPage() {
  const id = await getCurrentSupplierId();
  const [supplier, kpis, factories, alerts] = await Promise.all([
    getSupplier(id), getSupplierKpis(id), listSupplierFactories(id), listAlerts({ supplierId: id }),
  ]);

  return (
    <>
      <PageHeader
        title={supplier?.name ?? "Your dashboard"}
        subtitle="The water risk, impact and plant health of your factories."
        meta={
          <p className="flex flex-wrap items-center gap-2" role="note">
            Your brand partner can see the data on this page. Data sharing status: {supplier && <SharingPill sharing={supplier.sharing} />}
          </p>
        }
      />
      <KpiGrid items={[
        { label: "Your factories", value: kpis.factories },
        { label: "Average PWI", value: pct(kpis.avgPwi), context: "Simple average" },
        { label: "Factories in Band 1", value: kpis.band1Factories, context: "Highest water risk" },
        { label: "Off-track plants", value: kpis.offTrack },
        { label: "Open alerts", value: kpis.openAlerts },
        { label: "Baseline pending", value: kpis.baselinePending, context: "No impact score yet" },
      ]} />

      <Section title="Your factory map" hint="Choose what the colours mean, then select a dot.">
        <FactoryMap factories={factories} hrefBase="/supplier/factories" />
      </Section>

      <Section title="What to work on first" hint="Your factories in priority order: highest risk first, then the largest water footprint.">
        <SupplierFactoryTable factories={factories} hrefBase="/supplier/factories" />
      </Section>

      <Section title="Your alerts" hint="Newest first.">
        <div className="mb-4"><SeverityLegend /></div>
        <AlertList alerts={alerts} factoryHref={(fid) => `/supplier/factories/${fid}`} />
      </Section>
    </>
  );
}
