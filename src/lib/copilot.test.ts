import { describe, expect, it } from "vitest";
import { agents, businessCase, scripts, type ScriptId } from "@/src/data/copilotScripts";
import { ledger } from "@/src/data/ledger";
import {
  agentAllowed, allScriptTokens, buildAnswer, buildBusinessCase, copilotScope, defaultGapSupplier, demoHash, interpretLink, interpretText, matchScript,
  outOfScopeMention, promptFor, scopeChipText, suggestedScripts, FALLBACK_REPLY_FOR_TESTS, type ResolvedBlock,
} from "./copilot";
import { recycledReclaimedM3 } from "./impact";
import { fillTokens, makeTokenCtx, resolveToken, tokensIn, TokenError } from "./tokens";
import { getSites } from "./selectors";
import { scopeFor, OUT_OF_SCOPE_REPLY, VALIDATION_BRAND_ONLY_REPLY } from "./scope";

const brandScope = copilotScope("brand");
const ownScope = copilotScope("supplier");
const brandCtx = makeTokenCtx(brandScope);
const ownCtx = makeTokenCtx(ownScope);
const script = (id: ScriptId) => scripts.find((s) => s.id === id)!;
const answerOf = (id: ScriptId, ctx = brandCtx) => buildAnswer(script(id), ctx);
const block = <K extends ResolvedBlock["kind"]>(a: ReturnType<typeof answerOf>, kind: K) => a.blocks.find((b) => b.kind === kind) as Extract<ResolvedBlock, { kind: K }>;
const texts = (a: ReturnType<typeof answerOf>) => a.blocks.filter((b): b is Extract<ResolvedBlock, { kind: "text" }> => b.kind === "text").map((b) => b.text);

describe("tokens (PRODUCT 0.3): every figure comes from the data layer", () => {
  it("every token in every script, the business case and the BRSR draft resolves for the brand", () => {
    const failures: string[] = [];
    for (const t of allScriptTokens()) { try { resolveToken(t, makeTokenCtx(brandScope, { factoryId: "F12", supplierId: "SUP1" })); } catch (e) { failures.push(`${t}: ${(e as Error).message}`); } }
    expect(failures).toEqual([]);
    expect(allScriptTokens().length).toBeGreaterThan(40);
  });

  it("for the supplier a token either resolves or is refused as out of scope. It is never unknown", () => {
    for (const t of allScriptTokens()) {
      try { resolveToken(t, makeTokenCtx(ownScope, { factoryId: "F12", supplierId: "SUP5" })); }
      catch (e) { expect(e).toBeInstanceOf(TokenError); expect((e as TokenError).kind).toBe("scope"); }
    }
  });

  it("accepts the spec's own spellings: {{F12.R}} and {{site.F12.pwi}}", () => {
    expect(resolveToken("F12.R", brandCtx)).toBe("0.84");
    expect(resolveToken("site.F12.R", brandCtx)).toBe("0.84");
    expect(resolveToken("site.F12.pwi", brandCtx)).toBe("69.8%");
  });

  it("site figures match the check values", () => {
    const t = (p: string) => resolveToken(p, brandCtx);
    expect([t("F12.R"), t("F12.I"), t("F12.pwi"), t("F12.vb"), t("F12.conf"), t("F12.grade"), t("F12.tier"), t("F12.band")]).toEqual(["0.84", "0.91", "69.8%", "73.6%", "0.78", "B", "1", "1"]);
    expect([t("F12.P1"), t("F12.P2"), t("F12.P3")]).toEqual(["0.954", "0.758", "0.382"]);
    expect([t("F12.P2A"), t("F12.P3A"), t("F12.P3Q"), t("F02.P2A")]).toEqual(["0.795", "0.568", "0.00", "0.45"]);
    expect([t("F02.P2A.state"), t("F12.P3Q.state"), t("F12.P3W.grade")]).toEqual(["Partially scored", "Missing input", "C"]);
    expect([t("F12.bws"), t("F01.grade"), t("F02.tierChangeAge"), t("F12.priorPwi")]).toEqual(["4.75", "B", "12", "70.3%"]);
  });

  it("portfolio, ranking and weakest-area tokens", () => {
    const t = (p: string) => resolveToken(p, brandCtx);
    expect([t("portfolio.unweighted"), t("portfolio.rnWeighted")]).toEqual(["68.9%", "62.6%"]);
    expect([t("rank.1.name"), t("rank.2.name"), t("rank.top2.tiers"), t("rank.1.band")]).toEqual(["Ambattur Denim Unit", "Avinashi Road Dye House", "Both are Tier 1.", "1"]);
    expect([t("weakest.1.label"), t("weakest.2.label")]).toEqual(["P3 Basin Quality", "P3 Basin Availability"]);
    expect(t("scope.pwiName")).toBe("Portfolio PWI");
  });

  it("ledger, project, inspection, document and water tokens", () => {
    const t = (p: string) => resolveToken(p, brandCtx);
    expect([t("ledger.LE-2291.p2a"), t("ledger.LE-2347.p2a"), t("ledger.LE-2291.fills"), t("ledger.LE-2347.fills")]).toEqual(["0.836", "0.795", "1.6", "1.5"]);
    expect([t("project.PRJ-201.claimed"), t("project.PRJ-201.counted"), t("project.PRJ-201.low")]).toEqual(["38,000 m³", "0 m³", "0 m³"]);
    expect([t("project.PRJ-103.claimed"), t("project.PRJ-103.share"), t("project.PRJ-103.counted"), t("project.PRJ-103.low")]).toEqual(["50,000 m³", "50%", "25,000 m³", "21,250 m³"]);
    expect([t("inspection.INS-0412.trust"), t("inspection.INS-0412.passed"), t("inspection.INS-0412.steps"), t("inspection.INS-0412.failStep")]).toEqual(["85.7%", "12", "14", "9"]);
    expect(t("doc.F01-D04.detail")).toBe("44 of 52 weekly samples; at least 48 required");
    expect([t("water.F12.withdrawal"), t("water.F12.discharge"), t("water.F12.municipal"), t("water.F12.recycled")]).toEqual(["250,000 kL", "140,000 kL", "120,000 kL", "19,000 kL"]);
  });

  it("off-track, technology and pilot tokens", () => {
    const t = (p: string) => resolveToken(p, brandCtx);
    expect(t("offtrack.sentence")).toBe("Three plants need attention:");
    expect(t("offtrack.onTrackSentence")).toBe("Noyyal Textile Works and Palar Fabrics are on track.");
    expect([t("tech.top.name"), t("tech.top.match"), t("tech.top.weakest")]).toEqual(["Hydris tertiary polishing module", "0.80", "stability 0.60"]);
    expect(t("match.weights")).toBe("0.35 technical fit, 0.30 expected benefit, 0.20 stability and 0.15 data quality");
    expect([t("pilot.low"), t("pilot.expected"), t("pilot.high")]).toEqual(["8", "12", "15"]);
  });

  it("refuses a token for a site outside the scope (a supplier cannot read another supplier)", () => {
    expect(() => resolveToken("F01.name", ownCtx)).toThrow(TokenError);
    expect(() => resolveToken("project.PRJ-201.claimed", ownCtx)).toThrow(TokenError);
    expect(() => resolveToken("doc.F01-D04.detail", ownCtx)).toThrow(TokenError);
    expect(resolveToken("F12.name", ownCtx)).toBe("Ambattur Denim Unit");
  });

  it("an unknown token is an error, not a blank", () => {
    expect(() => resolveToken("F12.nonsense", brandCtx)).toThrow(/Unknown token/);
    expect(() => resolveToken("nothing.here", brandCtx)).toThrow(TokenError);
  });

  it("fills and finds tokens in text", () => {
    expect(tokensIn("a {{F12.R}} b {{ F12.I }}")).toEqual(["F12.R", "F12.I"]);
    expect(fillTokens("R {{F12.R}}, I {{F12.I}}", brandCtx)).toBe("R 0.84, I 0.91");
  });

  it("scope tokens follow the supplier role: own scope numbers", () => {
    expect(resolveToken("portfolio.unweighted", ownCtx)).toBe("65.9%");
    expect(resolveToken("portfolio.rnWeighted", ownCtx)).toBe("66.0%");
    expect(resolveToken("portfolio.weightingNote", ownCtx)).toContain("not lower than the unweighted one");
    expect(resolveToken("scope.pwiName", ownCtx)).toBe("PWI across your factories");
    expect(resolveToken("offtrack.sentence", ownCtx)).toBe("One plant needs attention:");
    expect(resolveToken("offtrack.onTrackSentence", ownCtx)).toBe("The other 2 plants are on track.");
    expect(resolveToken("weakest.1.label", ownCtx)).toBe("P3 Basin Quality");
  });
});

