"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRole, useScope } from "@/src/context/RoleContext";
import { countLine, supplierKpis } from "@/src/lib/kpis";
import { getSupplier } from "@/src/lib/selectors";
import { filterByBand, parseBand, parseSiteSort, sortSites } from "@/src/lib/sort";
import { AppMain, EmptyState, FilterChips, KpiGrid, PageHeader, SelectControl, Section } from "@/src/components/ui";
import FactoryCard from "./FactoryCard";

// Supplier detail (PRODUCT 4.3), brand only. A supplier's own home page is My factories, so that role is sent there.
export default function SupplierDetailScreen({ supplierId }: { supplierId: string }) {
  const { role } = useRole();
  const scope = useScope();
  const router = useRouter();
  const params = useSearchParams();
  const crumbs = [{ label: "Portfolio", href: "/portfolio" }];

  useEffect(() => {
    if (role === "supplier") router.replace("/portfolio");
  }, [role, router]);

  const supplier = useMemo(() => getSupplier(scope, supplierId), [scope, supplierId]);
  const sort = parseSiteSort(params.get("sort"));
  const band = parseBand(params.get("band"));
  const factories = useMemo(() => (supplier ? sortSites(filterByBand(supplier.sites, band), sort) : []), [supplier, sort, band]);

  if (role === "supplier") return null;

  if (!supplier) {
    return (
      <>
        <PageHeader title="Supplier not found" subtitle="There is no supplier with this link." crumbs={[...crumbs, { label: supplierId }]} />
        <AppMain><EmptyState title="Supplier not found" text="Go back to the portfolio and choose a supplier from the list." action={{ label: "Open portfolio", href: "/portfolio" }} /></AppMain>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={supplier.name}
        subtitle={`${supplier.cluster} · ${countLine(null, supplier.sites.length)}`}
        crumbs={[...crumbs, { label: supplier.name }]}
      />
      <AppMain>
        <KpiGrid items={supplierKpis(supplier)} />

        <Section title="Factories" hint="Ranked in the network. Select a factory for its risk, impact, projects and evidence." action={
          <SelectControl param="sort" label="Sort by" defaultValue="rank" options={[
            { value: "rank", label: "Rank in the network" }, { value: "risk", label: "Risk R (highest first)" },
            { value: "footprint", label: "Footprint I (largest first)" }, { value: "pwi", label: "PWI (weakest first)" },
            { value: "band", label: "Risk band" },
          ]} />
        }>
          <div className="mb-4">
            <FilterChips param="band" label="Filter by risk band" options={[{ value: "1", label: "Band 1" }, { value: "2", label: "Band 2" }, { value: "3", label: "Band 3" }]} />
          </div>
          {factories.length === 0 ? (
            <EmptyState title="No factories in this band" text="Choose another band, or show all factories." />
          ) : (
            <ul className="space-y-5">{factories.map((s) => <FactoryCard key={s.id} site={s} />)}</ul>
          )}
        </Section>
      </AppMain>
    </>
  );
}
