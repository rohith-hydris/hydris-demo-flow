import { describe, expect, it } from "vitest";
import { removals } from "@/src/data/cells";
import { delivered } from "@/src/data/delivered";
import { factories } from "@/src/data/factories";
import { f12Example } from "@/src/data/f12Example";
import { liteFindings, opportunities } from "@/src/data/opportunities";
import { outputs } from "@/src/data/affected";
import { projects } from "@/src/data/projects";
import { riskScores } from "@/src/data/risks";
import { scenarios } from "@/src/data/scenarios";
import { affectedOutputs, flaggedCount } from "./affected";
import { boundaryBalance, loadReduction, qualityAccounting } from "./boundary";
import { importFinding, initialImports, rankOpportunities, weightedScore } from "./catalogue";
import { statusCounts } from "./claims";
import { buildFactoryPwi } from "./pwi";
import { eventsOn, eventsUpTo } from "./replay";
import { DEFAULT_WEIGHTS, riskPillarsPolicy, riskR, renormalisationDelta, riskPillars } from "./risk";
import { evaluateScenario, paybackLabel } from "./scenarios";
import { allocationConflictText, hasAllocationConflict, participationRecords, physicalTotals, totalAllocation, totalFunding } from "./shared";
import { acceptEvidence, countsTowardPwi, geographyOnly, summaryStatus } from "./states";
import { getSites } from "./selectors";
import { scopeFor } from "./scope";
import type { RiskScores } from "@/src/data/types";
import type { ReviewStates } from "./types";

const f12 = () => buildFactoryPwi(factories.find((f) => f.id === "F12")!, delivered.find((d) => d.factoryId === "F12"), removals.find((r) => r.factoryId === "F12")!, f12Example);
const RN = 110000;
const scen = (id: string) => evaluateScenario(f12(), RN, scenarios.find((s) => s.id === id)!.items);
const pct = (x: number) => Math.round(x * 1000) / 10;

describe("V2 2: five review states", () => {
  it("the 22 projects keep their old summary status (the 21 plus PRJ-702)", () => {
    expect(projects).toHaveLength(22);
    expect(statusCounts()).toEqual({ Validated: 12, "Pending validation": 6, Flagged: 1, "Not counted": 3 });
  });
  it("named exceptions", () => {
    const by = (id: string) => projects.find((p) => p.id === id)!;
    expect(by("PRJ-105").states).toMatchObject({ evidenceAcceptance: "Accepted with warning", benefitState: "Measured", reportRelease: "Draft" });
    expect(by("PRJ-401").states).toMatchObject({ evidenceAcceptance: "Accepted with warning", benefitState: "Validated" });
    for (const id of ["PRJ-107", "PRJ-108", "PRJ-303"]) expect(by(id).states.claimEligibility).toBe("Not eligible");
    for (const id of ["PRJ-101", "PRJ-102", "PRJ-103", "PRJ-104", "PRJ-106"]) expect(by(id).states.reportRelease).toBe("Released (snapshot)");
    expect(projects.filter((p) => p.states.reportRelease === "Released (snapshot)").map((p) => p.id)).toEqual(["PRJ-101", "PRJ-102", "PRJ-103", "PRJ-104", "PRJ-106"]);
  });
  it("a passed evidence check never validates an impact claim", () => {
    const pending = projects.find((p) => p.id === "PRJ-1101")!.states;
    const accepted = acceptEvidence(pending);
    expect(accepted.evidenceAcceptance).toBe("Accepted");
    expect(accepted.benefitState).toBe("Measured");
    expect(countsTowardPwi(accepted)).toBe(false);
    expect(summaryStatus(accepted)).toBe("Pending validation");
  });
  it("a Forecast is never Measured or Validated and never counts", () => {
    const forecast: ReviewStates = { ...projects[0].states, benefitState: "Forecast" };
    expect(forecast.benefitState).toBe("Forecast");
    expect(countsTowardPwi(forecast)).toBe(false);
  });
  it("geography alone never makes a project eligible (PRJ-501)", () => {
    const c = projects.find((p) => p.id === "PRJ-501")!.eligibilityChecks;
    expect(c).toEqual({ insidePolygon: "Pass", hydrologicallyConnected: "Pass", collectiveAction: "Unknown" });
    expect(geographyOnly(c)).toBe(true);
    expect(projects.find((p) => p.id === "PRJ-501")!.states.claimEligibility).toBe("Under review");
  });
});