describe("data cross-checks the scripts rely on", () => {
  it("the ledger's P2 Availability for LE-2347 is F12's P2 Availability cell score", () => {
    const f12 = getSites(scopeFor("brand")).find((s) => s.id === "F12")!;
    expect(ledger.find((l) => l.id === "LE-2347")!.p2Availability).toBe(f12.pwi.cells.find((c) => c.pillar === "P2" && c.dimension === "Availability")!.score);
  });
  it("each ledger entry's text states the figures held in its fields", () => {
    for (const e of ledger.filter((l) => l.p2Availability !== undefined)) {
      expect(e.what).toContain(String(e.p2Availability));
      expect(e.what).toContain(String(e.desiltingFills));
    }
  });
  it("water recycled or reclaimed on site is 19,000 m³ (15,000 + 4,000)", () => {
    expect(recycledReclaimedM3("F12")).toBe(19000);
    expect(recycledReclaimedM3("F01")).toBeNull();
  });
  it("no site is Self-certified, so 'No site is Net Positive' is true of the data", () => {
    expect(getSites(scopeFor("brand")).filter((s) => s.pwi.statusBand === "Self-certified")).toHaveLength(0);
  });
});

describe("scripts C1 to C6 (PRODUCT 7)", () => {
  it("C1: act on Ambattur then Avinashi, both Tier 1, a mini ranking of five, and the Open ranking button", () => {
    const a = answerOf("C1");
    expect(a.tools).toEqual(["get_site_ranking", "get_basin_risk"]);
    expect(texts(a)[0]).toBe("Start with **Ambattur Denim Unit**, then **Avinashi Road Dye House**. Both are Tier 1.");
    expect(block(a, "ranking").rows.map((r) => r.id)).toEqual(["F12", "F02", "F01", "F09", "F04"]);
    expect(block(a, "ranking").rows[0]).toMatchObject({ rank: 1, name: "Ambattur Denim Unit", band: 1, R: "0.84", I: "0.91", quadrant: "Act now" });
    expect(texts(a)[1]).toBe("Ambattur Denim Unit is in Band 1 (R 0.84) with the largest footprint in the band (I 0.91). Rank shows priority for action, not performance.");
    expect(block(a, "citations").items.map((c) => c.label)).toEqual(["Module 02 · Ranking", "Module 01 · Basin Risk"]);
    expect(block(a, "actions").items[0]).toMatchObject({ label: "Open ranking", href: "/ranking" });
  });

  it("C2: portfolio PWI 68.9% and 62.6%, the weaker-figure sentence, weakest areas, the Ambattur project, and no Net Positive", () => {
    const a = answerOf("C2");
    expect(a.tools).toEqual(["get_portfolio_pwi", "get_pwi_grid"]);
    expect(texts(a)[0]).toBe("Portfolio PWI is **68.9%** unweighted and **62.6%** RN-weighted. The weaker figure is the one to watch because it weights large sites by how much water they need to replenish.");
    expect(block(a, "avgGrid").weakest).toEqual(["P3 Basin Quality", "P3 Basin Availability"]);
    expect(block(a, "avgGrid").cells).toHaveLength(9);
    expect(texts(a)[1]).toBe("The weakest area across the network is **P3 Basin Quality** (average cell score 0.28), followed by **P3 Basin Availability** (0.48).");
    expect(texts(a)[2]).toBe("The next best project for Ambattur Denim Unit is a basin Quality project (P3 Quality scores 0.00 today because none is registered).");
    expect(texts(a)[3]).toBe("No site is Net Positive. A client-facing claim needs external assurance.");
    expect(block(a, "citations").items.map((c) => c.label)).toEqual(["Module 03 · Impact", "Impact Ledger"]);
  });

  it("C3: sub-basin Availability 0.836 to 0.795, PWI 70.3% to 69.8%, and the cause is an input, not a lost project", () => {
    const a = answerOf("C3");
    expect(a.tools).toEqual(["get_ledger_diff"]);
    expect(texts(a)[0]).toBe("Sub-basin Availability at **Ambattur Denim Unit** moved from **0.836** to **0.795**. Site PWI moved from 70.3% to 69.8%.");
    expect(block(a, "table").rows).toEqual([
      ["LE-2291", "Aug 2026", "0.836", "Desilting at 1.6 fills per year"],
      ["LE-2347", "Sep 2026", "0.795", "Desilting recomputed to 1.5 fills per year after an IMD rainfall update"],
    ]);
    expect(texts(a)[1]).toBe("No project was removed. The change came from an updated input, not a lost project.");
    const cites = block(a, "citations").items;
    expect(cites.map((c) => c.label)).toEqual(["LE-2291", "LE-2347"]);
    expect(cites[1].trace?.value).toBe("0.795");
  });

  it("C4: three plants, grouped by supplier, with the right severity and an on-track sentence", () => {
    const a = answerOf("C4");
    expect(a.tools).toEqual(["get_alerts", "get_tier_history", "get_benefits"]);
    expect(texts(a)[0]).toBe("Three plants need attention:");
    const g = block(a, "offTrack").groups;
    expect(g.map((x) => x.supplier)).toEqual(["Cauvery Dyeing & Finishing", "Kongu Knit Processing", "Coromandel Denim Mills"]);
    expect(g[0].plants[0]).toMatchObject({ id: "F06", name: "Erode Wet Process", severity: "Critical", message: "Dropped to Not conformant; OCEMS offline 9 days" });
    expect(g[1].plants[0]).toMatchObject({ id: "F02", severity: "High", age: "12 days ago" });
    expect(g[2].plants[0]).toMatchObject({ id: "F13", severity: "High", message: "No data for 9 days (water meter log)" });
    expect(texts(a)[1]).toBe("Noyyal Textile Works and Palar Fabrics are on track.");
  });

  it("C5: hands over to the Validation agent and plays V3", () => {
    const a = answerOf("C5");
    expect(a.routeNote).toBe("That is a validation question. I'm switching you to the Validation agent.");
    expect(a.tools).toEqual([]);
    expect(a.blocks).toEqual([]);
    expect(a.then?.scriptId).toBe("V3");
    expect(a.then?.agent).toBe("validation");
  });

  it("C6: three technologies with Match 0.80, 0.73 and 0.70 computed from the formula, and the near miss", () => {
    const a = answerOf("C6");
    expect(a.tools).toEqual(["match_technology"]);
    const t = block(a, "techTable");
    expect(t.rows.map((r) => [r.name, r.match])).toEqual([["Hydris tertiary polishing module", "0.80"], ["Electrocoagulation retrofit", "0.73"], ["Membrane bioreactor upgrade", "0.70"]]);
    expect(t.rows[0]).toMatchObject({ technicalFit: "0.90", expectedBenefit: "0.80", stability: "0.60", dataQuality: "0.80", top: true });
    expect(t.rows[2].note).toBe("near miss: stability");
    expect(t.weights).toBe("0.35 technical fit, 0.30 expected benefit, 0.20 stability and 0.15 data quality");
    expect(texts(a)[0]).toContain("Karur Finishing Works");
    const ids = block(a, "actions").items.map((x) => x.kind === "local" ? x.id : x.label);
    expect(ids).toEqual(["business-case", "Open factory"]);
  });

  it("the C6 business case: numbers come from tokens, cost is a placeholder, and it is a draft for review", () => {
    const c = buildBusinessCase(brandCtx);
    const by = Object.fromEntries(c.sections.map((s) => [s.heading, s]));
    expect(c.note).toBe("Draft for review");
    expect(by["Recommendation"].text).toBe("Adopt the **Hydris tertiary polishing module** (match 0.80) at Karur Finishing Works.");
    expect(by["Proof"].text).toContain("+12 percentage points");
    expect(by["Target plants"].text).toBe("Karur Finishing Works and Dharapuram Dyeing.");
    expect(by["Projected impact"].text).toBe("TN removal improves by **+8** (low), **+12** (expected) and **+15** (high) percentage points.");
    expect(by["Cost and payback"]).toMatchObject({ text: "[Placeholder: cost to be supplied]", placeholder: true });
    expect(by["Risks"].text).toContain("stability 0.60");
    expect(c.sections.map((s) => s.heading)).toEqual(businessCase.sections.map((s) => s.heading));
    expect(by["Proof"].cites).toContain("Illustrative pilot data");
  });
});

