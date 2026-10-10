import {
  FALLBACK_REPLY, NO_METER_DATA_REPLY, ROUTE_TO_COPILOT, ROUTE_TO_EVIDENCE, ROUTE_TO_VALIDATION, UNSCRIPTED_ITEM_REPLY, agents, brsrDraft, businessCase,
  gapActionByState, scripts, validationTargets,
  type ActionSpec, type AgentId, type BlockSpec, type CitationSpec, type LocalActionId, type ScriptDef, type ScriptId,
} from "@/src/data/copilotScripts";
import { inspections } from "@/src/data/inspections";
import { ledger } from "@/src/data/ledger";
import { projects } from "@/src/data/projects";
import { suppliers } from "@/src/data/suppliers";
import { SUPPLIER_TENANT } from "@/src/data/tenants";
import type { DocumentRecord, InspectionStep } from "@/src/data/types";
import { documentsForFactory, readinessCounts, trustScore } from "./claims";
import { fmtDaysAgo, fmtScore } from "./format";
import { waterBalance } from "./impact";
import { PILLAR_NAMES, DIMENSIONS, PILLARS } from "./pwi";
import type { Role } from "./roles";
import { OUT_OF_SCOPE_REPLY, VALIDATION_BRAND_ONLY_REPLY, scopeFor, type Scope } from "./scope";
import { GRADE_MEANING, traceLedgerEntry, type Trace } from "./trace";
import { fillTokens, makeTokenCtx, offTrackSites, rankedTechnologies, tokensIn, type CopilotScope, type TokenCtx } from "./tokens";
import type { Band, Dimension, Pillar, Quadrant, ReadinessState, Severity, Tier } from "./types";
import { severityRank } from "./ops";

export { OUT_OF_SCOPE_REPLY, VALIDATION_BRAND_ONLY_REPLY };
export { FALLBACK_REPLY as FALLBACK_REPLY_FOR_TESTS };

// The copilot engine: who is asking and about what (PRODUCT 2, 4.7), which script a question selects, and the answer built
// from the data layer. Everything here is pure, so it is tested without a browser.

// ---- Scope -------------------------------------------------------------------------------------------------------------------
export function copilotScope(role: Role, supplierId: string | null = null): CopilotScope {
  const base = scopeFor(role);
  if (role === "supplier") return { scope: base, kind: "own", supplierId: null, label: SUPPLIER_TENANT.name };
  const s = supplierId ? suppliers.find((x) => x.id === supplierId) : undefined;
  if (!s) return { scope: base, kind: "network", supplierId: null, label: "All suppliers" };
  const narrowed: Scope = { ...base, supplierIds: [s.id], factoryIds: [...s.factoryIds] };
  return { scope: narrowed, kind: "supplier", supplierId: s.id, label: s.name };
}

/** The period the demo's figures belong to. The September 2026 monitoring month has no separate figures. */
export const PERIOD_LABEL = "FY2025-26";
export const scopeChipText = (c: CopilotScope) => `${c.label} · ${PERIOD_LABEL}`;

export const agentAllowed = (agent: AgentId, role: Role) => !(agents.find((a) => a.id === agent)?.brandOnly && role !== "brand");
export const agentById = (id: AgentId) => agents.find((a) => a.id === id)!;

// ---- Suggested prompts -------------------------------------------------------------------------------------------------------
/** The site a script needs in scope. A BRSR draft needs the site it is for (Ambattur unless the question names another). */
export const requiredSite = (s: ScriptDef, params: { factoryId?: string } = {}) => (s.id === "E1" ? (params.factoryId ?? "F12") : s.requiresSite);

export function promptFor(s: ScriptDef, role: Role, cscope?: CopilotScope): string {
  if (s.id === "E2" && cscope?.kind === "supplier") return `Evidence gap report for ${cscope.label}`;
  return s.promptByRole?.[role] ?? s.prompt;
}

export function suggestedScripts(agent: AgentId, role: Role, cscope: CopilotScope): ScriptDef[] {
  return scripts.filter((s) => s.agent === agent && s.roles.includes(role) && (!requiredSite(s) || cscope.scope.factoryIds.includes(requiredSite(s)!)));
}