describe("V2 4.2: missing data in R", () => {
  const scores = (id: string) => riskScores.find((r) => r.factoryId === id)!;
  it("F10 has a coastal flood reading of 0.0 (No Risk), so coverage is 10 of 10 and R stays 0.55", () => {
    const r = scores("F10");
    const p = riskPillarsPolicy(r.scores, r.gaps);
    expect(p.coverage).toMatchObject({ available: 10, required: 10, share: 1 });
    expect(p.missingPillars).toEqual([]);
    expect(Math.round(riskR(p.pillars, DEFAULT_WEIGHTS) * 100) / 100).toBe(0.55);
    const site = getSites(scopeFor("brand")).find((s) => s.id === "F10")!;
    expect(site.R).toBeCloseTo(0.55, 2);
    expect(site.riskCoverage.share).toBe(1);
  });
  it("F11 coastal eutrophication Error changes neither R nor the counts", () => {
    const sites = getSites(scopeFor("brand"));
    const f11 = sites.find((s) => s.id === "F11")!;
    const rec = riskScores.find((r) => r.factoryId === "F11")!;
    const without = (gaps: object) => { const p = riskPillarsPolicy(rec.scores, gaps); return riskR(p.pillars, DEFAULT_WEIGHTS, p.missingPillars); };
    expect(without({ rfr: "No data", cep: "Error" })).toBeCloseTo(without({ rfr: "No data" }), 12); // the cep gap alone moves nothing
    expect(f11.R).toBeCloseTo(0.365, 3);
    expect(f11.riskCounts).toMatchObject({ present: 1, watch: 4 });
    expect(f11.risks.find((r) => r.code === "cep")!.status).toBe("Error");
    const f10cfr = sites.find((s) => s.id === "F10")!.risks.find((r) => r.code === "cfr")!;
    expect([f10cfr.status, f10cfr.rule]).toEqual(["Not present", "No Risk"]); // inland: coastal flood is a reading of No Risk, not missing data (issue C4)
  });
  it("a synthetic site with the whole groundwater pillar missing renormalises, records coverage and reports the R delta", () => {
    const base = scores("F01").scores as RiskScores;
    const p = riskPillarsPolicy(base, { gtd: "No data" });
    expect(p.missingPillars).toEqual(["groundwater"]);
    expect(p.coverage).toMatchObject({ available: 9, required: 10 });
    // Without groundwater, the other weights are 0.30, 0.20, 0.15, 0.15 over 0.80.
    const R = riskR(p.pillars, DEFAULT_WEIGHTS, p.missingPillars);
    const expected = (0.3 * p.pillars.scarcity + 0.2 * p.pillars.drought + 0.15 * p.pillars.flood + 0.15 * p.pillars.community) / 0.8;
    expect(R).toBeCloseTo(expected, 12);
    const delta = renormalisationDelta(p.pillars, DEFAULT_WEIGHTS, p.missingPillars);
    expect(typeof delta).toBe("number");
    expect(delta).not.toBe(0);
    // Renormalisation can lower R as well as raise it: it is never claimed to be neutral.
    const lowFlood = { ...base, gtd: 0 };
    const q = riskPillarsPolicy({ ...lowFlood, drr: 0, bws: 0, bwd: 0, iav: 0, sev: 0 }, { gtd: "No data" });
    expect(renormalisationDelta(q.pillars, DEFAULT_WEIGHTS, q.missingPillars)).not.toBe(renormalisationDelta(p.pillars, DEFAULT_WEIGHTS, p.missingPillars));
  });
  it("no gaps gives the same pillars as before", () => {
    expect(riskPillars(scores("F01").scores).scarcity).toBeCloseTo(0.78, 2);
  });
});

