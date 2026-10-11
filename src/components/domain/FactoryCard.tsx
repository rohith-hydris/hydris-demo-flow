import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BAND1_NOTE, LARGE_FOOTPRINT_NOTE } from "@/src/lib/explain";
import { fmtScore, fmtPct1 } from "@/src/lib/format";
import { I_LARGE, R_BAND1 } from "@/src/lib/rank";
import { headlineRisks } from "@/src/lib/risk";
import type { Site } from "@/src/lib/selectors";
import { PILLARS } from "@/src/lib/pwi";
import {
  BandPill, StatusBandField, HealthPill, OffTrackChip, QuadrantPill, RankBadge, ScoreBar, SeverityPill, StatusPill, TierBadge, ZdhcPill, bandMeta,
} from "@/src/components/ui";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-ink-500">{title}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const bigNumber = "num font-display text-numlg text-ink-900";

/** One factory, ranked: risk, footprint, PWI with its three pillars, and operations (DESIGN 5.3). The whole card is one link. */
export default function FactoryCard({ site }: { site: Site }) {
  const { chips, more } = headlineRisks(site.risks);
  const tone = bandMeta[site.band].tone;
  return (
    <li>
      <Link href={`/factories/${site.id}`} className="card card-link block p-6">
        <div className="flex items-start gap-4">
          <RankBadge rank={site.rank} tier={site.tier} />
          <div className="min-w-0 flex-1">
            <h3>{site.name}</h3>
            <p className="text-ink-500">{site.district}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TierBadge tier={site.tier} />
              <QuadrantPill quadrant={site.quadrant} />
              {site.offTrack && <OffTrackChip />}
            </div>
          </div>
          <ChevronRight className="mt-3 size-6 shrink-0 text-ink-300" aria-hidden="true" />
        </div>

        <div className="mt-6 grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1.4fr_1.2fr]">
          <Block title="Risk (R)">
            <div className="flex items-baseline gap-3">
              <span className={bigNumber}>{fmtScore(site.R)}</span>
              <BandPill band={site.band} />
            </div>
            <ScoreBar className="mt-2" value={site.R} tick={R_BAND1} tone={tone} label="Risk R" valueText={`${fmtScore(site.R)} of 1, ${BAND1_NOTE}`} />
            <p className="mt-2 text-sm text-ink-500">{plural(site.riskCounts.present, "risk", "risks")} present, {site.riskCounts.watch} watch</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {chips.map((c) => <StatusPill key={c.code} tone="negative" shape="triangle" label={c.shortName} />)}
              {chips.length > 0 && more > 0 && <span className="text-sm font-semibold text-ink-500">+{more} more</span>}
              {chips.length === 0 && <span className="text-sm text-ink-500">No site-specific risks present</span>}
            </div>
          </Block>

          <Block title="Footprint (I)">
            {site.footprintI === null ? (
              <p className="font-semibold text-ink-900">Impact pending</p>
            ) : (
              <>
                <span className={bigNumber}>{fmtScore(site.footprintI)}</span>
                <ScoreBar className="mt-2" value={site.footprintI} tick={I_LARGE} label="Footprint I" valueText={`${fmtScore(site.footprintI)} of 1, ${LARGE_FOOTPRINT_NOTE.toLowerCase()}`} />
              </>
            )}
            <p className="mt-2 text-sm text-ink-500">Water footprint of the site</p>
          </Block>

          <Block title="Positive Water Impact (PWI)">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={bigNumber}>{fmtPct1(site.pwi.sitePwi)}</span>
            </div>
            <div className="mt-2"><StatusBandField band={site.pwi.statusBand} /></div>
            <ScoreBar className="mt-2" value={site.pwi.sitePwi} label="Site PWI" valueText={fmtPct1(site.pwi.sitePwi)} />
            <p className="mt-2 text-sm text-ink-500">Confidence {fmtScore(site.pwi.confidence)}</p>
            <ul className="mt-2 space-y-1.5">
              {PILLARS.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm">
                  <span className="w-6 font-semibold text-ink-700">{p}</span>
                  <ScoreBar className="flex-1" value={site.pwi.pillars[p]} label={`Pillar ${p}`} valueText={fmtScore(site.pwi.pillars[p])} />
                  <span className="num w-10 text-right text-ink-700">{fmtScore(site.pwi.pillars[p])}</span>
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Operations">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={bigNumber}>{site.healthScore}</span>
              <HealthPill health={site.health} />
            </div>
            <div className="mt-2"><ZdhcPill tier={site.zdhcTier} /></div>
            <div className="mt-2 flex flex-col gap-1">
              <SeverityPill severity={site.highestAlert} />
              {site.alertMessage && <p className="line-clamp-2 text-sm text-ink-500">{site.alertMessage}</p>}
            </div>
          </Block>
        </div>
      </Link>
    </li>
  );
}
