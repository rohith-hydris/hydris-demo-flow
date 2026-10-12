"use client";

import { useRef } from "react";

export interface TabDef { id: string; label: string }

/** Panel ids that pair with the tabs: put `id` and `aria-labelledby` on the tab panel. */
export const tabIds = (prefix: string, id: string) => ({ tab: `${prefix}-tab-${id}`, panel: `${prefix}-panel-${id}` });

/** Pill segmented control (DESIGN 5.4). Arrow keys, Home and End move between tabs. */
export function Tabs({ tabs, value, onChange, label, idPrefix }: {
  tabs: TabDef[]; value: string; onChange: (id: string) => void; label: string; idPrefix: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: React.KeyboardEvent, i: number) {
    const last = tabs.length - 1;
    const next = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-[28px] border border-line bg-card p-1 shadow-card">
      {tabs.map((t, i) => {
        const on = t.id === value;
        const ids = tabIds(idPrefix, t.id);
        return (
          <button
            key={t.id} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" id={ids.tab} aria-controls={ids.panel}
            aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => onChange(t.id)} onKeyDown={(e) => onKey(e, i)}
            className={`min-h-11 whitespace-nowrap rounded-full px-5 font-semibold ${on ? "bg-blue-600 text-white" : "text-ink-700 hover:bg-blue-50"}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
