"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, HelpCircle, Info, X, XCircle } from "lucide-react";
import type { ProjectRecord } from "@/src/data/types";
import { monitoringOverdueDays, projectBenefit } from "@/src/lib/claims";
import { fmtClaim } from "@/src/lib/measure";
import { MAX_ALLOCATION, allocationConflictText, claimsWithoutFunding, totalAllocation, totalFunding } from "@/src/lib/shared";
import { STATE_FIELDS, geographyOnly, summaryStatus } from "@/src/lib/states";
import type { CheckOutcome } from "@/src/lib/types";
import { ProjectStatusPill, ProposedBadge, StateStrip, StatusPill } from "@/src/components/ui";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const CHECKS: { key: "insidePolygon" | "hydrologicallyConnected" | "collectiveAction"; label: string }[] = [
  { key: "insidePolygon", label: "Inside pillar polygon" },
  { key: "hydrologicallyConnected", label: "Hydrologically connected to the site's source" },
  { key: "collectiveAction", label: "Collective-action eligibility (agreement or programme membership)" },
];
const CHECK_ICON: Record<CheckOutcome, typeof XCircle> = { Pass: CheckCircle2, Fail: XCircle, Unknown: HelpCircle };
const CHECK_TONE: Record<CheckOutcome, "positive" | "negative" | "caution"> = { Pass: "positive", Fail: "negative", Unknown: "caution" };

