import { fmtPct1 } from "@/src/lib/format";

/** Trust score of a field inspection as a small progress ring. */
export default function TrustRing({ value, ok }: { value: number; ok: boolean }) {
  const r = 22, c = 2 * Math.PI * r;
  return (
    <div className="relative size-16 shrink-0" role="img" aria-label={`Trust score ${fmtPct1(value)}`}>
      <svg viewBox="0 0 56 56" className="size-16 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--blue-100)" strokeWidth="6" />
        <circle
          cx="28" cy="28" r={r} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * value} ${c}`}
          stroke={ok ? "var(--positive-fill)" : "var(--caution-fill)"}
        />
      </svg>
      <span className="num absolute inset-0 grid place-items-center text-sm font-semibold text-ink-900">{Math.round(value * 100)}%</span>
    </div>
  );
}
