import { removals } from "@/src/data/cells";
import { f12Example } from "@/src/data/f12Example";
import { flowGuardExample } from "@/src/data/f12Balance";
import { loadReduction, qualityAccounting } from "@/src/lib/boundary";
import { fmtCellScore, fmtInt } from "@/src/lib/format";
import { POLLUTANT_LABEL } from "@/src/lib/impactView";
import type { Site } from "@/src/lib/selectors";
import { ProposedBadge, StatusPill } from "@/src/components/ui";

/** V2 8: three separate figures per pollutant, matched inlet and outlet flows. The spill-over row is shown, never counted. */
export default function QualityAccountingPanel({ site }: { site: Site }) {
  const rem = removals.find((r) => r.factoryId === site.id);
  const cols = rem ? qualityAccounting(site.id, { tss: rem.tss, tn: rem.tn, tp: rem.tp }) : null;
  if (!cols) return null;

  const p2 = site.pwi.cells.find((c) => c.pillar === "P2" && c.dimension === "Quality");
  const g = flowGuardExample;
  const ok = loadReduction({ mgPerL: g.inletMgPerL, flowM3: g.inletFlowM3 }, { mgPerL: g.outletMgPerL, flowM3: g.outletFlowM3 });
  const bad = loadReduction({ mgPerL: g.inletMgPerL, flowM3: g.inletFlowM3 }, { mgPerL: g.outletMgPerL, flowM3: g.mismatchedOutletFlowM3 });
  const th = "px-3 py-3 text-sm font-semibold text-ink-700 bg-blue-50";

  return (
    <div className="card p-6">
      <h3>Quality accounting</h3>
      <p className="mt-1 max-w-3xl text-ink-500">
        Three different things, kept apart for each pollutant, using matched inlet and outlet flows (ETP flow {fmtInt(f12Example.etpFlowM3)} m{"³"} per year). Pollutants are never summed across kg.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-[15px]">
          <caption className="sr-only">Quality accounting per pollutant</caption>
          <thead>
            <tr>
              <th scope="col" className={`${th} rounded-l-tile`}>Kilograms per year</th>
              {cols.map((c, i) => <th key={c.pollutant} scope="col" className={`${th} text-right ${i === cols.length - 1 ? "rounded-r-tile" : ""}`}>{POLLUTANT_LABEL[c.pollutant]}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="border-b border-line px-3 py-3 text-left font-normal text-ink-700">Baseline influent load</th>
              {cols.map((c) => <td key={c.pollutant} className="num border-b border-line px-3 py-3 text-right">{fmtInt(c.baselineLoadKg)}</td>)}
            </tr>
            <tr>
              <th scope="row" className="border-b border-line px-3 py-3 text-left font-semibold text-ink-900">Total treatment removal at the plant</th>
              {cols.map((c) => <td key={c.pollutant} className="num border-b border-line px-3 py-3 text-right font-semibold">{fmtInt(c.totalRemovalKg)} <span className="font-normal text-ink-500">({c.removalPct}%)</span></td>)}
            </tr>
            <tr>
              <th scope="row" className="border-b border-line px-3 py-3 text-left font-semibold text-ink-900">Incremental project benefit against the counterfactual (PRJ-106)</th>
              {cols.map((c) => <td key={c.pollutant} className="num border-b border-line px-3 py-3 text-right font-semibold">{fmtInt(c.incrementalKg)}</td>)}
            </tr>
            <tr>
              <th scope="row" className="border-b border-line px-3 py-3 text-left font-semibold text-ink-900">Eligible pillar contribution counted today (P2)</th>
              {cols.map((c) => <td key={c.pollutant} className="num border-b border-line px-3 py-3 text-right font-semibold">{fmtInt(c.eligibleP2Kg)}</td>)}
            </tr>
            <tr className="bg-[var(--neutral-bg)]">
              <th scope="row" className="px-3 py-3 text-left font-normal text-ink-700">
                Proposed automatic spill-over above 90% into P2
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusPill tone="neutral" shape="ring" label="Not counted" />
                  <ProposedBadge label="Decision pending: eligibility of on-site removal in P2/P3 (V2 P08 C02)" />
                </span>
              </th>
              {cols.map((c) => <td key={c.pollutant} className="num px-3 py-3 text-right text-ink-500">{fmtInt(c.spilloverKg)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-ink-700">
        The counted P2 Quality score stays <span className="num font-semibold">{p2 ? fmtCellScore(p2.score) : "n/a"}</span>. It is project-based, so the spill-over row does not change it.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-tile border border-line p-4">
          <p className="font-semibold text-ink-900">A lower concentration alone does not prove a load reduction when flows differ.</p>
          <ul className="mt-2 space-y-2 text-sm text-ink-700">
            <li className="flex flex-wrap items-center gap-2">
              <StatusPill tone="positive" shape="circle" label={ok.message} />
              <span className="num">Inlet {g.inletMgPerL} mg/L at {fmtInt(g.inletFlowM3)} m{"³"}, outlet {g.outletMgPerL} mg/L at {fmtInt(g.outletFlowM3)} m{"³"}: {fmtInt(ok.kg ?? 0)} kg removed.</span>
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <StatusPill tone="negative" shape="triangle" label={bad.message} />
              <span className="num">Same concentrations, outlet flow {fmtInt(g.mismatchedOutletFlowM3)} m{"³"}: not accepted.</span>
            </li>
          </ul>
        </div>
        <p className="rounded-tile bg-blue-50 p-4 text-ink-700">Cleaner water or reuse does not by itself create new access beneficiaries.</p>
      </div>
    </div>
  );
}
