"use client";

import { useState } from "react";
import {
  Activity, Anchor, ArrowDownToLine, CalendarDays, ChevronDown, Droplets, Gauge, GlassWater, Leaf, Recycle, ShieldAlert, ShowerHead, Sun, TrendingDown, Waves,
  type LucideIcon,
} from "lucide-react";
import { fmtScore } from "@/src/lib/format";
import { COUNTRY_LEVEL_NOTE, VINTAGE_NOTE, explainRisk } from "@/src/lib/riskCopy";
import { DEFAULT_WEIGHTS, PILLAR_KEYS, PILLAR_LABELS, PRESENT_AT, RISK_COUNTED, WATCH_AT, type RiskResult } from "@/src/lib/risk";
import type { Site } from "@/src/lib/selectors";
import { traceRisk } from "@/src/lib/trace";
import type { RiskCategory, RiskCode } from "@/src/lib/types";
import { RiskPill, ScoreBar, StatusPill } from "@/src/components/ui";
import { InfoButton } from "./Trace";

const ICONS: Record<RiskCode, LucideIcon> = {
  bws: Droplets, bwd: TrendingDown, iav: Activity, sev: CalendarDays, gtd: ArrowDownToLine, drr: Sun, rfr: Waves,
  cfr: Anchor, ucw: Recycle, cep: Leaf, udw: GlassWater, usa: ShowerHead, rri: ShieldAlert, tex: Gauge,
};

// Group order from PRODUCT 4.4.
const GROUPS: RiskCategory[] = ["Physical quantity", "Physical quality", "Downstream", "Regulatory and reputational", "Composite"];

function RiskCard({ risk, site }: { risk: RiskResult; site: Site }) {
  const [open, setOpen] = useState(false);
  const e = explainRisk(risk, site);
  const Icon = ICONS[risk.code];
  return (
    <li className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-tile bg-blue-100 text-blue-600"><Icon className="size-5" aria-hidden="true" /></span>
          <h4 className="pt-1">{risk.name}</h4>
        </div>
        <RiskPill status={risk.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {risk.countryLevel && <StatusPill tone="neutral" shape="ring" label="Country-level" />}
        {risk.excludedFromCounts && <StatusPill tone="neutral" shape="ring" label="Shown separately" />}
        {risk.compositeLabel && <StatusPill tone="negative" shape="triangle" label={risk.compositeLabel} />}
      </div>

      <div className="mt-3">
        <p className="num font-display text-numlg text-ink-900">{fmtScore(risk.score)} <span className="text-base font-normal text-ink-500">/ 5</span></p>
        <ScoreBar
          className="mt-2" value={risk.score / 5} tick={[WATCH_AT / 5, PRESENT_AT / 5]} label={`${risk.name} score`}
          valueText={`${fmtScore(risk.score)} out of 5. Watch starts at ${fmtScore(WATCH_AT)} and Present at ${fmtScore(PRESENT_AT)}.`}
        />
        {risk.rawValue && <p className="mt-2 text-sm text-ink-500">Raw value <span className="num font-semibold text-ink-700">{risk.rawValue}</span></p>}
      </div>

      <p className="mt-3 text-ink-700">{e.headline}</p>

      <button
        type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="mt-3 inline-flex min-h-11 items-center gap-1 self-start font-semibold text-blue-600 hover:underline"
      >
        Why this status <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="space-y-2 border-t border-line pt-3 text-ink-700">
          <p><span className="font-semibold text-ink-900">What it measures. </span>{e.meaning}</p>
          <p><span className="font-semibold text-ink-900">Reason. </span>{e.reason}</p>
          <p><span className="font-semibold text-ink-900">Where it sits. </span>{e.threshold}</p>
          <p><span className="font-semibold text-ink-900">What would change it. </span>{e.whatWouldChange}</p>
          {e.outlook && <p><span className="font-semibold text-ink-900">Outlook. </span>{e.outlook}</p>}
          <p className="text-sm text-ink-500">Data: {e.vintage}.{e.caveats.length > 0 && ` ${e.caveats.join(" ")}`}</p>
        </div>
      )}
    </li>
  );
}

export default function RiskTab({ site }: { site: Site }) {
  const { present, watch, notPresent } = site.riskCounts;
  return (
    <div className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="card p-6 lg:col-span-7">
          <div className="flex items-center gap-2">
            <h3>How the risk score R is built</h3>
            <InfoButton trace={traceRisk(site)} />
          </div>
          <p className="mt-1 text-ink-500">Each pillar is its worst indicator on the 0 to 5 scale, divided by 5. R adds the pillars by weight.</p>
          <ul className="mt-4 space-y-3">
            {PILLAR_KEYS.map((k) => (
              <li key={k} className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
                <span className="font-semibold text-ink-700">{PILLAR_LABELS[k]}</span>
                <ScoreBar value={site.pillars[k]} label={`${PILLAR_LABELS[k]} pillar`} valueText={fmtScore(site.pillars[k])} />
                <span className="num text-right text-ink-700">{fmtScore(site.pillars[k])} <span className="text-ink-500">× {fmtScore(DEFAULT_WEIGHTS[k])}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-baseline gap-2 border-t border-line pt-3 text-ink-700">
            R <span className="num font-display text-numlg text-ink-900">{fmtScore(site.R)}</span> Band {site.band}
          </p>
        </div>

        <div className="card p-6 lg:col-span-5">
          <h3>Risks at this site</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            {[{ n: present, label: "Present", tone: "negative" }, { n: watch, label: "Watch", tone: "caution" }, { n: notPresent, label: "Not present", tone: "positive" }].map((s) => (
              <div key={s.label} className={`tone-${s.tone} min-w-24 rounded-tile border border-[var(--t-line)] bg-[var(--t-bg)] px-4 py-2 text-[var(--t-fg)]`}>
                <p className="num font-display text-numlg">{s.n}</p>
                <p className="text-sm font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-500">Counted over {RISK_COUNTED} risks. Coastal eutrophication is shown separately and left out.</p>
          <p className="mt-2 text-sm text-ink-500">{VINTAGE_NOTE}</p>
          <p className="mt-2 text-sm text-ink-500">{COUNTRY_LEVEL_NOTE}</p>
        </div>
      </div>

      {GROUPS.map((group) => {
        const list = site.risks.filter((r) => r.category === group);
        if (list.length === 0) return null;
        return (
          <section key={group} aria-labelledby={`risk-group-${group}`}>
            <h2 id={`risk-group-${group}`} className="mb-4 text-[22px] leading-[30px]">{group}</h2>
            <ul className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
              {list.map((r) => <RiskCard key={r.code} risk={r} site={site} />)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