// ---- Reading a question ----------------------------------------------------------------------------------------------------
export interface PlayRequest { script: ScriptDef; params: { factoryId?: string; supplierId?: string } }
export interface Interpretation {
  /** Switch to this agent first. */
  agent?: AgentId;
  /** The text shown as the person's message. */
  userText: string;
  /** A fixed reply instead of a script. */
  reply?: string;
  /** Whether to show the suggested prompts under the reply (the fallback does). */
  showPrompts?: boolean;
  play?: PlayRequest;
  routeNote?: string;
}

const lower = (s: string) => s.toLowerCase();

/** The first factory, supplier, project or inspection in the text that is outside the scope in force, as a display name. */
export function outOfScopeMention(text: string, cscope: CopilotScope): string | null {
  const t = lower(text);
  const inScope = new Set(cscope.scope.factoryIds);
  const named: { id: string; name: string; keys: string[] }[] = [];
  for (const s of suppliers) {
    named.push({ id: s.id, name: s.name, keys: [lower(s.name), lower(s.id)] });
    if (cscope.scope.supplierIds.includes(s.id)) continue;
    if (named.at(-1)!.keys.some((k) => hasWord(t, k))) return s.name;
  }
  // Factories, by name or id, and the things that belong to a factory.
  const factories = suppliers.flatMap((s) => s.factoryIds.map((id) => ({ id, supplier: s })));
  for (const f of factories) {
    if (inScope.has(f.id)) continue;
    const name = factoryName(f.id);
    if (hasWord(t, lower(name)) || hasWord(t, lower(f.id))) return name;
  }
  for (const p of projects) if (!inScope.has(p.factoryId) && hasWord(t, lower(p.id))) return factoryName(p.factoryId);
  for (const i of inspections) if (!inScope.has(i.factoryId) && hasWord(t, lower(i.id))) return factoryName(i.factoryId);
  return null;
}

const hasWord = (text: string, key: string) => text.includes(key);
const factoryNames: Record<string, string> = {};
function factoryName(id: string): string {
  if (!factoryNames[id]) factoryNames[id] = makeTokenCtx(copilotScope("brand")).sites.find((s) => s.id === id)?.name ?? id;
  return factoryNames[id];
}

function scopeReply(name: string, cscope: CopilotScope): string {
  return cscope.kind === "own" ? OUT_OF_SCOPE_REPLY : `${name} is outside the current scope (${cscope.label}). Change the scope to include it.`;
}

/** Pick the factory or supplier a question names, if any (for the BRSR draft and the gap report). */
function paramsFromText(text: string, cscope: CopilotScope): PlayRequest["params"] {
  const t = lower(text);
  const params: PlayRequest["params"] = {};
  const ctx = makeTokenCtx(cscope);
  params.factoryId = ctx.sites.find((s) => t.includes(lower(s.name)))?.id;
  params.supplierId = suppliers.find((s) => cscope.scope.supplierIds.includes(s.id) && t.includes(lower(s.name)))?.id;
  return params;
}

/** The supplier a gap report covers when the question does not name one. */
export function defaultGapSupplier(role: Role, cscope: CopilotScope): string {
  if (cscope.kind === "supplier") return cscope.supplierId!;
  return role === "supplier" ? cscope.scope.supplierIds[0] : "SUP1";
}

const routeNoteFor = (to: AgentId) => (to === "validation" ? ROUTE_TO_VALIDATION : to === "evidence" ? ROUTE_TO_EVIDENCE : ROUTE_TO_COPILOT);

/** Which script a typed question selects: loose keyword match, preferring the selected agent's own scripts. */
export function matchScript(text: string, agent: AgentId): ScriptDef | null {
  const t = lower(text);
  const hits = scripts.filter((s) => s.match.some((words) => words.every((w) => t.includes(w))));
  return hits.find((s) => s.agent === agent) ?? hits[0] ?? null;
}

