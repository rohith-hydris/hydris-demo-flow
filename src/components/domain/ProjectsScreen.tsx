"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRole, useScope } from "@/src/context/RoleContext";
import { REPORTING_PERIOD } from "@/src/data/tenants";
import { tenantFor } from "@/src/lib/roles";
import { AppMain, PageHeader, Tabs, tabIds } from "@/src/components/ui";
import CatalogueTab from "./CatalogueTab";
import OpportunitiesTab from "./OpportunitiesTab";
import ScenariosTab from "./ScenariosTab";

const TABS = [
  { id: "opportunities", label: "Opportunities" },
  { id: "catalogue", label: "Catalogue" },
  { id: "scenarios", label: "Scenarios" },
];
const PREFIX = "projects";

// Projects (V2 10 to 12): Lite findings, the evaluated catalogue, and scenarios with a business case. Forecast only.
export default function ProjectsScreen() {
  const { role } = useRole();
  const scope = useScope();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab")) ? (params.get("tab") as string) : "opportunities";
  const tenant = tenantFor(role!);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="From a Hydris Lite finding to an approved delivery baseline. Every figure here is a Forecast and a demo estimate."
        crumbs={[{ label: role === "brand" ? "Portfolio" : "My factories", href: "/portfolio" }, { label: "Projects" }]}
        meta={<p className="text-ink-500">{tenant.name} · {scope.factoryIds.length} factories · {REPORTING_PERIOD.label}</p>}
      />
      <AppMain>
        <Tabs tabs={TABS} value={tab} idPrefix={PREFIX} label="Projects sections" onChange={(id) => router.replace(`${pathname}?tab=${id}`, { scroll: false })} />
        <div role="tabpanel" id={tabIds(PREFIX, tab).panel} aria-labelledby={tabIds(PREFIX, tab).tab} className="mt-6">
          {tab === "opportunities" && <OpportunitiesTab />}
          {tab === "catalogue" && <CatalogueTab />}
          {tab === "scenarios" && <ScenariosTab />}
        </div>
      </AppMain>
    </>
  );
}