describe("Validation scripts V1 to V5 (PRODUCT 8)", () => {
  const counts = (checks: { result: string }[]) => ({ pass: checks.filter((c) => c.result === "Pass").length, warn: checks.filter((c) => c.result === "Warn").length, fail: checks.filter((c) => c.result === "Fail").length });

  it("V1: eight checks (4 Pass, 1 Warn, 3 Fail), Fail verdict, counted 0 m³, effect on F02", () => {
    const b = block(answerOf("V1"), "checklist");
    expect(b.checks).toHaveLength(8);
    expect(counts(b.checks)).toEqual({ pass: 4, warn: 1, fail: 3 });
    expect(b.checks.find((c) => c.name.startsWith("Photo not reused"))).toMatchObject({ result: "Fail", reason: "2 of 5 photos match images already submitted for another claim." });
    expect(b.checks.find((c) => c.name === "Photo inside the project geofence")!.reason).toBe("Capture location is 4.2 km from the registered site.");
    expect(b.checks.find((c) => c.name === "Monitoring log current")).toMatchObject({ result: "Warn", reason: "Last check 71 days ago; claim lapses at 90 days." });
    expect(b.checks.find((c) => c.name === "No double claim")!.reason).toBe("Another brand also claims 40% of this check dam.");
    expect(b.verdict.label).toBe("Fail. Claim flagged.");
    expect(b.verdict.effect).toBe("Claimed 38,000 m³; counted 0 m³. Low value shown: 0 m³. Effect on Avinashi Road Dye House: P2 Availability stays at 0.45, status Partially scored.");
    const actions = block(answerOf("V1"), "actions").items;
    expect(actions.map((x) => x.label)).toEqual(["Request evidence from supplier", "Confirm flag", "Override with reason"]);
    expect(actions[2]).toMatchObject({ kind: "local", reasonRequired: true });
  });

  it("V2: eight checks with one Warn, validated with one warning, counted 25,000 m³, low value 21,250 m³", () => {
    const b = block(answerOf("V2"), "checklist");
    expect(counts(b.checks)).toEqual({ pass: 7, warn: 1, fail: 0 });
    expect(b.checks.find((c) => c.result === "Warn")).toMatchObject({ name: "Inundation area measured from satellite water data (JRC)", reason: "Mean depth is an engineering estimate, grade B." });
    expect(b.verdict.label).toBe("Validated with one warning");
    expect(b.verdict.effect).toBe("Counted 25,000 m³ (50,000 m³ x 50%). Low value shown: 21,250 m³. Effect: P3 Availability 0.568.");
  });

  it("V3: 12 Pass, 1 Warn, 1 Fail, trust 85.7%, Needs review, steps 9 and 11, and the retake note", () => {
    const a = answerOf("V3");
    const b = block(a, "inspection");
    expect(b.counts).toEqual({ pass: 12, warn: 1, fail: 1 });
    expect(b.nonPass.map((s) => [s.n, s.result, s.check])).toEqual([[9, "Fail", "VC-06"], [11, "Warn", "VC-21"]]);
    expect(b.nonPass[0]).toMatchObject({ instruction: "Photograph the ETP outlet sampling point", reason: "The photo is too blurry to read the sampling point." });
    expect(b.nonPass[1]).toMatchObject({ instruction: "Read the outlet flow meter", reason: "The reading is far from the last 30 days. Please confirm." });
    expect(b.layers).toEqual(["Completeness", "Photo quality", "Matches instruction", "Authenticity", "Reasoning and readings"]);
    expect(texts(a)[0]).toBe("**INS-0412** at Ambattur Denim Unit has 14 steps. Trust score 85.7%, report status **Needs review**.");
    const actions = block(a, "actions").items;
    expect(actions.map((x) => x.label)).toEqual(["Confirm", "Override with reason", "Request retake"]);
    expect(actions[2]).toMatchObject({ done: "Step 9 sent back to the field team." });
  });

  it("V4: six checks, Failed check verdict, 44 of 52 samples, COD variance, grade stays B", () => {
    const b = block(answerOf("V4"), "checklist");
    expect(b.checks).toHaveLength(6);
    expect(counts(b.checks)).toEqual({ pass: 4, warn: 1, fail: 1 });
    expect(b.checks.find((c) => c.name === "Weekly sample coverage")!.reason).toBe("44 of 52 weekly samples; at least 48 required.");
    expect(b.checks.find((c) => c.result === "Warn")!.reason).toContain("14%");
    expect(b.verdict.label).toBe("Failed check. Not accepted as full-year evidence.");
    expect(b.verdict.effect).toContain("evidence grade stays B");
    expect(block(answerOf("V4"), "actions").items[0].label).toBe("Ask supplier for the missing weeks");
  });

  it("V5: five checks (2 Pass, 2 Warn, 1 Fail), expired verdict, dated 2024, tier dropped 12 days ago", () => {
    const b = block(answerOf("V5"), "checklist");
    expect(b.checks).toHaveLength(5);
    expect(counts(b.checks)).toEqual({ pass: 2, warn: 2, fail: 1 });
    expect(b.checks.find((c) => c.result === "Fail")!.reason).toBe("The report is dated 2024, which is out of period.");
    expect(b.checks.find((c) => c.name === "ZDHC tier consistent with report")!.reason).toBe("The tier dropped 12 days ago.");
    expect(b.verdict).toMatchObject({ label: "Expired / out of period", effect: "A current third-party audit is needed." });
  });
});

