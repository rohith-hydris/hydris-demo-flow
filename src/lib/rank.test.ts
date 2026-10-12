import { describe, expect, it } from "vitest";
import { riskScores } from "@/src/data/risks";
import { factories } from "@/src/data/factories";
import { bandOf, quadrantOf, rankRanges, rankSites, tierOf, UNSTABLE_WIDTH, type RankInput } from "./rank";
import { bwsRise, evaluateRisks, rankPresentCount, riskCounts, riskPillars, type Pillars } from "./risk";
import { getRankRanges, getSites } from "./selectors";
import { scopeFor } from "./scope";
import { siteChecks } from "./specCheckValues";

const inputs = (): RankInput[] =>
  factories.map((f) => {
    const scores = riskScores.find((r) => r.factoryId === f.id)!.scores;
    return {
      id: f.id, pillars: riskPillars(scores), footprintI: f.footprintI,
      presentCount: rankPresentCount(evaluateRisks(f.id, scores)), bwsRise: bwsRise(scores),
    };
  });

const flat = (v: number): Pillars => ({ scarcity: v, groundwater: v, drought: v, flood: v, community: v });
const synth = (id: string, over: Partial<RankInput> & { v?: number }): RankInput => ({
  id, pillars: flat(over.v ?? 0.7), footprintI: 0.5, presentCount: 5, bwsRise: 0, ...over,
});

describe("ranking the 14 sites (PRODUCT 5.5, 6.8)", () => {
  const ranked = rankSites(inputs());

  it("orders the sites exactly as the check values: band first, then I", () => {
    expect(ranked.map((r) => r.id)).toEqual(siteChecks.map((c) => c.id));
  });

  it.each(siteChecks)("rank $rank is $id: Band $band, $quadrant, Tier $tier", (c) => {
    const r = ranked.find((x) => x.id === c.id)!;
    expect(r).toMatchObject({ rank: c.rank, band: c.band, quadrant: c.quadrant, tier: c.tier });
  });

  it("makes 2 Tier 1, 3 Tier 2 and 9 Tier 3 sites", () => {
    const count = (t: number) => ranked.filter((r) => r.tier === t).length;
    expect([count(1), count(2), count(3)]).toEqual([2, 3, 9]);
  });

  it("puts 8 sites in Band 1", () => {
    expect(ranked.filter((r) => r.band === 1)).toHaveLength(8);
  });
});

describe("bands, quadrants and tiers", () => {
  it("Band 1 from R 0.6, Band 2 from 0.4, otherwise Band 3", () => {
    expect([bandOf(0.6), bandOf(0.599), bandOf(0.4), bandOf(0.399)]).toEqual([1, 2, 2, 3]);
  });

  it("quadrant lines sit at R = 0.6 and I = 0.5", () => {
    expect(quadrantOf(0.8, 0.9)).toBe("Act now");
    expect(quadrantOf(0.8, 0.4)).toBe("Build resilience");
    expect(quadrantOf(0.5, 0.9)).toBe("Reduce footprint");
    expect(quadrantOf(0.5, 0.4)).toBe("Monitor");
    expect(quadrantOf(0.8, null)).toBe("Impact pending");
  });

  it("tier cut uses integer maths: top 10% and next 20%, rounded up", () => {
    const split = (n: number) => {
      const t = Array.from({ length: n }, (_, i) => tierOf(i + 1, n));
      return [1, 2, 3].map((x) => t.filter((y) => y === x).length);
    };
    expect(split(14)).toEqual([2, 3, 9]);
    expect(split(30)).toEqual([3, 6, 21]); // 0.1 x 30 is 3.0000000000000004 in floating point; must not give 4
    expect(split(10)).toEqual([1, 2, 7]);
    expect(split(3)).toEqual([1, 1, 1]);
  });
});

