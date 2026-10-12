"use client";

import { CalendarClock } from "lucide-react";
import { useRole } from "@/src/context/RoleContext";
import { tenantFor } from "@/src/lib/roles";
import { REPORTING_PERIOD } from "@/src/data/tenants";
import { AppMain, EmptyState, PageHeader, type Crumb } from "@/src/components/ui";

interface StubProps {
  titles: { brand: string; supplier: string };
  description: string;
  phase: string;
  crumbs?: Crumb[];
}

// Placeholder for a page whose phase has not been built yet. Replaced phase by phase.
export default function StubPage({ titles, description, phase, crumbs }: StubProps) {
  const { role } = useRole();
  if (!role) return null;
  const tenant = tenantFor(role);
  return (
    <>
      <PageHeader
        title={titles[role]} subtitle={description} crumbs={crumbs}
        meta={<p className="text-ink-500">{tenant.name} · {REPORTING_PERIOD.label}</p>}
      />
      <AppMain>
        <EmptyState title="This page is coming soon" text={`It is built in ${phase}. The shell, role switch and navigation already work.`} icon={CalendarClock} />
      </AppMain>
    </>
  );
}
