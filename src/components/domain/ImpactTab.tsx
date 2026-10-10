"use client";

import { useState } from "react";
import { additionalityGate, projectBenefit } from "@/src/lib/claims";
import { fmtInt, fmtPct1, fmtScore, fmtScore3 } from "@/src/lib/format";
import { GUIDE_CORRECTIONS, METHOD_VERSION, guideDetail, ledgerFor, priorMonthSitePwi, sitePwiChange, waterBalance } from "@/src/lib/impact";
import { fmtClaim } from "@/src/lib/measure";
import type { Site } from "@/src/lib/selectors";
import { cellLabel, traceConfidence, traceSitePwi, traceVolumetric } from "@/src/lib/trace";
import { CertPill, EmptyState, Segmented, StatusPill } from "@/src/components/ui";
import LedgerTimeline from "./LedgerTimeline";
import PwiGrid from "./PwiGrid";
import { InfoButton } from "./Trace";

type Method = "pwi-m" | "guide";

function GradeRule() {
  return (
    <ul className="mt-2 space-y-1 text-ink-700">
      <li><strong>Grades A and B</strong> count the central value.</li>
      <li><strong>Grade C</strong> counts the lower bound.</li>
      <li><strong>Grade D</strong> is shown but scores zero.</li>
      <li>The low value always sits beside the claimed value.</li>
    </ul>
  );
}

