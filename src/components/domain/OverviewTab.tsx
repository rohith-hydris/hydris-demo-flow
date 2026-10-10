"use client";

import { fmtDaysAgo, fmtPct1, fmtScore } from "@/src/lib/format";
import { BAND1_NOTE, LARGE_FOOTPRINT_NOTE, whyThisRank } from "@/src/lib/explain";
import { RISK_TOTAL, headlineRisks } from "@/src/lib/risk";
import type { Site } from "@/src/lib/selectors";
import { traceConfidence, traceFootprint, traceRisk, traceSitePwi, type Trace } from "@/src/lib/trace";
import { BandPill, CertPill, HealthPill, SeverityPill, StatusPill, ZdhcPill } from "@/src/components/ui";
import { MiniPwiGrid } from "./PwiGrid";
import { InfoButton } from "./Trace";

function StatTile({ label, value, context, trace, extra }: { label: string; value: string; context: string; trace: Trace; extra?: React.ReactNode }) {
  return (
    <li className="card flex flex-col p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink-500">{label}</span>
        <InfoButton trace={trace} />
      </div>
      <span className="kpi num mt-1 font-display text-kpi text-ink-900">{value}</span>
      {extra && <div className="mt-1">{extra}</div>}
      <span className="mt-auto pt-2 text-sm text-ink-500">{context}</span>
    </li>
  );
}

export default function OverviewTab({ site, scopeSites, onTab }: { site: Site; scopeSites: Site[]; onTab: (tab: string) => void }) {
  const { chips, more } = headlineRisks(site.risks);
  const change = site.tierChange;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="card p-6 lg:col-span-8">
          <h3>Why this rank</h3>
          <p className="mt-3 max-w-[75ch] text-lg text-ink-900">{whyThisRank(site, scopeSites)}</p>
          <p className="mt-3 text-ink-500">Rank shows priority for action, not performance. More benefit delivered never raises priority.</p>
        </div>
        <div className="panel p-4 lg:col-span-4">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4>Impact grid</h4>
              <button type="button" onClick={() => onTab("impact")} className="btn btn-tertiary text-sm">Open Impact</button>
            </div>
            <MiniPwiGrid site={site} />
          </div>
        </div>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Risk R" value={fmtScore(site.R)} trace={traceRisk(site)} extra={<BandPill band={site.band} />} context={BAND1_NOTE} />
        <StatTile
          label="Footprint I" value={site.footprintI === null ? "Pending" : fmtScore(site.footprintI)} trace={traceFootprint(site)}
          context={LARGE_FOOTPRINT_NOTE}
        />
        <StatTile label="Site PWI" value={fmtPct1(site.pwi.sitePwi)} trace={traceSitePwi(site)} extra={<CertPill band={site.pwi.certBand} />} context="Positive Water Impact" />
        <StatTile label="Confidence" value={fmtScore(site.pwi.confidence)} trace={traceConfidence(site)} context={`Evidence grade ${site.evidenceGrade}`} />
      </ul>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-6">
          <h3>Risks at this site</h3>
          <p className="mt-2 text-lg text-ink-900">
            <span className="num font-display text-numlg">{site.riskCounts.present}</span> present,{" "}
            <span className="num font-display text-numlg">{site.riskCounts.watch}</span> watch
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {chips.map((c) => <StatusPill key={c.code} tone="negative" shape="triangle" label={c.shortName} />)}
            {chips.length > 0 && more > 0 && <span className="text-sm font-semibold text-ink-500">+{more} more</span>}
            {chips.length === 0 && <span className="text-ink-500">No site-specific risks present</span>}
          </div>
          <button type="button" onClick={() => onTab("risk")} className="btn btn-secondary mt-4">See all {RISK_TOTAL} risks</button>
        </div>

        <div className="card p-6">
          <h3>Alerts, health and ZDHC tier</h3>
          <dl className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-ink-700">Plant health</dt>
              <dd className="flex items-center gap-2"><span className="num font-display text-[22px] font-semibold text-ink-900">{site.healthScore}</span><HealthPill health={site.health} /></dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-ink-700">ZDHC tier</dt>
              <dd><ZdhcPill tier={site.zdhcTier} /></dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-ink-700">Tier history</dt>
              <dd className="text-right text-ink-900">
                {change ? `${change.from} to ${change.to}, ${fmtDaysAgo(change.daysAgo)}` : "Stable"}
              </dd>
            </div>
            <div className="border-t border-line pt-3">
              <dt className="mb-1 text-ink-700">Highest open alert</dt>
              <dd>
                <SeverityPill severity={site.highestAlert} />
                {site.alertMessage && <p className="mt-1 text-ink-700">{site.alertMessage}</p>}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