export function interpretText(text: string, role: Role, agent: AgentId, cscope: CopilotScope): Interpretation {
  const userText = text.trim();
  const mention = outOfScopeMention(userText, cscope);
  if (mention) return { userText, reply: scopeReply(mention, cscope) };

  // A supplier who asks for validation of anything gets the brand-only message, scripted item or not (PRODUCT 4.7).
  if (role !== "brand" && /\bvalidat(e|ion|ing)\b/i.test(userText)) return { userText, reply: VALIDATION_BRAND_ONLY_REPLY };

  const script = matchScript(userText, agent);
  if (!script) return { userText, reply: FALLBACK_REPLY, showPrompts: true };

  // The Validation agent is for brand accounts only (PRODUCT 2, 4.7).
  const touchesValidation = script.agent === "validation" || script.routeTo !== undefined;
  if (role !== "brand" && touchesValidation) return { userText, reply: VALIDATION_BRAND_ONLY_REPLY };

  const params = paramsFromText(userText, cscope);
  if (script.id === "E2" && !params.supplierId) params.supplierId = defaultGapSupplier(role, cscope);
  const need = requiredSite(script, params);
  if (need && !cscope.scope.factoryIds.includes(need)) return { userText, reply: scopeReply(factoryName(need), cscope) };

  if (script.roles.length && !script.roles.includes(role)) return { userText, reply: FALLBACK_REPLY, showPrompts: true };

  const play: PlayRequest = { script, params };
  if (script.agent !== agent) return { userText, agent: script.agent, play, routeNote: routeNoteFor(script.agent) };
  return { userText, play };
}

/** "Validate with agent" and the evidence agent buttons open /copilot with the item preloaded (PRODUCT 4.4, 4.6, 8). */
export interface LinkParams { agent?: string | null; claim?: string | null; report?: string | null; inspection?: string | null; task?: string | null; factory?: string | null }

export function interpretLink(p: LinkParams, role: Role, cscope: CopilotScope): Interpretation | null {
  const agent = (["copilot", "evidence", "validation"] as const).find((a) => a === p.agent);
  if (!agent) return null;

  if (agent === "validation") {
    if (role !== "brand") return { userText: "Validate with the Validation agent", reply: VALIDATION_BRAND_ONLY_REPLY };
    const item = p.claim ? `claim:${p.claim}` : p.report ? `report:${p.report}` : p.inspection ? `inspection:${p.inspection}` : null;
    if (!item) return { userText: "", agent: "validation" };
    const id = validationTargets[item];
    const label = item.split(":")[1];
    if (!id) return { userText: `Validate ${label}`, agent: "validation", reply: UNSCRIPTED_ITEM_REPLY, showPrompts: true };
    const script = scripts.find((s) => s.id === id)!;
    const need = requiredSite(script);
    if (need && !cscope.scope.factoryIds.includes(need)) return { userText: promptFor(script, role), agent: "validation", reply: scopeReply(factoryName(need), cscope) };
    return { userText: promptFor(script, role, cscope), agent: "validation", play: { script, params: {} } };
  }

  if (agent === "evidence" && (p.task === "brsr-p6" || p.task === "gap-report")) {
    const script = scripts.find((s) => s.id === (p.task === "brsr-p6" ? "E1" : "E2"))!;
    const factoryId = p.factory ?? undefined;
    const owner = factoryId ? suppliers.find((s) => s.factoryIds.includes(factoryId))?.id : undefined;
    const params = { factoryId, supplierId: script.id === "E2" ? (owner && cscope.scope.supplierIds.includes(owner) ? owner : defaultGapSupplier(role, cscope)) : undefined };
    const need = requiredSite(script, params);
    if (need && !cscope.scope.factoryIds.includes(need)) return { userText: promptFor(script, role), agent, reply: scopeReply(factoryName(need), cscope) };
    const named = factoryId ? factoryName(factoryId) : undefined;
    const text = script.id === "E1" ? `Give me the BRSR Principle 6 water report for ${named ?? factoryName("F12")}` : `Evidence gap report for ${suppliers.find((s) => s.id === params.supplierId)?.name}`;
    return { userText: text, agent, play: { script, params } };
  }
  return { userText: "", agent };
}

// ---- Resolved answers (plain data, so a conversation can be kept as it is) ---------------------------------------------------
export interface Gap { docId: string; name: string; label: string; state: ReadinessState; detail: string; none: string; disclose: string }
export interface GapRow { factoryId: string; factoryName: string; docName: string; state: ReadinessState | "Needs a look"; detail: string; owner: string; action: string }
export type ResolvedCitation = { label: string; href?: string; trace?: Trace };
export type ResolvedAction =
  | { kind: "navigate"; label: string; href: string; primary?: boolean }
  | { kind: "local"; label: string; id: LocalActionId; done: string; reasonRequired?: boolean; primary?: boolean };

