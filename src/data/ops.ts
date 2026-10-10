import type { OpsRecord } from "./types";

// PRODUCT 5.7 (Module 06). Health band, off-track and the alert list are computed in src/lib/ops.ts.
// `alertAgeDays` is filled only where the spec states an age; otherwise null.
export const ops: OpsRecord[] = [
  { factoryId: "F01", healthScore: 78, zdhcTier: "Progressive", tierChange: null, highestAlert: "Medium", alertMessage: "Benefit behind target: P3 Basin cells below 80% of pro-rated target", alertAgeDays: null },
  { factoryId: "F02", healthScore: 61, zdhcTier: "Foundational", tierChange: { from: "Progressive", to: "Foundational", daysAgo: 12 }, highestAlert: "High", alertMessage: "ZDHC downgrade and TSS above limit on 3 of last 7 days", alertAgeDays: 12 },
  { factoryId: "F03", healthScore: 91, zdhcTier: "Aspirational", tierChange: { from: "Progressive", to: "Aspirational", daysAgo: 20 }, highestAlert: "Info", alertMessage: "ZDHC upgrade to Aspirational", alertAgeDays: 20 },
  { factoryId: "F04", healthScore: 72, zdhcTier: "Progressive", tierChange: null, highestAlert: "Medium", alertMessage: "Plant health in Watch range", alertAgeDays: null },
  { factoryId: "F05", healthScore: 84, zdhcTier: "Progressive", tierChange: null, highestAlert: null, alertMessage: null, alertAgeDays: null },
  { factoryId: "F06", healthScore: 38, zdhcTier: "Not conformant", tierChange: { from: "Foundational", to: "Not conformant", daysAgo: 5 }, highestAlert: "Critical", alertMessage: "Dropped to Not conformant; OCEMS offline 9 days", alertAgeDays: 5 },
  { factoryId: "F07", healthScore: 93, zdhcTier: "Aspirational", tierChange: null, highestAlert: null, alertMessage: null, alertAgeDays: null },
  { factoryId: "F08", healthScore: 96, zdhcTier: "Aspirational", tierChange: null, highestAlert: null, alertMessage: null, alertAgeDays: null },
  { factoryId: "F09", healthScore: 66, zdhcTier: "Foundational", tierChange: null, highestAlert: "Medium", alertMessage: "Plant health in Watch range", alertAgeDays: null },
  { factoryId: "F10", healthScore: 79, zdhcTier: "Progressive", tierChange: null, highestAlert: null, alertMessage: null, alertAgeDays: null },
  { factoryId: "F11", healthScore: 90, zdhcTier: "Aspirational", tierChange: { from: "Progressive", to: "Aspirational", daysAgo: 31 }, highestAlert: "Info", alertMessage: "ZDHC upgrade to Aspirational", alertAgeDays: 31 },
  { factoryId: "F12", healthScore: 81, zdhcTier: "Progressive", tierChange: null, highestAlert: "Medium", alertMessage: "P3 Basin cells behind target; PRJ-105 monitoring check 62 days overdue", alertAgeDays: null },
  { factoryId: "F13", healthScore: 55, zdhcTier: "Foundational", tierChange: null, highestAlert: "High", alertMessage: "No data for 9 days (water meter log)", alertAgeDays: 9 },
  { factoryId: "F14", healthScore: 83, zdhcTier: "Progressive", tierChange: null, highestAlert: null, alertMessage: null, alertAgeDays: null },
];
