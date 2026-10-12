import { describe, expect, it } from "vitest";
import { crossCheckDefs, questions, selfAssessments } from "@/src/data/selfAssessment";
import { factories } from "@/src/data/factories";
import { openDecisions } from "@/src/data/methodology";
import { removals } from "@/src/data/cells";
import { delivered } from "@/src/data/delivered";
import { f12Example } from "@/src/data/f12Example";
import type { AssessmentAnswer } from "@/src/data/types";
import { answerMean, answerValue, confidenceBreakdown, confidenceOf, crossChecksFor, siteConfidence } from "./confidence";
import { buildFactoryPwi, internalStatusBand } from "./pwi";
import { siteChecks } from "./specCheckValues";

// PRODUCT 5.3 confidence values: the demo's assessments are tuned to reproduce them.
const SPEC_CONFIDENCE: Record<string, number> = {
  F01: 0.72, F02: 0.55, F03: 0.81, F04: 0.66, F05: 0.79, F06: 0.44, F07: 0.84, F08: 0.88, F09: 0.62, F10: 0.7, F11: 0.83, F12: 0.78, F13: 0.58, F14: 0.76,
};
const all = (score: number, evidence: number, n = 52): AssessmentAnswer[] => Array.from({ length: n }, () => [score, evidence] as const);
const passes = (n: number) => Array.from({ length: n }, () => ({ passed: true }));
const fails = (n: number) => Array.from({ length: n }, () => ({ passed: false }));

describe("site confidence formula (PRD 4.8)", () => {
  it("an answer is (score / 3) x evidence confidence", () => {
    expect(answerValue([3, 1.0])).toBe(1);
    expect(answerValue([3, 0.7])).toBeCloseTo(0.7, 12);
    expect(answerValue([2, 0.5])).toBeCloseTo(1 / 3, 12);
    expect(answerValue([0, 1.0])).toBe(0);
  });

  it("the mean is taken over the answers", () => {
    expect(answerMean([[3, 1.0], [0, 1.0]])).toBe(0.5);
    expect(answerMean(all(3, 0.7))).toBeCloseTo(0.7, 12);
  });

  it("with no failed check the confidence is the answer mean", () => {
    expect(siteConfidence(all(3, 0.7), passes(10))).toBeCloseTo(0.7, 12);
  });

  it("each failed check subtracts exactly 0.10", () => {
    const base = siteConfidence(all(3, 1.0), passes(10));
    expect(base).toBe(1);
    for (let n = 1; n <= 10; n++) expect(siteConfidence(all(3, 1.0), [...fails(n), ...passes(10 - n)])).toBeCloseTo(1 - 0.1 * n, 12);
    expect(confidenceBreakdown(all(3, 1.0), [...fails(1), ...passes(9)]).penalty).toBeCloseTo(0.1, 12);
  });

  it("never goes below 0", () => {
    expect(siteConfidence(all(0, 0.5), fails(10))).toBe(0);
    expect(siteConfidence(all(1, 0.5), fails(10))).toBe(0); // mean 0.167, penalty 1.0
    expect(siteConfidence([], fails(3))).toBe(0);
  });
});

describe("the demo's self-assessments (PRD 4.8)", () => {
  it("has 52 questions and ten named cross-checks XV-01 to XV-10", () => {
    expect(questions).toHaveLength(52);
    expect(crossCheckDefs.map((d) => d.id)).toEqual(Array.from({ length: 10 }, (_, i) => `XV-${String(i + 1).padStart(2, "0")}`));
    expect(crossCheckDefs.every((d) => d.name.length > 0)).toBe(true);
  });

  it("every site answers all 52 questions with a valid score and evidence confidence", () => {
    expect(selfAssessments.map((a) => a.factoryId).sort()).toEqual(factories.map((f) => f.id).sort());
    for (const a of selfAssessments) {
      expect(a.answers).toHaveLength(52);
      for (const [score, evidence] of a.answers) { expect([0, 1, 2, 3]).toContain(score); expect([1.0, 0.7, 0.5]).toContain(evidence); }
      for (const id of a.failedChecks) expect(crossCheckDefs.map((d) => d.id)).toContain(id);
    }
  });

  it("each cross-check is Pass or Fail per site, matching the failed list", () => {
    const f06 = crossChecksFor("F06");
    expect(f06).toHaveLength(10);
    expect(f06.filter((c) => !c.passed).map((c) => c.id)).toEqual(["XV-01", "XV-05"]);
    expect(crossChecksFor("F08").every((c) => c.passed)).toBe(true);
  });

  it("every site reproduces its PRODUCT 5.3 confidence within 0.01", () => {
    for (const f of factories) expect(Math.abs(confidenceOf(f.id).confidence - SPEC_CONFIDENCE[f.id])).toBeLessThan(0.01);
  });

  it("the status band still matches PRODUCT 5.5 for all 14 sites", () => {
    for (const c of siteChecks) {
      const f = factories.find((x) => x.id === c.id)!;
      const p = buildFactoryPwi(f, delivered.find((d) => d.factoryId === c.id), removals.find((r) => r.factoryId === c.id)!, c.id === "F12" ? f12Example : null);
      expect(p.confidence).toBeCloseTo(SPEC_CONFIDENCE[c.id], 2);
      expect(internalStatusBand(p.sitePwiCentral, p.confidence)).toBe(c.cert);
    }
  });

  it("the way answers combine is listed as a proposed decision", () => {
    expect(openDecisions.find((d) => d.id === "V2-SC")).toMatchObject({ status: "Proposed, under review" });
  });
});