describe("V2 5.2: shared projects", () => {
  const prj = (id: string) => projects.find((p) => p.id === id)!;
  it("PRJ-103: funding and allocation total 100%, F12 counted 25,000, physical 50,000", () => {
    const p = prj("PRJ-103");
    expect(totalFunding(p)).toBeCloseTo(1, 12);
    expect(totalAllocation(p)).toBeCloseTo(1, 12);
    expect(hasAllocationConflict(p)).toBe(false);
    const recs = participationRecords([p]);
    const f12r = recs.find((r) => r.factoryId === "F12")!;
    expect(f12r.attributable).toEqual({ unit: "m3", value: 25000 });
    expect(recs.find((r) => r.participant === "Adyar Garments Ltd")!.attributable).toEqual({ unit: "m3", value: 25000 });
    expect(physicalTotals([p, p]).m3).toBe(50000);
  });
  it("adding a participant never raises the physical benefit", () => {
    const p = prj("PRJ-103");
    const more = { ...p, participants: [...p.participants, { ...p.participants[3], participant: "Another" }] };
    expect(physicalTotals([more]).m3).toBe(50000);
  });
  it("PRJ-201: 140% requested is an allocation conflict, and Noyyal Exports funds nothing", () => {
    const p = prj("PRJ-201");
    expect(totalAllocation(p)).toBeCloseTo(1.4, 12);
    expect(allocationConflictText(p)).toBe("Allocation conflict: 140% requested, 100% maximum");
    expect(p.participants.find((x) => x.participant === "Noyyal Exports")).toMatchObject({ fundingShare: 0, claimAllocation: 0.4 });
    expect(p.states.claimEligibility).toBe("Allocation conflict");
  });
});

describe("V2 10: Lite import", () => {
  it("is idempotent: LITE-0187 twice yields one record", () => {
    const f = liteFindings.find((x) => x.id === "LITE-0187")!;
    const a = importFinding(initialImports(), f);
    expect(a).toMatchObject({ created: true, opportunityId: "OPP-D" });
    const b = importFinding(a.imports, f);
    expect(b).toMatchObject({ created: false, opportunityId: "OPP-D", message: "Already imported as OPP-D. No duplicate created." });
    expect(Object.keys(b.imports).length).toBe(Object.keys(a.imports).length);
  });
  it("LITE-0144 is already imported as OPP-0144", () => {
    const f = liteFindings.find((x) => x.id === "LITE-0144")!;
    expect(importFinding(initialImports(), f)).toMatchObject({ created: false, opportunityId: "OPP-0144" });
  });
});

describe("V2 11: catalogue", () => {
  it("weighted scores reproduce", () => {
    const want: Record<string, number> = { "OPP-C": 3.85, "OPP-D": 3.8, "OPP-B": 3.6, "OPP-E": 3.5, "OPP-A": 3.45, "OPP-F": 3.4, "OPP-H": 3.3, "OPP-G": 4.45 };
    for (const r of rankOpportunities()) expect(Math.round(r.weighted * 100) / 100).toBe(want[r.opportunity.id]);
  });
  it("gates come first: OPP-G (4.45) is listed after OPP-H (3.30)", () => {
    const order = rankOpportunities().map((r) => r.opportunity.id);
    expect(order).toEqual(["OPP-C", "OPP-D", "OPP-B", "OPP-E", "OPP-A", "OPP-F", "OPP-H", "OPP-G"]);
    const g = rankOpportunities().find((r) => r.opportunity.id === "OPP-G")!;
    expect(g.eligible).toBe(false);
    expect(g.failed.map((x) => `${x.key}:${x.result}`)).toEqual(["hydrologicallyConnected:Fail", "collectiveAction:Unknown"]);
    expect(weightedScore(g.opportunity.scores)).toBeGreaterThan(weightedScore(rankOpportunities().find((r) => r.opportunity.id === "OPP-F")!.opportunity.scores));
  });
});

