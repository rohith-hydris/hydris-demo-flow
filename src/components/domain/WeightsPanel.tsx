"use client";

import { RotateCcw } from "lucide-react";
import { PILLAR_KEYS, PILLAR_LABELS, type Weights } from "@/src/lib/risk";
import { displayPercents, isDefaultWeights, setWeight } from "@/src/lib/weights";
import type { PillarKey } from "@/src/lib/types";

// What each risk pillar covers, in plain words.
const HELP: Record<PillarKey, string> = {
  scarcity: "Water stress, depletion and variability",
  groundwater: "Fall in the groundwater table",
  drought: "Exposure to drought",
  flood: "River and coastal flooding",
  community: "Drinking water and sanitation nearby",
};

/**
 * Five sliders for the risk pillar weights (PRODUCT 4.5, DESIGN 4.9). Moving one rescales the rest so the total stays 100%.
 * The page re-ranks live from `weights`.
 */
export default function WeightsPanel({ weights, onChange, onReset }: { weights: Weights; onChange: (w: Weights) => void; onReset: () => void }) {
  const pct = displayPercents(weights);
  const total = PILLAR_KEYS.reduce((s, k) => s + pct[k], 0);
  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3>Risk weights</h3>
          <p className="text-ink-500">Move a slider to see the ranking change.</p>
        </div>
        <button type="button" onClick={onReset} disabled={isDefaultWeights(weights)} className="btn btn-secondary min-h-11 px-4 text-sm">
          <RotateCcw className="size-4" aria-hidden="true" /> Reset to default
        </button>
      </div>

      <ul className="mt-3 divide-y divide-panel-line">
        {PILLAR_KEYS.map((k) => (
          <li key={k} className="py-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={`weight-${k}`} className="font-semibold text-ink-900">{PILLAR_LABELS[k]}</label>
              <output htmlFor={`weight-${k}`} className="num font-display text-[22px] font-semibold text-ink-900">{pct[k]}%</output>
            </div>
            <p className="text-sm text-ink-500">{HELP[k]}</p>
            <input
              id={`weight-${k}`} type="range" min={0} max={100} step={1} value={pct[k]} className="slider"
              style={{ "--fill": `${pct[k]}%` } as React.CSSProperties}
              aria-valuetext={`${pct[k]} percent`}
              onChange={(e) => onChange(setWeight(weights, k, Number(e.target.value) / 100))}
            />
          </li>
        ))}
      </ul>

      <p className="mt-2 flex items-center justify-between border-t border-panel-line pt-3 font-semibold text-ink-900" aria-live="polite">
        <span>Total</span><span className="num">{total}%</span>
      </p>
    </div>
  );
}
