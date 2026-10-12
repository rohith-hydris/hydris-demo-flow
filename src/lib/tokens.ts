import { documents } from "@/src/data/documents";
import { inspections } from "@/src/data/inspections";
import { ledger } from "@/src/data/ledger";
import { ops } from "@/src/data/ops";
import { projects } from "@/src/data/projects";
import { suppliers } from "@/src/data/suppliers";
import { pilot, technologies, type Technology } from "@/src/data/copilotScripts";
import { inspectionStatus, projectBenefit, trustScore } from "./claims";
import { evidenceChange } from "@/src/data/affected";
import { liteFindings } from "@/src/data/opportunities";
import { scenarios } from "@/src/data/scenarios";
import { affectedOutputs, flaggedCount, RESTATEMENT_BANNER } from "./affected";
import { initialImports, importMany, type LiteOutcome } from "./catalogue";
import { fmtLakh } from "./projectsView";
import { evaluateScenario, paybackLabel, reuseInsight } from "./scenarios";
import { fmtCellScore, fmtInt, fmtPct1, fmtScore, fmtScore3 } from "./format";
import { priorMonthSitePwi, recycledReclaimedM3, waterBalance } from "./impact";
import { fmtClaim } from "./measure";
import { MATCH_WEIGHTS, filterPlants, matchScore, type PlantProfile } from "./match";
import { severityRank } from "./ops";
import { DIMENSIONS, PILLARS, PILLAR_NAMES } from "./pwi";
import type { Scope } from "./scope";
import { getPortfolio, getSites, type Portfolio, type Site } from "./selectors";
import type { Dimension, Pillar } from "./types";

// {{token}} values for the copilot's scripts (PRODUCT 0.3). A token is a dotted path into the data layer. Because
// every figure in an answer comes through here, a sentence and the screen it describes can never disagree.

export class TokenError extends Error {
  constructor(public kind: "unknown" | "scope", public path: string) {
    super(kind === "scope" ? `Token {{${path}}} is outside the scope in force` : `Unknown token {{${path}}}`);
  }
}

/** What the copilot is looking at: who is asking, and which part of the data they may see. */
export interface CopilotScope {
  scope: Scope;
  /** network: the whole brand portfolio. own: the supplier's own factories. supplier: the brand narrowed to one supplier. */
  kind: "network" | "own" | "supplier";
  supplierId: string | null;
  label: string;
}

export interface TokenCtx {
  cscope: CopilotScope;
  sites: Site[];
  portfolio: Portfolio;
  /** Chosen by the question: the factory a BRSR draft is for, the supplier a gap report is for. */
  params: { factoryId?: string; supplierId?: string; /** Outcome of the Lite import the question just made (C9). */ lite?: LiteOutcome[] };
}

export function makeTokenCtx(cscope: CopilotScope, params: TokenCtx["params"] = {}): TokenCtx {
  return { cscope, sites: getSites(cscope.scope), portfolio: getPortfolio(cscope.scope), params };
}

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const join = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

const FACTORY_ID = /^F\d{2}$/;
const CELL = /^P([123])([AWQ])$/;
const DIM: Record<string, Dimension> = { A: "Availability", W: "Accessibility", Q: "Quality" };
const COMPONENT_LABEL: Record<string, string> = {
  technicalFit: "technical fit", expectedBenefit: "expected benefit", operationalStability: "stability", dataQuality: "data quality",
};

const cellLabel = (p: Pillar, d: Dimension) => `${p} ${PILLAR_NAMES[p]} ${d}`;

function siteOf(ctx: TokenCtx, id: string, path: string): Site {
  const s = ctx.sites.find((x) => x.id === id);
  if (!s) throw new TokenError(FACTORY_ID.test(id) ? "scope" : "unknown", path);
  return s;
}