export default function ImpactTab({ site }: { site: Site }) {
  const [method, setMethod] = useState<Method>("pwi-m");
  const pwi = site.pwi;
  const guide = pwi.guide;
  const detail = guideDetail(site.id);
  const guideOn = method === "guide" && guide !== null;
  const shown = guideOn ? guide.sitePwi : pwi.sitePwi;

  const wb = waterBalance(site.id);
  const ledger = ledgerFor(site.id);
  const prior = priorMonthSitePwi(site.id);
  const gate = additionalityGate(site.id);
  const gaps = pwi.cells.filter((c) => c.gap !== null);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="panel p-4 lg:col-span-8">
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3>Positive Water Impact grid</h3>
              <p className="text-ink-500">Score from 0 to 1 against the target. Evidence grade A to D at the top right of each cell.</p>
            </div>
            <PwiGrid site={site} guideMode={guideOn} />
          </div>
        </div>

        <div className="card p-6 lg:col-span-4">
          <div className="flex items-center gap-2">
            <h3>Site PWI</h3>
            <InfoButton trace={traceSitePwi(site)} />
          </div>
          <p className="kpi num mt-2 font-display text-kpi text-ink-900" aria-live="polite">{fmtPct1(shown)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CertPill band={pwi.certBand} />
            <span className="flex items-center gap-1 text-ink-700">Confidence {fmtScore(pwi.confidence)} <InfoButton trace={traceConfidence(site)} /></span>
          </div>
          {!guideOn && (
            <p className="mt-2 text-sm text-ink-500">Low value after the evidence grade rule: <span className="num font-semibold text-ink-700">{fmtPct1(pwi.sitePwiLow)}</span></p>
          )}
          {prior !== null && (
            <p className="mt-1 text-sm text-ink-500">
              Prior month <span className="num font-semibold text-ink-700">{fmtPct1(prior)}</span>
              {` (${sitePwiChange(pwi.sitePwi, prior).direction} ${sitePwiChange(pwi.sitePwi, prior).points} points)`}
            </p>
          )}

          {guide && (
            <div className="mt-5 border-t border-line pt-4">
              <Segmented
                label="PWI method" value={method} onChange={setMethod}
                options={[{ value: "pwi-m", label: `${METHOD_VERSION}` }, { value: "guide", label: "Guide-compatible" }]}
              />
              <p className="mt-2 text-sm text-ink-700">
                {METHOD_VERSION} <span className="num font-semibold">{fmtPct1(pwi.sitePwi)}</span> · Guide-compatible <span className="num font-semibold">{fmtPct1(guide.sitePwi)}</span>
              </p>
              <p className="mt-1 text-sm text-ink-500">
                {METHOD_VERSION} corrects {GUIDE_CORRECTIONS} issues found in the source formulas; the Guide-compatible figure is shown for comparison.
              </p>
              {guideOn && detail && (
                <p className="mt-2 rounded-tile bg-blue-50 p-3 text-sm text-ink-700">
                  The Guide scores P1 Quality as 1.00 because {fmtInt(detail.removedKg)} of {fmtInt(detail.totalKg)} kg removed is {fmtPct1(detail.massShare)} in total.
                  That hides {detail.weakest.pollutant} removal of {detail.weakest.removalPct}%. P1 becomes {fmtScore3(guide.p1)}.
                </p>
              )}
            </div>
          )}

          <div className="mt-5 rounded-tile border border-line bg-blue-50 p-4">
            <div className="flex items-center gap-1">
              <p className="font-semibold text-ink-700">Volumetric balance</p>
              <InfoButton trace={traceVolumetric(site)} />
            </div>
            <p className="num font-display text-numlg text-ink-900">{fmtPct1(pwi.volumetricBalance)}</p>
            <p className="text-sm text-ink-500">Water returned against water needed. Over 100% means more returned than consumed. Shown apart from PWI.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="card p-6 lg:col-span-7">
          <h3>What is needed to close the gaps</h3>
          {gaps.length === 0 ? (
            <p className="mt-3 text-ink-700">Every cell is at 1.00.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {gaps.map((c) => (
                <li key={`${c.pillar}${c.dimension}`} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-semibold text-ink-900">{cellLabel(c.pillar, c.dimension)}</p>
                  <p className="text-ink-700">{c.gap}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6 lg:col-span-5">
          <h3>Water balance</h3>
          {wb ? (
            <>
              <dl className="mt-4 space-y-2">
                <div className="flex justify-between gap-3"><dt className="text-ink-700">Freshwater withdrawal</dt><dd className="num font-semibold text-ink-900">{fmtInt(wb.withdrawalM3)} m{"³"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-700">Compliant same-basin discharge</dt><dd className="num font-semibold text-ink-900">{fmtInt(wb.basinDischargeM3)} m{"³"}</dd></div>
                <div className="flex justify-between gap-3 border-t border-line pt-2"><dt className="font-semibold text-ink-900">Replenishment needed (RN)</dt><dd className="num font-semibold text-ink-900">{fmtInt(wb.replenishmentNeededM3)} m{"³"}</dd></div>
              </dl>
              <p className="mt-2 text-sm text-ink-500">RN is the water the site must give back.</p>
              <p className="mt-4 text-sm font-semibold text-ink-700">Withdrawal by source</p>
              <ul className="mt-1 space-y-1 text-sm text-ink-700">
                {wb.bySource.map((s) => <li key={s.label} className="flex justify-between gap-3"><span>{s.label}</span><span className="num">{fmtInt(s.m3)} m{"³"}</span></li>)}
              </ul>
            </>
          ) : (
            <>
              <p className="num mt-4 font-display text-numlg text-ink-900">{fmtInt(site.replenishmentNeededM3)} m{"³"}</p>
              <p className="text-ink-700">Replenishment needed (RN): the water the site must give back.</p>
              <p className="mt-2 text-sm text-ink-500">Freshwater withdrawal and discharge are not part of the demo data for this site.</p>
            </>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3>Additionality Gate</h3>
        <p className="mt-1 text-ink-500">Only additional benefits count. Anything excluded shows its reason.</p>
        {gate.counted.length + gate.excluded.length === 0 ? (
          <p className="mt-4 text-ink-700">No sub-basin or basin projects are registered, so nothing is counted yet.</p>
        ) : (
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <h4>Counted</h4>
              <ul className="mt-2 divide-y divide-line">
                {gate.counted.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="text-ink-700">{p.name}</span>
                    <span className="num font-semibold text-ink-900">{fmtClaim(projectBenefit(p).attributed)}</span>
                  </li>
                ))}
                {gate.counted.length === 0 && <li className="py-2.5 text-ink-500">Nothing counted.</li>}
              </ul>
            </div>
            <div>
              <h4>Excluded</h4>
              <ul className="mt-2 divide-y divide-line">
                {gate.excluded.map((e) => (
                  <li key={e.project.id} className="py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-ink-700">{e.project.name}</span>
                      <StatusPill tone="neutral" shape="ring" label={e.reason} />
                    </div>
                    <p className="text-sm text-ink-500">{fmtClaim(e.project.claim)} claimed. {e.project.note}</p>
                  </li>
                ))}
                {gate.excluded.length === 0 && <li className="py-2.5 text-ink-500">Nothing excluded.</li>}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="card p-6 lg:col-span-5">
          <h3>Confidence and certification</h3>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="num font-display text-numlg text-ink-900">{fmtScore(pwi.confidence)}</span>
            <CertPill band={pwi.certBand} />
          </div>
          <p className="mt-3 font-semibold text-ink-700">Evidence grade rule</p>
          <GradeRule />
          <p className="mt-3 rounded-tile bg-blue-50 p-3 text-ink-700">Self-certified is internal. Net Positive claims need external assurance.</p>
        </div>

        <div className="card p-6 lg:col-span-7">
          <h3>Impact Ledger</h3>
          {ledger.length === 0 ? (
            <div className="mt-4"><EmptyState title="No ledger entries yet" text="The Impact Ledger holds entries for sites with a locked baseline. None is held for this site in the demo." /></div>
          ) : (
            <div className="mt-5"><LedgerTimeline entries={ledger} /></div>
          )}
        </div>
      </div>
    </div>
  );
}
