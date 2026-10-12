"use client";

import { useState } from "react";
import { fmtScore } from "@/src/lib/format";
import { I_LARGE, R_BAND1 } from "@/src/lib/rank";
import type { Site } from "@/src/lib/selectors";
import type { Tier } from "@/src/lib/types";

// Risk x footprint scatter (PRODUCT 4.5, DESIGN 4.8). x = I, y = R, lines at R = 0.6 and I = 0.5.
const W = 620, H = 560;
const M = { l: 62, r: 18, t: 18, b: 58 };
const PW = W - M.l - M.r, PH = H - M.t - M.b;
const X = (i: number) => M.l + i * PW;
const Y = (r: number) => M.t + (1 - r) * PH;
const DOT = 13;

// Dots are coloured by tier, like the tier badges: Tier 1 solid blue, Tier 2 pale blue, Tier 3 neutral.
const TIER_STYLE: Record<Tier, { fill: string; stroke: string; text: string }> = {
  1: { fill: "var(--blue-600)", stroke: "var(--blue-600)", text: "var(--card)" },
  2: { fill: "var(--blue-100)", stroke: "var(--blue-600)", text: "var(--blue-600)" },
  3: { fill: "var(--neutral-bg)", stroke: "var(--neutral-fill)", text: "var(--neutral-fg)" },
};

const ticksR = [0, 0.2, 0.4, 0.6, 0.8, 1];
const ticksI = [0, 0.25, 0.5, 0.75, 1];

