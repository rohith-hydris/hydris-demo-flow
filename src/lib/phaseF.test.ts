import { describe, expect, it } from "vitest";
import { scripts, type ScriptId } from "@/src/data/copilotScripts";
import { projects } from "@/src/data/projects";
import { buildAnswer, copilotScope, type ResolvedBlock } from "./copilot";
import { allocationConflictText, physicalTotals, totalAllocation, totalFunding } from "./shared";
import { STATE_FIELDS, VERDICT_CLOSING, geographyOnly, inspectionStates, reportStates, stateEffects, summaryStatus } from "./states";
import { makeTokenCtx } from "./tokens";

const ctx = makeTokenCtx(copilotScope("brand"));
const answer = (id: ScriptId) => buildAnswer(scripts.find((s) => s.id === id)!, ctx);
const verdictBlock = (id: ScriptId) => answer(id).blocks.find((b): b is Extract<ResolvedBlock, { kind: "checklist" | "inspection" }> => b.kind === "checklist" || b.kind === "inspection")!;
const proj = (id: string) => projects.find((p) => p.id === id)!;
const eff = (id: ScriptId) => Object.fromEntries(verdictBlock(id).stateEffects.map((e) => [e.key, e]));

describe("Phase F: the single badge is a summary of the five states", () => {
  it("every project's stored status equals the computed summary", () => {
    for (const p of projects) expect(summaryStatus(p.states)).toBe(p.status);
  });
  it("the strip has five fields", () => expect(STATE_FIELDS.map((f) => f.key)).toEqual(["evidenceAcceptance", "calculationValidity", "benefitState", "claimEligibility", "reportRelease"]));
  it("reports and inspections carry evidence acceptance only", () => {
    expect(reportStates("Ready")).toEqual({ evidenceAcceptance: "Accepted" });
    expect(reportStates("Failed check")).toEqual({ evidenceAcceptance: "Rejected" });
    expect(reportStates("Missing")).toEqual({ evidenceAcceptance: "Pending" });
    expect(inspectionStates("Needs review")).toEqual({ evidenceAcceptance: "Pending" });
    expect(inspectionStates("Validated")).toEqual({ evidenceAcceptance: "Accepted" });
  });
});

describe("Phase F: drawer facts", () => {
  it("PRJ-201 shows a 140% allocation conflict; Noyyal Exports funds 0% but requests 40%", () => {
    const p = proj("PRJ-201");
    expect(allocationConflictText(p)).toBe("Allocation conflict: 140% requested, 100% maximum");
    expect(totalAllocation(p)).toBeCloseTo(1.4, 10);
    expect(p.participants.find((x) => x.participant === "Noyyal Exports")).toMatchObject({ fundingShare: 0, claimAllocation: 0.4 });
  });
  it("PRJ-103 funding and allocation total 100% and the physical benefit stays 50,000", () => {
    const p = proj("PRJ-103");
    expect([totalFunding(p), totalAllocation(p)]).toEqual([1, 1]);
    expect(allocationConflictText(p)).toBeNull();
    expect(physicalTotals([p, p]).m3).toBe(50000);
  });
  it("PRJ-501 is in the basin by geography only and stays Under review", () => {
    const p = proj("PRJ-501");
    expect(geographyOnly(p.eligibilityChecks)).toBe(true);
    expect(p.states.claimEligibility).toBe("Under review");
    expect(geographyOnly(proj("PRJ-101").eligibilityChecks)).toBe(false);
  });
  it("F12 counterfactual, operating period and monitoring come from V2 5.1", () => {
    expect(proj("PRJ-103")).toMatchObject({ counterfactual: "Pre-restoration inundated area and depth", operatingPeriod: "10 years from 1 Jan 2025", monitoringRequirement: "Annual satellite inundation and depth survey" });
    expect(proj("PRJ-105").monitoringRequirement).toBe("Quarterly functionality check"); // the 62 days is computed from lastMonitoringCheck, not typed
  });
});

describe("Phase F: validation verdicts show the five states and end with the evidence line", () => {
  const ids: ScriptId[] = ["V1", "V2", "V3", "V4", "V5"];
  it("every verdict ends with the exact closing line and lists all five states", () => {
    for (const id of ids) {
      const b = verdictBlock(id);
      expect(b.closing).toBe("This checks the evidence. It does not by itself prove environmental impact.");
      expect(b.closing).toBe(VERDICT_CLOSING);
      expect(b.stateEffects.map((e) => e.key)).toEqual(STATE_FIELDS.map((f) => f.key));
    }
  });
  it("a passed check never sets benefitState to Validated", () => {
    for (const id of ids) expect(eff(id).benefitState.outcome === "set" && eff(id).benefitState.value === "Validated").toBe(false);
  });
  it("V1 sets four states, matching PRJ-201's stored states; the report state is unchanged", () => {
    const e = eff("V1");
    expect(["evidenceAcceptance", "calculationValidity", "benefitState", "claimEligibility"].map((k) => [e[k].outcome, e[k].value])).toEqual([
      ["set", "Rejected"], ["set", "Needs recalculation"], ["set", "Not validated"], ["set", "Allocation conflict"],
    ]);
    expect(e.reportRelease).toMatchObject({ outcome: "unchanged", value: "Not included" });
    const s = proj("PRJ-201").states;
    expect([e.evidenceAcceptance.value, e.calculationValidity.value, e.benefitState.value, e.claimEligibility.value]).toEqual([s.evidenceAcceptance, s.calculationValidity, s.benefitState, s.claimEligibility]);
  });
  it("V2 sets evidence only; benefit stays Validated and the Released snapshot is untouched", () => {
    const e = eff("V2");
    expect(e.evidenceAcceptance).toMatchObject({ outcome: "set", value: proj("PRJ-103").states.evidenceAcceptance });
    expect(e.benefitState).toMatchObject({ outcome: "unchanged", value: "Validated" });
    expect(e.reportRelease).toMatchObject({ outcome: "unchanged", value: "Released (snapshot)" });
  });
  it("V3, V4 and V5 set evidence acceptance only", () => {
    for (const id of ["V3", "V4", "V5"] as ScriptId[]) {
      expect(verdictBlock(id).stateEffects.filter((e) => e.outcome === "set").map((e) => e.key)).toEqual(["evidenceAcceptance"]);
    }
    expect(eff("V3").evidenceAcceptance.value).toBe("Pending");
    expect(eff("V4").evidenceAcceptance.value).toBe("Rejected");
    expect(eff("V5").evidenceAcceptance.value).toBe("Rejected");
  });
  it("stateEffects reads unchanged values from the record when there is one", () => {
    expect(stateEffects({ evidenceAcceptance: "Rejected" }, proj("PRJ-103").states)[2]).toMatchObject({ outcome: "unchanged", value: "Validated" });
    expect(stateEffects({}, null)[0]).toMatchObject({ outcome: "unchanged", value: null });
  });
});