function siteToken(ctx: TokenCtx, id: string, rest: string[], path: string): string {
  const s = siteOf(ctx, id, path);
  const [field, sub] = rest;
  const cell = field ? CELL.exec(field) : null;
  if (cell) {
    const c = s.pwi.cells.find((x) => x.pillar === (`P${cell[1]}` as Pillar) && x.dimension === DIM[cell[2]]);
    if (!c) throw new TokenError("unknown", path);
    if (sub === "state") return c.state;
    if (sub === "grade") return c.grade === "none" ? "no grade" : c.grade;
    return fmtCellScore(c.score);
  }
  switch (field) {
    case "name": return s.name;
    case "supplier": return s.supplierName;
    case "district": return s.district;
    case "R": return fmtScore(s.R);
    case "I": return s.footprintI === null ? "pending" : fmtScore(s.footprintI);
    case "pwi": return fmtPct1(s.pwi.sitePwi);
    case "pwiCentral": return fmtPct1(s.pwi.sitePwiCentral);
    case "pwiLow": return fmtPct1(s.pwi.sitePwiLow);
    case "priorPwi": {
      const p = priorMonthSitePwi(s.id);
      if (p === null) throw new TokenError("unknown", path);
      return fmtPct1(p);
    }
    case "statusBand": return s.pwi.statusBand;
    case "vb": return fmtPct1(s.pwi.volumetricBalance);
    case "conf": return fmtScore(s.pwi.confidence);
    case "grade": return s.evidenceGrade;
    case "health": return String(s.healthScore);
    case "rank": return String(s.rank);
    case "tier": return String(s.tier);
    case "band": return String(s.band);
    case "quadrant": return s.quadrant;
    case "rn": return `${fmtInt(s.replenishmentNeededM3)} m³`;
    case "bws": return fmtScore(s.risks.find((r) => r.code === "bws")!.score);
    case "tierChangeAge": {
      const row = ops.find((o) => o.factoryId === s.id);
      if (!row?.tierChange) throw new TokenError("unknown", path);
      return String(row.tierChange.daysAgo);
    }
    case "P1": case "P2": case "P3": return fmtScore3(s.pwi.pillars[field]);
    default: throw new TokenError("unknown", path);
  }
}

const rankedCells = (ctx: TokenCtx) => {
  const rows: { label: string; avg: number }[] = [];
  for (const p of PILLARS) for (const d of DIMENSIONS) {
    const scores = ctx.sites.map((s) => s.pwi.cells.find((c) => c.pillar === p && c.dimension === d)!.score);
    rows.push({ label: cellLabel(p, d), avg: scores.reduce((a, b) => a + b, 0) / scores.length });
  }
  return rows.sort((a, b) => a.avg - b.avg);
};

/** Lite findings for Ambattur in scope, imported (or found already imported). Uses the outcome the screen passed, else a fresh import. */
export function liteOutcomes(ctx: TokenCtx): LiteOutcome[] {
  if (ctx.params.lite) return ctx.params.lite;
  const findings = liteFindings.filter((f) => f.factoryId === "F12" && ctx.cscope.scope.factoryIds.includes(f.factoryId));
  return importMany(initialImports(), findings).outcomes;
}

/** Plants that are off-track in scope: most severe first, then by rank. */
export function offTrackSites(ctx: TokenCtx): Site[] {
  return ctx.sites.filter((s) => s.offTrack).sort((a, b) => severityRank(a.highestAlert ?? "Info") - severityRank(b.highestAlert ?? "Info") || a.rank - b.rank);
}

/**
 * Technologies ranked by match. With `plants`, only technologies at least one of them is eligible for (hard filters) are scored;
 * the others are left out. Without, every technology is scored.
 */
const NUMBER_WORD = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

export function rankedTechnologies(plants?: readonly PlantProfile[]): (Technology & { match: number })[] {
  const usable = plants ? technologies.filter((t) => filterPlants(t, plants).eligible.length > 0) : technologies;
  return usable.map((t) => ({ ...t, match: matchScore(t) })).sort((a, b) => b.match - a.match);
}

