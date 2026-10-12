// PRODUCT 6.7: supplier and portfolio roll-ups. Always show both PWI figures: the unweighted mean and the
// RN-weighted mean, which stops a small site hiding a large one. Values are 0 to 1 fractions, full precision.

export interface RollupSite {
  R: number; pwi: number; pwiCentral: number; volumetricBalance: number; replenishmentNeededM3: number; healthScore: number;
}

export interface Rollup {
  count: number;
  avgR: number;
  /** Headline PWI from counted site scores (evidence grade rule applied). */
  pwiUnweighted: number;
  pwiRnWeighted: number;
  /** The same two figures from central site scores, shown beside the counted ones. */
  pwiUnweightedCentral: number;
  pwiRnWeightedCentral: number;
  /** RN-weighted: total replenishment delivered over total replenishment needed. */
  volumetricBalance: number;
  totalRnM3: number;
  avgHealth: number;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function rollup(sites: RollupSite[]): Rollup {
  const n = sites.length;
  const rn = sum(sites.map((s) => s.replenishmentNeededM3));
  return {
    count: n,
    avgR: n ? sum(sites.map((s) => s.R)) / n : 0,
    pwiUnweighted: n ? sum(sites.map((s) => s.pwi)) / n : 0,
    pwiRnWeighted: rn ? sum(sites.map((s) => s.replenishmentNeededM3 * s.pwi)) / rn : 0,
    pwiUnweightedCentral: n ? sum(sites.map((s) => s.pwiCentral)) / n : 0,
    pwiRnWeightedCentral: rn ? sum(sites.map((s) => s.replenishmentNeededM3 * s.pwiCentral)) / rn : 0,
    volumetricBalance: rn ? sum(sites.map((s) => s.replenishmentNeededM3 * s.volumetricBalance)) / rn : 0,
    totalRnM3: rn,
    avgHealth: n ? sum(sites.map((s) => s.healthScore)) / n : 0,
  };
}
