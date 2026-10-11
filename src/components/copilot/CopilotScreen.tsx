"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Lock, Send } from "lucide-react";
import { useProjects } from "@/src/context/ProjectsContext";
import { agents, scripts, type AgentId } from "@/src/data/copilotScripts";
import { liteFindings } from "@/src/data/opportunities";
import { suppliers } from "@/src/data/suppliers";
import {
  PERIOD_LABEL, VALIDATION_BRAND_ONLY_REPLY, agentAllowed, agentById, buildAnswer, buildBusinessCase, copilotScope, interpretLink, interpretText, promptFor,
  scopeChipText, suggestedScripts, type Interpretation,
} from "@/src/lib/copilot";
import type { Role } from "@/src/lib/roles";
import { tenantFor } from "@/src/lib/roles";
import { makeTokenCtx, type CopilotScope } from "@/src/lib/tokens";
import { AppMain, PageHeader } from "@/src/components/ui";
import { AGENT_ICON, AGENT_TINT, AgentAvatar } from "./agentUi";
import type { LocalDone } from "./blocks";
import { AssistantMessage, CaseMessage, NoticeLine, UserBubble, type Msg } from "./Messages";

// Copilot (PRODUCT 4.7, DESIGN 5.7): a scripted chat with three agents. The conversation is kept while the person moves
// around the app (it lives in this module, not in the page), and is cleared when the role changes or the page is reloaded.
const store: { role: Role | null; messages: Msg[]; agent: AgentId; supplierScope: string | null; log: string[] } = {
  role: null, messages: [], agent: "copilot", supplierScope: null, log: [],
};

let counter = 0;
const nid = () => `m${++counter}`;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Turn an interpretation into the messages it adds to the thread. */
function toMessages(r: Interpretation, role: Role, cscope: CopilotScope, agent: AgentId): Msg[] {
  const out: Msg[] = [];
  if (r.userText) out.push({ id: nid(), kind: "user", text: r.userText });
  if (r.reply !== undefined) {
    const forAgent = r.agent ?? agent;
    const prompts = r.showPrompts ? suggestedScripts(forAgent, role, cscope).map((s) => ({ id: s.id, text: promptFor(s, role, cscope) })) : undefined;
    out.push({ id: nid(), kind: "assistant", agent: forAgent, answer: null, reply: r.reply, prompts, animate: true });
  } else if (r.play) {
    const answer = buildAnswer(r.play.script, makeTokenCtx(cscope, r.play.params), r.routeNote);
    out.push({ id: nid(), kind: "assistant", agent: answer.agent, answer, animate: true });
  }
  return out;
}

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open, close]);
  return ref;
}