export default function QuadrantScatter({ sites, selectedId, onSelect }: { sites: Site[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const pos = (s: Site) => ({ x: X(s.footprintI ?? 0), y: Y(s.R) });
  const shown = sites.find((s) => s.id === (hover ?? selectedId));
  // Draw the selected dot last so it sits on top; otherwise lower ranks on top.
  const order = [...sites].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId) || b.rank - a.rank);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="group"
        aria-label="Scatter plot of risk R against footprint I for each site. Lines at R 0.60 and I 0.50 split the four quadrants."
      >
        {/* Quadrant tints: Act now is pale amber, the others pale blue. */}
        <rect x={X(0)} y={Y(1)} width={X(I_LARGE) - X(0)} height={Y(R_BAND1) - Y(1)} fill="var(--blue-50)" />
        <rect x={X(I_LARGE)} y={Y(1)} width={X(1) - X(I_LARGE)} height={Y(R_BAND1) - Y(1)} fill="var(--caution-bg)" opacity="0.7" />
        <rect x={X(0)} y={Y(R_BAND1)} width={X(I_LARGE) - X(0)} height={Y(0) - Y(R_BAND1)} fill="var(--blue-50)" />
        <rect x={X(I_LARGE)} y={Y(R_BAND1)} width={X(1) - X(I_LARGE)} height={Y(0) - Y(R_BAND1)} fill="var(--blue-50)" />
        <rect x={M.l} y={M.t} width={PW} height={PH} fill="none" stroke="var(--panel-line)" />

        {ticksR.map((t) => (
          <g key={`r${t}`}>
            <text x={M.l - 10} y={Y(t) + 4.5} textAnchor="end" fontSize="13" fill="var(--ink-500)">{t.toFixed(2)}</text>
          </g>
        ))}
        {ticksI.map((t) => <text key={`i${t}`} x={X(t)} y={H - M.b + 22} textAnchor="middle" fontSize="13" fill="var(--ink-500)">{t.toFixed(2)}</text>)}

        {/* Threshold lines */}
        <line x1={X(0)} x2={X(1)} y1={Y(R_BAND1)} y2={Y(R_BAND1)} stroke="var(--ink-500)" strokeDasharray="6 5" />
        <line x1={X(I_LARGE)} x2={X(I_LARGE)} y1={Y(0)} y2={Y(1)} stroke="var(--ink-500)" strokeDasharray="6 5" />

        {/* Quadrant names in the corners */}
        <text x={X(1) - 10} y={Y(1) + 24} textAnchor="end" fontSize="15" fontWeight="600" fill="var(--ink-500)">Act now</text>
        <text x={X(0) + 10} y={Y(1) + 24} fontSize="15" fontWeight="600" fill="var(--ink-500)">Build resilience</text>
        <text x={X(1) - 10} y={Y(0) - 12} textAnchor="end" fontSize="15" fontWeight="600" fill="var(--ink-500)">Reduce footprint</text>
        <text x={X(0) + 10} y={Y(0) - 12} fontSize="15" fontWeight="600" fill="var(--ink-500)">Monitor</text>

        <text x={M.l + PW / 2} y={H - 8} textAnchor="middle" fontSize="14" fill="var(--ink-700)">Footprint I: larger is a bigger water footprint</text>
        <text transform={`translate(16 ${M.t + PH / 2}) rotate(-90)`} textAnchor="middle" fontSize="14" fill="var(--ink-700)">Risk R</text>

        {order.map((s) => {
          const { x, y } = pos(s);
          const st = TIER_STYLE[s.tier];
          const on = s.id === selectedId;
          const r = DOT + (on ? 4 : 0);
          return (
            <g
              key={s.id} tabIndex={0} role="button" aria-pressed={on}
              aria-label={`Rank ${s.rank}, ${s.name}. Risk ${fmtScore(s.R)}, footprint ${s.footprintI === null ? "pending" : fmtScore(s.footprintI)}, Tier ${s.tier}, ${s.quadrant}.`}
              data-site={s.id} className="cursor-pointer"
              style={{ transform: `translate(${x}px, ${y}px)`, transition: "transform 150ms ease-out" }}
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(s.id); } }}
              onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(s.id)} onBlur={() => setHover(null)}
            >
              <circle r={r + 2} fill="var(--card)" />
              <circle r={r} fill={st.fill} stroke={st.stroke} strokeWidth={on ? 3 : 1.5} strokeDasharray={s.footprintI === null ? "4 3" : undefined} />
              <text textAnchor="middle" dy="4.5" fontSize="13" fontWeight="700" fill={st.text} pointerEvents="none">{s.rank}</text>
            </g>
          );
        })}
      </svg>

      {shown && (
        <div
          aria-hidden="true"
          className="card pointer-events-none absolute z-10 w-60 -translate-x-1/2 -translate-y-full p-3 text-sm"
          style={{ left: `${(pos(shown).x / W) * 100}%`, top: `calc(${(pos(shown).y / H) * 100}% - ${DOT + 10}px)` }}
        >
          <p className="font-semibold text-ink-900">{shown.name}</p>
          <p className="num text-ink-700">Rank {shown.rank} · Tier {shown.tier} · {shown.quadrant}</p>
          <p className="num text-ink-700">R {fmtScore(shown.R)} · I {shown.footprintI === null ? "pending" : fmtScore(shown.footprintI)}</p>
        </div>
      )}

      <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-700">
        {([1, 2, 3] as Tier[]).map((t) => (
          <li key={t} className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true"><circle cx="12" cy="12" r="9" fill={TIER_STYLE[t].fill} stroke={TIER_STYLE[t].stroke} strokeWidth="1.5" /></svg>
            Tier {t}
          </li>
        ))}
        <li className="text-ink-500">The number in each dot is the rank.</li>
      </ul>

      <table className="sr-only">
        <caption>Sites by risk R and footprint I</caption>
        <thead><tr><th>Rank</th><th>Site</th><th>Risk R</th><th>Footprint I</th><th>Tier</th><th>Quadrant</th></tr></thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.id}><td>{s.rank}</td><td>{s.name}</td><td>{fmtScore(s.R)}</td><td>{s.footprintI === null ? "pending" : fmtScore(s.footprintI)}</td><td>{s.tier}</td><td>{s.quadrant}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