function Drawer({ project: p, siteName, onClose }: { project: ProjectRecord; siteName: string; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const conflict = allocationConflictText(p);
  const b = projectBenefit(p);
  const geo = geographyOnly(p.eligibilityChecks);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => { setShown(true); panel.current?.querySelector<HTMLElement>("button")?.focus(); });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>("button, a[href]")];
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); opener?.focus(); };
  }, [onClose]);

  // A project with no listed participants has one: this site. Its funding share may not be recorded.
  const rows = p.participants.length > 0
    ? p.participants.map((x) => ({ name: x.participant, role: x.role as string, funding: x.fundingShare as number | null, eligible: x.eligiblePillarRole, allocation: x.claimAllocation, state: x.claimState, noFunding: claimsWithoutFunding(x) }))
    : [{ name: siteName, role: "Sole participant", funding: p.fundingShare, eligible: `${p.pillar} ${p.dimension}`, allocation: p.attribution, state: "n/a" as const, noFunding: false }];

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div aria-hidden="true" onClick={onClose} className={`absolute inset-0 bg-ink-900/30 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`} />
      <aside ref={panel} role="dialog" aria-modal="true" aria-labelledby="proj-drawer-h"
        className={`absolute right-0 top-0 flex h-full w-[640px] max-w-full flex-col overflow-y-auto rounded-l-panel bg-card p-6 shadow-raised transition-transform duration-200 ${shown ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="proj-drawer-h" className="text-[22px] leading-[30px]">{p.name}</h2>
            <p className="mt-1 text-ink-500">{p.id} · {siteName} · feeds {p.pillar} {p.dimension}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 shrink-0 place-items-center rounded-full text-ink-700 hover:bg-blue-50"><X className="size-5" aria-hidden="true" /></button>
        </div>

        {conflict && (
          <div role="alert" className="mt-4 rounded-tile border border-[var(--negative-line)] bg-[var(--negative-bg)] p-4 text-[var(--negative-fg)]">
            <p className="flex items-center gap-2 font-semibold"><XCircle className="size-5 shrink-0" aria-hidden="true" /> {conflict}</p>
            <p className="mt-1 text-ink-900">The physical benefit is stored once. The requested shares must total 100% or less before the claim can be eligible.</p>
          </div>
        )}

        <section className="mt-5" aria-labelledby="pd-states">
          <h3 id="pd-states" className="mb-2 text-base font-semibold text-ink-500">Review states</h3>
          <p className="mb-2 flex flex-wrap items-center gap-2"><span className="text-ink-700">Summary, computed from the five:</span> <ProjectStatusPill status={summaryStatus(p.states)} /></p>
          <StateStrip states={p.states} />
          <dl className="mt-3 space-y-1 text-[15px]">
            {STATE_FIELDS.map((f) => <div key={f.key}><dt className="inline font-semibold text-ink-700">{f.name}: </dt><dd className="inline text-ink-500">{f.meaning}</dd></div>)}
          </dl>
        </section>

        <section className="mt-6" aria-labelledby="pd-part">
          <h3 id="pd-part" className="mb-1 text-base font-semibold text-ink-500">Participants</h3>
          <p className="mb-2 text-ink-700">Physical benefit {fmtClaim(p.claim)}, stored once on the project. Adding a participant never raises it. Counted for this site: {conflict ? "nothing while the allocation conflict stands" : fmtClaim(b.attributed)}.</p>
          <div className="overflow-x-auto rounded-tile border border-line">
            <table className="w-full min-w-[560px] text-left text-[15px]">
              <caption className="sr-only">Participants, funding share and claim allocation</caption>
              <thead><tr className="bg-blue-50 text-ink-700">
                {["Participant", "Role", "Funding share", "Eligible pillar role", "Claim allocation", "Claim state"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-t border-line align-top">
                    <th scope="row" className="px-3 py-2 font-semibold">{r.name}</th>
                    <td className="px-3 py-2">{r.role}</td>
                    <td className="num px-3 py-2">{r.funding === null ? "Not recorded" : pct(r.funding)}</td>
                    <td className="px-3 py-2">{r.eligible}</td>
                    <td className="num px-3 py-2 font-semibold">{pct(r.allocation)}{r.noFunding && <span className="block text-sm font-normal text-[var(--negative-fg)]">Funds 0% but requests a share</span>}</td>
                    <td className="px-3 py-2">{r.state === "Conflict" ? <StatusPill tone="negative" shape="triangle" label="Conflict" /> : r.state === "Eligible" ? <StatusPill tone="positive" shape="circle" label="Eligible" /> : <span className="text-ink-500">n/a</span>}</td>
                  </tr>
                ))}
              </tbody>
              {p.participants.length > 0 && (
                <tfoot><tr className="border-t border-line bg-blue-50 font-semibold">
                  <th scope="row" colSpan={2} className="px-3 py-2">Total</th>
                  <td className="num px-3 py-2">{pct(totalFunding(p))}</td><td />
                  <td className={`num px-3 py-2 ${totalAllocation(p) > MAX_ALLOCATION + 1e-9 ? "text-[var(--negative-fg)]" : ""}`}>{pct(totalAllocation(p))}</td><td />
                </tr></tfoot>
              )}
            </table>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[15px] text-ink-500"><Info className="mt-1 size-4 shrink-0" aria-hidden="true" /> Funding share is what a participant paid. Claim allocation is the share of the benefit it may claim. Funding does not create claim entitlement. Eligible benefit attribution for this site: {pct(p.attribution)}.</p>
        </section>

        <section className="mt-6" aria-labelledby="pd-elig">
          <h3 id="pd-elig" className="mb-2 text-base font-semibold text-ink-500">Eligibility checks</h3>
          <ul className="divide-y divide-line">
            {CHECKS.map((c) => {
              const r = p.eligibilityChecks[c.key];
              const Icon = CHECK_ICON[r];
              return (
                <li key={c.key} className="flex items-center gap-3 py-2.5">
                  <span className={`tone-${CHECK_TONE[r]} text-[var(--t-fill)]`}><Icon className="size-5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1 text-ink-900">{c.label}</span>
                  <StatusPill tone={CHECK_TONE[r]} shape={r === "Pass" ? "circle" : r === "Fail" ? "triangle" : "diamond"} label={r} />
                </li>
              );
            })}
          </ul>
          {geo && <p className="mt-2 rounded-tile border border-[var(--caution-line)] bg-[var(--caution-bg)] px-3 py-2 font-semibold text-[var(--caution-fg)]">In the basin by geography only. Geography alone never makes a project eligible, so the claim stays {p.states.claimEligibility}.</p>}
        </section>

        <section className="mt-6" aria-labelledby="pd-detail">
          <h3 id="pd-detail" className="mb-2 text-base font-semibold text-ink-500">Counterfactual, operating period and monitoring</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
            <dt className="text-ink-500">Boundary</dt><dd>{p.boundary}</dd>
            <dt className="text-ink-500">Counterfactual</dt><dd>{p.counterfactual}</dd>
            <dt className="text-ink-500">Operating period</dt><dd>{p.operatingPeriod}</dd>
            <dt className="text-ink-500">Monitoring requirement</dt><dd>{p.monitoringRequirement}</dd>
          </dl>
          {monitoringOverdueDays(p) > 0 && <p className="mt-2 flex flex-wrap items-center gap-2 text-ink-700">Monitoring-expiry rule (90 days) under review. <ProposedBadge /></p>}
        </section>
      </aside>
    </div>,
    document.body,
  );
}

/** Opens the project drawer: participants, shares, eligibility checks, counterfactual, operating period and monitoring. */
export default function ProjectDrawerButton({ project, siteName }: { project: ProjectRecord; siteName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="btn btn-secondary min-h-11 px-4 text-sm"><Info className="size-4" aria-hidden="true" /> Project details</button>
      {open && <Drawer project={project} siteName={siteName} onClose={() => setOpen(false)} />}
    </>
  );
}