export type ResolvedBlock =
  | { kind: "text"; text: string }
  | { kind: "ranking"; rows: { rank: number; id: string; name: string; band: Band; R: string; I: string; quadrant: Quadrant; tier: Tier }[] }
  | { kind: "avgGrid"; cells: { pillar: Pillar; dimension: Dimension; score: number }[]; weakest: string[] }
  | { kind: "table"; columns: string[]; rows: string[][] }
  | { kind: "offTrack"; groups: { supplier: string; plants: { id: string; name: string; severity: Severity; message: string; age: string | null }[] }[] }
  | { kind: "techTable"; weights: string; rows: { name: string; technicalFit: string; expectedBenefit: string; stability: string; dataQuality: string; match: string; note: string | null; top: boolean }[] }
  | { kind: "checklist"; title: string; checks: { name: string; result: "Pass" | "Warn" | "Fail"; reason?: string }[]; verdict: { label: string; tone: "negative" | "caution" | "positive" | "neutral"; effect: string } }
  | { kind: "inspection"; id: string; factory: string; date: string; steps: number; passed: number; trust: number; status: string; counts: { pass: number; warn: number; fail: number }; nonPass: InspectionStep[]; layers: string[] }
  | { kind: "brsr"; available: boolean; factoryId: string; factoryName: string; docs: DocumentRecord[]; gaps: Gap[]; draft: { title: string; sentences: { id: string; text: string; cite: string; trace: Trace }[]; footer: string } }
  | { kind: "gapReport"; supplierName: string; factories: { id: string; name: string; counts: Record<ReadinessState, number> }[]; gaps: GapRow[] }
  | { kind: "citations"; items: ResolvedCitation[] }
  | { kind: "actions"; items: ResolvedAction[] };

export interface ResolvedAnswer {
  scriptId: ScriptId; agent: AgentId; tools: string[];
  routeNote?: string;
  blocks: ResolvedBlock[];
  /** A routing answer (C5) hands over to this one once it has played. */
  then?: ResolvedAnswer;
}

/** A short, stable reference derived from text. Labelled "demo hash": the demo holds no real file hashes. */
export function demoHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `demo-${h.toString(16).padStart(8, "0")}`;
}

const LAYERS = ["Completeness", "Photo quality", "Matches instruction", "Authenticity", "Reasoning and readings"];
const STATE_VERB: Partial<Record<ReadinessState, string>> = { Missing: "not uploaded", "Failed check": "failed its check", "Expired / out of period": "expired", "Low confidence": "needs confirmation" };
const shortDocName = (n: string) => n.split(" (")[0].split(",")[0];
const STATE_ORDER: (ReadinessState | "Needs a look")[] = ["Failed check", "Missing", "Expired / out of period", "Low confidence", "Needs a look"];

export const gapsOf = (docs: DocumentRecord[]): Gap[] =>
  docs.filter((d) => d.state !== "Ready").map((d) => {
    const label = `${shortDocName(d.name)} ${STATE_VERB[d.state] ?? "has a gap"}`;
    return { docId: d.id, name: d.name, label, state: d.state, detail: d.detail, none: `[No evidence: ${label}]`, disclose: `[Disclosed gap: ${label}]` };
  });

function citation(c: CitationSpec, ctx: TokenCtx): ResolvedCitation {
  if (c.trace?.kind === "ledger") return { label: c.label, trace: traceLedgerEntry(ledger.find((l) => l.id === c.trace!.id)!) };
  return { label: c.label, href: c.href ? fillTokens(c.href, ctx) : undefined };
}

function action(a: ActionSpec, ctx: TokenCtx): ResolvedAction {
  return a.kind === "navigate"
    ? { kind: "navigate", label: a.label, href: fillTokens(a.href, ctx), primary: a.primary }
    : { kind: "local", label: a.label, id: a.id, done: fillTokens(a.done, ctx), reasonRequired: a.reasonRequired, primary: a.primary };
}