describe("Evidence & Disclosure scripts E1 and E2 (PRODUCT 9)", () => {
  it("E1: readiness lists the 12 F12 documents, four are gaps", () => {
    const b = block(answerOf("E1"), "brsr");
    expect(b.available).toBe(true);
    expect(b.docs).toHaveLength(12);
    expect(b.gaps.map((g) => g.label)).toEqual(["CGWA groundwater NOC expired", "NABL lab reports failed its check", "WASH facility audit needs confirmation", "Form V not uploaded"]);
    const formV = b.gaps.find((g) => g.label === "Form V not uploaded")!;
    expect(formV.none).toBe("[No evidence: Form V not uploaded]");
    expect(formV.disclose).toBe("[Disclosed gap: Form V not uploaded]");
  });

  it("E1: the draft has a cited sentence per figure, from the water meter log and the data layer", () => {
    const b = block(answerOf("E1"), "brsr");
    expect(b.draft.title).toBe("BRSR Principle 6, water: Ambattur Denim Unit, FY2025-26");
    expect(b.draft.sentences.map((s) => s.text)).toEqual([
      "Total freshwater withdrawal was [[250,000 kL]].",
      "By source: municipal [[120,000 kL]], groundwater [[90,000 kL]], rainwater used [[10,000 kL]] and third-party [[30,000 kL]].",
      "Water discharged to the same basin within consent limits was [[140,000 kL]].",
      "Water recycled or reclaimed on site was [[19,000 kL]].",
      "The site is in a water-stressed area (Aqueduct baseline water stress score [[4.75]] of 5).",
    ]);
    expect(b.draft.sentences.map((s) => s.cite)).toEqual([
      "Water meter log, 12 of 12 months", "Meter log, by source", "Discharge statement · ETP-OUT-1 flow log", "Reuse meters, FY2025-26", "Module 01 · Aqueduct 4.0",
    ]);
    expect(b.draft.footer).toBe("Draft only. Disclosure needs a Locked period and audited ledger entries.");
  });

  it("E1: each sentence opens a source panel with the document, period and a demo hash", () => {
    const s = block(answerOf("E1"), "brsr").draft.sentences;
    const withdrawal = s[0].trace;
    expect(withdrawal.value).toBe("250,000 kL");
    expect(withdrawal.inputs.find((i) => i.label === "Document")!.value).toBe("Water meter log by source");
    expect(withdrawal.inputs.find((i) => i.label === "Period")!.value).toBe("12 of 12 months");
    expect(withdrawal.inputs.find((i) => i.label === "Demo hash")!.value).toMatch(/^demo-[0-9a-f]{8}$/);
    const discharge = s[2].trace;
    expect(discharge.inputs.some((i) => i.value === "Station ETP-OUT-1")).toBe(true);
    expect(discharge.inputs.some((i) => i.value === "Apr 2025 to Mar 2026")).toBe(true);
    expect(s[3].trace.inputs.find((i) => i.label === "Source")!.value).toBe("Reuse meters, FY2025-26");
  });

  it("E1: without a meter log by source it says no evidence, no number, and drafts nothing", () => {
    const a = buildAnswer(script("E1"), makeTokenCtx(brandScope, { factoryId: "F04" }));
    expect(a.blocks).toHaveLength(1);
    expect(texts(a)[0]).toContain("No evidence, no number.");
    expect(texts(a)[0]).toContain("Karur Finishing Works");
    expect(a.blocks.some((b) => b.kind === "brsr")).toBe(false);
  });

  it("E2: the Kongu gap report lists F01's failed lab check, F02's expired audit, and F01's OCEMS variance, and no F03 gap", () => {
    const b = block(buildAnswer(script("E2"), makeTokenCtx(brandScope, { supplierId: "SUP1" })), "gapReport");
    expect(b.supplierName).toBe("Kongu Knit Processing");
    expect(b.factories.map((f) => f.id)).toEqual(["F01", "F02", "F03"]);
    expect(b.factories.find((f) => f.id === "F01")!.counts).toEqual({ Ready: 11, Missing: 0, "Failed check": 1, "Expired / out of period": 0, "Low confidence": 0 });
    expect(b.factories.find((f) => f.id === "F03")!.counts.Ready).toBe(12);
    expect(b.gaps.map((g) => [g.factoryId, g.state])).toEqual([["F01", "Failed check"], ["F02", "Expired / out of period"], ["F01", "Needs a look"]]);
    expect(b.gaps[0]).toMatchObject({ owner: "Kongu Knit Processing", action: "Upload the missing records so the check passes." });
    expect(b.gaps[2].detail).toContain("14%");
  });

  it("E2 for the supplier role is scoped to Coromandel (F12, F13, F14)", () => {
    const b = block(buildAnswer(script("E2"), makeTokenCtx(ownScope, { supplierId: "SUP5" })), "gapReport");
    expect(b.factories.map((f) => f.id)).toEqual(["F12", "F13", "F14"]);
    expect(b.gaps.some((g) => g.factoryId === "F01")).toBe(false);
    expect(b.gaps.filter((g) => g.factoryId === "F12")).toHaveLength(4);
  });
});

