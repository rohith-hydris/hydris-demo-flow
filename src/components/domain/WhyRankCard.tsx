import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RANK_RANGE_NOTE, whyThisRank } from "@/src/lib/explain";
import { fmtPct1, fmtScore } from "@/src/lib/format";
import type { RankRange } from "@/src/lib/rank";
import { PILLAR_LABELS, PILLAR_KEYS } from "@/src/lib/risk";
import type { Site } from "@/src/lib/selectors";
import { QuadrantPill, RankBadge, StatusPill } from "@/src/components/ui";

/** The selected site: its plain-language reason, the pillars that drive its risk, and how stable its rank is. */
export default function WhyRankCard({ site, scopeSites, range, weightsChanged }: { site: Site; scopeSites: Site[]; range: RankRange; weightsChanged: boolean }) {
  const drivers = [...PILLAR_KEYS].sort((a, b) => site.pillars[b] - site.pillars[a]).slice(0, 2);
  return (
    <div className="card p-6" aria-live="polite">
      <div className="flex items-start gap-4">
        <RankBadge rank={site.rank} tier={site.tier} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-500">Why this rank</p>
          <h3>{site.name}</h3>
          <p className="text-ink-500">{site.supplierName}</p>
        </div>
      </div>

      <p className="mt-4 text-ink-900">{whyThisRank(site, scopeSites)}</p>
      {weightsChanged && <p className="mt-2 rounded-tile bg-blue-50 p-3 text-sm text-ink-700">The weights differ from the default, so this rank may differ from the default ranking.</p>}

      <dl className="mt-4 space-y-2.5 border-t border-line pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><dt className="text-ink-700">Quadrant</dt><dd><QuadrantPill quadrant={site.quadrant} /></dd></div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-ink-700">Top risk drivers</dt>
          <dd className="text-right text-ink-900">{drivers.map((k) => `${PILLAR_LABELS[k]} ${fmtScore(site.pillars[k])}`).join(", ")}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-ink-700">Rank range</dt>
          <dd className="flex items-center gap-2"><span className="num font-semibold text-ink-900">{range.low === range.high ? range.low : `${range.low} to ${range.high}`}</span>{range.unstable && <StatusPill tone="caution" shape="diamond" label="Rank unstable" />}</dd>
        </div>
        <div className="flex justify-between gap-2"><dt className="text-ink-700">Site PWI (counted)</dt><dd className="num font-semibold text-ink-900">{fmtPct1(site.pwi.sitePwi)} <span className="font-normal text-ink-500">· {fmtPct1(site.pwi.sitePwiCentral)} central</span></dd></div>
      </dl>
      <p className="mt-3 text-sm text-ink-500">{RANK_RANGE_NOTE}</p>

      <Link href={`/factories/${site.id}`} className="btn btn-secondary mt-4">Open factory <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
    </div>
  );
}