function resolveParts(ctx: TokenCtx, parts: string[], path: string): string {
  const [head, ...rest] = parts;
  if (head === "site") return siteToken(ctx, rest[0], rest.slice(1), path);
  if (FACTORY_ID.test(head)) return siteToken(ctx, head, rest, path);

  switch (head) {
    case "portfolio": {
      const r = ctx.portfolio.rollup;
      switch (rest[0]) {
        case "unweighted": return fmtPct1(r.pwiUnweighted);
        case "rnWeighted": return fmtPct1(r.pwiRnWeighted);
        case "unweightedCentral": return fmtPct1(r.pwiUnweightedCentral);
        case "rnWeightedCentral": return fmtPct1(r.pwiRnWeightedCentral);
        case "weightingNote":
          return r.pwiRnWeighted < r.pwiUnweighted
            ? "The weaker figure is the one to watch because it weights large sites by how much water they need to replenish."
            : "The RN-weighted figure is not lower than the unweighted one, so no large site is hiding a weak one.";
        default: throw new TokenError("unknown", path);
      }
    }
    case "scope":
      if (rest[0] === "phrase") return ctx.cscope.kind === "network" ? "across the network" : ctx.cscope.kind === "own" ? "across your factories" : `across ${ctx.cscope.label}`;
      if (rest[0] === "label") return ctx.cscope.label;
      if (rest[0] === "pwiName") return ctx.cscope.kind === "network" ? "Portfolio PWI" : ctx.cscope.kind === "own" ? "PWI across your factories" : `PWI across ${ctx.cscope.label}`;
      throw new TokenError("unknown", path);
    case "rank": {
      if (rest[0] === "top2") {
        const [a, b] = ctx.sites;
        if (!a || !b) return "";
        return a.tier === b.tier ? `Both are Tier ${a.tier}.` : `They are Tier ${a.tier} and Tier ${b.tier}.`;
      }
      const s = ctx.sites[Number(rest[0]) - 1];
      if (!s) throw new TokenError("unknown", path);
      switch (rest[1]) {
        case "name": return s.name;
        case "id": return s.id;
        case "band": return String(s.band);
        case "tier": return String(s.tier);
        case "R": return fmtScore(s.R);
        case "I": return s.footprintI === null ? "pending" : fmtScore(s.footprintI);
        default: throw new TokenError("unknown", path);
      }
    }
    case "weakest": {
      const row = rankedCells(ctx)[Number(rest[0]) - 1];
      if (!row) throw new TokenError("unknown", path);
      return rest[1] === "avg" ? fmtScore(row.avg) : row.label;
    }
    case "ledger": {
      const e = ledger.find((l) => l.id === rest[0]);
      if (!e) throw new TokenError("unknown", path);
      siteOf(ctx, e.factoryId, path);
      switch (rest[1]) {
        case "id": return e.id;
        case "period": return e.period;
        case "p2a": if (e.p2Availability === undefined) throw new TokenError("unknown", path); return fmtCellScore(e.p2Availability);
        case "fills": if (e.desiltingFills === undefined) throw new TokenError("unknown", path); return String(e.desiltingFills);
        default: throw new TokenError("unknown", path);
      }
    }
    case "project": {
      const p = projects.find((x) => x.id === rest[0]);
      if (!p) throw new TokenError("unknown", path);
      siteOf(ctx, p.factoryId, path);
      const b = projectBenefit(p);
      switch (rest[1]) {
        case "id": return p.id;
        case "name": return p.name;
        case "claimed": return fmtClaim(p.claim);
        case "attributed": return fmtClaim(b.attributed);
        case "counted": return fmtClaim(b.counted);
        case "low": return fmtClaim(b.low);
        case "share": return `${Math.round(p.attribution * 100)}%`;
        default: throw new TokenError("unknown", path);
      }
    }
    case "inspection": {
      const i = inspections.find((x) => x.id === rest[0]);
      if (!i) throw new TokenError("unknown", path);
      siteOf(ctx, i.factoryId, path);
      const detail = i.stepDetail ?? [];
      switch (rest[1]) {
        case "id": return i.id;
        case "steps": return String(i.steps);
        case "passed": return String(i.passed);
        case "trust": return fmtPct1(trustScore(i));
        case "status": return inspectionStatus(i);
        case "warns": return String(detail.filter((s) => s.result === "Warn").length);
        case "fails": return String(detail.filter((s) => s.result === "Fail").length);
        case "failStep": { const f = detail.find((s) => s.result === "Fail"); if (!f) throw new TokenError("unknown", path); return String(f.n); }
        default: throw new TokenError("unknown", path);
      }
    }
    case "doc": {
      const d = documents.find((x) => x.id === rest[0]);
      if (!d) throw new TokenError("unknown", path);
      siteOf(ctx, d.factoryId, path);
      switch (rest[1]) {
        case "name": return d.name;
        case "period": return d.period;
        case "detail": return d.detail;
        case "state": return d.state;
        default: throw new TokenError("unknown", path);
      }
    }
    case "offtrack": {
      const off = offTrackSites(ctx);
      if (rest[0] === "sentence") {
        if (off.length === 0) return "No plant needs attention right now.";
        return off.length === 1 ? "One plant needs attention:" : `${WORDS[off.length] ?? off.length} plants need attention:`;
      }
      if (rest[0] === "onTrackSentence") {
        if (ctx.cscope.kind === "network") {
          const names = suppliers.filter((s) => ctx.cscope.scope.supplierIds.includes(s.id) && !ctx.sites.some((x) => x.supplierId === s.id && x.offTrack)).map((s) => s.name);
          return names.length === 0 ? "" : names.length === 1 ? `${names[0]} is on track.` : `${join(names)} are on track.`;
        }
        const others = ctx.sites.length - off.length;
        return others <= 0 ? "" : `The other ${others === 1 ? "plant is" : `${others} plants are`} on track.`;
      }
      throw new TokenError("unknown", path);
    }
    case "match":
      if (rest[0] === "weights") {
        const w = MATCH_WEIGHTS;
        return `${fmtScore(w.technicalFit)} technical fit, ${fmtScore(w.expectedBenefit)} expected benefit, ${fmtScore(w.operationalStability)} stability and ${fmtScore(w.dataQuality)} data quality`;
      }
      throw new TokenError("unknown", path);
    case "tech": {
      // The business case is for Karur Finishing Works (F04): only technologies that pass its hard filters are scored.
      const target = ctx.sites.filter((s) => s.id === "F04");
      const ranked = rankedTechnologies(target.length ? target : undefined);
      if (rest[0] === "passCount") return NUMBER_WORD[ranked.length] ?? String(ranked.length);
      const t = rest[0] === "top" ? ranked[0] : ranked.find((x) => x.id === rest[0]);
      if (!t) throw new TokenError("unknown", path);
      switch (rest[1]) {
        case "name": return t.name;
        case "match": return fmtScore(t.match);
        case "weakest": {
          const parts = (["technicalFit", "expectedBenefit", "operationalStability", "dataQuality"] as const).map((k) => ({ k, v: t[k] }));
          const low = parts.sort((a, b) => a.v - b.v)[0];
          return `${COMPONENT_LABEL[low.k]} ${fmtScore(low.v)}`;
        }
        default: throw new TokenError("unknown", path);
      }
    }
    case "pilot":
      if (rest[0] === "low" || rest[0] === "expected" || rest[0] === "high") return String(pilot[rest[0]]);
      throw new TokenError("unknown", path);
    case "water": {
      const id = rest[0];
      siteOf(ctx, id, path);
      const wb = waterBalance(id);
      const field = rest[1];
      const kl = (n: number) => `${fmtInt(n)} kL`;
      if (field === "recycled") { const r = recycledReclaimedM3(id); if (r === null) throw new TokenError("unknown", path); return kl(r); }
      if (!wb) throw new TokenError("unknown", path);
      const bySource = (label: string) => wb.bySource.find((x) => x.label === label)!.m3;
      switch (field) {
        case "withdrawal": return kl(wb.withdrawalM3);
        case "discharge": return kl(wb.basinDischargeM3);
        case "municipal": return kl(bySource("Municipal"));
        case "groundwater": return kl(bySource("Groundwater"));
        case "rainwater": return kl(bySource("Rainwater used"));
        case "thirdParty": return kl(bySource("Third-party"));
        default: throw new TokenError("unknown", path);
      }
    }
    case "scenario": {
      const site = siteOf(ctx, "F12", path);
      const run = (id: string) => {
        const sc = scenarios.find((x) => x.id === id);
        if (!sc) throw new TokenError("unknown", path);
        return { sc, r: evaluateScenario(site.pwi, site.replenishmentNeededM3, sc.items) };
      };
      if (rest[0] === "insight") {
        const i = reuseInsight(run("S2").r, run("S1").r);
        const pts = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
        switch (rest[1]) {
          case "reuseBalance": return pts(i.reuseBalanceGain);
          case "reusePwi": return pts(i.reusePwiGain);
          case "basinPwi": return pts(i.basinPwiGain);
          default: throw new TokenError("unknown", path);
        }
      }
      const { sc, r } = run(rest[0]);
      switch (rest[1]) {
        case "name": return sc.name;
        case "items": return sc.items.length ? sc.items.join(" + ") : "None";
        case "pwi": return fmtPct1(r.pwi);
        case "pwiLow": return fmtPct1(r.pwiLow);
        case "pwiBoth": return `${fmtPct1(r.pwi)} (${fmtPct1(r.pwiLow)})`;
        case "balance": return fmtPct1(r.volumetricBalance);
        case "balanceBoth": return `${fmtPct1(r.volumetricBalance)} (${fmtPct1(r.volumetricBalanceLow)})`;
        case "capex": return fmtLakh(r.capexLakh);
        case "payback": return paybackLabel(r.payback);
        default: throw new TokenError("unknown", path);
      }
    }
    case "affected": {
      const site = siteOf(ctx, evidenceChange.factoryId, path);
      switch (rest[0]) {
        case "flagged": return String(flaggedCount(affectedOutputs(site.pwi.sitePwi, site.pwi.cells.find((c) => c.pillar === "P2" && c.dimension === "Availability")!.score)));
        case "fillsBefore": return String(evidenceChange.fillsBefore);
        case "fillsAfter": return String(evidenceChange.fillsAfter);
        case "banner": return RESTATEMENT_BANNER;
        default: throw new TokenError("unknown", path);
      }
    }
    case "lite": {
      if (rest[0] !== "summary") throw new TokenError("unknown", path);
      const out = liteOutcomes(ctx);
      if (out.length === 0) return "There are no Lite findings to import in this scope.";
      if (out.every((o) => !o.created)) return out.length === 2 ? "Both are already imported. No duplicates were created." : "All are already imported. No duplicates were created.";
      if (out.every((o) => o.created)) return `Imported ${join(out.map((o) => `**${o.findingId}**`))} as project opportunities.`;
      return `Imported ${join(out.filter((o) => o.created).map((o) => `**${o.findingId}**`))}. The rest were already imported, so no duplicates were created.`;
    }
    case "brsr":
      if (rest[0] === "site") return siteOf(ctx, ctx.params.factoryId ?? "F12", path).name;
      throw new TokenError("unknown", path);
    case "gap":
      if (rest[0] === "supplier") {
        const sid = ctx.params.supplierId;
        const s = suppliers.find((x) => x.id === sid);
        if (!s || !ctx.cscope.scope.supplierIds.includes(s.id)) throw new TokenError("scope", path);
        return s.name;
      }
      throw new TokenError("unknown", path);
    default: throw new TokenError("unknown", path);
  }
}

export function resolveToken(path: string, ctx: TokenCtx): string {
  return resolveParts(ctx, path.trim().split("."), path.trim());
}

const TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g;

/** Replace every {{token}} in a piece of text. Throws a TokenError for one that is unknown or outside the scope. */
export const fillTokens = (text: string, ctx: TokenCtx): string => text.replace(TOKEN, (_, path: string) => resolveToken(path, ctx));

/** The token paths in a piece of text. */
export const tokensIn = (text: string): string[] => [...text.matchAll(TOKEN)].map((m) => m[1].trim());
