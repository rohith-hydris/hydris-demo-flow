import type { FactoryId } from "@/src/lib/types";
import type { AlertRule } from "@/src/lib/ops";

// V2 Section 14: a static 14-day replay pack for the alerts feed. This is demonstration data, not live data.
// V2 names three events (F06 tier drop on day 4, F02 downgrade on day 5, F13 no data from day 6); the rest are other open alerts
// placed on later days so the feed fills in as the replay plays. An event names the plant and the alert RULE it replays; its severity,
// message and age come from the alerts derived from the plant's inputs (src/lib/ops.ts deriveAlerts), never from text typed here.
export interface ReplayEvent { day: number; factoryId: FactoryId; rule: AlertRule }

export const REPLAY_DAYS = 14;

export const replayPack: ReplayEvent[] = [
  { day: 4, factoryId: "F06", rule: "not-conformant" },
  { day: 5, factoryId: "F02", rule: "tier-downgrade" },
  { day: 6, factoryId: "F13", rule: "no-data" },
  { day: 7, factoryId: "F06", rule: "no-data" },
  { day: 9, factoryId: "F02", rule: "watch-health" },
  { day: 10, factoryId: "F09", rule: "watch-health" },
  { day: 11, factoryId: "F04", rule: "watch-health" },
  { day: 12, factoryId: "F12", rule: "benefit-behind" },
  { day: 13, factoryId: "F01", rule: "benefit-behind" },
  { day: 14, factoryId: "F03", rule: "tier-upgrade" },
];

export type DataSourceMode = "Live data (not connected)" | "Replay" | "Manual";
export const DATA_SOURCE_MODES: readonly DataSourceMode[] = ["Live data (not connected)", "Replay", "Manual"];
export const DEFAULT_SOURCE_MODE: DataSourceMode = "Replay";
export const REPLAY_LABEL = "Replay data (demonstration)";