describe("V2 12: scenarios", () => {
  it("S0 reproduces the baseline", () => {
    const s = scen("S0");
    expect(pct(s.pwi)).toBe(69.8);
    expect(pct(s.volumetricBalance)).toBe(73.6);
    expect(s.payback).toEqual({ kind: "n/a" });
  });
  it("S0 balance equals the site's central balance exactly, for every site with no project added", () => {
    for (const f of factories) {
      const site = buildFactoryPwi(f, delivered.find((d) => d.factoryId === f.id), removals.find((r) => r.factoryId === f.id)!, f.id === "F12" ? f12Example : null);
      expect(evaluateScenario(site, f.replenishmentNeededM3, []).volumetricBalance).toBeCloseTo(site.volumetricBalanceCentral, 12);
    }
  });
  it("A5: an ETP nitrogen upgrade moves P1 Quality (TN 75 to 85 points raises it from 0.907 to 0.944)", () => {
    // P1 Quality is the mean of per-pollutant scores min(1, removal / 90): TSS 1, TN 85/90, TP 80/90 = 0.9444.
    // (The issue text gives 0.963, which is what TN at 90% would score: (1 + 1 + 0.889) / 3.)
    const site = f12();
    const q = (r: ReturnType<typeof evaluateScenario>) => r.pillars.P1;
    const before = site.cells.find((c) => c.pillar === "P1" && c.dimension === "Quality")!.score;
    expect(before).toBeCloseTo(0.9074, 3);
    const r = evaluateScenario(site, RN, ["OPP-H"]);
    const base = evaluateScenario(site, RN, []);
    // P1 = 0.4 A + 0.3 W + 0.3 Q, so a Quality gain of g lifts P1 by 0.3 g
    expect(q(r) - q(base)).toBeCloseTo(0.3 * ((1 + 85 / 90 + 80 / 90) / 3 - before), 9);
    expect((1 + 85 / 90 + 80 / 90) / 3).toBeCloseTo(0.9444, 4);
    expect(r.pwi).toBeGreaterThan(base.pwi);
  });
  it("A5: the low value applies the uncertainty to the added points (+7 not +10 at 30%) and removal is capped at 100%", () => {
    const site = f12();
    const base = evaluateScenario(site, RN, []);
    const r = evaluateScenario(site, RN, ["OPP-H"]);
    expect(r.pwiLow).toBeGreaterThan(base.pwi);
    expect(r.pwiLow).toBeLessThan(r.pwi);
    const lowQ = (1 + 82 / 90 + 80 / 90) / 3;
    expect(r.pwiLow - base.pwi).toBeCloseTo(0.3 * (lowQ - site.cells.find((c) => c.pillar === "P1" && c.dimension === "Quality")!.score) / 3, 9);
    const huge = evaluateScenario(site, RN, ["OPP-H"], [{ ...opportunities.find((o) => o.id === "OPP-H")!, forecast: { unit: "removal", tss: 50, tn: 50, tp: 50 } }]);
    expect(huge.pillars.P1).toBeCloseTo(0.4 * site.cells.find((c) => c.pillar === "P1" && c.dimension === "Availability")!.score + 0.3 + 0.3, 9); // every pollutant at 100% removal scores 1
  });
  it("A5: a scenario with no removal project is unchanged", () => {
    for (const id of ["S0", "S1", "S2", "S3"]) {
      const withH = scen(id), without = evaluateScenario(f12(), RN, scenarios.find((s) => s.id === id)!.items.filter((i) => i !== "OPP-H"));
      expect(withH.pwi).toBe(without.pwi);
      expect(withH.pillars.P1).toBe(without.pillars.P1);
    }
    expect(pct(scen("S1").pwi)).toBe(81.6);
  });
  it("S1 Basin first", () => {
    const s = scen("S1");
    expect([pct(s.pwi), pct(s.pwiLow), pct(s.volumetricBalance), pct(s.volumetricBalanceLow)]).toEqual([81.6, 78.6, 80.9, 78.7]);
    expect([s.capexLakh, s.omLakh, s.netSavingsLakh]).toEqual([205, 11, -11]);
    expect(paybackLabel(s.payback)).toBe("No financial payback");
    expect(s.pillars.P3).toBeCloseTo(0.736, 3);
    expect(s.stewardship.addedPeople).toBe(600);
    expect(s.benefitState).toBe("Forecast");
  });
  it("S2 Efficiency and reuse: overlap subtracted once", () => {
    const s = scen("S2");
    expect([pct(s.pwi), pct(s.pwiLow), pct(s.volumetricBalance), pct(s.volumetricBalanceLow)]).toEqual([70.4, 70.4, 80.5, 79.4]);
    expect([s.capexLakh, s.omLakh, s.netSavingsLakh]).toEqual([85, 3.5, 7.75]);
    expect(s.overlapM3).toBe(2500);
    expect(s.overlapSavingLakh).toBeCloseTo(3.75, 12);
    expect(s.payback.kind === "years" && s.payback.years.toFixed(1)).toBe("11.0");
    expect(s.pillars.P1).toBeCloseTo(0.972, 3);
  });
  it("S3 Balanced", () => {
    const s = scen("S3");
    expect([pct(s.pwi), pct(s.pwiLow), pct(s.volumetricBalance), pct(s.volumetricBalanceLow)]).toEqual([77.8, 76.1, 90.9, 86.5]);
    expect([s.capexLakh, s.omLakh, s.netSavingsLakh]).toEqual([218, 10, -1]);
    expect(paybackLabel(s.payback)).toBe("No financial payback");
    expect(s.stewardship.addedM3).toBe(19000);
  });
  it("efficiency and reuse raise the balance far more than PWI, basin projects move PWI", () => {
    expect(scen("S2").stewardship.balanceChangePoints).toBeGreaterThan(scen("S2").stewardship.pwiChangePoints * 5);
    expect(scen("S1").stewardship.pwiChangePoints).toBeGreaterThan(scen("S2").stewardship.pwiChangePoints * 10);
  });
  it("targets stay frozen: the forecast never changes the baseline", () => {
    expect(pct(f12().sitePwiCentral)).toBe(69.8);
  });
});

