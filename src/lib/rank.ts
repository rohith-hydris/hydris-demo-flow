import { seededRandom, RANK_RANGE_SEED } from "./rng";
import { DEFAULT_WEIGHTS, PILLAR_KEYS, normaliseWeights, riskR, type Pillars, type Weights } from "./risk";
import type { Band, FactoryId, PillarKey, Quadrant, Tier } from "./types";

// PRODUCT 6.8 (ranking) and 4.5 (rank range). Rank shows priority for action, never performance.

const EPS = 1e-9;

export const R_BAND1 = 0.6;
export const R_BAND2 = 0.4;
export const I_LARGE = 0.5;

export const bandOf = (R: number): Band => (R >= R_BAND1 - EPS ? 1 : R >= R_BAND2 - EPS ? 2 : 3);

/** Lines at R = 0.6 and I = 0.5. A site without an I score is "Impact pending". */
export function quadrantOf(R: number, I: number | null): Quadrant {
  if (I === null) return "Impact pending";
  const highRisk = R >= R_BAND1 - EPS;
  const largeFootprint = I >= I_LARGE - EPS;
  if (highRisk) return largeFootprint ? "Act now" : "Build resilience";
  return largeFootprint ? "Reduce footprint" : "Monitor";
}

/** Top 10% of sites, rounded up, are Tier 1; the next 20%, rounded up, are Tier 2; the rest Tier 3. Integer maths. */
export function tierOf(rank: number, count: number): Tier {
  const tier1 = Math.ceil((count * 10) / 100);
  const tier2 = Math.ceil((count * 20) / 100);
  return rank <= tier1 ? 1 : rank <= tier1 + tier2 ? 2 : 3;
}

export interface RankInput {
  id: FactoryId; pillars: Pillars; footprintI: number | null; presentCount: number; bwsRise: number;
  /** Pillars with no usable indicator: they drop out of R and the weights renormalise (V2 4.2). */
  missingPillars?: PillarKey[];
}
export interface RankedSite {
  id: FactoryId; R: number; footprintI: number | null; band: Band; quadrant: Quadrant; rank: number; tier: Tier;
}

type Scored = RankInput & { R: number; band: Band };

/** Band first, then I (largest first); ties by higher R, then more Present site-specific risks (rankPresentCount: not cep, tex, ucw or rri), then the larger 2050 rise. */
function compare(a: Scored, b: Scored): number {
  if (a.band !== b.band) return a.band - b.band;
  // A site without I ranks last in its band.
  if ((a.footprintI === null) !== (b.footprintI === null)) return a.footprintI === null ? 1 : -1;
  if (a.footprintI !== null && b.footprintI !== null && Math.abs(a.footprintI - b.footprintI) > EPS) {
    return b.footprintI - a.footprintI;
  }
  if (Math.abs(a.R - b.R) > EPS) return b.R - a.R;
  if (a.presentCount !== b.presentCount) return b.presentCount - a.presentCount;
  return b.bwsRise - a.bwsRise;
}

export function rankSites(inputs: RankInput[], weights: Weights = DEFAULT_WEIGHTS): RankedSite[] {
  const w = normaliseWeights(weights);
  const scored: Scored[] = inputs.map((i) => {
    const R = riskR(i.pillars, w, i.missingPillars);
    return { ...i, R, band: bandOf(R) };
  });
  scored.sort(compare);
  return scored.map((s, idx) => ({
    id: s.id, R: s.R, footprintI: s.footprintI, band: s.band, quadrant: quadrantOf(s.R, s.footprintI),
    rank: idx + 1, tier: tierOf(idx + 1, scored.length),
  }));
}

export interface RankRange { low: number; high: number; unstable: boolean }

export const RANK_RANGE_DRAWS = 500;
export const RANK_RANGE_JITTER = 0.2;
/** Flag "Rank unstable" when the 5th to 95th percentile range is wider than this many positions. */
export const UNSTABLE_WIDTH = 3;

/** Nearest-rank percentile on an ascending list of integers. */
export const percentile = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];

/**
 * 500 draws with each pillar weight varied by +/-20% and renormalised, seeded so it is repeatable.
 * Returns the 5th to 95th percentile rank for every site, plus the "Rank unstable" flag.
 */
export function rankRanges(
  inputs: RankInput[], weights: Weights = DEFAULT_WEIGHTS, seed = RANK_RANGE_SEED,
  draws = RANK_RANGE_DRAWS, jitter = RANK_RANGE_JITTER,
): Record<FactoryId, RankRange> {
  const rand = seededRandom(seed);
  const samples: Record<FactoryId, number[]> = Object.fromEntries(inputs.map((i) => [i.id, [] as number[]]));
  for (let d = 0; d < draws; d++) {
    const w = Object.fromEntries(
      PILLAR_KEYS.map((k) => [k, weights[k] * (1 - jitter + 2 * jitter * rand())]),
    ) as Weights;
    for (const site of rankSites(inputs, w)) samples[site.id].push(site.rank);
  }
  return Object.fromEntries(
    inputs.map((i) => {
      const sorted = samples[i.id].sort((a, b) => a - b);
      const low = percentile(sorted, 0.05);
      const high = percentile(sorted, 0.95);
      return [i.id, { low, high, unstable: high - low > UNSTABLE_WIDTH }];
    }),
  );
}
