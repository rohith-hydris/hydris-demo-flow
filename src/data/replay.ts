import type { FactoryId, Severity } from "@/src/lib/types";

// V2 Section 14: a static 14-day replay pack for the alerts feed. This is demonstration data, not live data.
// V2 names three events (F06 tier drop on day 4, F02 downgrade on day 5, F13 no data from day 6); the rest are
// the same open alerts as the operations table, placed on later days so the feed fills in as the replay plays.
export interface ReplayEvent { day: number; factoryId: FactoryId; severity: Severity; message: string }

export const REPLAY_DAYS = 14;

export const replayPack: ReplayEvent[] = [
  { day: 4, factoryId: "F06", severity: "Critical", message: "Dropped to Not conformant" },
  { day: 5, factoryId: "F02", severity: "High", message: "ZDHC downgrade, Progressive to Foundational" },
  { day: 6, factoryId: "F13", severity: "High", message: "No data from the water meter log" },
  { day: 7, factoryId: "F06", severity: "Critical", message: "OCEMS offline" },
  { day: 9, factoryId: "F02", severity: "High", message: "TSS above limit on 3 of the last 7 days" },
  { day: 10, factoryId: "F09", severity: "Medium", message: "Plant health in Watch range" },
  { day: 11, factoryId: "F04", severity: "Medium", message: "Plant health in Watch range" },
  { day: 12, factoryId: "F12", severity: "Medium", message: "P3 Basin cells behind target; PRJ-105 monitoring check overdue" },
  { day: 13, factoryId: "F01", severity: "Medium", message: "Benefit behind target: P3 Basin cells below 80% of pro-rated target" },
  { day: 14, factoryId: "F03", severity: "Info", message: "ZDHC upgrade to Aspirational" },
];

export type DataSourceMode = "Live data (not connected)" | "Replay" | "Manual";
export const DATA_SOURCE_MODES: readonly DataSourceMode[] = ["Live data (not connected)", "Replay", "Manual"];
export const DEFAULT_SOURCE_MODE: DataSourceMode = "Replay";
export const REPLAY_LABEL = "Replay data (demonstration)";
