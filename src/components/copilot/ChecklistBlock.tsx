import { AlertTriangle, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import type { ResolvedBlock } from "@/src/lib/copilot";
import type { StateEffect } from "@/src/lib/states";
import { fmtPct1 } from "@/src/lib/format";
import type { CheckResult } from "@/src/lib/types";
import { StatusPill, checkMeta, stateMeta } from "@/src/components/ui";
import TrustRing from "@/src/components/domain/TrustRing";

type B<K extends ResolvedBlock["kind"]> = Extract<ResolvedBlock, { kind: K }>;

const ICON: Record<CheckResult, LucideIcon> = { Pass: CheckCircle2, Warn: AlertTriangle, Fail: XCircle };

/** One check row: a status icon (check, triangle or X), the check, and the plain reason (DESIGN 4.10). */
function CheckRow({ name, result, reason }: { name: string; result: CheckResult; reason?: string }) {
  const Icon = ICON[result];
  const tone = checkMeta[result].tone;
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className={`tone-${tone} mt-0.5 text-[var(--t-fill)]`}><Icon className="size-5" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-900">{name}</p>
        {reason && <p className="text-ink-500">{reason}</p>}
      </div>
      <StatusPill {...checkMeta[result]} label={result} />
    </li>
  );
}

/** V2 2 and 14: which of the five review states this verdict sets, and the line that closes every verdict. */
function StateEffects({ effects, closing }: { effects: StateEffect[]; closing: string }) {
  return (
    <div className="border-t border-line p-4">
      <p className="mb-2 text-sm font-semibold text-ink-700">What this verdict changes in the five review states</p>
      <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {effects.map((e) => (
          <li key={e.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
            <span className="font-semibold text-ink-900">{e.name}:</span>
            {e.outcome === "set" && e.value ? (
              <><StatusPill {...stateMeta(e.key, e.value as never)} label={`Set to ${e.value}`} className="!min-h-6 !text-[13px]" /></>
            ) : (
              <span className="text-ink-500">{e.value ? `No change (${e.value})` : "No change"}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 font-semibold text-ink-900">{closing}</p>
    </div>
  );
}

/** The validation checklist: a verdict bar with the effect on the score, then one row per check. */
export function ChecklistBlock({ block }: { block: B<"checklist"> }) {
  const { verdict, checks } = block;
  const n = (r: CheckResult) => checks.filter((c) => c.result === r).length;
  return (
    <div className="rounded-tile border border-line">
      <div className={`tone-${verdict.tone} rounded-t-tile border-b border-[var(--t-line)] bg-[var(--t-bg)] p-4`}>
        <p className="text-sm font-semibold text-[var(--t-fg)]">Verdict</p>
        <p className="font-display text-[22px] font-bold leading-[30px] text-[var(--t-fg)]">{verdict.label}</p>
        <p className="mt-1 text-ink-900">{verdict.effect}</p>
      </div>
      <div className="p-4">
        <p className="mb-3 text-sm font-semibold text-ink-700">{block.title} · {n("Pass")} Pass, {n("Warn")} Warn, {n("Fail")} Fail</p>
        <ul className="divide-y divide-line">{checks.map((c) => <CheckRow key={c.name} {...c} />)}</ul>
      </div>
      <StateEffects effects={block.stateEffects} closing={block.closing} />
    </div>
  );
}

/** A field inspection: trust score, the non-pass steps, and the five layers it was checked in. */
export function InspectionBlock({ block }: { block: B<"inspection"> }) {
  const ok = block.status === "Validated";
  return (
    <div className="rounded-tile border border-line p-4">
      <div className="flex flex-wrap items-center gap-4">
        <TrustRing value={block.trust} ok={ok} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-900">{block.id} · {block.factory} · {block.date}</p>
          <p className="text-ink-700">{block.counts.pass} Pass, {block.counts.warn} Warn, {block.counts.fail} Fail · trust score {fmtPct1(block.trust)}</p>
          <div className="mt-1.5">{ok ? <StatusPill tone="positive" shape="circle" label={block.status} /> : <StatusPill tone="caution" shape="diamond" label={block.status} />}</div>
        </div>
      </div>

      <p className="mb-2 mt-4 text-sm font-semibold text-ink-700">Steps that did not pass</p>
      <ul className="divide-y divide-line">
        {block.nonPass.map((s) => (
          <li key={s.n} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            {(() => { const Icon = ICON[s.result]; return <span className={`tone-${checkMeta[s.result].tone} mt-0.5 text-[var(--t-fill)]`}><Icon className="size-5" aria-hidden="true" /></span>; })()}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-900">Step {s.n}: {s.instruction}</p>
              <p className="text-ink-500">{s.reason}{s.check ? ` (check ${s.check})` : ""}</p>
            </div>
            <StatusPill {...checkMeta[s.result]} label={s.result} />
          </li>
        ))}
      </ul>

      <p className="mb-2 mt-4 text-sm font-semibold text-ink-700">Checked in five layers</p>
      <ul className="flex flex-wrap gap-2">
        {block.layers.map((l) => <li key={l} className="inline-flex min-h-7 items-center rounded-full border border-panel-line bg-blue-50 px-3 text-sm text-ink-700">{l}</li>)}
      </ul>
      <p className="mt-3 text-sm text-ink-500">Only validated steps reach the Evidence Store.</p>
      <div className="-mx-4 -mb-4 mt-4 rounded-b-tile"><StateEffects effects={block.stateEffects} closing={block.closing} /></div>
    </div>
  );
}