describe("tie-breaks (PRODUCT 6.8)", () => {
  it("same band and I: higher R first", () => {
    const r = rankSites([synth("a", { v: 0.7 }), synth("b", { v: 0.8 })]);
    expect(r.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("same band, I and R: more Present risks first", () => {
    const r = rankSites([synth("a", { presentCount: 4 }), synth("b", { presentCount: 9 })]);
    expect(r.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("then the larger 2050 rise in water stress first", () => {
    const r = rankSites([synth("a", { bwsRise: 0.2 }), synth("b", { bwsRise: 1.1 })]);
    expect(r.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("a higher band always outranks a larger footprint", () => {
    const r = rankSites([synth("lowBand", { v: 0.5, footprintI: 0.99 }), synth("highBand", { v: 0.7, footprintI: 0.1 })]);
    expect(r.map((x) => x.id)).toEqual(["highBand", "lowBand"]);
  });

  it("a site without I is Impact pending and ranks last in its band", () => {
    const r = rankSites([synth("noI", { v: 0.9, footprintI: null }), synth("small", { v: 0.7, footprintI: 0.05 })]);
    expect(r.map((x) => x.id)).toEqual(["small", "noI"]);
    expect(r[1].quadrant).toBe("Impact pending");
  });
});

describe("live weights", () => {
  it("weights are renormalised, so doubling every weight changes nothing", () => {
    const base = rankSites(inputs());
    const doubled = rankSites(inputs(), { scarcity: 0.6, groundwater: 0.4, drought: 0.4, flood: 0.3, community: 0.3 });
    expect(doubled.map((r) => r.id)).toEqual(base.map((r) => r.id));
    expect(doubled[0].R).toBeCloseTo(base[0].R, 12);
  });

  it("moving weight onto flood re-sorts the table", () => {
    const base = rankSites(inputs()).map((r) => r.id);
    const flood = rankSites(inputs(), { scarcity: 0.05, groundwater: 0.05, drought: 0.05, flood: 0.8, community: 0.05 }).map((r) => r.id);
    expect(flood).not.toEqual(base);
  });
});

describe("rank range (PRODUCT 4.5)", () => {
  const ranges = rankRanges(inputs());

  it("is repeatable: the seeded generator gives the same answer every time", () => {
    expect(rankRanges(inputs())).toEqual(ranges);
  });

  it("with no weight variation every range collapses to the site's own rank", () => {
    const base = rankSites(inputs());
    const none = rankRanges(inputs(), undefined, 1, 50, 0);
    for (const r of base) expect(none[r.id]).toEqual({ low: r.rank, high: r.rank, unstable: false });
  });

  it("on the default data the +/-20% range is a single rank for every site (band flips need extreme weights)", () => {
    for (const r of Object.values(ranges)) expect(r.high - r.low).toBe(0);
  });

  it("responds to large weight swings: with +/-95% variation some site's range widens and can flag unstable", () => {
    const wide = rankRanges(inputs(), undefined, 11, 500, 0.95);
    const widths = Object.values(wide).map((r) => r.high - r.low);
    expect(Math.max(...widths)).toBeGreaterThan(0);
    for (const r of Object.values(wide)) expect(r.unstable).toBe(r.high - r.low > UNSTABLE_WIDTH);
  });

  it("gives a 5th to 95th percentile range inside 1 to 14 for every site, low <= high", () => {
    for (const id of Object.keys(ranges)) {
      expect(ranges[id].low).toBeGreaterThanOrEqual(1);
      expect(ranges[id].high).toBeLessThanOrEqual(14);
      expect(ranges[id].low).toBeLessThanOrEqual(ranges[id].high);
    }
  });

  it("flags Rank unstable exactly when the range is wider than 3 positions", () => {
    for (const r of Object.values(ranges)) expect(r.unstable).toBe(r.high - r.low > UNSTABLE_WIDTH);
  });

  it("contains the base rank for the top site", () => {
    expect(ranges.F12.low).toBeLessThanOrEqual(1);
  });
});

describe("ranking a supplier's own factories among themselves (PRODUCT 2)", () => {
  const sites = getSites(scopeFor("supplier"));

  it("ranks F12, F14, F13 as 1, 2, 3 (all Band 1, ordered by I)", () => {
    expect(sites.map((s) => [s.id, s.rank])).toEqual([["F12", 1], ["F14", 2], ["F13", 3]]);
  });

  it("keeps the network rank alongside (1, 6, 7)", () => {
    expect(sites.map((s) => s.networkRank)).toEqual([1, 6, 7]);
  });

  it("recomputes tiers for the 3 sites, and keeps the network tier alongside", () => {
    expect(sites.map((s) => s.tier)).toEqual([1, 2, 3]);
    expect(sites.map((s) => s.networkTier)).toEqual([1, 3, 3]);
  });

  it("computes rank ranges for the supplier's sites only", () => {
    expect(Object.keys(getRankRanges(scopeFor("supplier"))).sort()).toEqual(["F12", "F13", "F14"]);
  });
});

describe("the 2050 water stress rise is still the last tie-break (B2)", () => {
  // Two sites tied on band, I, R and Present count: the larger bws50 - bws ranks first. 2030 and the other 2050 scores are not used.
  const tied = (id: string, bwsRise: number): RankInput => synth(id, { bwsRise });
  it("orders a tie by the larger 2050 rise", () => {
    expect(rankSites([tied("A", 0.2), tied("B", 0.9)]).map((r) => r.id)).toEqual(["B", "A"]);
    expect(rankSites([tied("A", 0.9), tied("B", 0.2)]).map((r) => r.id)).toEqual(["A", "B"]);
  });
  it("bwsRise is 2050 minus today's water stress score for every site, whatever the new outlook fields hold", () => {
    for (const r of riskScores) {
      expect(bwsRise(r.scores)).toBeCloseTo(r.scores.bws50 - r.scores.bws, 12);
      expect(bwsRise({ ...r.scores, bws30: 0, bwd50: 5, iav30: 0, sev50: 5 })).toBeCloseTo(r.scores.bws50 - r.scores.bws, 12);
    }
  });
  it("all 14 ranks still match the PRODUCT 5.5 check values", () => {
    const ranked = rankSites(inputs());
    for (const c of siteChecks) expect(ranked.find((r) => r.id === c.id)!.rank).toBe(c.rank);
  });
});

// ---- C3: the tie-break counts site-specific Present risks only -------------------------------------------------------------------
import { riskScores as allRiskScores } from "@/src/data/risks";
import { RANK_EXCLUDED_RISKS } from "./risk";

describe("rankPresentCount excludes cep, tex, ucw and rri (issue C3)", () => {
  const f01 = allRiskScores.find((r) => r.factoryId === "F01")!.scores;
  const results = (s: typeof f01) => evaluateRisks("F01", s);

  it("counts Present risks other than the four excluded", () => {
    expect([...RANK_EXCLUDED_RISKS]).toEqual(["cep", "tex", "ucw", "rri"]);
    const r = results(f01);
    const present = r.filter((x) => x.status === "Present");
    expect(rankPresentCount(r)).toBe(present.filter((x) => !["cep", "tex", "ucw", "rri"].includes(x.code)).length);
    // F01: 8 Present for display (rri and the textile composite among them), 6 site-specific.
    expect(riskCounts(r).present).toBe(8);
    expect(rankPresentCount(r)).toBe(6);
  });

  it("the display count is unchanged: riskCounts still includes the composite and country-level risks", () => {
    expect(riskCounts(results(f01)).present).toBeGreaterThan(rankPresentCount(results(f01)));
  });

  it("a country-level or composite score never changes it, whatever its value", () => {
    const base = rankPresentCount(results(f01));
    for (const code of ["ucw", "rri", "tex", "cep"] as const) {
      for (const v of [0, 1.5, 2.5, 3, 5]) expect(rankPresentCount(results({ ...f01, [code]: v }))).toBe(base);
    }
  });

  it("a site-specific risk does change it", () => {
    expect(rankPresentCount(results({ ...f01, bwd: 4 }))).toBe(rankPresentCount(results(f01)) + 1); // bwd 2.6 (Watch) to 4 (Present)
  });

  it("two sites tied on band, I and R are ordered by the new count", () => {
    // Same worst indicator in every pillar, so the pillars and R are identical; B has two more Present scarcity indicators.
    const a = { ...f01, bws: 3.9, bwd: 1, iav: 1, sev: 1 };
    const b = { ...f01, bws: 3.9, bwd: 3.5, iav: 3.5, sev: 1 };
    const mk = (id: string, s: typeof f01): RankInput => ({ id, pillars: riskPillars(s), footprintI: 0.6, presentCount: rankPresentCount(evaluateRisks(id, s)), bwsRise: 0 });
    const ia = mk("A", a), ib = mk("B", b);
    expect(ia.pillars).toEqual(ib.pillars);
    expect(ib.presentCount).toBe(ia.presentCount + 2);
    expect(rankSites([ia, ib]).map((r) => r.id)).toEqual(["B", "A"]);
    expect(rankSites([ib, ia]).map((r) => r.id)).toEqual(["B", "A"]);
  });

  it("adding a constant country risk never changes a within-country order", () => {
    const a = { ...f01, bws: 3.9, bwd: 1, iav: 1, sev: 1 };
    const b = { ...f01, bws: 3.9, bwd: 3.5, iav: 3.5, sev: 1 };
    const order = (sa: typeof a, sb: typeof b) => {
      const mk = (id: string, s: typeof f01): RankInput => ({ id, pillars: riskPillars(s), footprintI: 0.6, presentCount: rankPresentCount(evaluateRisks(id, s)), bwsRise: 0 });
      return rankSites([mk("A", sa), mk("B", sb)]).map((r) => r.id);
    };
    const expected = order(a, b);
    for (const code of ["ucw", "rri"] as const) {
      for (const v of [0, 2.5, 5]) expect(order({ ...a, [code]: v }, { ...b, [code]: v })).toEqual(expected); // the same constant on both
      expect(order({ ...a, [code]: 5 }, { ...b, [code]: 0 })).toEqual(expected); // and even a different one on each
      expect(order({ ...a, [code]: 0 }, { ...b, [code]: 5 })).toEqual(expected);
    }
  });

  it("the 14 demo sites keep their PRODUCT 5.5 order and the display Present and Watch counts", () => {
    expect(rankSites(inputs()).map((r) => r.id)).toEqual(siteChecks.map((c) => c.id));
    const sites = getSites(scopeFor("brand"));
    for (const s of sites) expect(s.riskCounts.present).toBeGreaterThanOrEqual(0);
    expect(sites.map((s) => s.id)).toEqual(siteChecks.map((c) => c.id));
  });
});
