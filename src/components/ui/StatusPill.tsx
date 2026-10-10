import type { Band, CellState, Health, PerformanceStatus, RiskStatus, Severity, Sharing, ZdhcTier } from "@/src/lib/data";

export type Tone = "positive" | "caution" | "negative" | "high" | "neutral" | "info";
export type ShapeKind = "circle" | "diamond" | "triangle" | "square" | "ring" | "dash";

// Display lookups only: how a hardcoded category is drawn. Colour is never the only cue.
export function Shape({ kind, className = "size-3.5" }: { kind: ShapeKind; className?: string }) {
  const p = { viewBox: "0 0 14 14", className, "aria-hidden": true, fill: "currentColor" } as const;
  switch (kind) {
    case "circle": return <svg {...p}><circle cx="7" cy="7" r="5.5" /></svg>;
    case "diamond": return <svg {...p}><path d="M7 .8 13.2 7 7 13.2.8 7z" /></svg>;
    case "triangle": return <svg {...p}><path d="M7 1 13.5 12.5h-13z" /></svg>;
    case "square": return <svg {...p}><rect x="1.8" y="1.8" width="10.4" height="10.4" rx="1" /></svg>;
    case "ring": return <svg {...p} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="7" r="4.8" /></svg>;
    case "dash": return <svg {...p}><rect x="1.5" y="5.5" width="11" height="3" rx="1.5" /></svg>;
  }
}

export function StatusPill({ tone, shape, label, className = "" }: { tone: Tone; shape: ShapeKind; label: string; className?: string }) {
  return (
    <span className={`tone-${tone} inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--t-bg)] px-2.5 text-sm font-semibold text-[var(--t-fg)] ${className}`}>
      <Shape kind={shape} />
      {label}
    </span>
  );
}

type Meta = { tone: Tone; shape: ShapeKind };

export const bandMeta: Record<Band, Meta & { label: string }> = {
  1: { tone: "negative", shape: "triangle", label: "Band 1 · Highest risk" },
  2: { tone: "caution", shape: "diamond", label: "Band 2 · Medium risk" },
  3: { tone: "positive", shape: "circle", label: "Band 3 · Lower risk" },
};
export const BandPill = ({ band }: { band: Band }) => <StatusPill {...bandMeta[band]} />;

const riskMeta: Record<RiskStatus, Meta> = {
  Present: { tone: "negative", shape: "triangle" },
  Watch: { tone: "caution", shape: "diamond" },
  "Not present": { tone: "positive", shape: "circle" },
  "No data": { tone: "neutral", shape: "ring" },
};
export const RiskPill = ({ status }: { status: RiskStatus }) => <StatusPill {...riskMeta[status]} label={status} />;

const cellMeta: Record<CellState, Meta> = {
  Scored: { tone: "positive", shape: "circle" },
  "Missing input": { tone: "neutral", shape: "ring" },
  "Not additional": { tone: "caution", shape: "diamond" },
  "Low confidence": { tone: "high", shape: "triangle" },
};
export const CellPill = ({ state }: { state: CellState }) => <StatusPill {...cellMeta[state]} label={state} />;

export const healthMeta: Record<Health, Meta> = {
  Healthy: { tone: "positive", shape: "circle" },
  Watch: { tone: "caution", shape: "diamond" },
  Critical: { tone: "negative", shape: "triangle" },
};
export const HealthPill = ({ health }: { health: Health }) => <StatusPill {...healthMeta[health]} label={health} />;

export const tierMeta: Record<ZdhcTier, Meta> = {
  Aspirational: { tone: "positive", shape: "circle" },
  Progressive: { tone: "info", shape: "square" },
  Foundational: { tone: "caution", shape: "diamond" },
  "Not conformant": { tone: "negative", shape: "triangle" },
};

export const severityMeta: Record<Severity, Meta> = {
  Critical: { tone: "negative", shape: "triangle" },
  High: { tone: "high", shape: "square" },
  Medium: { tone: "caution", shape: "diamond" },
  Info: { tone: "info", shape: "ring" },
};
export const SeverityPill = ({ severity }: { severity: Severity | null }) =>
  severity ? <StatusPill {...severityMeta[severity]} label={severity} /> : <span className="text-muted">None open</span>;

export const performanceMeta: Record<PerformanceStatus, Meta> = {
  "On track": { tone: "positive", shape: "circle" },
  "Needs attention": { tone: "caution", shape: "diamond" },
  "Off track": { tone: "negative", shape: "triangle" },
};
export const PerformancePill = ({ status }: { status: PerformanceStatus }) => <StatusPill {...performanceMeta[status]} label={status} />;

export const SharingPill = ({ sharing }: { sharing: Sharing }) =>
  sharing === "Shared"
    ? <StatusPill tone="positive" shape="circle" label="Shared" />
    : <StatusPill tone="neutral" shape="ring" label="Not shared" />;

export const trendText = { Upgraded: "↑ Upgraded", Same: "→ Same", Downgraded: "↓ Downgraded" } as const;
