"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Upload } from "lucide-react";
import { useRole, useScope } from "@/src/context/RoleContext";
import { CURRENT_MONTH, REPORTING_PERIOD } from "@/src/data/tenants";
import { fmtScore } from "@/src/lib/format";
import { FACTORY_TABS, parseFactoryTab } from "@/src/lib/factoryTabs";
import { getSites } from "@/src/lib/selectors";
import { AppMain, CertPill, EmptyState, OffTrackChip, PageHeader, PeriodPill, QuadrantPill, StatusPill, TierBadge, Tabs, tabIds } from "@/src/components/ui";
import EvidenceTab from "./EvidenceTab";
import ImpactTab from "./ImpactTab";
import OverviewTab from "./OverviewTab";
import ProjectsTab from "./ProjectsTab";
import RiskTab from "./RiskTab";

const ID_PREFIX = "factory";

// Factory detail (PRODUCT 4.4): header plus five tabs. A supplier can open only its own factories; anything else is "not found".
export default function FactoryScreen({ factoryId }: { factoryId: string }) {
  const { role } = useRole();
  const scope = useScope();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const sites = useMemo(() => getSites(scope), [scope]);
  const site = sites.find((s) => s.id === factoryId);
  const tab = parseFactoryTab(params.get("tab"));
  const setTab = (id: string) => router.replace(`${pathname}?tab=${id}`, { scroll: false });

  const rootCrumb = role === "brand" ? { label: "Portfolio", href: "/portfolio" } : { label: "My factories", href: "/portfolio" };

  if (!site) {
    return (
      <>
        <PageHeader title="Factory not found" subtitle="There is no factory you can open with this link." crumbs={[rootCrumb, { label: factoryId }]} />
        <AppMain><EmptyState title="Factory not found" text="Go back and choose a factory from the list." action={{ label: role === "brand" ? "Open portfolio" : "Open my factories", href: "/portfolio" }} /></AppMain>
      </>
    );
  }

  const crumbs = role === "brand"
    ? [rootCrumb, { label: site.supplierName, href: `/suppliers/${site.supplierId}` }, { label: site.name }]
    : [rootCrumb, { label: site.name }];
  const ids = tabIds(ID_PREFIX, tab);

  return (
    <>
      <PageHeader
        title={site.name}
        subtitle={`${site.district} · ${site.supplierName}`}
        crumbs={crumbs}
        meta={
          <>
            <span className="inline-flex min-h-7 items-center whitespace-nowrap rounded-full bg-blue-600 px-3 text-sm font-semibold text-white">Rank {site.rank} of {sites.length}</span>
            <TierBadge tier={site.tier} />
            <QuadrantPill quadrant={site.quadrant} />
            <CertPill band={site.pwi.certBand} />
            <StatusPill tone="neutral" shape="ring" label={`Confidence ${fmtScore(site.pwi.confidence)}`} />
            <PeriodPill period={REPORTING_PERIOD.status} label={REPORTING_PERIOD.label} />
            <PeriodPill period={CURRENT_MONTH.status} label={CURRENT_MONTH.label} />
            {site.offTrack && <OffTrackChip />}
          </>
        }
        actions={
          role === "brand" ? (
            <>
              <Link href="/ranking" className="btn btn-secondary">Open ranking</Link>
              <Link href="/copilot" className="btn btn-primary"><Sparkles className="size-4" aria-hidden="true" /> Ask Copilot</Link>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setTab("evidence")} className="btn btn-primary"><Upload className="size-4" aria-hidden="true" /> Upload evidence</button>
              <Link href="/copilot" className="btn btn-secondary"><Sparkles className="size-4" aria-hidden="true" /> Ask Copilot</Link>
            </>
          )
        }
      >
        <div className="mt-6"><Tabs tabs={[...FACTORY_TABS]} value={tab} onChange={setTab} label="Factory sections" idPrefix={ID_PREFIX} /></div>
      </PageHeader>

      <AppMain>
        <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} key={tab} className="tab-fade">
          {tab === "overview" && <OverviewTab site={site} scopeSites={sites} onTab={setTab} />}
          {tab === "risk" && <RiskTab site={site} />}
          {tab === "impact" && <ImpactTab site={site} />}
          {tab === "projects" && <ProjectsTab site={site} canValidate={scope.canValidate} />}
          {tab === "evidence" && <EvidenceTab site={site} canValidate={scope.canValidate} />}
        </div>
      </AppMain>
    </>
  );
}