describe("understanding a question (PRODUCT 4.7)", () => {
  const ask = (text: string, role: "brand" | "supplier" = "brand", agent: "copilot" | "evidence" | "validation" = "copilot", cs = role === "brand" ? brandScope : ownScope) => interpretText(text, role, agent, cs);

  it("matches loosely and ignores case", () => {
    for (const t of ["Which sites should we act on first?", "which SITES first", "what should we act on first", "WHICH SITES SHOULD WE ACT ON FIRST"]) expect(ask(t).play?.script.id).toBe("C1");
    expect(ask("tell me our water impact").play?.script.id).toBe("C2");
    expect(ask("which suppliers are off track").play?.script.id).toBe("C4");
    expect(ask("what is our PWI").play?.script.id).toBe("C2");
  });

  it("anything else gets the fallback and the prompts again", () => {
    const r = ask("what's the weather");
    expect(r.reply).toBe("In this demo I can answer the suggested questions. Pick one below to continue.");
    expect(r.showPrompts).toBe(true);
    expect(r.play).toBeUndefined();
    expect(FALLBACK_REPLY_FOR_TESTS).toBe(r.reply);
  });

  it("a question for another agent switches to it and says so", () => {
    const r = ask("Validate the Pallikaranai claim PRJ-103");
    expect(r.play?.script.id).toBe("V2");
    expect(r.agent).toBe("validation");
    expect(r.routeNote).toBe("That is a validation question. I'm switching you to the Validation agent.");
    const e = ask("give me the BRSR report", "brand", "copilot");
    expect(e.agent).toBe("evidence");
    expect(e.routeNote).toContain("Evidence & Disclosure agent");
    expect(ask("which sites first", "brand", "validation").agent).toBe("copilot");
  });

  it("a question for the selected agent stays with it", () => {
    expect(ask("validate PRJ-201", "brand", "validation")).toMatchObject({ play: { script: { id: "V1" } } });
    expect(ask("validate PRJ-201", "brand", "validation").agent).toBeUndefined();
  });

  it("C5 plays the routing script for the brand", () => {
    const r = ask("Can I trust the inspection at Ambattur?");
    expect(r.play?.script.id).toBe("C5");
  });

  it("the Validation agent is brand only: a supplier asking for it gets the exact message", () => {
    for (const q of ["Validate the Pallikaranai claim PRJ-103", "Can I trust the inspection at Ambattur?", "validate the Ambattur inspection INS-0412", "run a validation of PRJ-105"]) {
      const r = ask(q, "supplier");
      expect([r.reply, r.play === undefined]).toEqual([VALIDATION_BRAND_ONLY_REPLY, true]);
    }
    expect(VALIDATION_BRAND_ONLY_REPLY).toBe("Claim and report validation is available to brand accounts. You can upload evidence from Claims & Evidence.");
  });

  it("a supplier asking about another supplier is told it can only see its own data", () => {
    for (const q of ["Which technology fits Karur Finishing Works?", "How is Kongu Knit Processing doing?", "What about Tiruppur Mill?", "Tell me about SUP2", "Is PRJ-201 valid?", "evidence gap report for Palar Fabrics"]) {
      expect(ask(q, "supplier").reply).toBe("I can only show data for Coromandel Denim Mills.");
    }
    expect(OUT_OF_SCOPE_REPLY).toBe("I can only show data for Coromandel Denim Mills.");
  });

  it("a supplier's own questions are answered from its own scope", () => {
    expect(ask("Which of our factories should we act on first?", "supplier").play?.script.id).toBe("C1");
    expect(ask("Which suppliers are off-track?", "supplier").play?.script.id).toBe("C4");
    expect(ask("which technology fits", "supplier").reply).toBe("I can only show data for Coromandel Denim Mills.");
  });

  it("a narrowed brand scope explains what is outside it", () => {
    const sup2 = copilotScope("brand", "SUP2");
    expect(sup2.label).toBe("Cauvery Dyeing & Finishing");
    expect(ask("Check the Avinashi ETP audit report", "brand", "validation", sup2).reply).toBe("Avinashi Road Dye House is outside the current scope (Cauvery Dyeing & Finishing). Change the scope to include it.");
    expect(ask("Why did Ambattur's sub-basin score drop last month?", "brand", "copilot", sup2).reply).toContain("outside the current scope");
    expect(ask("Which sites should we act on first?", "brand", "copilot", sup2).play?.script.id).toBe("C1");
  });

  it("the BRSR draft and gap report pick up the factory or supplier a question names", () => {
    expect(ask("BRSR principle 6 report for Oragadam Finishing").play?.params.factoryId).toBe("F14");
    expect(ask("Give me the BRSR Principle 6 water report for Ambattur Denim Unit", "brand", "evidence").play?.params.factoryId).toBe("F12");
    expect(ask("Evidence gap report for Kongu Knit Processing", "brand", "evidence").play?.params.supplierId).toBe("SUP1");
    expect(ask("Evidence gap report", "brand", "evidence").play?.params.supplierId).toBe("SUP1");
    expect(ask("Evidence gap report", "supplier", "evidence").play?.params.supplierId).toBe("SUP5");
    expect(defaultGapSupplier("brand", copilotScope("brand", "SUP4"))).toBe("SUP4");
  });

  it("matchScript prefers the selected agent when two scripts match", () => {
    expect(matchScript("Can I trust the Ambattur inspection (INS-0412)?", "copilot")?.id).toBe("C5");
    expect(matchScript("Can I trust the Ambattur inspection (INS-0412)?", "validation")?.id).toBe("V3");
  });

  it("detects mentions outside the scope, by name, id, project or inspection", () => {
    expect(outOfScopeMention("how is Kongu Knit Processing", ownScope)).toBe("Kongu Knit Processing");
    expect(outOfScopeMention("is f06 ok", ownScope)).toBe("Erode Wet Process");
    expect(outOfScopeMention("PRJ-201", ownScope)).toBe("Avinashi Road Dye House");
    expect(outOfScopeMention("INS-0399", ownScope)).toBe("Erode Wet Process");
    expect(outOfScopeMention("Ambattur Denim Unit PRJ-103 INS-0412", ownScope)).toBeNull();
    expect(outOfScopeMention("Kongu Knit Processing", brandScope)).toBeNull();
  });
});

