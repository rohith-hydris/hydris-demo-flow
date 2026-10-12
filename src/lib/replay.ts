import { REPLAY_DAYS, replayPack, type ReplayEvent } from "@/src/data/replay";
import type { DerivedAlert } from "./ops";
import { getSites } from "./selectors";
import { scopeFor } from "./scope";
import type { FactoryId, Severity } from "./types";

// V2 Section 14. Pure helpers for the replay control: which alerts have fired by a given day. Each event is resolved against the
// alerts derived from the plant's inputs, so the replay shows the same severity and text as the live alert rules.

export const clampDay = (day: number) => Math.max(0, Math.min(REPLAY_DAYS, Math.round(day)));

/** A replay event with the severity and message of the derived alert it replays. */
export interface ResolvedReplayEvent extends ReplayEvent { severity: Severity; message: string }

const derivedAlerts = (() => {
  let cache: Map<FactoryId, DerivedAlert[]> | null = null;
  return () => (cache ??= new Map(getSites(scopeFor("brand")).map((s) => [s.id, s.alerts])));
})();

/** Looks up the derived alert a replay event names. Throws if the plant does not raise that rule, so the pack cannot drift from the rules. */
export function resolveEvent(e: ReplayEvent): ResolvedReplayEvent {
  const alert = derivedAlerts().get(e.factoryId)?.find((a) => a.rule === e.rule);
  if (!alert) throw new Error(`Replay event day ${e.day}: ${e.factoryId} raises no "${e.rule}" alert`);
  return { ...e, severity: alert.severity, message: alert.message };
}

/** Events that have fired on or before `day` (day 0 shows none). Newest first. */
export function eventsUpTo(day: number, pack: ReplayEvent[] = replayPack): ResolvedReplayEvent[] {
  const d = clampDay(day);
  return pack.filter((e) => e.day <= d).sort((a, b) => b.day - a.day).map(resolveEvent);
}

/** Events that fire on exactly this day. */
export const eventsOn = (day: number, pack: ReplayEvent[] = replayPack) => pack.filter((e) => e.day === day).map(resolveEvent);

export const nextDay = (day: number) => (day >= REPLAY_DAYS ? REPLAY_DAYS : clampDay(day) + 1);
export const isReplayEnd = (day: number) => day >= REPLAY_DAYS;
