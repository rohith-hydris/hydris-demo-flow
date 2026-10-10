"use client";

import { useState } from "react";
import Link from "next/link";
import type { ResolvedAction, ResolvedBlock, ResolvedCitation } from "@/src/lib/copilot";
import { BandPill, CitationChip, QuadrantPill, SeverityPill, StatusPill, TierBadge } from "@/src/components/ui";
import { MiniGrid } from "@/src/components/domain/PwiGrid";
import { useTrace } from "@/src/components/domain/Trace";
import { RichText } from "./RichText";

type B<K extends ResolvedBlock["kind"]> = Extract<ResolvedBlock, { kind: K }>;

const th = "px-3 py-2 text-left text-sm font-semibold text-ink-700";
const td = "px-3 py-2.5 align-top text-sm text-ink-900";

export function RankingBlock({ block }: { block: B<"ranking"> }) {
  return (
    <div className="overflow-x-auto rounded-tile border border-line">
      <table className="w-full min-w-[520px]">
        <caption className="sr-only">Mini ranking</caption>
        <thead className="bg-blue-50"><tr><th className={th}>Rank</th><th className={th}>Site</th><th className={th}>Band</th><th className={`${th} text-right`}>R</th><th className={`${th} text-right`}>I</th><th className={th}>Quadrant</th></tr></thead>
        <tbody className="divide-y divide-line">
          {block.rows.map((r) => (
            <tr key={r.id}>
              <td className={td}><span className="inline-flex items-center gap-2"><span className="num font-display text-lg font-bold">{r.rank}</span><TierBadge tier={r.tier} /></span></td>
              <td className={td}><Link href={`/factories/${r.id}`} className="font-semibold hover:underline">{r.name}</Link></td>
              <td className={td}><BandPill band={r.band} compact /></td>
              <td className={`${td} num text-right`}>{r.R}</td>
              <td className={`${td} num text-right`}>{r.I}</td>
              <td className={td}><QuadrantPill quadrant={r.quadrant} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AvgGridBlock({ block }: { block: B<"avgGrid"> }) {
  return (
    <div className="rounded-tile border border-line bg-blue-50 p-4">
      <p className="mb-3 text-sm font-semibold text-ink-700">Average cell score{block.weakest.length > 0 ? ". The two weakest are ringed." : ""}</p>
      <MiniGrid
        labelled cells={block.cells} label={`Average cell score across the sites in scope, by pillar and dimension. Weakest: ${block.weakest.join(" and ")}.`}
        highlight={block.weakest.map((w) => w.split(" ").filter((_, i, a) => i === 0 || i === a.length - 1).join(" "))}
      />
    </div>
  );
}

export function TableBlock({ block }: { block: B<"table"> }) {
  return (
    <div className="overflow-x-auto rounded-tile border border-line">
      <table className="w-full min-w-[480px]">
        <thead className="bg-blue-50"><tr>{block.columns.map((c) => <th key={c} className={th}>{c}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">
          {block.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={`${td} ${j === 2 ? "num" : ""}`}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function OffTrackBlock({ block }: { block: B<"offTrack"> }) {
  if (block.groups.length === 0) return null;
  return (
    <ul className="space-y-3">
      {block.groups.map((g) => (
        <li key={g.supplier} className="rounded-tile border border-line p-4">
          <p className="font-semibold text-ink-900">{g.supplier}</p>
          <ul className="mt-2 divide-y divide-line">
            {g.plants.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
                <Link href={`/factories/${p.id}`} className="font-semibold text-ink-900 hover:underline">{p.name}</Link>
                <SeverityPill severity={p.severity} />
                <span className="text-ink-700">{p.message}</span>
                <CitationChip label={`${p.name}${p.age ? ` · ${p.age}` : ""}`} href={`/factories/${p.id}`} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function TechTableBlock({ block }: { block: B<"techTable"> }) {
  return (
    <div className="overflow-x-auto rounded-tile border border-line">
      <table className="w-full min-w-[640px]">
        <caption className="sr-only">Technology match scores</caption>
        <thead className="bg-blue-50">
          <tr><th className={th}>Technology</th><th className={`${th} text-right`}>Technical fit</th><th className={`${th} text-right`}>Expected benefit</th><th className={`${th} text-right`}>Stability</th><th className={`${th} text-right`}>Data quality</th><th className={`${th} text-right`}>Match</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {block.rows.map((r) => (
            <tr key={r.name} className={r.top ? "bg-blue-50/60" : ""}>
              <td className={`${td} font-semibold`}>{r.name}{r.top && <span className="ml-2 inline-block align-middle"><StatusPill tone="info" shape="circle" label="Best match" /></span>}</td>
              <td className={`${td} num text-right`}>{r.technicalFit}</td><td className={`${td} num text-right`}>{r.expectedBenefit}</td>
              <td className={`${td} num text-right`}>{r.stability}</td><td className={`${td} num text-right`}>{r.dataQuality}</td>
              <td className={`${td} num text-right font-semibold`}>{r.match}{r.note && <span className="block text-xs font-normal text-ink-500">({r.note})</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line bg-card px-3 py-2 text-sm text-ink-500">Hard filters passed for all three. Scores are illustrative.</p>
    </div>
  );
}

export function CitationsBlock({ items }: { items: ResolvedCitation[] }) {
  const { open } = useTrace();
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Sources">
      <li className="text-sm text-ink-500">Sources</li>
      {items.map((c) => (
        <li key={c.label}>{c.trace ? <CitationChip label={c.label} onClick={() => open(c.trace!)} /> : <CitationChip label={c.label} href={c.href} />}</li>
      ))}
    </ul>
  );
}

export interface LocalDone { id: string; label: string; done: string; reason?: string }

/** Action buttons under an answer. They navigate, or change local state and confirm in place; nothing is sent anywhere. */
export function ActionsBlock({ items, onLocal }: { items: ResolvedAction[]; onLocal: (d: LocalDone) => void }) {
  const [done, setDone] = useState<Record<number, string>>({});
  const [asking, setAsking] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const finish = (i: number, a: Extract<ResolvedAction, { kind: "local" }>, why?: string) => {
    const text = why ? `${a.done} Reason: “${why}”` : a.done;
    setDone((d) => ({ ...d, [i]: text }));
    setAsking(null); setReason("");
    onLocal({ id: a.id, label: a.label, done: text, reason: why });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {items.map((a, i) => {
          if (a.kind === "navigate") return <Link key={a.label} href={a.href} className={`btn min-h-11 px-4 text-sm ${a.primary ? "btn-primary" : "btn-secondary"}`}>{a.label}</Link>;
          if (done[i]) return <span key={a.label} role="status"><StatusPill tone="positive" shape="circle" label={done[i]} wrap /></span>;
          return (
            <button
              key={a.label} type="button" aria-expanded={a.reasonRequired ? asking === i : undefined}
              onClick={() => (a.reasonRequired ? setAsking(asking === i ? null : i) : finish(i, a))}
              className={`btn min-h-11 px-4 text-sm ${a.primary ? "btn-primary" : "btn-secondary"}`}
            >
              {a.label}
            </button>
          );
        })}
      </div>
      {asking !== null && (() => {
        const a = items[asking] as Extract<ResolvedAction, { kind: "local" }>;
        return (
          <form
            className="mt-3 rounded-tile border border-line bg-blue-50 p-4"
            onSubmit={(e) => { e.preventDefault(); if (reason.trim()) finish(asking, a, reason.trim()); }}
          >
            <label htmlFor="override-reason" className="font-semibold text-ink-900">Reason for the override (required)</label>
            <textarea
              id="override-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} required autoFocus
              className="mt-2 w-full rounded-tile border border-line bg-card p-3 text-base text-ink-900"
            />
            <p className="mt-1 text-sm text-ink-500">The override and your reason are logged.</p>
            <div className="mt-3 flex gap-3">
              <button type="submit" disabled={!reason.trim()} className="btn btn-primary min-h-11 px-4 text-sm">Log override</button>
              <button type="button" onClick={() => { setAsking(null); setReason(""); }} className="btn btn-secondary min-h-11 px-4 text-sm">Cancel</button>
            </div>
          </form>
        );
      })()}
    </div>
  );
}

export { RichText };
