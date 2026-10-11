import { fmtInt } from "@/src/lib/format";
import { PILLAR_NAMES } from "@/src/lib/pwi";
import { VALUE_STATES, type PillarRow, type StateSplit, type ValueState } from "@/src/lib/impactView";
import { StatusPill } from "@/src/components/ui";

// V2 9: one panel per outcome dimension. Each pillar is a stacked bar split into Validated, Measured and Forecast.

const stateMeta: Record<ValueState, { tone: "positive" | "info" | "neutral"; shape: "circle" | "square" | "dash" }> = {
  Validated: { tone: "positive", shape: "circle" },
  Measured: { tone: "info", shape: "square" },
  Forecast: { tone: "neutral", shape: "dash" },
};
export const ValueStatePill = ({ state }: { state: ValueState }) => <StatusPill {...stateMeta[state]} label={state} />;

const segmentStyle: Record<ValueState, React.CSSProperties> = {
  Validated: { background: "var(--blue-600)" },
  Measured: { background: "var(--blue-100)", boxShadow: "inset 0 0 0 1.5px var(--blue-500)" },
  Forecast: { background: "repeating-linear-gradient(45deg, var(--neutral-bg), var(--neutral-bg) 4px, var(--neutral-line) 4px, var(--neutral-line) 8px)", boxShadow: "inset 0 0 0 1.5px var(--neutral-fill)" },
};

export function StateLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Value states">
      {VALUE_STATES.map((s) => (
        <li key={s} className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-3 w-6 rounded-full" style={segmentStyle[s]} />
          <ValueStatePill state={s} />
        </li>
      ))}
    </ul>
  );
}

function StackedBar({ split, target, label }: { split: StateSplit; target: number | null; label: string }) {
  const total = split.Validated + split.Measured + split.Forecast;
  const scale = Math.max(target ?? 0, total);
  return (
    <div role="img" aria-label={label} className="relative flex h-3 w-full overflow-hidden rounded-full bg-blue-100/60 ring-1 ring-line">
      {scale > 0 && VALUE_STATES.map((s) => split[s] > 0 && (
        <span key={s} style={{ ...segmentStyle[s], width: `${(split[s] / scale) * 100}%` }} className="h-full" />
      ))}
    </div>
  );
}

export function PillarBars({ rows, unit, empty = "Nothing yet" }: { rows: PillarRow[]; unit: string; empty?: string }) {
  return (
    <ul className="space-y-5">
      {rows.map((r) => {
        const parts = VALUE_STATES.filter((s) => r.split[s] > 0);
        const text = parts.map((s) => `${s} ${fmtInt(r.split[s])} ${unit}`).join(", ") || empty;
        return (
          <li key={r.pillar}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-semibold text-ink-900">{PILLAR_NAMES[r.pillar]} <span className="font-normal text-ink-500">{r.pillar}</span></span>
              <span className="num text-sm text-ink-500">{r.target === null ? "No target recorded" : `Target ${fmtInt(r.target)} ${unit}`}</span>
            </div>
            <div className="mt-1.5"><StackedBar split={r.split} target={r.target} label={`${PILLAR_NAMES[r.pillar]}: ${text}`} /></div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {parts.length === 0 ? <span className="text-sm text-ink-500">{empty}</span> : parts.map((s) => (
                <span key={s} className="flex items-center gap-1.5"><ValueStatePill state={s} /><span className="num font-semibold text-ink-900">{fmtInt(r.split[s])}</span><span className="text-sm text-ink-500">{unit}</span></span>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