function brsrBlock(ctx: TokenCtx): Extract<ResolvedBlock, { kind: "brsr" }> {
  const factoryId = ctx.params.factoryId ?? "F12";
  const site = ctx.sites.find((s) => s.id === factoryId)!;
  const docs = documentsForFactory(factoryId);
  const available = waterBalance(factoryId) !== null;
  const sentences = available
    ? brsrDraft.sentences.map((s) => {
        const text = fillTokens(s.text, ctx);
        const sources = s.source.docs.map((id) => docs.find((d) => d.id === id)).filter((d): d is DocumentRecord => Boolean(d));
        const inputs = sources.flatMap((d) => [
          { label: "Document", value: d.name },
          { label: "Period", value: d.period },
          ...(d.detail ? [{ label: "Detail", value: d.detail }] : []),
          { label: "Demo hash", value: demoHash(`${d.id}:${d.name}`) },
        ]);
        if (s.source.note) inputs.push({ label: "Source", value: s.source.note }, { label: "Demo hash", value: demoHash(`${factoryId}:${s.id}`) });
        const trace: Trace = {
          title: s.source.title, value: (text.match(/\[\[(.+?)\]\]/)?.[1] ?? text),
          formula: s.source.formula, inputs, method: { name: "Evidence and Disclosure agent" },
          grade: { grade: site.evidenceGrade, meaning: GRADE_MEANING[site.evidenceGrade] },
          note: "Page, sheet and cell references are not held in the demo data. The hash is a demo reference, not a file hash.",
        };
        return { id: s.id, text, cite: s.cite, trace };
      })
    : [];
  return {
    kind: "brsr", available, factoryId, factoryName: site.name, docs, gaps: gapsOf(docs),
    draft: { title: fillTokens(brsrDraft.title, ctx), sentences, footer: brsrDraft.footer },
  };
}