function PromptButtons({ items, onPick, layout }: { items: { id: string; text: string }[]; onPick: (text: string) => void; layout: "grid" | "row" | "wrap" }) {
  const cls = layout === "grid" ? "grid gap-3 sm:grid-cols-2" : layout === "row" ? "flex gap-2 overflow-x-auto pb-1" : "flex flex-wrap gap-2";
  return (
    <ul className={cls} aria-label="Suggested questions">
      {items.map((p) => (
        <li key={p.id} className={layout === "row" ? "shrink-0" : ""}>
          <button type="button" onClick={() => onPick(p.text)} className={`min-h-12 rounded-full border border-panel-line bg-card px-5 text-left font-semibold text-ink-900 hover:bg-blue-50 ${layout === "grid" ? "w-full" : ""}`}>
            {p.text}
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---- The agent list in the left rail and the agent menu in the composer ---------------------------------------------
function AgentRow({ id, role, selected, onPick }: { id: AgentId; role: Role; selected: boolean; onPick: (id: AgentId) => void }) {
  const a = agentById(id);
  const locked = !agentAllowed(id, role);
  return (
    <button
      type="button" role="radio" aria-checked={selected} aria-disabled={locked || undefined} onClick={() => onPick(id)}
      title={locked ? "Available to brand accounts" : undefined}
      className={`flex w-full items-start gap-3 rounded-tile border p-3 text-left ${selected ? "border-blue-600 bg-blue-50" : "border-line bg-card hover:bg-blue-50"} ${locked ? "opacity-70" : ""}`}
    >
      <AgentAvatar agent={id} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
          {a.name}
          {a.brandOnly && (
            <span className="inline-flex min-h-6 items-center gap-1 rounded-full bg-[var(--internal-bg)] px-2 text-xs font-semibold text-[var(--internal-fg)]">
              {locked && <Lock className="size-3" aria-hidden="true" />}Brand only
            </span>
          )}
        </span>
        <span className="block text-sm text-ink-500">{locked ? "Available to brand accounts" : a.blurb}</span>
      </span>
    </button>
  );
}

function AgentPillMenu({ agent, role, onPick }: { agent: AgentId; role: Role; onPick: (id: AgentId) => void }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useOutsideClose(open, close);
  const Icon = AGENT_ICON[agent];
  return (
    <div ref={ref} className="relative">
      <button
        type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full pl-3 pr-3 font-semibold ${AGENT_TINT[agent]}`}
      >
        <Icon className="size-4" aria-hidden="true" />
        <span className="max-w-60 truncate">{agentById(agent).name}</span>
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" aria-label="Choose an agent" className="card absolute bottom-full left-0 z-30 mb-2 w-80 p-2 shadow-raised">
          {agents.map((a) => {
            const locked = !agentAllowed(a.id, role);
            const I = AGENT_ICON[a.id];
            return (
              <button
                key={a.id} type="button" role="menuitemradio" aria-checked={a.id === agent} aria-disabled={locked || undefined}
                onClick={() => { onPick(a.id); setOpen(false); }}
                className="flex min-h-12 w-full items-center gap-3 rounded-tile px-3 text-left hover:bg-blue-50"
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${AGENT_TINT[a.id]}`}><I className="size-4" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink-900">{a.name}</span>
                  {locked && <span className="flex items-center gap-1 text-sm text-ink-500"><Lock className="size-3.5" aria-hidden="true" />Available to brand accounts</span>}
                </span>
                {a.id === agent && <Check className="size-5 text-blue-600" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- The scope and period chip ----------------------------------------------------------------------------------------------
function ScopeChip({ role, cscope, onPick }: { role: Role; cscope: CopilotScope; onPick: (supplierId: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useOutsideClose(open, close);
  const chip = "inline-flex min-h-11 items-center gap-2 rounded-full border border-panel-line bg-card px-4 text-sm font-semibold text-ink-700";
  if (role === "supplier") {
    return <p className={chip}>Scope and period: {scopeChipText(cscope)}</p>;
  }
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`${chip} hover:bg-blue-50`}>
        Scope and period: {scopeChipText(cscope)} <ChevronDown className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" aria-label="Scope and period" className="card absolute left-0 top-full z-30 mt-2 w-80 p-2 shadow-raised">
          <p className="px-3 pb-1 pt-2 text-sm font-semibold text-ink-500">Scope</p>
          {[{ id: null as string | null, name: "All suppliers" }, ...suppliers.map((s) => ({ id: s.id as string | null, name: s.name }))].map((o) => (
            <button key={o.id ?? "all"} type="button" role="menuitemradio" aria-checked={cscope.supplierId === o.id} onClick={() => { onPick(o.id); setOpen(false); }} className="flex min-h-11 w-full items-center justify-between rounded-tile px-3 text-left hover:bg-blue-50">
              <span className="text-ink-900">{o.name}</span>{cscope.supplierId === o.id && <Check className="size-5 text-blue-600" aria-hidden="true" />}
            </button>
          ))}
          <p className="px-3 pb-1 pt-3 text-sm font-semibold text-ink-500">Period</p>
          <button type="button" role="menuitemradio" aria-checked className="flex min-h-11 w-full items-center justify-between rounded-tile px-3 text-left" onClick={() => setOpen(false)}>
            <span className="text-ink-900">{PERIOD_LABEL}</span><Check className="size-5 text-blue-600" aria-hidden="true" />
          </button>
          <p role="menuitemradio" aria-checked={false} aria-disabled="true" className="px-3 py-2 text-ink-500">September 2026 (monitoring month) is not available in this demo.</p>
        </div>
      )}
    </div>
  );
}

export default function CopilotScreen({ role }: { role: Role }) {
  const router = useRouter();
  const params = useSearchParams();
  const restored = store.role === role;

  const [supplierScope, setSupplierScope] = useState<string | null>(() => (restored ? store.supplierScope : null));
  const cscope = useMemo(() => copilotScope(role, supplierScope), [role, supplierScope]);

  // A "Validate with agent" or evidence button opens /copilot with the item in the address. Read it once, at the start.
  const [boot] = useState(() =>
    interpretLink(
      { agent: params.get("agent"), claim: params.get("claim"), report: params.get("report"), inspection: params.get("inspection"), task: params.get("task"), factory: params.get("factory") },
      role, copilotScope(role, restored ? store.supplierScope : null),
    ),
  );
  const [agent, setAgent] = useState<AgentId>(() => boot?.agent ?? (restored ? store.agent : "copilot"));
  const [messages, setMessages] = useState<Msg[]>(() => [
    // Coming back to the page shows the finished conversation, including a hand-over that had not yet played.
    ...(restored
      ? store.messages.flatMap((m): Msg[] => {
          if (m.kind !== "assistant") return [m];
          const followOn: Msg[] = m.answer?.then && !m.thenQueued ? [{ id: nid(), kind: "assistant", agent: m.answer.then.agent, answer: m.answer.then, animate: false }] : [];
          return [{ ...m, animate: false, thenQueued: true }, ...followOn];
        })
      : []),
    ...(boot ? toMessages(boot, role, copilotScope(role, restored ? store.supplierScope : null), restored ? store.agent : "copilot") : []),
  ]);
  const [log, setLog] = useState<string[]>(() => (restored ? store.log : []));
  const [input, setInput] = useState("");
  const [tick, setTick] = useState(0);
  const [announce, setAnnounce] = useState("");
  const thread = useRef<HTMLDivElement>(null);

  useEffect(() => { if (boot) router.replace("/copilot", { scroll: false }); }, [boot, router]);
  useEffect(() => { store.role = role; store.messages = messages; store.agent = agent; store.supplierScope = supplierScope; store.log = log; });
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: reducedMotion() ? "auto" : "smooth" });
  }, [messages.length, tick]);

  const { importMany } = useProjects();
  const apply = (r0: Interpretation) => {
    let r = r0;
    // C9 imports for real in the Projects state, so asking twice is answered "already imported" and Opportunities shows the result.
    if (r.play?.script.id === "C9") {
      const found = liteFindings.filter((f) => f.factoryId === "F12" && cscope.scope.factoryIds.includes(f.factoryId));
      r = { ...r, play: { ...r.play, params: { ...r.play.params, lite: importMany(found) } } };
    }
    const target = r.play?.script.routeTo ? scripts.find((s) => s.id === r.play!.script.routeTo)!.agent : r.agent;
    if (target) setAgent(target);
    setMessages((m) => [...m, ...toMessages(r, role, cscope, agent)]);
  };
  const send = (text: string) => { const t = text.trim(); if (t) apply(interpretText(t, role, agent, cscope)); };
  const submit = (e: React.FormEvent) => { e.preventDefault(); send(input); setInput(""); };

  const selectAgent = (id: AgentId) => {
    if (!agentAllowed(id, role)) {
      // A supplier who selects the Validation agent is told it is for brand accounts (PRODUCT 4.7).
      setMessages((m) => [...m, { id: nid(), kind: "assistant", agent, answer: null, reply: VALIDATION_BRAND_ONLY_REPLY, animate: true }]);
      return;
    }
    setAgent(id);
    setAnnounce(`${agentById(id).name} selected.`);
  };

  const changeScope = (id: string | null) => {
    setSupplierScope(id);
    const next = copilotScope(role, id);
    setMessages((m) => [...m, { id: nid(), kind: "notice", text: `Scope set to ${scopeChipText(next)}. New answers use this scope.` }]);
  };

  const onDone = useCallback((id: string) => {
    setMessages((ms) => {
      const i = ms.findIndex((m) => m.id === id);
      const m = ms[i];
      if (i < 0 || m.kind !== "assistant") return ms;
      const next = ms.slice();
      next[i] = { ...m, animate: false, thenQueued: true };
      // A routing answer (C5) hands over to the answer it points at once it has played.
      if (m.answer?.then && !m.thenQueued) next.splice(i + 1, 0, { id: nid(), kind: "assistant", agent: m.answer.then.agent, answer: m.answer.then, animate: true });
      return next;
    });
  }, []);
  const onGrow = useCallback(() => setTick((t) => t + 1), []);

  const onLocal = (d: LocalDone) => {
    setLog((l) => [...l, d.done]);
    if (d.id === "business-case") setMessages((m) => [...m, { id: nid(), kind: "case", item: buildBusinessCase(makeTokenCtx(cscope)) }]);
  };

  const prompts = suggestedScripts(agent, role, cscope).map((s) => ({ id: s.id, text: promptFor(s, role, cscope) }));
  const railPrompts = suggestedScripts(agent, role, cscope).map((s) => ({ id: s.id, text: promptFor(s, role, cscope), short: s.short }));
  const tenant = tenantFor(role);
  const current = agentById(agent);
  const renderPrompts = (items: { id: string; text: string }[]): ReactNode => <PromptButtons items={items} onPick={send} layout="wrap" />;

  return (
    <>
      <PageHeader
        title="Copilot"
        subtitle={role === "brand"
          ? "Ask about risk, ranking and impact, check evidence, and validate claims. Every figure shows where it came from."
          : "Ask about your own factories. Every figure shows where it came from."}
        meta={<p className="text-ink-500">{tenant.name}</p>}
      />
      <AppMain>
        {/* Below desktop width the agents sit in a bar above the chat. */}
        <div role="radiogroup" aria-label="Agent" className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
          {agents.map((a) => {
            const locked = !agentAllowed(a.id, role);
            const I = AGENT_ICON[a.id];
            return (
              <button key={a.id} type="button" role="radio" aria-checked={a.id === agent} aria-disabled={locked || undefined} onClick={() => selectAgent(a.id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 font-semibold ${a.id === agent ? "border-blue-600 bg-blue-50 text-ink-900" : "border-line bg-card text-ink-700"} ${locked ? "opacity-70" : ""}`}>
                <I className="size-4" aria-hidden="true" />{a.name}{locked && <Lock className="size-3.5" aria-label="Available to brand accounts" />}
              </button>
            );
          })}
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-12">
          <aside className="hidden space-y-5 lg:col-span-3 lg:block" aria-label="Agents and prompts">
            <div className="card p-4">
              <h3 className="mb-3">Agents</h3>
              <div role="radiogroup" aria-label="Agent" className="space-y-2">
                {agents.map((a) => <AgentRow key={a.id} id={a.id} role={role} selected={a.id === agent} onPick={selectAgent} />)}
              </div>
            </div>
            <div className="card p-4">
              <h3 className="mb-3">Try asking</h3>
              <ul className="space-y-1">
                {railPrompts.map((p) => (
                  <li key={p.id}><button type="button" onClick={() => send(p.text)} className="min-h-11 w-full rounded-tile px-3 text-left text-ink-700 hover:bg-blue-50">{p.short}</button></li>
                ))}
              </ul>
            </div>
            {log.length > 0 && (
              <div className="card p-4">
                <h3 className="mb-2">Session log</h3>
                <ul className="space-y-1.5 text-sm text-ink-700" aria-label="Actions logged in this session">
                  {log.slice(-6).map((l, i) => <li key={`${i}-${l}`} className="rounded-tile bg-blue-50 px-3 py-2">{l}</li>)}
                </ul>
              </div>
            )}
          </aside>

          <section className="card flex min-w-0 flex-col p-0 lg:col-span-9" aria-label="Conversation">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
              <div className="flex items-center gap-3"><AgentAvatar agent={agent} /><div><p className="font-semibold text-ink-900">{current.name}</p><p className="text-sm text-ink-500">{current.blurb}</p></div></div>
            </div>

            {/* `relative` keeps screen-reader-only text (position: absolute) inside this scroll area. Without it that text sits
                where it falls in the page and stretches the page's height as the conversation grows. */}
            <div ref={thread} role="log" aria-label="Conversation" className="relative h-[min(62vh,620px)] min-h-[360px] space-y-5 overflow-y-auto px-5 py-5">
              {messages.length === 0 ? (
                <div className="mx-auto max-w-2xl pt-4">
                  <AgentAvatar agent={agent} />
                  <h2 className="mt-3 text-[26px] leading-9">Ask the {current.name}</h2>
                  <p className="mb-5 mt-1 text-ink-500">Pick a question to start. In this demo the answers are scripted, and every figure comes from the same data as the screens.</p>
                  {prompts.length > 0 ? <PromptButtons items={prompts} onPick={send} layout="grid" /> : <p className="text-ink-500">There are no suggested questions for this agent in your scope.</p>}
                </div>
              ) : (
                messages.map((m) =>
                  m.kind === "user" ? <UserBubble key={m.id} text={m.text} />
                  : m.kind === "notice" ? <NoticeLine key={m.id} text={m.text} />
                  : m.kind === "case" ? <CaseMessage key={m.id} item={m.item} />
                  : <AssistantMessage key={m.id} msg={m} role={role} onDone={onDone} onGrow={onGrow} onLocal={onLocal} renderPrompts={renderPrompts} />,
                )
              )}
            </div>

            <div className="space-y-3 border-t border-line px-5 py-4">
              {messages.length > 0 && prompts.length > 0 && <PromptButtons items={prompts} onPick={send} layout="row" />}
              <ScopeChip role={role} cscope={cscope} onPick={changeScope} />
              <form onSubmit={submit} className="flex flex-wrap items-center gap-3 rounded-[28px] border border-line bg-card p-2 pl-3 shadow-card">
                <AgentPillMenu agent={agent} role={role} onPick={selectAgent} />
                <label htmlFor="copilot-input" className="sr-only">Ask a question</label>
                <input
                  id="copilot-input" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" placeholder={`${current.placeholder}…`}
                  className="min-h-11 min-w-48 flex-1 bg-transparent px-2 text-base text-ink-900 placeholder:text-ink-500 focus:outline-none"
                />
                <button type="submit" aria-label="Send" disabled={!input.trim()} className="btn btn-primary size-11 min-h-0 px-0"><Send className="size-5" aria-hidden="true" /></button>
              </form>
            </div>
          </section>
        </div>
        <p className="sr-only" role="status" aria-live="polite">{announce}</p>
      </AppMain>
    </>
  );
}
