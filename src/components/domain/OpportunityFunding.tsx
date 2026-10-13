"use client";

import { useId, useState } from "react";
import { HandCoins } from "lucide-react";
import { useProjects } from "@/src/context/ProjectsContext";
import { useRole } from "@/src/context/RoleContext";
import type { Opportunity } from "@/src/data/opportunities";
import { blockerText, gatesPass, canCommitReason, claimNote, commitmentStatus, coverage, fundingLabel, fundingOf, PLACEHOLDER_NOTE, possibleFunders } from "@/src/lib/selectors";
import { StatusPill } from "@/src/components/ui";
import { CommitmentPill } from "./ProjectsParts";

const INSTRUMENT_SHAPE = { Loan: "square", Grant: "diamond", "Programme support": "circle" } as const;

/** Who pays, the supplier's commitment, and possible funders from other organisations. Supplier role only (the brand has no Projects page). */
export default function OpportunityFunding({ opportunity: o }: { opportunity: Opportunity }) {
  const { role } = useRole();
  const { commitments, commit, shortlist, toggleFunder } = useProjects();
  const [message, setMessage] = useState("");
  const reasonId = useId();
  if (role !== "supplier") return null;

  const status = commitmentStatus(o, commitments);
  const reason = canCommitReason(o, "supplier");
  const { eligible, nearMisses } = possibleFunders(o);
  const picked = shortlist[o.id] ?? [];

  function onCommit() {
    const res = commit(o.id, "supplier");
    setMessage(res.ok ? `${o.id}: supplier commitment recorded.` : res.reason);
  }

  return (
    <section className="mt-4 rounded-tile border border-line bg-blue-50 p-4" aria-label={`Funding for ${o.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
          <HandCoins className="size-4 text-blue-600" aria-hidden="true" /> Funding: {fundingLabel(fundingOf(o))} <CommitmentPill status={status} />
        </p>
        <button type="button" className="btn btn-secondary min-h-11 px-4 text-sm" disabled={reason !== null} aria-describedby={reason ? reasonId : undefined} onClick={onCommit}>
          Record supplier commitment
        </button>
      </div>
      {reason && <p id={reasonId} className="mt-2 text-[15px] text-ink-500">{reason}</p>}
      <p role="status" aria-live="polite" className="mt-2 font-semibold text-ink-900">{message ? `${message} Status: ${status}.` : ""}</p>

      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-blue-600">Possible funders ({eligible.length})</summary>
        <p className="mb-3 rounded-tile border border-[var(--caution-line)] bg-[var(--caution-bg)] px-3 py-2 font-semibold text-[var(--caution-fg)]">{PLACEHOLDER_NOTE}</p>
        {!gatesPass(o.gates) ? (
          <p className="font-semibold text-ink-700">Funder matching is unavailable until the mandatory gates pass.</p>
        ) : (
          <>
            {eligible.length === 0 && <p className="text-ink-700">No funder matches this opportunity.</p>}
            <ul className="space-y-3">
              {eligible.map((f) => (
                <li key={f.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink-900">{f.name}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2"><StatusPill tone="info" shape={INSTRUMENT_SHAPE[f.instrument]} label={f.instrument} /><span className="text-sm text-ink-500">Last checked {f.lastChecked}</span></p>
                    </div>
                    <button type="button" aria-pressed={picked.includes(f.id)} onClick={() => setMessage(toggleFunder(o.id, f.id).ok ? "" : "This funder does not match the opportunity.")}
                      className={`btn min-h-11 px-4 text-sm ${picked.includes(f.id) ? "btn-primary" : "btn-secondary"}`}>
                      {picked.includes(f.id) ? "Shortlisted" : "Shortlist"}
                    </button>
                  </div>
                  <p className="mt-2 font-semibold text-ink-900">Could cover up to {Math.round(coverage(o, f) * 100)}% of capex</p>
                  <p className="text-[15px] text-ink-700">Requires: {f.requires.join(", ")}</p>
                  <p className="text-[15px] text-ink-700">{claimNote(f)}</p>
                  <p className="mt-1 text-sm text-ink-500">{PLACEHOLDER_NOTE}</p>
                </li>
              ))}
            </ul>
            {nearMisses.length > 0 && (
              <div className="mt-4">
                <h5 className="mb-1 font-semibold text-ink-900">Not matched</h5>
                <ul className="space-y-1 text-[15px] text-ink-700">
                  {nearMisses.map((m) => <li key={m.funder.id}>{m.funder.name}: {blockerText(m.blocker)}</li>)}
                </ul>
              </div>
            )}
          </>
        )}
      </details>
    </section>
  );
}