describe("V2 7: water balance boundary", () => {
  const b = boundaryBalance("F12")!;
  it("reconciles: 250,000 = 150,000 + 97,000 + 2,000 + 1,000", () => {
    expect(b.reconciles).toBe(true);
    expect([b.withdrawalM3, b.totalDischargeM3, b.consumptionM3, b.storageChangeM3, b.errorM3]).toEqual([250000, 150000, 97000, 2000, 1000]);
    expect(b.otherDischargeM3).toBe(10000);
    expect(b.errorShareOfWithdrawal).toBeCloseTo(0.004, 12);
  });
  it("consumption and Replenishment Needed are separate and reconcile to 110,000; recirculation is not an inflow", () => {
    expect(b.consumptionM3).toBe(97000);
    expect(b.replenishmentNeededM3).toBe(110000);
    expect(b.rnParts.map((p) => p.m3)).toEqual([10000, 97000, 2000, 1000]);
    expect(b.internalRecirculationM3).toBe(19000);
    expect(b.withdrawalM3).toBe(250000);
  });
  it("only F12 has a boundary balance", () => expect(boundaryBalance("F01")).toBeNull());
});

describe("V2 8: quality accounting", () => {
  const q = qualityAccounting("F12", { tss: 92.5, tn: 75, tp: 80 })!;
  it("three separate columns", () => {
    expect(q.map((c) => c.pollutant)).toEqual(["tss", "tn", "tp"]);
    expect(q.map((c) => c.baselineLoadKg)).toEqual([60000, 9000, 1500]);
    expect(q.map((c) => c.totalRemovalKg)).toEqual([55500, 6750, 1200]);
    expect(q.map((c) => c.incrementalKg)).toEqual([2500, 200, 40]);
    expect(q.map((c) => c.eligibleP2Kg)).toEqual([2500, 200, 40]);
  });
  it("proposed spill-over is not counted: 1,500 / 0 / 0, and P2 Quality stays 0.604", () => {
    expect(q.map((c) => c.spilloverKg)).toEqual([1500, 0, 0]);
    expect(q[0].eligibleP2Kg).toBe(2500); // not 2,500 + 1,500
    expect(f12().cells.find((c) => c.pillar === "P2" && c.dimension === "Quality")!.score).toBeCloseTo(0.604, 3);
  });
  it("a lower concentration proves a load reduction only when flows match", () => {
    expect(loadReduction({ mgPerL: 60, flowM3: 150000 }, { mgPerL: 20, flowM3: 150000 })).toEqual({ valid: true, kg: 6000, message: "Valid load reduction" });
    expect(loadReduction({ mgPerL: 60, flowM3: 150000 }, { mgPerL: 20, flowM3: 120000 })).toEqual({ valid: false, kg: null, message: "Flows do not match" });
  });
});

