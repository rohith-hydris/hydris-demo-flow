import { CheckCircle2, Circle, CircleDashed, XCircle, HelpCircle } from "lucide-react";
import { GATE_LABELS, type Gates } from "@/src/data/opportunities";
import { LINEAGE_STEPS } from "@/src/lib/catalogue";
import { DEMO_ESTIMATE_TAG, type LineageState } from "@/src/lib/projectsView";
import { StatusPill } from "@/src/components/ui";
import { ValueStatePill } from "./ImpactPanels";

/** Every forecast figure carries both tags: it is a Forecast, and it is a demo estimate (V2 0 and 12). */
export const ForecastTags = () => (
  <span className="inline-flex flex-wrap items-center gap-2">
    <ValueStatePill state="Forecast" />
    <StatusPill tone="caution" shape="diamond" label={DEMO_ESTIMATE_TAG} />
  </span>
);

const LINEAGE_ICON = { done: CheckCircle2, next: Circle, pending: CircleDashed } as const;

/** Lite finding, Opportunity, Scenario, Business case, Delivery, Measured result. A navigation aid, not a wizard. */
export function LineageStrip({ states }: { states: LineageState[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Lineage">
      {LINEAGE_STEPS.map((step, i) => {
        const Icon = LINEAGE_ICON[states[i]];
        const text = states[i] === "done" ? "Done" : states[i] === "next" ? "Next" : "Not yet";
        return (
          <li key={step} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${states[i] === "done" ? "border-[var(--positive-line)] bg-[var(--positive-bg)] text-[var(--positive-fg)]" : states[i] === "next" ? "border-panel-line bg-blue-50 text-blue-600" : "border-line bg-card text-ink-500"}`}>
            <Icon className="size-4" aria-hidden="true" />
            {step}
            <span className="sr-only">: {text}</span>
          </li>
        );
      })}
    </ol>
  );
}

const GATE_ICON = { Pass: CheckCircle2, Fail: XCircle, Unknown: HelpCircle } as const;
const GATE_COLOUR = { Pass: "text-[var(--positive-fg)]", Fail: "text-[var(--negative-fg)]", Unknown: "text-[var(--caution-fg)]" } as const;

/** The six mandatory gates, with a word as well as an icon for each result. */
export function GateList({ gates }: { gates: Gates }) {
  return (
    <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2" aria-label="Mandatory eligibility gates">
      {(Object.keys(gates) as (keyof Gates)[]).map((k) => {
        const Icon = GATE_ICON[gates[k]];
        return (
          <li key={k} className={`flex items-start gap-2 text-[15px] ${GATE_COLOUR[gates[k]]}`}>
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span><span className="font-semibold">{gates[k]}</span> <span className="text-ink-700">{GATE_LABELS[k]}</span></span>
          </li>
        );
      })}
    </ul>
  );
}