function gapReportBlock(ctx: TokenCtx): Extract<ResolvedBlock, { kind: "gapReport" }> {
  const supplier = suppliers.find((s) => s.id === ctx.params.supplierId)!;
  // Factories in the supplier's own order (F01, F02, F03), not by rank.
  const own = supplier.factoryIds.map((id) => ctx.sites.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const rows: GapRow[] = [];
  for (const site of own) {
    for (const d of documentsForFactory(site.id)) {
      const attention = d.state === "Ready" && d.needsAttention;
      if (d.state === "Ready" && !attention) continue;
      const state = attention ? "Needs a look" : d.state;
      rows.push({
        factoryId: site.id, factoryName: site.name, docName: d.name, state, detail: d.detail, owner: supplier.name,
        action: gapActionByState[attention ? "Attention" : d.state],
      });
    }
  }
  rows.sort((a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) || own.findIndex((s) => s.id === a.factoryId) - own.findIndex((s) => s.id === b.factoryId));
  return {
    kind: "gapReport", supplierName: supplier.name,
    factories: own.map((s) => ({ id: s.id, name: s.name, counts: readinessCounts(documentsForFactory(s.id)) })),
    gaps: rows,
  };
}

function buildBlock(spec: BlockSpec, ctx: TokenCtx): ResolvedBlock | null {
  switch (spec.kind) {
    case "text": {
      if (spec.when && !ctx.sites.some((s) => s.id === spec.when!.site)) return null;
      return { kind: "text", text: fillTokens(spec.text, ctx) };
    }
    case "ranking":
      return {
        kind: "ranking",
        rows: ctx.sites.slice(0, spec.count).map((s) => ({ rank: s.rank, id: s.id, name: s.name, band: s.band, R: fmtScore(s.R), I: s.footprintI === null ? "pending" : fmtScore(s.footprintI), quadrant: s.quadrant, tier: s.tier })),
      };
    case "avgGrid": {
      const cells = PILLARS.flatMap((p) => DIMENSIONS.map((d) => {
        const scores = ctx.sites.map((s) => s.pwi.cells.find((c) => c.pillar === p && c.dimension === d)!.score);
        return { pillar: p, dimension: d, score: scores.reduce((a, b) => a + b, 0) / scores.length };
      }));
      const weakest = [...cells].sort((a, b) => a.score - b.score).slice(0, 2).map((c) => `${c.pillar} ${PILLAR_NAMES[c.pillar]} ${c.dimension}`);
      return { kind: "avgGrid", cells, weakest };
    }
    case "table":
      return { kind: "table", columns: spec.columns, rows: spec.rows.map((r) => r.map((c) => fillTokens(c, ctx))) };
    case "offTrack": {
      const off = offTrackSites(ctx);
      const bySupplier = new Map<string, typeof off>();
      for (const s of off) bySupplier.set(s.supplierId, [...(bySupplier.get(s.supplierId) ?? []), s]);
      const groups = [...bySupplier.entries()]
        .map(([sid, plants]) => ({ sid, supplier: plants[0].supplierName, worst: Math.min(...plants.map((p) => severityRank(p.highestAlert ?? "Info"))), plants }))
        .sort((a, b) => a.worst - b.worst || a.sid.localeCompare(b.sid))
        .map((g) => ({
          supplier: g.supplier,
          plants: g.plants.map((p) => ({ id: p.id, name: p.name, severity: (p.highestAlert ?? "Info") as Severity, message: p.alertMessage ?? "", age: p.alertAgeDays === null ? null : fmtDaysAgo(p.alertAgeDays) })),
        }));
      return { kind: "offTrack", groups };
    }
    case "techTable": {
      const ranked = rankedTechnologies();
      return {
        kind: "techTable", weights: fillTokens("{{match.weights}}", ctx),
        rows: ranked.map((t, i) => ({
          name: t.name, technicalFit: fmtScore(t.technicalFit), expectedBenefit: fmtScore(t.expectedBenefit), stability: fmtScore(t.operationalStability),
          dataQuality: fmtScore(t.dataQuality), match: fmtScore(t.match), note: t.nearMissOn ? `near miss: ${t.nearMissOn}` : null, top: i === 0,
        })),
      };
    }
    case "checklist":
      return {
        kind: "checklist", title: spec.title,
        checks: spec.checks.map((c) => ({ name: c.name, result: c.result, reason: c.reason ? fillTokens(c.reason, ctx) : undefined })),
        verdict: { label: spec.verdict.label, tone: spec.verdict.tone, effect: fillTokens(spec.verdict.effect, ctx) },
      };
    case "inspection": {
      const i = inspections.find((x) => x.id === spec.id)!;
      const detail = i.stepDetail ?? [];
      const site = ctx.sites.find((s) => s.id === i.factoryId)!;
      return {
        kind: "inspection", id: i.id, factory: site.name, date: i.date, steps: i.steps, passed: i.passed, trust: trustScore(i), status: i.status,
        counts: { pass: i.passed, warn: detail.filter((s) => s.result === "Warn").length, fail: detail.filter((s) => s.result === "Fail").length },
        nonPass: detail, layers: LAYERS,
      };
    }
    case "readiness": return null;
    case "brsr": return brsrBlock(ctx);
    case "gapReport": return gapReportBlock(ctx);
    case "citations": return { kind: "citations", items: spec.items.map((c) => citation(c, ctx)) };
    case "actions": return { kind: "actions", items: spec.items.map((a) => action(a, ctx)) };
  }
}

export function buildAnswer(script: ScriptDef, ctx: TokenCtx, routeNote?: string): ResolvedAnswer {
  let specs = script.blocks;
  // A BRSR draft needs the water meter log by source. Without it the agent says so and stops: no evidence, no number.
  if (script.id === "E1" && waterBalance(ctx.params.factoryId ?? "F12") === null) {
    specs = [{ kind: "text", text: `I can't draft **BRSR Principle 6** for **{{brsr.site}}** yet. ${NO_METER_DATA_REPLY} Ambattur Denim Unit has one: ask for it by name.` }];
  }
  const blocks = specs.map((b) => buildBlock(b, ctx)).filter((b): b is ResolvedBlock => b !== null);
  const answer: ResolvedAnswer = { scriptId: script.id, agent: script.agent, tools: script.tools, blocks, routeNote };
  if (script.routeTo) {
    const target = scripts.find((s) => s.id === script.routeTo)!;
    answer.routeNote = script.routeNote;
    answer.then = buildAnswer(target, ctx);
  }
  return answer;
}

export interface ResolvedCase { title: string; note: string; sections: { heading: string; text: string; placeholder: boolean; cites: string[] }[] }

/** The drafted prove-and-scale business case (C6 button). Every number is a token; "Draft for review". */
export function buildBusinessCase(ctx: TokenCtx): ResolvedCase {
  const cites: Record<string, string[]> = {
    Recommendation: ["Module 06 · Technology match"], Proof: ["Illustrative pilot data"], "Projected impact": ["Illustrative pilot data"],
    Risks: ["Module 06 · Technology match"],
  };
  return {
    title: businessCase.title, note: "Draft for review",
    sections: businessCase.sections.map((s) => ({ heading: s.heading, text: fillTokens(s.text, ctx), placeholder: Boolean(s.placeholder), cites: cites[s.heading] ?? [] })),
  };
}

/** Every token used anywhere in the scripts, for the test that checks they all resolve. */
export function allScriptTokens(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(...tokensIn(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(scripts); walk(businessCase); walk(brsrDraft);
  return [...new Set(out)];
}

