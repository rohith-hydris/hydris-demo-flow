import type { WorkedExample } from "./types";

// PRODUCT 5.8: F12 Ambattur Denim Unit, the PRD worked example. Method version PWI-M 1.0. Illustrative.
// Cell scores S come from src/data/cells.ts; this file holds the targets, delivered benefits, grades and states.
export const f12Example: WorkedExample = {
  factoryId: "F12",
  methodVersion: "PWI-M 1.0",
  baselineWithdrawalM3: 250000,
  compliantBasinDischargeM3: 140000,
  attributableShare: 1.0,
  etpFlowM3: 150000,
  influentMgPerL: { tss: 400, tn: 60, tp: 10 },
  baselineLoadsKg: { tss: 60000, tn: 9000, tp: 1500 },
  withdrawalBySourceM3: { municipal: 120000, groundwater: 90000, rainwaterUsed: 10000, thirdParty: 30000, condensate: 0 },
  priorMonthSitePwi: 0.703,
  cells: [
    {
      pillar: "P1", dimension: "Availability", target: { kind: "volume", m3: 22000 }, delivered: { kind: "volume", m3: 21000 },
      breakdown: [{ label: "Recycled", value: 15000, unit: "m3" }, { label: "Reclaimed grey water", value: 4000, unit: "m3" }, { label: "On-site recharge", value: 2000, unit: "m3" }],
      grade: "B", state: "Scored",
    },
    {
      pillar: "P2", dimension: "Availability", target: { kind: "volume", m3: 44000 }, delivered: { kind: "volume", m3: 35000 },
      breakdown: [{ label: "Desilting (30,000 x 1.5 fills x 0.60 net)", value: 27000, unit: "m3" }, { label: "Recharge", value: 8000, unit: "m3" }],
      grade: "B", state: "Partially scored", stateNote: "6,000 m3 landscape offset excluded",
    },
    {
      pillar: "P3", dimension: "Availability", target: { kind: "volume", m3: 44000 }, delivered: { kind: "volume", m3: 25000 },
      breakdown: [{ label: "Wetland (50,000 x 50% attribution)", value: 25000, unit: "m3" }],
      grade: "B", state: "Scored",
    },
    { pillar: "P1", dimension: "Accessibility", target: { kind: "people", count: 1200 }, delivered: { kind: "people", count: 1200 }, grade: "B", state: "Scored" },
    { pillar: "P2", dimension: "Accessibility", target: { kind: "people", count: 1740 }, delivered: { kind: "people", count: 1500 }, grade: "B", state: "Scored" },
    { pillar: "P3", dimension: "Accessibility", target: { kind: "people", count: 1740 }, delivered: { kind: "people", count: 900 }, grade: "C", state: "Low confidence", stateNote: "Monitoring check overdue" },
    { pillar: "P1", dimension: "Quality", target: { kind: "removal", tss: 90, tn: 90, tp: 90 }, delivered: { kind: "removal", tss: 92.5, tn: 75, tp: 80 }, grade: "A", state: "Scored", stateNote: "TN 75% is the weak pollutant" },
    { pillar: "P2", dimension: "Quality", target: { kind: "mass", tss: 3000, tn: 450, tp: 75 }, delivered: { kind: "mass", tss: 2500, tn: 200, tp: 40 }, grade: "B", state: "Scored" },
    { pillar: "P3", dimension: "Quality", target: { kind: "mass", tss: 3000, tn: 450, tp: 75 }, delivered: { kind: "mass", tss: 0, tn: 0, tp: 0 }, grade: "none", state: "Missing input", stateNote: "No basin quality project registered" },
  ],
};
