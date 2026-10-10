import Link from "next/link";
import type { Alert } from "@/src/lib/data";
import { EmptyState, SeverityPill, Tooltip } from "@/src/components/ui";

const SOON = "Coming in the next release";

function DisabledButton({ children }: { children: string }) {
  // aria-disabled (not disabled) keeps the button focusable so the tooltip can open from the keyboard.
  return (
    <Tooltip text={SOON}>
      <button type="button" aria-disabled="true" aria-label={`${children}. ${SOON}`} className="min-h-11 cursor-not-allowed rounded-lg border border-line bg-page px-4 font-semibold text-muted">
        {children}
      </button>
    </Tooltip>
  );
}

export function AlertList({ alerts, factoryHref, empty }: { alerts: Alert[]; factoryHref?: (id: string) => string; empty?: { title: string; text: string; action?: { label: string; href: string } } }) {
  if (alerts.length === 0) {
    return <EmptyState title={empty?.title ?? "No alerts"} text={empty?.text ?? "Nothing needs attention right now."} action={empty?.action} />;
  }
  return (
    <ul className="space-y-3">
      {alerts.map((a) => (
        <li key={a.id} className="card p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <SeverityPill severity={a.severity} />
            {factoryHref
              ? <Link href={factoryHref(a.factoryId)} className="inline-flex min-h-11 items-center font-bold text-brand hover:underline">{a.factoryName}</Link>
              : <strong>{a.factoryName}</strong>}
            <span className="text-muted">{a.supplierName}</span>
            <span className="num text-sm text-muted">{a.date}</span>
          </div>
          <p className="mt-1">{a.reason}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold">Status: {a.status}{a.assignee && ` · ${a.assignee}`}</span>
            <DisabledButton>Acknowledge</DisabledButton>
            <DisabledButton>Assign</DisabledButton>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Compact list for the brand overview. Links to the supplier, no actions.
export function RecentAlerts({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return <EmptyState title="No Critical or High alerts" text="Nothing urgent right now. New alerts will appear here." />;
  return (
    <ul className="card divide-y divide-line">
      {alerts.map((a) => (
        <li key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <SeverityPill severity={a.severity} />
              <strong>{a.factoryName}</strong>
              <span className="text-muted">{a.supplierName}</span>
              <span className="num text-sm text-muted">{a.date}</span>
            </div>
            <p className="mt-1">{a.reason}</p>
          </div>
          <Link href={`/brand/suppliers/${a.supplierId}`} className="inline-flex min-h-11 shrink-0 items-center font-semibold text-brand hover:underline">View supplier</Link>
        </li>
      ))}
    </ul>
  );
}

export function SeverityLegend() {
  return (
    <ul className="grid gap-2 text-sm sm:grid-cols-2" aria-label="What the severities mean">
      <li className="flex flex-wrap items-center gap-2"><SeverityPill severity="Critical" /> Dropped to Not conformant, or health is Critical.</li>
      <li className="flex flex-wrap items-center gap-2"><SeverityPill severity="High" /> Any downgrade, or 7+ days without data.</li>
      <li className="flex flex-wrap items-center gap-2"><SeverityPill severity="Medium" /> Health in Watch range, or benefit behind target.</li>
      <li className="flex flex-wrap items-center gap-2"><SeverityPill severity="Info" /> A tier upgrade.</li>
    </ul>
  );
}