describe("deep links from the Validate with agent buttons (PRODUCT 4.4, 4.6)", () => {
  const link = (p: Parameters<typeof interpretLink>[0], role: "brand" | "supplier" = "brand") => interpretLink(p, role, role === "brand" ? brandScope : ownScope);

  it("claim=PRJ-103 selects the Validation agent and plays V2 with the claim preloaded", () => {
    const r = link({ agent: "validation", claim: "PRJ-103" })!;
    expect(r.agent).toBe("validation");
    expect(r.play?.script.id).toBe("V2");
    expect(r.userText).toBe("Validate the Pallikaranai wetland claim (PRJ-103)");
  });

  it("every scripted item opens its script: PRJ-201, INS-0412, the Tiruppur lab report, the Avinashi audit", () => {
    expect(link({ agent: "validation", claim: "PRJ-201" })!.play?.script.id).toBe("V1");
    expect(link({ agent: "validation", inspection: "INS-0412" })!.play?.script.id).toBe("V3");
    expect(link({ agent: "validation", report: "F01-D04" })!.play?.script.id).toBe("V4");
    expect(link({ agent: "validation", report: "F02-D11" })!.play?.script.id).toBe("V5");
  });

  it("an item without a script gets a plain reply and the prompts", () => {
    const r = link({ agent: "validation", claim: "PRJ-301" })!;
    expect(r.agent).toBe("validation");
    expect(r.play).toBeUndefined();
    expect(r.reply).toContain("not among them");
    expect(r.showPrompts).toBe(true);
    expect(link({ agent: "validation", inspection: "INS-0399" })!.reply).toContain("not among them");
  });

  it("a supplier who opens the Validation agent gets the brand-only message", () => {
    const r = link({ agent: "validation", claim: "PRJ-103" }, "supplier")!;
    expect(r.reply).toBe(VALIDATION_BRAND_ONLY_REPLY);
    expect(r.play).toBeUndefined();
    expect(link({ agent: "validation" }, "supplier")!.reply).toBe(VALIDATION_BRAND_ONLY_REPLY);
  });

  it("the Evidence tab buttons open the evidence agent with the factory", () => {
    const e1 = link({ agent: "evidence", task: "brsr-p6", factory: "F12" })!;
    expect(e1.play?.script.id).toBe("E1");
    expect(e1.play?.params.factoryId).toBe("F12");
    const e2 = link({ agent: "evidence", task: "gap-report", factory: "F12" })!;
    expect(e2.play?.script.id).toBe("E2");
    expect(e2.play?.params.supplierId).toBe("SUP5");
    expect(link({ agent: "evidence", task: "gap-report", factory: "F12" }, "supplier")!.play?.params.supplierId).toBe("SUP5");
    expect(link({ agent: "evidence", task: "brsr-p6", factory: "F04" }, "supplier")!.reply).toBe(OUT_OF_SCOPE_REPLY);
    expect(interpretLink({ agent: "evidence", task: "brsr-p6", factory: "F04" }, "brand", copilotScope("brand", "SUP1"))!.reply).toContain("outside the current scope");
  });

  it("an agent alone only switches; no agent or an unknown one does nothing", () => {
    expect(link({ agent: "evidence" })).toEqual({ userText: "", agent: "evidence" });
    expect(link({ agent: "copilot" })).toEqual({ userText: "", agent: "copilot" });
    expect(link({ agent: "nonsense" })).toBeNull();
    expect(link({})).toBeNull();
  });
});

