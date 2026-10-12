import type { CellStateOverride, RemovalRecord } from "./types";

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
