"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, UserPlus } from "lucide-react";
import { fmtDaysAgo } from "@/src/lib/format";
import type { Alert } from "@/src/lib/ops";
import { EmptyState, SeverityPill, StatusPill } from "@/src/components/ui";

// Mock assignees for the demo: roles, not people.
const ASSIGNEES = ["Sustainability lead", "Sourcing lead", "Supplier EHS manager"] as const;
const COLLAPSED = 5;

interface Handled { acknowledged: boolean; assignee: string | null }

/**
 * Alerts feed (PRODUCT 4.2). The brand can Acknowledge or Assign an alert; that is local state only and resets on reload.
 * Pass `canAct={false}` for the supplier role, which can read alerts but not triage them.
 */
export default function AlertsFeed({ alerts, siteNames, canAct, empty }: { alerts: Alert[]; siteNames: Record<string, string>; canAct: boolean; empty?: { title: string; text: string } }) {
  const [handled, setHandled] = useState<Record<string, Handled>>({});
  const [menu, setMenu] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [announce, setAnnounce] = useState("");

  const update = (id: string, patch: Partial<Handled>) =>
    setHandled((h) => ({ ...h, [id]: { ...(h[id] ?? { acknowledged: false, assignee: null }), ...patch } }));

  if (alerts.length === 0) return <EmptyState title={empty?.title ?? "No open alerts"} text={empty?.text ?? "Every plant in view is running without an open alert."} />;

  const visible = showAll ? alerts : alerts.slice(0, COLLAPSED);
  return (
    <div>
      <ul className="divide-y divide-line">
        {visible.map((a) => {
          const h = handled[a.id];
          return (
            <li key={a.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityPill severity={a.severity} />
                <Link href={`/factories/${a.factoryId}`} className="font-semibold text-ink-900 hover:underline">{siteNames[a.factoryId]}</Link>
                {a.ageDays !== null && <span className="text-sm text-ink-500">{fmtDaysAgo(a.ageDays)}</span>}
              </div>
              <p className="mt-1 text-ink-700">{a.message}</p>

              {(h?.acknowledged || h?.assignee) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {h.acknowledged && <StatusPill tone="positive" shape="circle" label="Acknowledged" />}
                  {h.assignee && <StatusPill tone="info" shape="ring" label={`Assigned to ${h.assignee}`} />}
                </div>
              )}

              {canAct && (
                <div className="relative mt-2 flex flex-wrap gap-2">
                  <button
                    type="button" disabled={h?.acknowledged}
                    onClick={() => { update(a.id, { acknowledged: true }); setAnnounce(`Alert for ${siteNames[a.factoryId]} acknowledged`); }}
                    className="btn btn-secondary min-h-11 px-4 text-sm"
                  >
                    <Check className="size-4" aria-hidden="true" /> Acknowledge
                  </button>
                  <button
                    type="button" aria-haspopup="menu" aria-expanded={menu === a.id}
                    onClick={() => setMenu(menu === a.id ? null : a.id)}
                    className="btn btn-secondary min-h-11 px-4 text-sm"
                  >
                    <UserPlus className="size-4" aria-hidden="true" /> Assign
                  </button>
                  {menu === a.id && (
                    <div role="menu" aria-label={`Assign alert for ${siteNames[a.factoryId]}`} className="card absolute left-0 top-full z-20 mt-1 w-60 p-2 shadow-raised">
                      {ASSIGNEES.map((who) => (
                        <button
                          key={who} type="button" role="menuitem"
                          onClick={() => { update(a.id, { assignee: who }); setMenu(null); setAnnounce(`Alert for ${siteNames[a.factoryId]} assigned to ${who}`); }}
                          className="flex min-h-11 w-full items-center rounded-tile px-3 text-left hover:bg-blue-50"
                        >
                          {who}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {alerts.length > COLLAPSED && (
        <button type="button" onClick={() => setShowAll((s) => !s)} className="btn btn-tertiary mt-3">
          {showAll ? "Show fewer alerts" : `Show all ${alerts.length} alerts`}
        </button>
      )}
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    </div>
  );
}