describe("agents, prompts and scope", () => {
  it("there are three agents; only the Validation agent is brand-only", () => {
    expect(agents.map((a) => [a.id, a.brandOnly])).toEqual([["copilot", false], ["evidence", false], ["validation", true]]);
    expect(agents.map((a) => a.name)).toEqual(["Stewardship Copilot", "Evidence & Disclosure agent", "Validation agent"]);
    expect(agentAllowed("validation", "brand")).toBe(true);
    expect(agentAllowed("validation", "supplier")).toBe(false);
    expect(agentAllowed("copilot", "supplier")).toBe(true);
  });

  it("brand: six Copilot prompts, two Evidence prompts, five Validation prompts, in the spec order", () => {
    expect(suggestedScripts("copilot", "brand", brandScope).map((s) => s.id)).toEqual(["C1", "C2", "C3", "C4", "C5", "C6"]);
    expect(suggestedScripts("evidence", "brand", brandScope).map((s) => s.id)).toEqual(["E1", "E2"]);
    expect(suggestedScripts("validation", "brand", brandScope).map((s) => s.id)).toEqual(["V1", "V2", "V4", "V3", "V5"].sort((a, b) => ["V1", "V2", "V3", "V4", "V5"].indexOf(a) - ["V1", "V2", "V3", "V4", "V5"].indexOf(b)));
  });

  it("supplier: Copilot offers C1 to C4, Evidence offers both, Validation offers none", () => {
    expect(suggestedScripts("copilot", "supplier", ownScope).map((s) => s.id)).toEqual(["C1", "C2", "C3", "C4"]);
    expect(suggestedScripts("evidence", "supplier", ownScope).map((s) => s.id)).toEqual(["E1", "E2"]);
    expect(suggestedScripts("validation", "supplier", ownScope)).toEqual([]);
  });

  it("prompts use the spec wording", () => {
    expect(promptFor(script("C1"), "brand")).toBe("Which sites should we act on first?");
    expect(promptFor(script("V1"), "brand")).toBe("Validate the Noyyal check dam claim (PRJ-201)");
    expect(promptFor(script("V2"), "brand")).toBe("Validate the Pallikaranai wetland claim (PRJ-103)");
    expect(promptFor(script("V4"), "brand")).toBe("Validate the ETP lab report for Tiruppur Mill");
    expect(promptFor(script("V3"), "brand")).toBe("Can I trust the Ambattur inspection (INS-0412)?");
    expect(promptFor(script("V5"), "brand")).toBe("Check the Avinashi ETP audit report");
    expect(promptFor(script("E1"), "brand")).toBe("Give me the BRSR Principle 6 water report for Ambattur Denim Unit");
    expect(promptFor(script("E2"), "brand")).toBe("Evidence gap report for Kongu Knit Processing");
    expect(promptFor(script("E2"), "supplier")).toBe("Evidence gap report for Coromandel Denim Mills");
    expect(promptFor(script("E2"), "brand", copilotScope("brand", "SUP3"))).toBe("Evidence gap report for Noyyal Textile Works");
  });

  it("a prompt is dropped when the site it needs is outside the scope", () => {
    const sup2 = copilotScope("brand", "SUP2");
    expect(suggestedScripts("copilot", "brand", sup2).map((s) => s.id)).toEqual(["C1", "C2", "C4", "C6"]);
    expect(suggestedScripts("validation", "brand", sup2)).toEqual([]);
  });

  it("scope: supplier is its own three factories; the brand can narrow to one supplier; the chip says so", () => {
    expect(ownScope.scope.factoryIds).toEqual(["F12", "F13", "F14"]);
    expect(scopeChipText(ownScope)).toBe("Coromandel Denim Mills · FY2025-26");
    expect(scopeChipText(brandScope)).toBe("All suppliers · FY2025-26");
    const kongu = copilotScope("brand", "SUP1");
    expect(kongu.scope.factoryIds).toEqual(["F01", "F02", "F03"]);
    expect(kongu.scope.canValidate).toBe(true);
    expect(copilotScope("supplier", "SUP1").kind).toBe("own");
    expect(copilotScope("brand", "SUP9").kind).toBe("network");
  });

  it("answers follow the scope: narrowed to Kongu, ranking and PWI are Kongu's", () => {
    const ctx = makeTokenCtx(copilotScope("brand", "SUP1"));
    const c1 = buildAnswer(script("C1"), ctx);
    expect(texts(c1)[0]).toBe("Start with **Avinashi Road Dye House**, then **Tiruppur Mill**. Both are Tier 1.".replace("Both are Tier 1.", "They are Tier 1 and Tier 2."));
    expect(block(c1, "ranking").rows.map((r) => r.id)).toEqual(["F02", "F01", "F03"]);
    expect(texts(buildAnswer(script("C2"), ctx))[0]).toContain("PWI across Kongu Knit Processing is **64.2%** unweighted and **58.5%** RN-weighted.");
    expect(texts(buildAnswer(script("C2"), ctx)).some((t) => t.includes("Ambattur"))).toBe(false);
  });

  it("for the supplier, C1 to C4 are built from its own three factories", () => {
    const c1 = buildAnswer(script("C1"), ownCtx);
    expect(block(c1, "ranking").rows.map((r) => r.id)).toEqual(["F12", "F14", "F13"]);
    expect(texts(c1)[0]).toBe("Start with **Ambattur Denim Unit**, then **Oragadam Finishing**. They are Tier 1 and Tier 2.");
    const c4 = buildAnswer(script("C4"), ownCtx);
    expect(texts(c4)[0]).toBe("One plant needs attention:");
    expect(block(c4, "offTrack").groups).toHaveLength(1);
    expect(block(c4, "offTrack").groups[0].plants[0].id).toBe("F13");
    expect(texts(c4)[1]).toBe("The other 2 plants are on track.");
    const c2 = buildAnswer(script("C2"), ownCtx);
    expect(texts(c2)[0]).toBe("PWI across your factories is **65.9%** unweighted and **66.0%** RN-weighted. The RN-weighted figure is not lower than the unweighted one, so no large site is hiding a weak one.");
  });
});

describe("demo hash", () => {
  it("is stable and shaped like a reference", () => {
    expect(demoHash("F12-D06:Water meter log by source")).toBe(demoHash("F12-D06:Water meter log by source"));
    expect(demoHash("a")).not.toBe(demoHash("b"));
    expect(demoHash("a")).toMatch(/^demo-[0-9a-f]{8}$/);
  });
});
