import { describe, expect, it } from "vitest";
import { riskScores } from "@/src/data/risks";
import { getSites } from "./selectors";
import { scopeFor } from "./scope";
import { DEFAULT_WEIGHTS, evaluateRisks, recordGaps, riskPillarsPolicy, riskR, siteRiskFlags } from "./risk";
import { siteChecks } from "./specCheckValues";

// Issue C4: the illustrative flood scores are geographically consistent.
const rec = (id: string) => riskScores.find((r) => r.factoryId === id)!;
const sites = getSites(scopeFor("brand"));
const by = (id: string) => sites.find((s) => s.id === id)!;

describe("inland sites have no coastal flood risk", () => {
  it("F10, F13 and F14 all score coastal flood 0.0", () => {
    for (const id of ["F10", "F13", "F14"]) expect(rec(id).scores.cfr).toBe(0);
  });
  it("F10's coastal flood is No Risk: Not present by the rule, a reading rather than a gap, so coverage is 100%", () => {
    expect(rec("F10").cfrNoRisk).toBe(true);
    expect(rec("F10").gaps).toBeUndefined();
    const cfr = by("F10").risks.find((r) => r.code === "cfr")!;
    expect([cfr.status, cfr.rule, cfr.gap]).toEqual(["Not present", "No Risk", null]);
    expect(by("F10").riskCoverage.share).toBe(1);
  });
  it("F10's R is unchanged at 0.55, because its flood pillar was always its riverine flood", () => {
    const r = rec("F10");
    const p = riskPillarsPolicy(r.scores, recordGaps(r), siteRiskFlags(r));
    expect(Math.round(riskR(p.pillars, DEFAULT_WEIGHTS, p.missingPillars) * 100) / 100).toBe(0.55);
  });
});

describe("F13 and F14 share a flood plain", () => {
  it("their riverine flood scores are within 0.5 of each other", () => {
    const [a, b] = [rec("F13").scores.rfr, rec("F14").scores.rfr];
    expect(Math.abs(a - b)).toBeLessThanOrEqual(0.5);
    expect([a, b]).toEqual([4.5, 4.0]);
  });
  it("F14's flood pillar rises from 0.75 to 0.80 and its R from 0.61 to 0.6175, still Band 1 at the same rank", () => {
    const f14 = by("F14");
    const p = riskPillarsPolicy(rec("F14").scores, {}, {});
    expect(p.pillars.flood).toBeCloseTo(0.8, 12);
    expect(f14.R).toBeCloseTo(0.6175, 4);
    expect([f14.band, f14.rank, f14.tier]).toEqual([1, 6, 3]);
  });
  it("F14 has one Watch risk fewer than before (coastal flood 2.85 is gone), and the same Present risks", () => {
    expect(by("F14").riskCounts).toMatchObject({ present: 5, watch: 6 });
  });
  it("Coromandel Denim Mills still averages 0.75", () => {
    const r = ["F12", "F13", "F14"].reduce((s, id) => s + by(id).R, 0) / 3;
    expect(Math.round(r * 100) / 100).toBe(0.75);
  });
});

describe("F01 and F12 are untouched", () => {
  it("their scores are the PRODUCT 5.6 values and their R, rank and counts match PRODUCT 5.5", () => {
    expect(rec("F01").scores).toMatchObject({ bws: 2.09, drr: 4.05, rfr: 3.0, cfr: 0.0, usa: 3.4, tex: 4.05 });
    expect(rec("F12").scores).toMatchObject({ bws: 4.75, drr: 4.0, rfr: 4.5, cfr: 3.6, tex: 4.5 });
    for (const id of ["F01", "F12"]) {
      const c = siteChecks.find((x) => x.id === id)!;
      expect([Math.round(by(id).R * 100) / 100, by(id).rank, by(id).band, by(id).tier]).toEqual([c.R, c.rank, c.band, c.tier]);
    }
    expect(by("F12").riskCounts).toMatchObject({ present: 11, watch: 2 });
    expect(by("F01").riskCounts).toMatchObject({ present: 8, watch: 4 });
  });
});

describe("the ranking is unchanged", () => {
  it("the order, bands and tiers of all 14 sites still match PRODUCT 5.5", () => {
    expect(sites.map((s) => s.id)).toEqual(siteChecks.map((c) => c.id));
    for (const c of siteChecks) expect([by(c.id).band, by(c.id).tier]).toEqual([c.band, c.tier]);
  });
  it("the evaluated flood risks are consistent for F13 and F14", () => {
    const flood = (id: string) => evaluateRisks(id, rec(id).scores, recordGaps(rec(id)), siteRiskFlags(rec(id))).filter((r) => r.code === "rfr" || r.code === "cfr").map((r) => [r.code, r.status]);
    expect(flood("F13")).toEqual([["rfr", "Present"], ["cfr", "Not present"]]);
    expect(flood("F14")).toEqual([["rfr", "Present"], ["cfr", "Not present"]]);
  });
});
