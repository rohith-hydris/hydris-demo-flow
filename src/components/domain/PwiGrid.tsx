"use client";

import { useEffect, useState } from "react";
import { fmtCellScore, fmtScore3 } from "@/src/lib/format";
import { DIMENSIONS, PILLARS, PILLAR_NAMES, type PwiCell } from "@/src/lib/pwi";
import type { Site } from "@/src/lib/selectors";
import { cellDetail, cellLabel, traceCell, tracePillar } from "@/src/lib/trace";
import type { CellGrade, Pillar } from "@/src/lib/types";
import { CellPill, ScoreBar } from "@/src/components/ui";
import { InfoButton } from "./Trace";

// Single-hue ramp for the grid fill (DESIGN 2.1): pale blue at 0 up to the primary blue at 1.
const ramp = (score: number) => `color-mix(in srgb, var(--blue-600) ${Math.round(Math.max(0, Math.min(1, score)) * 100)}%, var(--blue-100))`;

/** Cells fill from empty to their value on first view (700 ms, 40 ms stagger). Reduced motion renders them filled at once. */
function useFilled(): boolean {
  const [filled, setFilled] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (filled) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setFilled(true)); });
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
  }, [filled]);
  return filled;
}

function GradeCircle({ grade }: { grade: CellGrade }) {
  const none = grade === "none";
  return (
    <span
      role="img" aria-label={none ? "No evidence grade" : `Evidence grade ${grade}`}
      className={`grid size-8 shrink-0 place-items-center rounded-full border font-display text-sm font-bold ${none ? "border-dashed border-ink-300 bg-card text-ink-500" : "border-panel-line bg-card text-blue-600"}`}
    >
      {none ? "–" : grade}
    </span>
  );
}

function GridCell({ site, cell, index, filled, score, guide }: { site: Site; cell: PwiCell; index: number; filled: boolean; score: number; guide: boolean }) {
  const [open, setOpen] = useState(false);
  const zero = score === 0;
  const d = cellDetail(cell);
  return (
    <div data-cell={`${cell.pillar}-${cell.dimension}`} className={`group relative min-h-40 rounded-tile border bg-card ${zero ? "border-dashed border-ink-300" : "border-line"}`}>
      {/* Liquid fill: rises from the bottom to the score. A zero score is an empty, dashed cell instead of a pale one. */}
      {!zero && (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-tile">
          <div
            data-fill
            className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
            style={{ height: filled ? `${score * 100}%` : "0%", background: ramp(score), transitionDelay: `${index * 40}ms` }}
          />
        </div>
      )}

      <div className="relative z-10 flex h-full min-h-40 flex-col justify-between gap-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="rounded-lg bg-card/85 px-2 py-1">
            <div className="flex items-center gap-1">
              <span className="num font-display text-[28px] font-bold leading-8 text-ink-900">{fmtCellScore(score)}</span>
              <InfoButton trace={traceCell(site, cell)} />
            </div>
            <span className="block text-sm text-ink-500">{guide ? "Guide rule" : "of target"}</span>
          </div>
          <GradeCircle grade={cell.grade} />
        </div>

        <div className="rounded-lg bg-card/90 p-2">
          <CellPill state={cell.state} wrap />
          {cell.gap && score < 1 && (
            <>
              <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="mt-1 block min-h-8 text-left text-sm font-semibold text-blue-600 hover:underline">
                {open ? "Hide what is needed" : "See what’s needed"}
              </button>
              {open && <p className="mt-1 text-sm text-ink-700">{cell.gap}</p>}
            </>
          )}
        </div>
      </div>

      <div
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-20 mt-1 w-64 -translate-x-1/2 rounded-tile border border-line bg-card p-3 text-sm text-ink-700 opacity-0 shadow-raised group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        <p className="font-semibold text-ink-900">{cellLabel(cell.pillar, cell.dimension)}</p>
        {d.target && <p>Target: <span className="num">{d.target}</span></p>}
        {d.delivered && <p>Delivered: <span className="num">{d.delivered}</span></p>}
        <p className="mt-1">{d.formula}</p>
      </div>
    </div>
  );
}