describe("V2 13: affected outputs", () => {
  const rows = affectedOutputs(0.698, 0.795);
  it("flags the draft scorecard and claim pack; the released snapshot is unchanged", () => {
    expect(rows.find((r) => r.output.id === "SC-2026-09")!.outcome).toBe("Flagged for review");
    expect(rows.find((r) => r.output.id === "CP-F12-DRAFT")!.outcome).toBe("Flagged for review");
    expect(flaggedCount(rows)).toBe(2);
    const brsr = rows.find((r) => r.output.id === "BRSR-P6-FY2526")!;
    expect(brsr.outcome).toBe("Not altered");
    expect(brsr.banner).toContain("does not alter a released report");
    expect(outputs.find((o) => o.id === "BRSR-P6-FY2526")!.before).toEqual({ kind: "text", value: "Unchanged" });
  });
  it("the ledger entry is recalculated and valid", () => {
    expect(rows.find((r) => r.output.id === "LE-2347")).toMatchObject({ outcome: "Recalculated", calculationValidity: "Valid" });
  });
});

describe("V2 14: replay", () => {
  it("alerts fire in sequence: F06 day 4, F02 day 5, F13 day 6", () => {
    expect(eventsUpTo(0)).toEqual([]);
    expect(eventsUpTo(3)).toEqual([]);
    expect(eventsOn(4).map((e) => e.factoryId)).toEqual(["F06"]);
    expect(eventsOn(5).map((e) => e.factoryId)).toEqual(["F02"]);
    expect(eventsOn(6).map((e) => e.factoryId)).toEqual(["F13"]);
    expect(eventsUpTo(6).map((e) => e.factoryId)).toEqual(["F13", "F02", "F06"]);
    expect(eventsUpTo(99).length).toBeGreaterThan(5);
  });
});

// ---- C6: the mass-balance tolerance (issue C6) -------------------------------------------------------------------------------------

import { f12BoundaryHighError } from "@/src/data/f12Balance";
import { balanceGradeNote, balanceGradePenalty, computeBoundaryBalance, BALANCE_ERROR_NOTE } from "./boundary";
import { gradeAfterBalance } from "./pwi";

