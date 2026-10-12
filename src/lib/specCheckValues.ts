import type { StatusBand, Quadrant, Tier, Band } from "./types";

// Expected values copied from PRODUCT.md. Tests compare the computed output against these.
// If a test fails, fix the code, not these numbers (they are the spec). Report a suspected spec error instead.

/** PRODUCT 5.5 check values, in rank order. PWI and volumetric balance are percentages to one decimal. */
export interface SiteCheck {
  rank: number; id: string; band: Band; R: number; I: number; quadrant: Quadrant; tier: Tier;
  P1: number; P2: number; P3: number; pwi: number; volumetric: number; cert: StatusBand;
}

const c = (
  rank: number, id: string, band: Band, R: number, I: number, quadrant: Quadrant, tier: Tier,
  P1: number, P2: number, P3: number, pwi: number, volumetric: number, cert: StatusBand,
): SiteCheck => ({ rank, id, band, R, I, quadrant, tier, P1, P2, P3, pwi, volumetric, cert });

export const siteChecks: SiteCheck[] = [
  c(1, "F12", 1, 0.84, 0.91, "Act now", 1, 0.954, 0.758, 0.382, 69.8, 73.6, "In progress"),
  c(2, "F02", 1, 0.71, 0.88, "Act now", 1, 0.814, 0.45, 0.17, 47.8, 41.0, "Not achieved"),
  c(3, "F01", 1, 0.74, 0.78, "Act now", 2, 0.938, 0.685, 0.305, 64.3, 60.0, "In progress"),
  c(4, "F09", 1, 0.63, 0.72, "Act now", 2, 0.934, 0.635, 0.34, 63.6, 59.6, "In progress"),
  c(5, "F04", 1, 0.68, 0.64, "Act now", 2, 0.91, 0.585, 0.27, 58.8, 53.0, "Not achieved"),
  c(6, "F14", 1, 0.61, 0.58, "Act now", 3, 0.966, 0.774, 0.487, 74.2, 70.6, "In progress"),
  c(7, "F13", 1, 0.79, 0.45, "Build resilience", 3, 0.867, 0.52, 0.225, 53.7, 50.0, "Not achieved"),
  c(8, "F06", 1, 0.66, 0.41, "Build resilience", 3, 0.771, 0.4, 0.12, 43.0, 36.0, "Low confidence"),
  c(9, "F05", 2, 0.58, 0.55, "Reduce footprint", 3, 0.96, 0.785, 0.52, 75.5, 72.4, "In progress"),
  c(10, "F10", 2, 0.55, 0.48, "Monitor", 3, 0.949, 0.735, 0.455, 71.3, 68.0, "In progress"),
  c(11, "F03", 2, 0.52, 0.35, "Monitor", 3, 0.978, 0.85, 0.585, 80.4, 77.0, "Conditional"),
  c(12, "F07", 2, 0.45, 0.3, "Monitor", 3, 0.984, 0.883, 0.67, 84.6, 82.4, "Conditional"),
  c(13, "F11", 3, 0.38, 0.25, "Monitor", 3, 0.992, 0.9, 0.72, 87.1, 85.6, "Conditional"),
  c(14, "F08", 3, 0.32, 0.12, "Monitor", 3, 1.0, 0.935, 0.785, 90.7, 90.0, "Conditional"),
];

/** PRODUCT 5.5 supplier roll-ups. Avg R to two decimals, PWI to one decimal (percent), RN in m3. */
export const supplierChecks = [
  { id: "SUP1", avgR: 0.66, pwiUnweighted: 64.2, pwiRnWeighted: 58.5, totalRn: 280000 },
  { id: "SUP2", avgR: 0.64, pwiUnweighted: 59.1, pwiRnWeighted: 54.8, totalRn: 250000 },
  { id: "SUP3", avgR: 0.47, pwiUnweighted: 79.6, pwiRnWeighted: 70.5, totalRn: 127000 },
  { id: "SUP4", avgR: 0.47, pwiUnweighted: 79.2, pwiRnWeighted: 76.1, totalRn: 92000 },
  { id: "SUP5", avgR: 0.75, pwiUnweighted: 65.9, pwiRnWeighted: 66.0, totalRn: 262000 },
] as const;

export const portfolioCheck = { pwiUnweighted: 68.9, pwiRnWeighted: 62.6, totalRn: 1011000 } as const;

/** PRODUCT 5.6 Present and Watch counts over the 13 risks excluding `cep`. */
export const riskCountChecks: Record<string, [present: number, watch: number]> = {
  F01: [8, 4], F02: [8, 3], F03: [3, 7], F04: [8, 4], F05: [4, 7], F06: [8, 4], F07: [1, 6],
  F08: [1, 2], F09: [6, 6], F10: [3, 8], F11: [1, 4], F12: [11, 2], F13: [10, 2], F14: [5, 7],
};
