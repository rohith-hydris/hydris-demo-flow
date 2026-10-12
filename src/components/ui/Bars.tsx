import { Shape, type ShapeKind, type Tone } from "./StatusPill";

export interface Segment { label: string; count: number; pct: number; tone: Tone; shape: ShapeKind }

/** Turns counts into segments whose widths sum to 100. */
export function toSegments(items: { label: string; count: number; tone: Tone; shape: ShapeKind }[]): Segment[] {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  return items.map((i) => ({ ...i, pct: total ? (i.count / total) * 100 : 0 }));
}

export function StackedBar({
  segments, ariaLabel, size = "md", legend = true, className = "",
}: { segments: Segment[]; ariaLabel: string; size?: "sm" | "md" | "lg"; legend?: boolean | "compact"; className?: string }) {
  const h = size === "lg" ? "h-5" : size === "md" ? "h-3" : "h-2";
  return (
    <div className={className}>
      <div className={`flex ${h} w-full overflow-hidden rounded-full bg-blue-100`} role="img"
        aria-label={`${ariaLabel}: ${segments.filter((s) => s.count > 0).map((s) => `${s.count} ${s.label}`).join(", ")}`}>
        {segments.filter((s) => s.pct > 0).map((s) => (
          <span key={s.label} title={`${s.label}: ${s.count}`} className={`tone-${s.tone} h-full bg-[var(--t-fill)] not-first:border-l-2 not-first:border-white`} style={{ width: `${s.pct}%` }} />
        ))}
      </div>
      {legend === "compact" && (
        <ul className="mt-1.5 flex flex-wrap gap-x-3 text-sm">
          {segments.map((s) => (
            <li key={s.label} className={`tone-${s.tone} flex items-center gap-1 ${s.count === 0 ? "text-ink-500" : ""}`} title={s.label}>
              <span className="text-[var(--t-fill)]"><Shape kind={s.shape} className="size-3" /></span>
              <span className="sr-only">{s.label}</span><strong className="num">{s.count}</strong>
            </li>
          ))}
        </ul>
      )}
      {legend === true && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {segments.map((s) => (
            <li key={s.label} className={`tone-${s.tone} flex items-center gap-1.5 ${s.count === 0 ? "text-ink-500" : ""}`}>
              <span className="text-[var(--t-fill)]"><Shape kind={s.shape} className="size-3" /></span>
              <span>{s.label}</span><strong className="num">{s.count}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Score bar (DESIGN 4.5): 8px, pill track, blue gradient fill. Pass `tone` to colour the fill by meaning (for example
 * the risk band) and `tick` for a threshold marker (R at 0.6, I at 0.5). `value` and `tick` are on a 0 to 1 scale.
 */
export function ScoreBar({
  value, label, valueText, tone, tick, className = "",
}: { value: number; label: string; valueText: string; tone?: Tone; tick?: number | number[]; className?: string }) {
  const width = `${Math.max(0, Math.min(1, value)) * 100}%`;
  return (
    <div className={`${tone ? `tone-${tone}` : ""} relative h-2 w-full rounded-full bg-blue-100 ${className}`} role="img" aria-label={`${label}: ${valueText}`}>
      <div
        className="h-full rounded-full"
        style={{ width, background: tone ? "var(--t-fill)" : "linear-gradient(90deg, var(--blue-500), var(--blue-600))" }}
      />
      {(tick === undefined ? [] : Array.isArray(tick) ? tick : [tick]).map((t) => (
        <span key={t} aria-hidden="true" className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-ink-900/60" style={{ left: `${t * 100}%` }} />
      ))}
    </div>
  );
}