describe("mass-balance tolerance lowers the cell grades (issue C6)", () => {
  // withdrawal 250,000 and the other terms fixed, so the error is set by the metered consumption
  const errorOf = (share: number) => ({ ...f12BoundaryHighError, meteredConsumptionM3: 250000 - 150000 - 2000 - Math.round(share * 250000) });

  it("balanceGradePenalty is 0 at 9.9% and 10.0%, and 1 at 10.1%, in either direction", () => {
    expect([0.099, 0.1, 0.101].map(balanceGradePenalty)).toEqual([0, 0, 1]);
    expect([-0.099, -0.1, -0.101].map(balanceGradePenalty)).toEqual([0, 0, 1]);
    expect([0, 0.004, 0.5].map(balanceGradePenalty)).toEqual([0, 0, 1]);
  });

  it("the thresholds hold on real balances: errors of 24,750, 25,000 and 25,250 m3 on 250,000 m3 withdrawn", () => {
    for (const [share, penalty] of [[0.099, 0], [0.1, 0], [0.101, 1]] as const) {
      const b = computeBoundaryBalance(errorOf(share));
      expect(b.errorM3).toBe(Math.round(share * 250000));
      expect(b.errorShareOfWithdrawal).toBe(share);
      expect(balanceGradePenalty(b.errorShareOfWithdrawal)).toBe(penalty);
    }
  });

  it("F12's own balance error is 0.4%, so nothing is lowered and no note is shown", () => {
    const b = boundaryBalance("F12")!;
    expect(balanceGradePenalty(b.errorShareOfWithdrawal)).toBe(0);
    expect(balanceGradeNote(b)).toBeNull();
    const f12 = getSites(scopeFor("brand")).find((s) => s.id === "F12")!;
    expect(f12.pwi.gradePenalty).toBe(0);
    expect(f12.pwi.cells.find((c) => c.pillar === "P1" && c.dimension === "Availability")!.grade).toBe("B");
  });

  it("the second fixture has a 12% error and shows the note", () => {
    const hi = computeBoundaryBalance(f12BoundaryHighError);
    expect([hi.withdrawalM3, hi.errorM3]).toEqual([250000, 30000]);
    expect(hi.errorShareOfWithdrawal).toBeCloseTo(0.12, 12);
    expect(hi.reconciles).toBe(true);
    expect(balanceGradePenalty(hi.errorShareOfWithdrawal)).toBe(1);
    expect(balanceGradeNote(hi)).toBe("Balance error above 10%: grade lowered");
    expect(BALANCE_ERROR_NOTE).toBe("Balance error above 10%: grade lowered");
  });

  it("gradeAfterBalance lowers one letter, keeps D at D and leaves an ungraded cell ungraded", () => {
    expect((["A", "B", "C", "D", "none"] as const).map((g) => gradeAfterBalance(g, 1))).toEqual(["B", "C", "D", "D", "none"]);
    expect((["A", "B", "C", "D", "none"] as const).map((g) => gradeAfterBalance(g, 0))).toEqual(["A", "B", "C", "D", "none"]);
  });

  it("with the penalty, every F12 cell drops one letter, and the counted PWI falls because grade C counts the low value", () => {
    const site = (penalty: number) => buildFactoryPwi(factories.find((f) => f.id === "F12")!, undefined, removals.find((r) => r.factoryId === "F12")!, f12Example, penalty);
    const [ok, lowered] = [site(0), site(1)];
    ok.cells.forEach((c, i) => expect(lowered.cells[i].grade).toBe(gradeAfterBalance(c.grade, 1)));
    expect(lowered.cells.find((c) => c.pillar === "P1" && c.dimension === "Quality")!.grade).toBe("B"); // A to B
    expect(lowered.cells.find((c) => c.pillar === "P3" && c.dimension === "Accessibility")!.grade).toBe("D"); // C to D
    expect(lowered.cells.find((c) => c.pillar === "P3" && c.dimension === "Quality")!.grade).toBe("none");
    expect(lowered.sitePwi).toBeLessThan(ok.sitePwi);
    expect(lowered.sitePwiCentral).toBeCloseTo(ok.sitePwiCentral, 12); // the central scores do not change
    expect(lowered.gradePenalty).toBe(1);
  });
});
