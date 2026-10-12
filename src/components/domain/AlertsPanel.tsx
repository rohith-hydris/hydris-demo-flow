"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { DATA_SOURCE_MODES, DEFAULT_SOURCE_MODE, REPLAY_DAYS, REPLAY_LABEL, type DataSourceMode } from "@/src/data/replay";
import { eventsUpTo, isReplayEnd, nextDay } from "@/src/lib/replay";
import type { Alert } from "@/src/lib/ops";
import { Segmented } from "@/src/components/ui";
import AlertsFeed from "./AlertsFeed";

const STEP_MS = 1200;

const MODE_LABEL: Record<DataSourceMode, string> = {
  "Live data (not connected)": "Live data (not connected)",
  Replay: "Replay",
  Manual: "Manual",
};

// V2 14: the alerts feed with a data-source control. The demo uses replay and manual data, never live data, and says so.
export default function AlertsPanel({ alerts, siteNames, canAct }: { alerts: Alert[]; siteNames: Record<string, string>; canAct: boolean }) {
  const [mode, setMode] = useState<DataSourceMode>(DEFAULT_SOURCE_MODE);
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setDay((d) => nextDay(d)), STEP_MS);
    return () => window.clearInterval(t);
  }, [playing]);
  // Once the last day is reached the button reads Play again but is disabled until Reset (no state change in an effect).
  const running = playing && !isReplayEnd(day);

  // Only plants in scope appear: the site list the page passes is already scoped to the role.
  const replayAlerts = useMemo<Alert[]>(
    () => eventsUpTo(day).filter((e) => e.factoryId in siteNames).map((e) => ({ id: `RP-${e.day}-${e.factoryId}-${e.message}`, factoryId: e.factoryId, severity: e.severity, message: e.message, ageDays: day - e.day })),
    [day, siteNames],
  );

  const label = mode === "Replay" ? REPLAY_LABEL : mode === "Manual" ? "Manual data (demonstration)" : "Live data is not connected in this demo";

  return (
    <div>
      <div className="mb-3"><Segmented<DataSourceMode> label="Alert data source" value={mode} onChange={(m) => { setMode(m); setPlaying(false); }} options={DATA_SOURCE_MODES.map((m) => ({ value: m, label: MODE_LABEL[m] }))} /></div>
      <p className="mb-3 inline-flex min-h-7 items-center rounded-full border border-[var(--caution-line)] bg-[var(--caution-bg)] px-3 text-sm font-semibold text-[var(--caution-fg)]">{label}</p>

      {mode === "Replay" && (
        <div className="mb-4 rounded-tile border border-line bg-blue-50 p-3">
          <p className="font-semibold text-ink-900" aria-live="polite">Day {day} of {REPLAY_DAYS}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary min-h-11 px-4 text-sm" aria-pressed={running} disabled={isReplayEnd(day)} onClick={() => setPlaying(!running)}>
              {running ? <><Pause className="size-4" aria-hidden="true" /> Pause</> : <><Play className="size-4" aria-hidden="true" /> Play</>}
            </button>
            <button type="button" className="btn btn-secondary min-h-11 px-4 text-sm" disabled={isReplayEnd(day)} onClick={() => { setPlaying(false); setDay((d) => nextDay(d)); }}>
              <StepForward className="size-4" aria-hidden="true" /> Next day
            </button>
            <button type="button" className="btn btn-secondary min-h-11 px-4 text-sm" disabled={day === 0} onClick={() => { setPlaying(false); setDay(0); }}>
              <RotateCcw className="size-4" aria-hidden="true" /> Reset
            </button>
          </div>
        </div>
      )}

      {mode === "Live data (not connected)" ? (
        <p className="rounded-tile border border-line bg-card p-4 text-ink-700">No live feed is connected. Switch to Replay to step through a 14-day demonstration pack, or Manual to see the alerts entered for the demo.</p>
      ) : mode === "Replay" ? (
        <AlertsFeed alerts={replayAlerts} siteNames={siteNames} canAct={canAct} empty={{ title: "No alerts have fired yet", text: "Press Play or Next day to step through the replay pack." }} />
      ) : (
        <AlertsFeed alerts={alerts} siteNames={siteNames} canAct={canAct} />
      )}
    </div>
  );
}
