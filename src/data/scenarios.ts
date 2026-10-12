import type { FactoryId } from "@/src/lib/types";

// V2 Section 12. Saved scenarios for F12. Results are computed in src/lib/scenarios.ts; the addendum's check values live in the tests.
export interface ScenarioRecord { id: string; factoryId: FactoryId; name: string; items: string[]; blurb: string }

export const scenarios: ScenarioRecord[] = [
  { id: "S0", factoryId: "F12", name: "No-project baseline", items: [], blurb: "Nothing new. The comparison point for every other scenario." },
  { id: "S1", factoryId: "F12", name: "Basin first", items: ["OPP-A", "OPP-B", "OPP-C"], blurb: "Basin Availability, Quality and Access projects." },
  { id: "S2", factoryId: "F12", name: "Efficiency and reuse", items: ["OPP-D", "OPP-E"], blurb: "On-site reuse and blowdown recovery." },
  { id: "S3", factoryId: "F12", name: "Balanced", items: ["OPP-A", "OPP-C", "OPP-F", "OPP-D"], blurb: "A mix across pillars." },
];

/** Value of water saved, rupees per m3. Demo estimate (V2 12). */
export const WATER_VALUE_RS_PER_M3 = 150;
/** One lakh is 100,000 rupees. */
export const RS_PER_LAKH = 100000;
