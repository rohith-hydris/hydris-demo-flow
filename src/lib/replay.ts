import { REPLAY_DAYS, replayPack, type ReplayEvent } from "@/src/data/replay";

// V2 Section 14. Pure helpers for the replay control: which alerts have fired by a given day.

export const clampDay = (day: number) => Math.max(0, Math.min(REPLAY_DAYS, Math.round(day)));

/** Events that have fired on or before `day` (day 0 shows none). Newest first. */
export function eventsUpTo(day: number, pack: ReplayEvent[] = replayPack): ReplayEvent[] {
  const d = clampDay(day);
  return pack.filter((e) => e.day <= d).sort((a, b) => b.day - a.day);
}

/** Events that fire on exactly this day. */
export const eventsOn = (day: number, pack: ReplayEvent[] = replayPack) => pack.filter((e) => e.day === day);

export const nextDay = (day: number) => (day >= REPLAY_DAYS ? REPLAY_DAYS : clampDay(day) + 1);
export const isReplayEnd = (day: number) => day >= REPLAY_DAYS;
