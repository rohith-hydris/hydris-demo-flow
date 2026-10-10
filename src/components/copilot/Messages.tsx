"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronDown, Circle, Loader2 } from "lucide-react";
import { agentById } from "@/src/lib/copilot";
import type { ResolvedAnswer, ResolvedBlock, ResolvedCase } from "@/src/lib/copilot";
import type { AgentId } from "@/src/data/copilotScripts";
import type { Role } from "@/src/lib/roles";
import { AgentAvatar } from "./agentUi";
import { AvgGridBlock, ActionsBlock, CitationsBlock, OffTrackBlock, RankingBlock, RichText, TableBlock, TechTableBlock, type LocalDone } from "./blocks";
import { BrsrBlock } from "./BrsrBlock";
import { BusinessCaseCard } from "./BusinessCaseCard";
import { ChecklistBlock, InspectionBlock } from "./ChecklistBlock";
import { GapReportBlock } from "./GapReportBlock";

export type Msg =
  | { id: string; kind: "user"; text: string }
  // `prompts` are the suggestions offered under a reply, fixed at the moment it was sent (they do not change with the agent later).
  | { id: string; kind: "assistant"; agent: AgentId; answer: ResolvedAnswer | null; reply?: string; prompts?: { id: string; text: string }[]; animate: boolean; thenQueued?: boolean }
  | { id: string; kind: "case"; item: ResolvedCase }
  | { id: string; kind: "notice"; text: string };

const TOOL_MS_MIN_TOTAL = 1500;
const TOOL_MS_MAX_TOTAL = 3000;
const STREAM_MS_PER_WORD = 20;
const STREAM_MS_MAX = 1500;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** While streaming, close any open **bold** so half a phrase never shows stray asterisks. */
const closeBold = (s: string) => ((s.match(/\*\*/g) ?? []).length % 2 === 1 ? `${s}**` : s);

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[70%] rounded-[24px] rounded-br-md bg-blue-600 px-5 py-3 text-white">{text}</p>
    </div>
  );
}

export function NoticeLine({ text }: { text: string }) {
  return <p className="mx-auto w-fit rounded-full bg-blue-50 px-4 py-1.5 text-sm text-ink-500" role="status">{text}</p>;
}

