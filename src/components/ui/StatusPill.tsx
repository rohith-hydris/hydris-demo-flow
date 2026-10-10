import { Lock } from "lucide-react";
import type { Band, CellState, CertBand, CheckResult, Health, Period, ProjectStatus, Quadrant, ReadinessState, RiskStatus, Severity, Tier, ZdhcTier } from "@/src/lib/types";

export type Tone = "positive" | "caution" | "negative" | "high" | "neutral" | "info" | "internal";
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

/** `wrap` lets a long label break onto two lines, for narrow spaces such as a grid cell. */
export function StatusPill({ tone, shape, label, className = "", wrap = false }: { tone: Tone; shape: ShapeKind; label: string; className?: string; wrap?: boolean }) {
  return (
    <span className={`tone-${tone} inline-flex min-h-7 items-center gap-1.5 ${wrap ? "rounded-2xl py-1 leading-5" : "whitespace-nowrap rounded-full"} bg-[var(--t-bg)] px-2.5 text-sm font-semibold text-[var(--t-fg)] ${className}`}>
      <Shape kind={shape} className={wrap ? "size-3.5 shrink-0" : "size-3.5"} />
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
/** `compact` drops the risk wording ("Band 1") for tight spaces such as table rows. */
export const BandPill = ({ band, compact = false }: { band: Band; compact?: boolean }) => (
  <StatusPill {...bandMeta[band]} label={compact ? `Band ${band}` : bandMeta[band].label} />
);

const riskMeta: Record<RiskStatus, Meta> = {
  Present: { tone: "negative", shape: "triangle" },
  Watch: { tone: "caution", shape: "diamond" },
  "Not present": { tone: "positive", shape: "circle" },
};
export const RiskPill = ({ status }: { status: RiskStatus }) => <StatusPill {...riskMeta[status]} label={status} />;

const cellMeta: Record<CellState, Meta> = {
  Scored: { tone: "positive", shape: "circle" },
  "Partially scored": { tone: "caution", shape: "diamond" },
  "Missing input": { tone: "neutral", shape: "ring" },
  Blocked: { tone: "negative", shape: "triangle" },
  "Not additional": { tone: "caution", shape: "diamond" },
  "Low confidence": { tone: "neutral", shape: "ring" },
};
export const CellPill = ({ state, wrap }: { state: CellState; wrap?: boolean }) => <StatusPill {...cellMeta[state]} label={state} wrap={wrap} />;

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

export const ZdhcPill = ({ tier }: { tier: ZdhcTier }) => <StatusPill {...tierMeta[tier]} label={tier} />;

export const severityMeta: Record<Severity, Meta> = {
  Critical: { tone: "negative", shape: "triangle" },
  High: { tone: "high", shape: "square" },
  Medium: { tone: "caution", shape: "diamond" },
  Info: { tone: "info", shape: "ring" },
};
export const SeverityPill = ({ severity }: { severity: Severity | null }) =>
  severity ? <StatusPill {...severityMeta[severity]} label={severity} /> : <span className="text-ink-500">None open</span>;


export const certMeta: Record<CertBand, Meta> = {
  "Low confidence": { tone: "neutral", shape: "ring" },
  "Self-certified": { tone: "internal", shape: "diamond" },
  Conditional: { tone: "info", shape: "ring" },
  "In progress": { tone: "caution", shape: "diamond" },
  "Not achieved": { tone: "negative", shape: "triangle" },
};
export const CertPill = ({ band }: { band: CertBand }) => <StatusPill {...certMeta[band]} label={band} />;

export const projectStatusMeta: Record<ProjectStatus, Meta> = {
  Validated: { tone: "positive", shape: "circle" },
  "Pending validation": { tone: "caution", shape: "diamond" },
  Flagged: { tone: "negative", shape: "triangle" },
  "Not counted": { tone: "neutral", shape: "ring" },
};
export const ProjectStatusPill = ({ status }: { status: ProjectStatus }) => <StatusPill {...projectStatusMeta[status]} label={status} />;

export const readinessMeta: Record<ReadinessState, Meta> = {
  Ready: { tone: "positive", shape: "circle" },
  Missing: { tone: "negative", shape: "triangle" },
  "Failed check": { tone: "negative", shape: "triangle" },
  "Expired / out of period": { tone: "caution", shape: "diamond" },
  "Low confidence": { tone: "neutral", shape: "ring" },
};
export const ReadinessPill = ({ state }: { state: ReadinessState }) => <StatusPill {...readinessMeta[state]} label={state} />;

export const checkMeta: Record<CheckResult, Meta> = {
  Pass: { tone: "positive", shape: "circle" },
  Warn: { tone: "caution", shape: "diamond" },
  Fail: { tone: "negative", shape: "triangle" },
};

// Tier badges (DESIGN 2.1): Tier 1 solid blue, Tier 2 pale blue, Tier 3 neutral.
const tierBadgeClass: Record<Tier, string> = {
  1: "bg-blue-600 text-white",
  2: "bg-blue-100 text-blue-600",
  3: "tone-neutral bg-[var(--t-bg)] text-[var(--t-fg)]",
};
export const TierBadge = ({ tier }: { tier: Tier }) => (
  <span className={`inline-flex min-h-7 items-center whitespace-nowrap rounded-full px-3 text-sm font-semibold ${tierBadgeClass[tier]}`}>Tier {tier}</span>
);

/** Big rank numeral in a 48px circle, coloured by tier. */
export const RankBadge = ({ rank, tier }: { rank: number; tier: Tier }) => (
  <span
    className={`num grid size-12 shrink-0 place-items-center rounded-full font-display text-xl font-bold ${tierBadgeClass[tier]}`}
    role="img" aria-label={`Rank ${rank}, Tier ${tier}`}
  >
    {rank}
  </span>
);

export const quadrantMeta: Record<Quadrant, Meta> = {
  "Act now": { tone: "info", shape: "triangle" },
  "Build resilience": { tone: "neutral", shape: "diamond" },
  "Reduce footprint": { tone: "neutral", shape: "square" },
  Monitor: { tone: "neutral", shape: "circle" },
  "Impact pending": { tone: "neutral", shape: "ring" },
};
export const QuadrantPill = ({ quadrant }: { quadrant: Quadrant }) => <StatusPill {...quadrantMeta[quadrant]} label={quadrant} />;

export const OffTrackChip = () => <StatusPill tone="negative" shape="triangle" label="Off-track" />;

// Reporting period status. A Locked period carries a lock icon (DESIGN 4.13).
export const periodMeta: Record<Period, Meta> = {
  Draft: { tone: "caution", shape: "diamond" },
  Submitted: { tone: "info", shape: "ring" },
  Verified: { tone: "positive", shape: "circle" },
  Locked: { tone: "neutral", shape: "square" },
};
export function PeriodPill({ period, label }: { period: Period; label?: string }) {
  const m = periodMeta[period];
  return (
    <span className={`tone-${m.tone} inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--t-bg)] px-2.5 text-sm font-semibold text-[var(--t-fg)]`}>
      {period === "Locked" ? <Lock className="size-3.5" aria-hidden="true" /> : <Shape kind={m.shape} />}
      {label ? `${label} · ${period}` : period}
    </span>
  );
}

export const LedgerPill = ({ status }: { status: "Validated" | "Audited" }) =>
  status === "Validated" ? <StatusPill tone="positive" shape="circle" label="Validated" /> : <StatusPill tone="info" shape="square" label="Audited" />;
