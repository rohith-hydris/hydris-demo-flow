"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";
import type { Trace } from "@/src/lib/trace";
import { CitationChip, StatusPill } from "@/src/components/ui";

// "Where this number comes from" drawer (PRODUCT 1, DESIGN 4.12). Any figure opens it through an InfoButton.

const TraceContext = createContext<{ open: (t: Trace) => void } | null>(null);

export const useTrace = () => {
  const ctx = useContext(TraceContext);
  if (!ctx) throw new Error("useTrace must be used inside TraceProvider");
  return ctx;
};

/** Small info icon next to a figure. The hit area is padded to 44px. */
export function InfoButton({ trace }: { trace: Trace }) {
  const { open } = useTrace();
  return (
    <button
      type="button" onClick={() => open(trace)} aria-label={`Where this number comes from: ${trace.title}`}
      className="relative inline-grid size-6 shrink-0 place-items-center rounded-full text-ink-500 after:absolute after:-inset-2.5 after:content-[''] hover:bg-blue-100 hover:text-blue-600"
    >
      <Info className="size-4" aria-hidden="true" />
    </button>
  );
}

const FOCUSABLE = "button, a[href], [tabindex]:not([tabindex='-1'])";

export function TraceProvider({ children }: { children: ReactNode }) {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [shown, setShown] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const open = useCallback((t: Trace) => {
    opener.current = document.activeElement as HTMLElement | null;
    setTrace(t);
    requestAnimationFrame(() => setShown(true));
  }, []);

  const close = useCallback(() => {
    setShown(false);
    window.setTimeout(() => { setTrace(null); opener.current?.focus(); }, 200);
  }, []);

  useEffect(() => {
    if (!trace) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [trace, close]);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <TraceContext.Provider value={value}>
      {children}
      {trace && (
        <div className="fixed inset-0 z-50">
          <div aria-hidden="true" onClick={close} className={`absolute inset-0 bg-ink-900/30 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`} />
          <aside
            ref={panel} role="dialog" aria-modal="true" aria-labelledby="trace-heading"
            className={`absolute right-0 top-0 flex h-full w-[420px] max-w-full flex-col overflow-y-auto rounded-l-panel bg-card p-6 shadow-raised transition-transform duration-200 ${shown ? "translate-x-0" : "translate-x-full"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="trace-heading" className="text-[22px] leading-[30px]">Where this number comes from</h2>
                <p className="mt-1 font-semibold text-ink-700">{trace.title}</p>
              </div>
              <button ref={closeBtn} type="button" onClick={close} aria-label="Close" className="grid size-11 shrink-0 place-items-center rounded-full text-ink-700 hover:bg-blue-50">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <section className="mt-6">
              <h3 className="text-base font-semibold text-ink-500">Value</h3>
              <p className="kpi num mt-1 font-display text-kpi text-ink-900">{trace.value}</p>
            </section>

            <section className="mt-6">
              <h3 className="text-base font-semibold text-ink-500">Formula</h3>
              <div className="mt-2 space-y-1.5 rounded-tile bg-blue-50 p-4 text-ink-900">
                {trace.formula.map((line) => <p key={line}>{line}</p>)}
              </div>
            </section>

            <section className="mt-6">
              <h3 className="text-base font-semibold text-ink-500">Inputs</h3>
              <ul className="mt-2 divide-y divide-line">
                {trace.inputs.map((i) => (
                  <li key={`${i.label}-${i.value}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
                    <span className="min-w-0 text-ink-700">{i.label}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="num font-semibold text-ink-900">{i.value}</span>
                      {i.cite && <CitationChip label={i.cite} />}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6">
              <h3 className="text-base font-semibold text-ink-500">Method version</h3>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-ink-900">
                {trace.method.name}
                {trace.method.version && <StatusPill tone="info" shape="square" label={trace.method.version} />}
              </p>
            </section>

            {trace.grade && (
              <section className="mt-6">
                <h3 className="text-base font-semibold text-ink-500">Confidence grade</h3>
                <p className="mt-2 flex items-start gap-3 text-ink-700">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-100 font-display font-bold text-blue-600" aria-label={trace.grade.grade === "none" ? "No grade" : `Grade ${trace.grade.grade}`}>
                    {trace.grade.grade === "none" ? "–" : trace.grade.grade}
                  </span>
                  <span>{trace.grade.meaning}</span>
                </p>
              </section>
            )}

            {trace.note && <p className="mt-6 rounded-tile border border-line p-4 text-ink-700">{trace.note}</p>}
          </aside>
        </div>
      )}
    </TraceContext.Provider>
  );
}
