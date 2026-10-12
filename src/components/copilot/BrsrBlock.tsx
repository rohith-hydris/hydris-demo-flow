"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, FileCheck2, Upload } from "lucide-react";
import type { DocumentRecord } from "@/src/data/types";
import { READINESS_STATES, readinessCounts } from "@/src/lib/claims";
import type { Gap, ResolvedBlock } from "@/src/lib/copilot";
import { CitationChip, ReadinessPill, Shape, StatusPill, readinessMeta } from "@/src/components/ui";
import { useTrace } from "@/src/components/domain/Trace";
import { DraftText } from "./RichText";
import type { LocalDone } from "./blocks";

type B = Extract<ResolvedBlock, { kind: "brsr" }>;
type Choice = "upload" | "none" | "disclose";
type Stage = "gaps" | "generating" | "draft";

const GENERATING_MS = 2000;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ReadinessList({ docs, uploaded }: { docs: DocumentRecord[]; uploaded: Set<string> }) {
  const shown = docs.map((d) => (uploaded.has(d.id) ? { ...d, state: "Ready" as const, detail: "Uploaded (demo)" } : d));
  const counts = readinessCounts(shown);
  return (
    <div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Document readiness">
        {READINESS_STATES.map((s) => (
          <li key={s} className={`tone-${readinessMeta[s].tone} rounded-tile border border-[var(--t-line)] bg-[var(--t-bg)] px-3 py-2 text-[var(--t-fg)]`}>
            <p className="num font-display text-[22px] font-bold leading-7">{counts[s]}</p>
            <p className="text-sm font-semibold">{s}</p>
          </li>
        ))}
      </ul>
      <ul className="mt-3 divide-y divide-line rounded-tile border border-line px-4">
        {shown.map((d) => (
          <li key={d.id} className="flex items-start gap-3 py-2.5">
            <span className={`tone-${readinessMeta[d.state].tone} mt-1.5 text-[var(--t-fill)]`}><Shape kind={readinessMeta[d.state].shape} className="size-3.5" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-900">{d.name}</p>
              <p className="text-sm text-ink-500">{d.period}{d.detail ? ` · ${d.detail}` : ""}</p>
            </div>
            <ReadinessPill state={d.state} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const CHOICES: { id: Choice; label: string }[] = [
  { id: "upload", label: "Upload now" },
  { id: "none", label: "Use a ‘no evidence’ placeholder" },
  { id: "disclose", label: "Disclose the gap" },
];

function GapRow({ gap, choice, onChoose }: { gap: Gap; choice: Choice | undefined; onChoose: (c: Choice) => void }) {
  return (
    <li className="rounded-tile border border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ReadinessPill state={gap.state} />
        <p className="font-semibold text-ink-900">{gap.name}</p>
      </div>
      {gap.detail && <p className="mt-1 text-ink-500">{gap.detail}</p>}
      {choice === "upload" ? (
        <p className="mt-3 flex items-center gap-2 font-semibold text-[var(--positive-fg)]" role="status"><Check className="size-5" aria-hidden="true" /> Uploaded (demo). This document is now Ready.</p>
      ) : (
        <div role="group" aria-label={`What to do about ${gap.label}`} className="mt-3 flex flex-wrap gap-2">
          {CHOICES.map((c) => (
            <button
              key={c.id} type="button" aria-pressed={choice === c.id} onClick={() => onChoose(c.id)}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${choice === c.id ? "border-blue-600 bg-blue-600 text-white" : "border-line bg-card text-ink-700 hover:bg-blue-50"}`}
            >
              {c.id === "upload" && <Upload className="mr-1.5 inline size-4 align-text-bottom" aria-hidden="true" />}{c.label}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

/**
 * The BRSR Principle 6 flow (PRODUCT 9, E1): readiness, a choice for each gap, a short "generating" step, then the cited
 * draft. The agent never estimates: a gap that is not uploaded becomes a placeholder, never a number.
 */
export function BrsrBlock({ block, onLocal }: { block: B; onLocal: (d: LocalDone) => void }) {
  const [stage, setStage] = useState<Stage>("gaps");
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [approved, setApproved] = useState(false);
  const { open } = useTrace();

  const uploaded = useMemo(() => new Set(Object.entries(choices).filter(([, c]) => c === "upload").map(([id]) => id)), [choices]);

  useEffect(() => {
    if (stage !== "generating") return;
    const t = window.setTimeout(() => setStage("draft"), prefersReducedMotion() ? 0 : GENERATING_MS);
    return () => window.clearTimeout(t);
  }, [stage]);

  if (!block.available) return null;
  const open_gaps = block.gaps.filter((g) => !uploaded.has(g.docId));
  const placeholders = open_gaps.map((g) => (choices[g.docId] === "disclose" ? g.disclose : g.none));

  return (
    <div className="space-y-5">
      <section aria-labelledby="brsr-step1">
        <h4 id="brsr-step1" className="mb-2">Step 1 · Readiness</h4>
        <ReadinessList docs={block.docs} uploaded={uploaded} />
      </section>

      {stage === "gaps" && (
        <section aria-labelledby="brsr-step2">
          <h4 id="brsr-step2" className="mb-2">Step 2 · What to do about each gap</h4>
          {block.gaps.length === 0 ? (
            <p className="text-ink-700">Every document is ready.</p>
          ) : (
            <>
              <p className="mb-3 text-ink-700">I never estimate. A gap you leave stays a gap in the draft.</p>
              <ul className="space-y-3">{block.gaps.map((g) => <GapRow key={g.docId} gap={g} choice={choices[g.docId]} onChoose={(c) => setChoices((x) => ({ ...x, [g.docId]: c }))} />)}</ul>
            </>
          )}
          <button type="button" onClick={() => setStage("generating")} className="btn btn-primary mt-4">Generate draft</button>
        </section>
      )}

      {stage === "generating" && (
        <section aria-live="polite">
          <h4 className="mb-2">Step 3 · Generating draft</h4>
          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-label="Generating the draft">
            <div className="h-full rounded-full bg-blue-600" style={{ width: "100%", animation: `gen-fill ${GENERATING_MS}ms ease-out` }} />
          </div>
          <p className="mt-2 text-ink-500">Collecting the figures and their sources.</p>
        </section>
      )}

      {stage === "draft" && (
        <section aria-labelledby="brsr-step4">
          <h4 id="brsr-step4" className="mb-2">Step 4 · Review the draft</h4>
          <article className="rounded-tile border border-line bg-card p-5 shadow-card">
            <h5 className="font-display text-lg font-semibold text-ink-900">{block.draft.title}</h5>
            <p className="mt-1 text-sm text-ink-500">Select a sentence to see its source.</p>
            <ol className="mt-3 space-y-2.5">
              {block.draft.sentences.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => open(s.trace)} className="w-full rounded-tile p-2 text-left leading-8 text-ink-700 hover:bg-blue-50">
                    <DraftText text={s.text} />{" "}
                    <span className="ml-1 align-middle"><CitationChip label={s.cite} /></span>
                  </button>
                </li>
              ))}
              {placeholders.map((p) => (
                <li key={p} className="rounded-tile border border-[var(--caution-line)] bg-[var(--caution-bg)] px-3 py-2 font-semibold text-[var(--caution-fg)]">{p}</li>
              ))}
            </ol>
          </article>
          <p className="mt-3 text-sm text-ink-500">{block.draft.footer}</p>
          <div className="mt-3">
            {approved ? (
              <span role="status"><StatusPill tone="positive" shape="circle" label="Draft approved and logged" /></span>
            ) : (
              <button
                type="button" className="btn btn-primary"
                onClick={() => { setApproved(true); onLocal({ id: "approve-draft", label: "Approve draft", done: `Approved the BRSR Principle 6 draft for ${block.factoryName}.` }); }}
              >
                <FileCheck2 className="size-4" aria-hidden="true" /> Approve draft
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
