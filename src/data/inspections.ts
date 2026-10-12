import type { InspectionRecord } from "./types";

// PRODUCT 5.11, Field Glasses inspection reports. Trust score = passed / steps, and the status (Validated, Needs review, Rejected steps)
// is derived from the steps and the review log: both are computed in src/lib/claims.ts.
export const inspections: InspectionRecord[] = [
  {
    id: "INS-0412", factoryId: "F12", date: "2 Oct 2026", steps: 14, passed: 12, source: "Field Glasses",
    stepDetail: [
      { n: 9, instruction: "Photograph the ETP outlet sampling point", result: "Fail", check: "VC-06", reason: "The photo is too blurry to read the sampling point." },
      { n: 11, instruction: "Read the outlet flow meter", result: "Warn", check: "VC-21", reason: "The reading is far from the last 30 days. Please confirm." },
    ],
  },
  { id: "INS-0408", factoryId: "F01", date: "28 Sep 2026", steps: 12, passed: 12, source: "Field Glasses" },
  // The spec gives the trust score (66.7%) but not which steps failed, so this report has no step detail: its 5 steps that did not pass count as unresolved.
  { id: "INS-0399", factoryId: "F06", date: "21 Sep 2026", steps: 15, passed: 10, source: "Field Glasses" },
  // V2 14: an ordinary field upload, no glasses hardware.
  { id: "INS-0415", factoryId: "F13", date: "5 Oct 2026", steps: 9, passed: 9, source: "Field upload (phone or web)" },
  // Demo (issue B8): a failed step, a logged override with its reason, then a retake request that puts the report at "Rejected steps".
  {
    id: "INS-0418", factoryId: "F14", date: "6 Oct 2026", steps: 10, passed: 8, source: "Field Glasses",
    stepDetail: [
      { n: 6, instruction: "Photograph the sludge pit", result: "Fail", check: "VC-03", reason: "The photo does not show the sludge pit." },
      { n: 8, instruction: "Read the inlet flow meter", result: "Warn", check: "VC-21", reason: "The reading is far from the last 30 days. Please confirm." },
    ],
    reviewLog: [
      { action: "override", user: "R. Menon, Lumen Apparel Group", time: "7 Oct 2026, 09:40", reason: "The plant lead confirmed the pit location by call. A photo will follow." },
      { action: "retake", user: "R. Menon, Lumen Apparel Group", time: "8 Oct 2026, 11:15", step: 6 },
    ],
  },
];
