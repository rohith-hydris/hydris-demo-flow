import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { fmtPct1, fmtScore } from "@/src/lib/format";
import { healthBand } from "@/src/lib/ops";
import { bandOf } from "@/src/lib/rank";
import type { SupplierView } from "@/src/lib/selectors";
import type { ZdhcTier } from "@/src/lib/types";
import { BandPill, HealthPill, OffTrackChip, ScoreBar, SeverityPill, StackedBar, bandMeta, tierMeta, toSegments } from "@/src/components/ui";

const TIERS: ZdhcTier[] = ["Aspirational", "Progressive", "Foundational", "Not conformant"];

function Cell({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-sm text-ink-500">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const big = "num font-display text-numlg text-ink-900";

/** One supplier as a wide white band inside the pale blue panel (DESIGN 5.2). Click anywhere to open it. */
export default function SupplierRow({ supplier: s }: { supplier: SupplierView }) {
  const r = s.rollup;
  const band = bandOf(r.avgR);
  const avgHealth = Math.round(r.avgHealth);
  const claims = s.claimsAwaitingValidation;
  return (
    <li>
      <Link href={`/suppliers/${s.id}`} className="card card-link block p-5 lg:px-6">
        <div className="grid grid-cols-2 items-center gap-x-6 gap-y-5 lg:grid-cols-[1.8fr_1.6fr_1.9fr_1.8fr_1.6fr_auto]">
          <div className="col-span-2 min-w-0 lg:col-span-1">
            <h3>{s.name}</h3>
            <p className="text-ink-500">{s.cluster} · {s.sites.length} factories</p>
            {s.offTrack && <div className="mt-2"><OffTrackChip /></div>}
          </div>

          <Cell title="Average risk (R)">
            <div className="flex items-baseline gap-2">
              <span className={big}>{fmtScore(r.avgR)}</span>
              <BandPill band={band} compact />
            </div>
            <ScoreBar className="mt-2" value={r.avgR} tick={0.6} tone={bandMeta[band].tone} label="Average risk R" valueText={fmtScore(r.avgR)} />
          </Cell>

          <Cell title="PWI">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <span><span className="num block font-display text-[22px] font-semibold leading-7 text-ink-900">{fmtPct1(r.pwiUnweighted)}</span><span className="text-sm text-ink-500">Unweighted</span></span>
              <span><span className="num block font-display text-[22px] font-semibold leading-7 text-ink-900">{fmtPct1(r.pwiRnWeighted)}</span><span className="text-sm text-ink-500">RN-weighted</span></span>
            </div>
          </Cell>

          <Cell title="Plant health and ZDHC tier" className="col-span-2 lg:col-span-1">
            <div className="flex items-baseline gap-2">
              <span className={big}>{avgHealth}</span>
              <HealthPill health={healthBand(r.avgHealth)} />
            </div>
            <StackedBar
              className="mt-2" size="sm" legend="compact" ariaLabel="ZDHC tier mix"
              segments={toSegments(TIERS.map((t) => ({ label: t, count: s.tierMix[t], ...tierMeta[t] })))}
            />
          </Cell>

          <Cell title="Alerts and claims">
            <div className="flex flex-wrap items-center gap-2">
              {s.openAlerts > 0 ? <><span className="font-semibold text-ink-900">{s.openAlerts} open</span><SeverityPill severity={s.highestAlert} /></> : <span className="text-ink-500">No open alerts</span>}
            </div>
            <p className="mt-1.5 text-sm text-ink-500">{claims > 0 ? `${claims} ${claims === 1 ? "claim" : "claims"} to validate` : "No claims waiting"}</p>
          </Cell>

          <ChevronRight className="hidden size-6 text-ink-300 lg:block" aria-hidden="true" />
        </div>
      </Link>
    </li>
  );
}
