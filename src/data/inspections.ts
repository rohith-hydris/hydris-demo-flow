import type { InspectionRecord } from "./types";

// PRODUCT 5.11, Field Glasses inspection reports. Trust score = passed / steps, computed in src/lib/claims.ts.
export const inspections: InspectionRecord[] = [
  {
    id: "INS-0412", factoryId: "F12", date: "2 Oct 2026", steps: 14, passed: 12, status: "Needs review",
    stepDetail: [
      { n: 9, instruction: "Photograph the ETP outlet sampling point", result: "Fail", check: "VC-06", reason: "The photo is too blurry to read the sampling point." },
      { n: 11, instruction: "Read the outlet flow meter", result: "Warn", check: "VC-21", reason: "The reading is far from the last 30 days. Please confirm." },
    ],
  },
  { id: "INS-0408", factoryId: "F01", date: "28 Sep 2026", steps: 12, passed: 12, status: "Validated" },
  { id: "INS-0399", factoryId: "F06", date: "21 Sep 2026", steps: 15, passed: 10, status: "Needs review" },
];
