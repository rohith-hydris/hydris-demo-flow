"use client";

import { useState } from "react";
import { Check, RotateCcw, ShieldAlert } from "lucide-react";
import type { InspectionRecord } from "@/src/data/types";
import { TODAY } from "@/src/data/tenants";
import { inspectionIssues, reviewInspection } from "@/src/lib/claims";

const REVIEWER = "Brand reviewer (demo)";
const timeNow = () => `${TODAY}, ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

const ACTION_TEXT = { confirm: "Confirmed", override: "Overridden", retake: "Retake requested" } as const;

/** Who did what and when on a report, with an override's reason and the step sent back on a retake. Oldest first. */
export function ReviewLog({ inspection }: { inspection: InspectionRecord }) {
  const log = inspection.reviewLog ?? [];
  if (log.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 text-sm text-ink-700" aria-label={`Review log for ${inspection.id}`}>
      {log.map((e, k) => (
        <li key={k}>
          <span className="font-semibold text-ink-900">{ACTION_TEXT[e.action]}</span>
          {e.action === "retake" && e.step !== undefined && <> step {e.step}, sent back to the field team</>}
          {" · "}{e.user} · {e.time}
          {e.reason && <span className="block text-ink-500">Reason: {e.reason}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * The review-queue actions for a field inspection (brand only): confirm, override with a reason, request a retake.
 * Every action goes through reviewInspection, which refuses an invalid one with a plain message; the log is local state in this demo.
 */
export function InspectionActions({ inspection, onChange }: { inspection: InspectionRecord; onChange: (next: InspectionRecord) => void }) {
  const [mode, setMode] = useState<"override" | "retake" | null>(null);
  const [reason, setReason] = useState("");
  const nonPass = (inspection.stepDetail ?? []).filter((s) => s.result !== "Pass");
  const [step, setStep] = useState<number>(nonPass.find((s) => s.result === "Fail")?.n ?? nonPass[0]?.n ?? 0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const { fails, unresolved } = inspectionIssues(inspection);
  const canConfirm = fails + unresolved === 0;

  const apply = (a: Parameters<typeof reviewInspection>[1], done: string) => {
    const r = reviewInspection(inspection, a);
    if (!r.ok) { setMessage({ ok: false, text: r.error }); return; }
    onChange(r.inspection);
    setMessage({ ok: true, text: done });
    setMode(null); setReason("");
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!canConfirm} aria-disabled={!canConfirm} title={canConfirm ? undefined : "A failed step cannot be confirmed"}
          onClick={() => apply({ action: "confirm", user: REVIEWER, time: timeNow() }, "Confirmed and logged.")} className="btn btn-secondary min-h-11 px-4 text-sm disabled:opacity-50">
          <Check className="size-4" aria-hidden="true" /> Confirm
        </button>
        <button type="button" aria-expanded={mode === "override"} onClick={() => setMode(mode === "override" ? null : "override")} className="btn btn-secondary min-h-11 px-4 text-sm">
          <ShieldAlert className="size-4" aria-hidden="true" /> Override with reason
        </button>
        <button type="button" disabled={nonPass.length === 0} aria-expanded={mode === "retake"} onClick={() => setMode(mode === "retake" ? null : "retake")} className="btn btn-secondary min-h-11 px-4 text-sm disabled:opacity-50">
          <RotateCcw className="size-4" aria-hidden="true" /> Request retake
        </button>
      </div>

      {mode === "override" && (
        <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); apply({ action: "override", user: REVIEWER, time: timeNow(), reason }, "Override logged with your reason."); }}>
          <label htmlFor={`reason-${inspection.id}`} className="font-semibold text-ink-900">Reason for the override (required)</label>
          <textarea id={`reason-${inspection.id}`} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} required className="w-full rounded-tile border border-line p-2" />
          <p className="text-sm text-ink-500">The override, your name and the time are logged.</p>
          <button type="submit" disabled={!reason.trim()} className="btn btn-primary min-h-11 px-4 text-sm">Log override</button>
        </form>
      )}

      {mode === "retake" && (
        <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); apply({ action: "retake", user: REVIEWER, time: timeNow(), step }, `Step ${step} sent back to the field team.`); }}>
          <label htmlFor={`step-${inspection.id}`} className="font-semibold text-ink-900">Step to retake</label>
          <select id={`step-${inspection.id}`} value={step} onChange={(e) => setStep(Number(e.target.value))} className="min-h-11 w-full rounded-tile border border-line px-2">
            {nonPass.map((s) => <option key={s.n} value={s.n}>Step {s.n}: {s.instruction} ({s.result})</option>)}
          </select>
          <button type="submit" className="btn btn-primary min-h-11 px-4 text-sm">Send back to the field team</button>
        </form>
      )}

      {message && <p role="status" className={`mt-2 text-sm font-semibold ${message.ok ? "text-ink-900" : "tone-negative text-[var(--t-fg)]"}`}>{message.text}</p>}
    </div>
  );
}
