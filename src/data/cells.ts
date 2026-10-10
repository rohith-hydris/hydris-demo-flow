import type { CellScoreRecord, CellStateOverride, RemovalRecord } from "./types";

// PRODUCT 5.4: entered cell scores S (0 to 1). P1 Quality is derived from pollutant removal below.
const row = (
  factoryId: string, a: [number, number, number], w: [number, number, number], q: [number, number],
): CellScoreRecord => ({
  factoryId,
  availability: { P1: a[0], P2: a[1], P3: a[2] },
  accessibility: { P1: w[0], P2: w[1], P3: w[2] },
  quality: { P2: q[0], P3: q[1] },
});

export const cellScores: CellScoreRecord[] = [
  row("F01", [0.9, 0.7, 0.35], [1.0, 0.8, 0.45], [0.55, 0.1]),
  row("F02", [0.75, 0.45, 0.2], [0.9, 0.55, 0.3], [0.35, 0.0]),
  row("F03", [0.95, 0.85, 0.6], [1.0, 0.9, 0.7], [0.8, 0.45]),
  row("F04", [0.85, 0.6, 0.3], [1.0, 0.65, 0.35], [0.5, 0.15]),
  row("F05", [0.92, 0.8, 0.55], [1.0, 0.85, 0.6], [0.7, 0.4]),
  row("F06", [0.7, 0.4, 0.15], [0.85, 0.5, 0.2], [0.3, 0.0]),
  row("F07", [0.96, 0.88, 0.7], [1.0, 0.92, 0.75], [0.85, 0.55]),
  row("F08", [1.0, 0.95, 0.8], [1.0, 0.95, 0.85], [0.9, 0.7]),
  row("F09", [0.88, 0.65, 0.4], [1.0, 0.7, 0.4], [0.55, 0.2]),
  row("F10", [0.9, 0.75, 0.5], [1.0, 0.8, 0.55], [0.65, 0.3]),
  row("F11", [0.98, 0.9, 0.75], [1.0, 0.95, 0.8], [0.85, 0.6]),
  row("F12", [0.955, 0.795, 0.568], [1.0, 0.862, 0.517], [0.604, 0.0]),
  row("F13", [0.8, 0.55, 0.3], [0.95, 0.6, 0.3], [0.4, 0.05]),
  row("F14", [0.93, 0.78, 0.52], [1.0, 0.82, 0.58], [0.72, 0.35]),
];

// PRODUCT 5.4: pollutant removal at the ETP, percent. Used for S(Q,1).
export const removals: RemovalRecord[] = [
  { factoryId: "F01", tss: 91, tn: 78, tp: 82 },
  { factoryId: "F02", tss: 88, tn: 62, tp: 70 },
  { factoryId: "F03", tss: 95, tn: 88, tp: 90 },
  { factoryId: "F04", tss: 92, tn: 74, tp: 79 },
  { factoryId: "F05", tss: 94, tn: 85, tp: 88 },
  { factoryId: "F06", tss: 86, tn: 60, tp: 66 },
  { factoryId: "F07", tss: 96, tn: 90, tp: 92 },
  { factoryId: "F08", tss: 97, tn: 92, tp: 94 },
  { factoryId: "F09", tss: 93, tn: 80, tp: 84 },
  { factoryId: "F10", tss: 94, tn: 84, tp: 86 },
  { factoryId: "F11", tss: 97, tn: 91, tp: 93 },
  { factoryId: "F12", tss: 92.5, tn: 75, tp: 80 },
  { factoryId: "F13", tss: 90, tn: 70, tp: 76 },
  { factoryId: "F14", tss: 95, tn: 86, tp: 89 },
];

// PRODUCT 5.9: exceptions to the default "Scored" state. A score of 0 is always "Missing input" (rule in src/lib/pwi.ts).
export const cellStateOverrides: CellStateOverride[] = [
  { factoryId: "F06", pillar: "all", dimension: "all", state: "Low confidence", reason: "Site evidence is low confidence." },
  { factoryId: "F13", pillar: "P2", dimension: "Availability", state: "Low confidence", reason: "The project behind this cell has evidence grade C." },
  { factoryId: "F01", pillar: "P3", dimension: "Availability", state: "Partially scored", reason: "A project behind this cell is gated or flagged." },
  { factoryId: "F02", pillar: "P2", dimension: "Availability", state: "Partially scored", reason: "A project behind this cell is gated or flagged." },
];