/**
 * The signature 3 x 3 PWI grid (DESIGN 4.6): pillars down the side, dimensions across the top, pillar totals to the right.
 * `guideMode` shows the F12 Guide-compatible view, where the mass-sum rule scores P1 Quality as 1.0.
 */
export default function PwiGrid({ site, guideMode = false }: { site: Site; guideMode?: boolean }) {
  const filled = useFilled();
  const g = site.pwi.guide;
  const useGuide = guideMode && g !== null;
  const scoreOf = (c: PwiCell) => (useGuide && c.pillar === "P1" && c.dimension === "Quality" ? g.p1Quality : c.score);
  const pillarOf = (p: Pillar) => (useGuide && p === "P1" ? g.p1 : site.pwi.pillars[p]);

  return (
    <div role="group" aria-label="Positive Water Impact grid: three pillars by three dimensions" className="grid grid-cols-[104px_repeat(3,minmax(0,1fr))] gap-3">
      <p className="px-1 text-sm font-semibold text-ink-500">Pillar score</p>
      {DIMENSIONS.map((d) => <p key={d} className="px-1 text-center font-semibold text-ink-700">{d}</p>)}

      {PILLARS.map((p, row) => (
        <PillarRow key={p} site={site} pillar={p} row={row} filled={filled} scoreOf={scoreOf} pillarValue={pillarOf(p)} guideMode={useGuide} />
      ))}
    </div>
  );
}

function PillarRow({ site, pillar, row, filled, scoreOf, pillarValue, guideMode }: {
  site: Site; pillar: Pillar; row: number; filled: boolean; scoreOf: (c: PwiCell) => number; pillarValue: number; guideMode: boolean;
}) {
  const cells = site.pwi.cells.filter((c) => c.pillar === pillar);
  return (
    <>
      {/* Row header: the pillar name and its total as a score bar (DESIGN 4.6). It sits here, not in a column on the right,
          so each cell keeps room for its score, grade and state at 1280px. */}
      <div className="flex flex-col justify-center gap-1">
        <p className="font-semibold leading-5 text-ink-900">{PILLAR_NAMES[pillar]} <span className="font-normal text-ink-500">{pillar}</span></p>
        <div className="flex items-center gap-0.5">
          <span className="num font-display text-[22px] font-semibold leading-7 text-ink-900">{fmtScore3(pillarValue)}</span>
          <InfoButton trace={tracePillar(site, pillar)} />
        </div>
        <ScoreBar value={pillarValue} label={`Pillar ${pillar}`} valueText={fmtScore3(pillarValue)} />
      </div>
      {cells.map((c, i) => (
        <GridCell key={c.dimension} site={site} cell={c} index={row * 3 + i} filled={filled} score={scoreOf(c)} guide={guideMode && c.pillar === "P1" && c.dimension === "Quality"} />
      ))}
    </>
  );
}

/** A small, static 3 x 3 for the Overview tab: the same fill, with the score in each cell and no controls. */
export function MiniPwiGrid({ site }: { site: Site }) {
  return (
    <div role="img" aria-label="Positive Water Impact grid, scores by pillar and dimension" className="grid grid-cols-3 gap-1.5">
      {PILLARS.flatMap((p) => site.pwi.cells.filter((c) => c.pillar === p)).map((c) => (
        <div key={`${c.pillar}${c.dimension}`} className={`relative h-14 overflow-hidden rounded-lg border bg-card ${c.score === 0 ? "border-dashed border-ink-300" : "border-line"}`}>
          {c.score > 0 && <div aria-hidden="true" className="absolute inset-x-0 bottom-0" style={{ height: `${c.score * 100}%`, background: ramp(c.score) }} />}
          <span className="num relative z-10 m-1 inline-block rounded bg-card/85 px-1 text-sm font-semibold text-ink-900">{fmtCellScore(c.score)}</span>
        </div>
      ))}
    </div>
  );
}
