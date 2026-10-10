import { Shape, type ShapeKind, type Tone } from "./StatusPill";

export interface Segment { label: string; count: number; pct: number; tone: Tone; shape: ShapeKind }

// Segment widths are the hardcoded `pct` values from the data layer.
export function StackedBar({
  segments, ariaLabel, size = "md", legend = true, className = "",
}: { segments: Segment[]; ariaLabel: string; size?: "sm" | "md" | "lg"; legend?: boolean | "compact"; className?: string }) {
  const h = size === "lg" ? "h-5" : size === "md" ? "h-3" : "h-2";
  return (
    <div className={className}>
      <div className={`flex ${h} w-full overflow-hidden rounded-full bg-[#E6E9F1]`} role="img"
        aria-label={`${ariaLabel}: ${segments.filter((s) => s.count > 0).map((s) => `${s.count} ${s.label}`).join(", ")}`}>
        {segments.filter((s) => s.pct > 0).map((s) => (
          <span key={s.label} title={`${s.label}: ${s.count}`} className={`tone-${s.tone} h-full bg-[var(--t-fill)] not-first:border-l-2 not-first:border-white`} style={{ width: `${s.pct}%` }} />
        ))}
      </div>
      {legend === "compact" && (
        <ul className="mt-1.5 flex flex-wrap gap-x-3 text-sm">
          {segments.map((s) => (
            <li key={s.label} className={`tone-${s.tone} flex items-center gap-1 ${s.count === 0 ? "text-muted" : ""}`}>
              <span className="text-[var(--t-fill)]"><Shape kind={s.shape} className="size-3" /></span>
              <span className="sr-only">{s.label}</span><strong className="num">{s.count}</strong>
            </li>
          ))}
        </ul>
      )}
      {legend === true && (
        <ul className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm ${size === "sm" ? "" : "text-base"}`}>
          {segments.map((s) => (
            <li key={s.label} className={`tone-${s.tone} flex items-center gap-1.5 ${s.count === 0 ? "text-muted" : ""}`}>
              <span className="text-[var(--t-fill)]"><Shape kind={s.shape} className="size-3" /></span>
              <span>{s.label}</span><strong className="num">{s.count}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// `pct` is 0..100 and comes from the data layer.
export function ProgressBar({ pct, label, tone = "info", className = "" }: { pct: number; label: string; tone?: Tone; className?: string }) {
  return (
    <div className={`tone-${tone} h-2 w-full overflow-hidden rounded-full bg-[#E6E9F1] ${className}`} role="img" aria-label={`${label}: ${pct}%`}>
      <div className="h-full rounded-full bg-[var(--t-fill)]" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Plots values that are already on a 0..100 scale. Dashed guide lines are given as values on the same scale.
export function Sparkline({ values, guides = [], ariaLabel, className = "h-28 w-full" }: { values: number[]; guides?: number[]; ariaLabel: string; className?: string }) {
  const W = 300, H = 100, step = W / (values.length - 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={ariaLabel} preserveAspectRatio="none">
      {guides.map((g) => <line key={g} x1="0" x2={W} y1={H - g} y2={H - g} stroke="#98A2B3" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)}
      <polyline points={values.map((v, i) => `${i * step},${H - v}`).join(" ")} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
