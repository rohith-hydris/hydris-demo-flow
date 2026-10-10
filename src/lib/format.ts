// Display formatting (DESIGN section 6). Computation always keeps full precision; only these functions round.

const EPS = 1e-9;

/** Round half up, tolerant of binary floating-point noise (0.795 must give 0.80, 0.465 must give 0.47). */
export function round(x: number, dp: number): number {
  const f = 10 ** dp;
  return Math.sign(x) * Math.round(Math.abs(x) * f + EPS) / f;
}

/** PWI and portfolio percentages: one decimal. 0.698 -> "69.8%". */
export const fmtPct1 = (fraction: number) => `${round(fraction * 100, 1).toFixed(1)}%`;

/** Percentage without the sign, as a number: 0.698 -> 69.8. */
export const pct1 = (fraction: number) => round(fraction * 100, 1);

/** R, I and cell scores: two decimals. */
export const fmtScore = (x: number) => round(x, 2).toFixed(2);

/** Three decimals where the PRD shows three (for example 0.955, pillar values). */
export const fmtScore3 = (x: number) => round(x, 3).toFixed(3);

/** Thousands separators: 110000 -> "110,000". */
export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

export const fmtM3 = (n: number) => `${fmtInt(n)} m³`;
export const fmtPeople = (n: number) => `${fmtInt(n)} people`;
export const fmtKg = (n: number) => `${fmtInt(n)} kg`;

/** "12 days ago" style age. */
export const fmtDaysAgo = (days: number) => (days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`);

/** Cell scores show two decimals, or three where the score has more than two (0.955, 0.907) as the PRD does. */
export const fmtCellScore = (x: number) => (round(x, 2) === round(x, 6) ? round(x, 2).toFixed(2) : round(x, 3).toFixed(3));
