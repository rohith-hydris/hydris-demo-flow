import { STATE_FIELDS } from "@/src/lib/states";
import type { ReviewStates } from "@/src/lib/types";
import { StatusPill, type ShapeKind, type Tone } from "./StatusPill";

// V2 2: the five review states as five small labelled pills. The single status badge is a summary computed from these.
type Meta = { tone: Tone; shape: ShapeKind };
const META: { [K in keyof ReviewStates]: Record<ReviewStates[K], Meta> } = {
  evidenceAcceptance: { Accepted: { tone: "positive", shape: "circle" }, "Accepted with warning": { tone: "caution", shape: "diamond" }, Pending: { tone: "neutral", shape: "ring" }, Rejected: { tone: "negative", shape: "triangle" } },
  calculationValidity: { Valid: { tone: "positive", shape: "circle" }, "Needs recalculation": { tone: "caution", shape: "diamond" }, Blocked: { tone: "negative", shape: "triangle" } },
  benefitState: { Validated: { tone: "positive", shape: "circle" }, Measured: { tone: "info", shape: "square" }, Forecast: { tone: "neutral", shape: "dash" }, "Not validated": { tone: "neutral", shape: "ring" } },
  claimEligibility: { Eligible: { tone: "positive", shape: "circle" }, "Under review": { tone: "caution", shape: "diamond" }, "Not eligible": { tone: "neutral", shape: "ring" }, "Allocation conflict": { tone: "negative", shape: "triangle" } },
  reportRelease: { "Released (snapshot)": { tone: "info", shape: "square" }, Draft: { tone: "caution", shape: "diamond" }, "Not included": { tone: "neutral", shape: "ring" } },
};

export const stateMeta = <K extends keyof ReviewStates>(key: K, value: ReviewStates[K]): Meta => (META[key] as Record<string, Meta>)[value];

/**
 * Pass all five fields for a project, or only the ones that apply (a report or inspection has just evidence acceptance).
 * The rest show as "n/a", so the strip always has the same five places.
 */
export function StateStrip({ states, className = "" }: { states: Partial<ReviewStates>; className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label="Review states">
      {STATE_FIELDS.map((f) => {
        const v = states[f.key];
        return (
          <li key={f.key}>
            {v ? (
              <StatusPill {...stateMeta(f.key, v as never)} label={`${f.label}: ${v}`} className="!min-h-6 !text-[13px]" />
            ) : (
              <span className="inline-flex min-h-6 items-center rounded-full border border-dashed border-[var(--neutral-line)] px-2.5 text-[13px] text-ink-500">{f.label}: n/a</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