function WorkingStrip({ tools, step, working }: { tools: string[]; step: number; working: boolean }) {
  const [open, setOpen] = useState(false);
  const showChips = working || open;
  return (
    <div className="my-3">
      {working ? (
        <p className="mb-1.5 text-sm font-semibold text-ink-700" aria-live="polite">Working</p>
      ) : (
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-blue-600 hover:underline">
          Used {tools.length} {tools.length === 1 ? "tool" : "tools"} <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      )}
      {showChips && (
        <ul className="flex flex-wrap gap-2" aria-label="Tools">
          {tools.map((t, i) => {
            const done = !working || i < step;
            const active = working && i === step;
            return (
              <li key={t} className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-panel-line bg-blue-50 px-2.5 font-mono text-[13px] text-ink-700">
                {done ? <Check className="size-3.5 text-[var(--positive-fg)]" aria-hidden="true" /> : active ? <Loader2 className="size-3.5 animate-spin text-blue-600" aria-hidden="true" /> : <Circle className="size-3.5 text-ink-300" aria-hidden="true" />}
                {t}
                <span className="sr-only">{done ? "done" : active ? "running" : "waiting"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BlockView({ block, role, onLocal }: { block: ResolvedBlock; role: Role; onLocal: (d: LocalDone) => void }): ReactNode {
  switch (block.kind) {
    case "text": return <RichText text={block.text} className="text-ink-700" />;
    case "ranking": return <RankingBlock block={block} />;
    case "avgGrid": return <AvgGridBlock block={block} />;
    case "table": return <TableBlock block={block} />;
    case "offTrack": return <OffTrackBlock block={block} />;
    case "techTable": return <TechTableBlock block={block} />;
    case "checklist": return <ChecklistBlock block={block} />;
    case "inspection": return <InspectionBlock block={block} />;
    case "brsr": return <BrsrBlock block={block} onLocal={onLocal} />;
    case "gapReport": return <GapReportBlock block={block} role={role} onLocal={onLocal} />;
    case "citations": return <CitationsBlock items={block.items} />;
    case "actions": return <ActionsBlock items={block.items} onLocal={onLocal} />;
  }
}

/**
 * An assistant answer. A new one plays as a short scripted sequence (PRODUCT 4.7): the tool chips tick one by one over
 * about 1.5 to 3 seconds, then the lead sentence streams in at 20 ms a word (never more than 1.5 s), then the rest appears.
 * Reduced motion shows the finished answer at once.
 */
export function AssistantMessage({ msg, role, onDone, onGrow, onLocal, renderPrompts }: {
  msg: Extract<Msg, { kind: "assistant" }>; role: Role; onDone: (id: string) => void; onGrow: () => void; onLocal: (d: LocalDone) => void;
  renderPrompts: (items: { id: string; text: string }[]) => ReactNode;
}) {
  const { answer, reply } = msg;
  const tools = answer?.tools ?? [];
  const lead = answer?.blocks[0]?.kind === "text" ? answer.blocks[0].text : (reply ?? "");
  const [phase, setPhase] = useState<"working" | "streaming" | "done">(() => (!msg.animate || reducedMotion() ? "done" : tools.length > 0 ? "working" : lead ? "streaming" : "done"));
  const [step, setStep] = useState(0);
  const [words, setWords] = useState(0);
  const leadWords = lead ? lead.split(/\s+/) : [];

  // Tools tick one by one.
  useEffect(() => {
    if (phase !== "working") return;
    const total = Math.min(TOOL_MS_MAX_TOTAL, Math.max(TOOL_MS_MIN_TOTAL, tools.length * 750));
    const timer = window.setTimeout(() => {
      if (step + 1 >= tools.length) setPhase(lead ? "streaming" : "done");
      else setStep((s) => s + 1);
    }, total / tools.length);
    return () => window.clearTimeout(timer);
  }, [phase, step, tools.length, lead]);

  // The lead sentence streams in word by word.
  useEffect(() => {
    if (phase !== "streaming") return;
    const every = Math.min(STREAM_MS_PER_WORD, STREAM_MS_MAX / Math.max(1, leadWords.length));
    const timer = window.setInterval(() => {
      setWords((w) => {
        if (w + 1 >= leadWords.length) { window.clearInterval(timer); setPhase("done"); return leadWords.length; }
        return w + 1;
      });
    }, every);
    return () => window.clearInterval(timer);
  }, [phase, leadWords.length]);

  // Tell the page when this answer has finished playing (it then starts any follow-on), and keep it scrolled into view.
  useEffect(() => {
    onGrow();
    if (phase === "done" && msg.animate) onDone(msg.id);
  }, [phase, msg.animate, msg.id, onDone, onGrow]);

  const agent = agentById(msg.agent);
  const working = phase === "working";
  const showRest = phase === "done";
  const visibleLead = phase === "done" ? lead : leadWords.slice(0, words).join(" ");
  const rest = answer ? (answer.blocks[0]?.kind === "text" ? answer.blocks.slice(1) : answer.blocks) : [];

  return (
    <div className="flex items-start gap-3">
      <AgentAvatar agent={msg.agent} />
      <div className="card min-w-0 flex-1 p-5">
        <p className="text-sm font-semibold text-ink-500">{agent.name}</p>
        {answer?.routeNote && <p className="mt-2 rounded-tile bg-blue-50 p-3 text-ink-700">{answer.routeNote}</p>}
        {tools.length > 0 && <WorkingStrip tools={tools} step={step} working={working} />}

        {phase !== "working" && lead && (
          <div className="mt-2">
            {phase === "streaming" ? (
              <>
                <span className="sr-only">{lead}</span>
                <span aria-hidden="true"><RichText text={closeBold(visibleLead)} className="text-ink-700" /></span>
              </>
            ) : answer?.blocks[0]?.kind === "text" ? (
              <RichText text={lead} className="text-ink-700" />
            ) : (
              <p className="text-ink-700">{lead}</p>
            )}
          </div>
        )}

        {showRest && rest.length > 0 && (
          <div className="tab-fade mt-4 space-y-4">
            {rest.map((b, i) => <BlockView key={i} block={b} role={role} onLocal={onLocal} />)}
          </div>
        )}
        {showRest && msg.prompts && msg.prompts.length > 0 && <div className="tab-fade mt-4">{renderPrompts(msg.prompts)}</div>}
      </div>
    </div>
  );
}

export function CaseMessage({ item }: { item: ResolvedCase }) {
  return (
    <div className="flex items-start gap-3">
      <AgentAvatar agent="copilot" />
      <div className="card tab-fade min-w-0 flex-1 p-5">
        <p className="mb-3 text-sm font-semibold text-ink-500">{agentById("copilot").name}</p>
        <BusinessCaseCard item={item} />
      </div>
    </div>
  );
}
