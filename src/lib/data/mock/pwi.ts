import type { CellState, FactoryPwi, PwiCell } from "../types";

// Builder (module load only): turns hand-authored scores into 9 final cells.
// Score order below is dimension-major, as in the brief:
// P1A P2A P3A | P1W P2W P3W | P1Q P2Q P3Q (A = Availability, W = Accessibility, Q = Quality).
// Output cells are pillar-major: P1 (A, W, Q), P2 (A, W, Q), P3 (A, W, Q).
const PILLARS = ["P1", "P2", "P3"] as const;
const DIMS = ["Availability", "Accessibility", "Quality"] as const;
const BASE_TARGET = [
  [180000, 450000, 900000], // m3 per year
  [1500, 20000, 60000], // people with safe access
  [24000, 80000, 200000], // kg COD per year
];
const UNIT = ["m³", "people", "kg"];
const n = (v: number) => v.toLocaleString("en-IN");

const grade = (s: number, state: CellState): PwiCell["grade"] =>
  state === "Missing input" ? "-" : s >= 0.9 ? "A" : s >= 0.75 ? "B" : s >= 0.5 ? "C" : "D";

function build(
  factoryId: string, sitePwi: number, confidence: number, certBand: FactoryPwi["certBand"],
  volumetricBalance: number, replenishmentNeededM3: number, period: FactoryPwi["period"], sitePwiLow: number,
  scale: number, scores: number[], states: Record<number, CellState> = {},
): FactoryPwi {
  const cells: PwiCell[] = [];
  PILLARS.forEach((pillar, p) =>
    DIMS.forEach((dimension, d) => {
      const i = d * 3 + p;
      const score = scores[i];
      const state = states[i] ?? "Scored";
      const t = Math.round(BASE_TARGET[d][p] * scale);
      cells.push({
        pillar, dimension,
        target: `${n(t)} ${UNIT[d]}`,
        delivered: state === "Missing input" ? "No data" : `${n(Math.round(t * score))} ${UNIT[d]}`,
        score, scorePct: Math.round(score * 1000) / 10, scoreLow: Math.max(0, Math.round((score - (sitePwi - sitePwiLow)) * 1000) / 1000), state, grade: grade(score, state),
      });
    }),
  );
  return { factoryId, sitePwi, sitePwiLow, confidence, certBand, volumetricBalance, replenishmentNeededM3, period, cells };
}

const list: FactoryPwi[] = [
  build("nanjangud-unit", 0.76, 0.7, "Conditional", 0.78, 15000, "Verified", 0.68, 0.5,
    [0.95, 0.84, 0.68, 0.93, 0.8, 0.64, 0.88, 0.74, 0.45]),
  build("site-a-chennai", 0.698, 0.72, "In progress", 0.736, 110000, "Submitted", 0.51, 1,
    [0.955, 0.795, 0.568, 1.0, 0.862, 0.517, 0.907, 0.604, 0.0], { 8: "Missing input" }),
  build("tiruppur-mill", 0.612, 0.68, "Conditional", 0.65, 142000, "Verified", 0.49, 1.2,
    [0.81, 0.66, 0.52, 0.74, 0.6, 0.41, 0.7, 0.52, 0.0], { 5: "Low confidence", 8: "Not additional" }),
  build("avinashi-unit", 0.548, 0.55, "In progress", 0.58, 96000, "Submitted", 0.41, 0.8,
    [0.72, 0.58, 0.44, 0.66, 0.55, 0.38, 0.64, 0.47, 0.21], { 2: "Low confidence" }),
  build("palladam-dye-house", 0.701, 0.74, "Conditional", 0.72, 64000, "Verified", 0.6, 0.9,
    [0.9, 0.77, 0.6, 0.88, 0.72, 0.55, 0.82, 0.63, 0.33]),
  build("sriperumbudur-unit", 0.742, 0.78, "Conditional", 0.76, 48000, "Locked", 0.66, 0.7,
    [0.93, 0.81, 0.62, 0.9, 0.78, 0.6, 0.85, 0.7, 0.38]),
  build("coimbatore-spinning", 0.803, 0.7, "Self-certified", 0.81, 22000, "Submitted", 0.72, 0.6,
    [0.96, 0.86, 0.7, 0.94, 0.82, 0.66, 0.9, 0.76, 0.45]),
  build("erode-dyeing-works", 0.655, 0.66, "In progress", 0.67, 88000, "Draft", 0.52, 1.1,
    [0.84, 0.7, 0.55, 0.8, 0.64, 0.46, 0.74, 0.58, 0.0], { 8: "Missing input" }),
  build("karur-unit", 0.871, 0.81, "Conditional", 0.88, 9000, "Verified", 0.8, 0.4,
    [0.98, 0.9, 0.78, 0.99, 0.88, 0.74, 0.95, 0.82, 0.6]),
  build("mysuru-cut-and-sew", 0.834, 0.79, "Conditional", 0.85, 14000, "Locked", 0.76, 0.5,
    [0.97, 0.88, 0.73, 0.96, 0.84, 0.69, 0.92, 0.79, 0.52]),
  build("bengaluru-hub", 0.792, 0.69, "Self-certified", 0.79, 31000, "Submitted", 0.7, 0.6,
    [0.94, 0.83, 0.66, 0.92, 0.8, 0.62, 0.88, 0.72, 0.41]),
  build("ballari-weave", 0.421, 0.46, "Low confidence", 0.44, 205000, "Draft", 0.27, 1.3,
    [0.62, 0.48, 0.3, 0.55, 0.4, 0.22, 0.5, 0.35, 0.1], { 5: "Low confidence" }),
  build("hubballi-unit", 0.487, 0.58, "In progress", 0.5, 120000, "Submitted", 0.36, 0.9,
    [0.7, 0.54, 0.36, 0.62, 0.46, 0.3, 0.57, 0.4, 0.15]),
];

export const pwiByFactory: Record<string, FactoryPwi> = Object.fromEntries(list.map((p) => [p.factoryId, p]));
