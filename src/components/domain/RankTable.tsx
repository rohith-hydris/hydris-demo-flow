"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { RANK_RANGE_TITLE } from "@/src/lib/explain";
import { FOOTPRINT_TOOLTIP } from "@/src/lib/statusCopy";
import { fmtPct1, fmtScore } from "@/src/lib/format";
import { PILLAR_LABELS } from "@/src/lib/risk";
import type { RankRange } from "@/src/lib/rank";
import type { Site } from "@/src/lib/selectors";
import { BandPill, QuadrantPill, StatusPill, TierBadge } from "@/src/components/ui";

// Column minimums add up to about 1,200px so the table fits a 1,280px page without scrolling sideways.
const COLS = "grid grid-cols-[76px_minmax(150px,1.6fr)_88px_52px_56px_144px_76px_minmax(110px,1.2fr)_minmax(96px,0.9fr)_68px_76px_76px_32px] items-center gap-x-2";

const range = (r: RankRange) => (r.low === r.high ? `${r.low}` : `${r.low} to ${r.high}`);

/**
 * Ranked table (DESIGN 4.7, 5.5): rows are divs so they can slide to their new place when the weights change
 * (200 ms, position only). A row that moved shows an arrow with the change in rank.
 */
export default function RankTable({ sites, ranges, deltas, selectedId, onSelect }: {
  sites: Site[]; ranges: Record<string, RankRange>; deltas: Record<string, number>; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const rows = useRef(new Map<string, HTMLElement>());
  const tops = useRef(new Map<string, number>());
  const order = sites.map((s) => s.id).join(",");

  // FLIP: remember where each row was, and after a re-order slide it from there to where it now is.
  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rows.current.forEach((el, id) => {
      const top = el.offsetTop;
      const prev = tops.current.get(id);
      if (!reduce && prev !== undefined && prev !== top) {
        el.style.transition = "none";
        el.style.transform = `translateY(${prev - top}px)`;
        void el.offsetHeight;
        el.style.transition = "transform 200ms ease-out";
        el.style.transform = "";
      }
      tops.current.set(id, top);
    });
  }, [order]);

  return (
    <div className="card p-2 max-xl:overflow-x-auto">
      <div role="table" aria-label="Sites ranked by priority for action" className="min-w-[1260px] xl:min-w-0">
        <div role="row" className={`${COLS} rounded-tile bg-blue-50 px-4 py-3 text-sm font-semibold text-ink-700 xl:sticky xl:top-24 xl:z-10`}>
          <span role="columnheader">Rank</span>
          <span role="columnheader">Site</span>
          <span role="columnheader">Band</span>
          <span role="columnheader" className="text-right">R</span>
          <span role="columnheader" className="text-right" title={FOOTPRINT_TOOLTIP}>I</span>
          <span role="columnheader">Quadrant</span>
          <span role="columnheader">Tier</span>
          <span role="columnheader">Drivers</span>
          <span role="columnheader" title={RANK_RANGE_TITLE}>Rank range</span>
          <span role="columnheader" className="text-right">PWI</span>
          <span role="columnheader" className="text-right" title="Share of risk indicators with a reading. Informational.">Coverage</span>
          <span role="columnheader" className="text-right" title="Share of documents that are Ready. Informational: it never filters, sorts or re-ranks.">Readiness</span>
          <span role="columnheader" className="sr-only">Open</span>
        </div>

        <div className="relative">
          {sites.map((s) => {
            const d = deltas[s.id] ?? 0;
            const on = s.id === selectedId;
            const rg = ranges[s.id];
            return (
              <div
                key={s.id} ref={(el) => { if (el) rows.current.set(s.id, el); else rows.current.delete(s.id); }}
                role="row" tabIndex={0} aria-selected={on} data-site={s.id}
                onClick={() => onSelect(s.id)}
                onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onSelect(s.id); } }}
                className={`${COLS} min-h-16 cursor-pointer border-b border-line px-4 py-2 last:border-b-0 hover:bg-blue-50 ${on ? "bg-blue-50" : ""} ${s.tier === 1 ? "border-l-4 border-l-blue-600 pl-3" : ""}`}
              >
                <span role="cell" className="flex items-center gap-1.5">
                  <span className="num font-display text-[22px] font-bold leading-7 text-ink-900">{s.rank}</span>
                  {d !== 0 && (
                    <span className="inline-flex items-center text-sm font-semibold text-blue-600" aria-label={`moved ${d > 0 ? "up" : "down"} ${Math.abs(d)}`}>
                      {d > 0 ? <ArrowUp className="size-4" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}{Math.abs(d)}
                    </span>
                  )}
                </span>
                <span role="cell" className="min-w-0">
                  <Link href={`/factories/${s.id}`} title={s.name} onClick={(e) => e.stopPropagation()} className="inline-block max-w-full truncate align-bottom font-semibold text-ink-900 hover:underline">{s.name}</Link>
                  <span className="block truncate text-sm text-ink-500">{s.supplierName}</span>
                </span>
                <span role="cell"><BandPill band={s.band} compact /></span>
                <span role="cell" className="num text-right">{fmtScore(s.R)}</span>
                <span role="cell" className="num text-right">{s.footprintI === null ? "Pending" : fmtScore(s.footprintI)}</span>
                <span role="cell"><QuadrantPill quadrant={s.quadrant} /></span>
                <span role="cell"><TierBadge tier={s.tier} /></span>
                <span role="cell" className="text-sm text-ink-700">{s.drivers.map((k) => PILLAR_LABELS[k]).join(", ")}</span>
                <span role="cell" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-700">
                  <span className="num font-semibold">{range(rg)}</span>
                  {rg.unstable && <StatusPill tone="caution" shape="diamond" label="Rank unstable" />}
                </span>
                <span role="cell" className="num text-right">{fmtPct1(s.pwi.sitePwi)}</span>
                <span role="cell" className="num text-right">{Math.round(s.riskCoverage.share * 100)}%</span>
                <span role="cell" className="num text-right">{Math.round(s.readiness * 100)}%</span>
                <span role="cell">
                  <Link href={`/factories/${s.id}`} onClick={(e) => e.stopPropagation()} aria-label={`Open ${s.name}`} className="grid size-9 place-items-center rounded-full text-ink-300 hover:bg-blue-100 hover:text-blue-600">
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </Link>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
