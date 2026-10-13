"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRole, useScope } from "@/src/context/RoleContext";
import { REPORTING_PERIOD } from "@/src/data/tenants";
import { tenantFor } from "@/src/lib/roles";
import { AppMain, PageHeader, Tabs, tabIds } from "@/src/components/ui";
import { STEP_FOR_PROJECTS_TAB } from "@/src/lib/journey";
import JourneyStrip from "./JourneyStrip";
import CatalogueTab from "./CatalogueTab";
import OpportunitiesTab from "./OpportunitiesTab";
import ScenariosTab from "./ScenariosTab";

const TABS = [
  { id: "opportunities", label: "Opportunities" },
  { id: "catalogue", label: "Catalogue" },
  { id: "scenarios", label: "Scenarios" },
];
const PREFIX = "projects";

// Projects (V2 10 to 12), supplier only: Lite findings, the evaluated catalogue, and scenarios with a business case. Forecast only.
// The brand does not plan projects; it is sent to Supplier actions.
export default function ProjectsScreen() {
  const { role } = useRole();
  const scope = useScope();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    if (role === "brand") router.replace("/actions");
  }, [role, router]);
  if (role !== "supplier") return null;

  const tab = TABS.some((t) => t.id === params.get("tab")) ? (params.get("tab") as string) : "opportunities";
  const view = { factoryIds: scope.factoryIds, clearHref: null, showSupplier: false };

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="From a Hydris Lite finding to an approved delivery baseline. Every figure here is a Forecast and a demo estimate."
        crumbs={[{ label: "My factories", href: "/portfolio" }, { label: "Projects" }]}
        meta={<p className="text-ink-500">{tenantFor(role).name} · {scope.factoryIds.length} factories · {REPORTING_PERIOD.label}</p>}
      />
      <AppMain>
        <div className="mb-5"><JourneyStrip current={STEP_FOR_PROJECTS_TAB[tab]} /></div>
        <Tabs tabs={TABS} value={tab} idPrefix={PREFIX} label="Projects sections" onChange={(id) => router.replace(`${pathname}?tab=${id}`, { scroll: false })} />
        <div role="tabpanel" id={tabIds(PREFIX, tab).panel} aria-labelledby={tabIds(PREFIX, tab).tab} className="mt-6">
          {tab === "opportunities" && <OpportunitiesTab {...view} />}
          {tab === "catalogue" && <CatalogueTab {...view} />}
          {tab === "scenarios" && <ScenariosTab {...view} />}
        </div>
      </AppMain>
    </>
  );
}
