"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useRole, useScope } from "@/src/context/RoleContext";
import { REPORTING_PERIOD } from "@/src/data/tenants";
import { countLine, portfolioKpis } from "@/src/lib/kpis";
import { tenantFor } from "@/src/lib/roles";
import { getAlerts, getPortfolio, getSites, getSuppliers } from "@/src/lib/selectors";
import { filterByBand, parseBand, parseSiteSort, parseSupplierSort, sortSites, sortSuppliers } from "@/src/lib/sort";
import { AppMain, EmptyState, FilterChips, KpiGrid, PageHeader, SelectControl, Section } from "@/src/components/ui";
import AlertsFeed from "./AlertsFeed";
import FactoryCard from "./FactoryCard";
import NetworkMap from "./NetworkMap";
import SupplierRow from "./SupplierRow";
import TopPriorities from "./TopPriorities";

// Brand: Portfolio Command Center (PRODUCT 4.2). Supplier: My factories, the same page scoped to SUP5.
export default function PortfolioScreen() {
  const { role } = useRole();
  const scope = useScope();
  const params = useSearchParams();
  const tenant = tenantFor(role!);

  const portfolio = useMemo(() => getPortfolio(scope), [scope]);
  const sites = useMemo(() => getSites(scope), [scope]);
  const alerts = useMemo(() => getAlerts(scope), [scope]);
  const siteNames = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, s.name])), [sites]);

  const supplierSort = parseSupplierSort(params.get("sort"));
  const suppliers = useMemo(() => sortSuppliers(getSuppliers(scope), supplierSort), [scope, supplierSort]);

  const siteSort = parseSiteSort(params.get("sort"));
  const band = parseBand(params.get("band"));
  const factories = useMemo(() => sortSites(filterByBand(sites, band), siteSort), [sites, siteSort, band]);

  const isBrand = role === "brand";
  return (
    <>
      <PageHeader
        title={isBrand ? "Portfolio" : "My factories"}
        subtitle={`${tenant.name} · ${countLine(isBrand ? portfolio.supplierCount : null, portfolio.factoryCount)} · ${REPORTING_PERIOD.label}`}
      />
      <AppMain>
        <KpiGrid items={portfolioKpis(portfolio, role!)} />

        {isBrand ? (
          <Section title="Suppliers" hint="Select a supplier to see its factories, ranked." action={
            <SelectControl param="sort" label="Sort by" defaultValue="risk" options={[
              { value: "risk", label: "Risk (highest first)" }, { value: "pwi", label: "PWI (weakest first)" },
              { value: "alerts", label: "Alerts (most severe first)" }, { value: "name", label: "Name" },
            ]} />
          }>
            <div className="panel p-5">
              <ul className="space-y-4">{suppliers.map((s) => <SupplierRow key={s.id} supplier={s} />)}</ul>
            </div>
          </Section>
        ) : (
          <Section title="Your factories" hint="Ranked among your own factories. Rank shows priority for action, not performance." action={
            <SelectControl param="sort" label="Sort by" defaultValue="rank" options={[
              { value: "rank", label: "Rank" }, { value: "risk", label: "Risk R (highest first)" },
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
        )}

        <div className="mt-12 grid items-start gap-5 lg:grid-cols-12">
          <div className="card p-6 lg:col-span-8">
            <h3 className="mb-4">Network map</h3>
            <NetworkMap sites={sites} />
          </div>
          <div className="card p-6 lg:col-span-4">
            <h3 className="mb-4">Alerts</h3>
            <AlertsFeed alerts={alerts} siteNames={siteNames} canAct={isBrand} />
          </div>
        </div>

        <div className="mt-5"><TopPriorities sites={sites} /></div>
      </AppMain>
    </>
  );
}
