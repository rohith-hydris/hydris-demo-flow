import { describe, expect, it } from "vitest";
import { factories } from "@/src/data/factories";
import { riskScores } from "@/src/data/risks";
import { round } from "./format";
import { DEFAULT_WEIGHTS, evaluateRisks, headlineRisks, normaliseWeights, riskCounts, riskPillars, riskR, riskStatus, textileLabel } from "./risk";
import { riskCountChecks, siteChecks } from "./specCheckValues";

const scoresOf = (id: string) => riskScores.find((r) => r.factoryId === id)!.scores;

describe("risk score R (PRODUCT 5.6)", () => {
  it.each(siteChecks)("$id: R = $R", ({ id, R }) => {
    expect(round(riskR(riskPillars(scoresOf(id))), 2)).toBe(R);
  });

  it("F01 pillars are 0.78, 0.76, 0.81, 0.60, 0.68", () => {
    const p = riskPillars(scoresOf("F01"));
    expect([p.scarcity, p.groundwater, p.drought, p.flood, p.community].map((x) => round(x, 2))).toEqual([0.78, 0.76, 0.81, 0.6, 0.68]);
  });

  it("F12 pillars are 0.95, 0.79, 0.80, 0.90, 0.68", () => {
    const p = riskPillars(scoresOf("F12"));
    expect([p.scarcity, p.groundwater, p.drought, p.flood, p.community].map((x) => round(x, 2))).toEqual([0.95, 0.79, 0.8, 0.9, 0.68]);
  });

  it("default weights are 0.30 / 0.20 / 0.20 / 0.15 / 0.15 and sum to 1", () => {
    expect(Object.values(DEFAULT_WEIGHTS)).toEqual([0.3, 0.2, 0.2, 0.15, 0.15]);
    expect(Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it("renormalises any weights to sum to 1 without changing their ratios", () => {
    const w = normaliseWeights({ scarcity: 3, groundwater: 2, drought: 2, flood: 1.5, community: 1.5 });
    expect(w.scarcity).toBeCloseTo(0.3, 12);
    expect(w.flood).toBeCloseTo(0.15, 12);
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it("ucw, rri, cep and tex never change R (country-level and composite risks are not ranked)", () => {
    for (const f of factories) {
      const base = riskR(riskPillars(scoresOf(f.id)));
      const bumped = riskR(riskPillars({ ...scoresOf(f.id), ucw: 5, rri: 5, cep: 5, tex: 5 }));
      expect(bumped).toBe(base);
    }
  });
});

describe("risk status and counts (PRODUCT 5.6)", () => {
  it("Present from 3.0, Watch from 2.0 up to 3.0, otherwise Not present", () => {
    expect(riskStatus("bws", 3.0)).toBe("Present");
    expect(riskStatus("bws", 2.99)).toBe("Watch");
    expect(riskStatus("bws", 2.0)).toBe("Watch");
    expect(riskStatus("bws", 1.99)).toBe("Not present");
    expect(riskStatus("cfr", 0)).toBe("Not present");
  });

  it("ucw is always Watch, whatever its score", () => {
    for (const score of [0, 1, 2.5, 4.9]) expect(riskStatus("ucw", score)).toBe("Watch");
  });

  it.each(Object.entries(riskCountChecks))("%s: Present and Watch counts match", (id, [present, watch]) => {
    const counts = riskCounts(evaluateRisks(id, scoresOf(id)));
    expect([counts.present, counts.watch]).toEqual([present, watch]);
  });

  it("returns 14 risks per site; 13 count, and coastal eutrophication is shown separately", () => {
    const results = evaluateRisks("F01", scoresOf("F01"));
    expect(results).toHaveLength(14);
    expect(results.filter((r) => r.excludedFromCounts).map((r) => r.code)).toEqual(["cep"]);
    const counts = riskCounts(results);
    expect(counts.present + counts.watch + counts.notPresent).toBe(13);
  });

  it("marks only ucw and rri as country-level", () => {
    expect(evaluateRisks("F01", scoresOf("F01")).filter((r) => r.countryLevel).map((r) => r.code).sort()).toEqual(["rri", "ucw"]);
  });

  it("textile composite is Extremely High at 4.0 and above only", () => {
    expect(textileLabel(4.0)).toBe("Extremely High");
    expect(textileLabel(3.99)).toBeNull();
  });
});

describe("F01 golden test site (PRODUCT 4.4)", () => {
  const byCode = Object.fromEntries(evaluateRisks("F01", scoresOf("F01")).map((r) => [r.code, r]));

  it("water stress 20.9% is Watch", () => {
    expect(byCode.bws.status).toBe("Watch");
    expect(byCode.bws.rawValue).toBe("20.9%");
  });
  it("drought 0.81 is Present", () => {
    expect(byCode.drr.status).toBe("Present");
    expect(byCode.drr.rawValue).toBe("0.81");
    expect(round(riskPillars(scoresOf("F01")).drought, 2)).toBe(0.81);
  });
  it("sanitation gap 47.8% is Present", () => {
    expect(byCode.usa.status).toBe("Present");
    expect(byCode.usa.rawValue).toBe("47.8%");
  });
  it("overall textile 4.05 is Extremely High", () => {
    expect(byCode.tex.score).toBe(4.05);
    expect(byCode.tex.compositeLabel).toBe("Extremely High");
  });
  it("other sites show scores only, never an invented raw value", () => {
    expect(evaluateRisks("F12", scoresOf("F12")).every((r) => r.rawValue === null)).toBe(true);
  });
});

describe("headline risk chips (PRODUCT 4.3)", () => {
  const chipsFor = (id: string) => headlineRisks(evaluateRisks(id, scoresOf(id)));

  it("F01 shows its four highest site-specific Present risks and +4 more (8 present in all)", () => {
    const { chips, more } = chipsFor("F01");
    expect(chips.map((c) => c.code)).toEqual(["drr", "sev", "gtd", "usa"]);
    expect(more).toBe(4);
  });

  it("never shows a country-level or composite risk as a chip", () => {
    for (const f of factories) {
      for (const c of chipsFor(f.id).chips) {
        expect(c.countryLevel).toBe(false);
        expect(c.category).not.toBe("Composite");
      }
    }
  });

  it("chips plus more always equals the Present count", () => {
    for (const f of factories) {
      const { chips, more } = chipsFor(f.id);
      expect(chips.length + more).toBe(riskCountChecks[f.id][0]);
      expect(chips.length).toBeLessThanOrEqual(4);
    }
  });

  it("F08 has no site-specific Present risk, only the country-level one", () => {
    expect(chipsFor("F08")).toEqual({ chips: [], more: 1 });
  });
});

// Module 01 special rules (PRD 5.1, 5.2). Fixtures start from F01's scores so each rule's effect is isolated.
import { isSnapped, recordGaps, riskPillarsPolicy, siteRiskFlags, snappedNote, waterStressed, WATER_STRESSED_LABEL } from "./risk";
import type { RiskScoreRecord } from "@/src/data/types";
import { getSites } from "./selectors";
import { scopeFor } from "./scope";

const f01 = riskScores.find((r) => r.factoryId === "F01")!;
const rec = (extra: Partial<RiskScoreRecord>): RiskScoreRecord => ({ ...f01, ...extra });
const statusOf = (r: RiskScoreRecord, code: string) => evaluateRisks("F01", r.scores, recordGaps(r), siteRiskFlags(r)).find((x) => x.code === code)!.status;

describe("arid areas (PRD 5.1)", () => {
  const r = rec({ arid: true });
  const policy = riskPillarsPolicy(r.scores, recordGaps(r), siteRiskFlags(r));
  it("set the scarcity pillar to 1.0, mark it flagged, and leave the other pillars alone", () => {
    expect(policy.pillars.scarcity).toBe(1);
    expect(policy.flagged).toEqual(["scarcity"]);
    expect(policy.pillars.drought).toBeCloseTo(0.81, 12);
    expect(riskR(policy.pillars)).toBeCloseTo(riskR(riskPillars(f01.scores)) + 0.3 * (1 - 0.78), 12);
  });
  it("make all four scarcity risks Present, even at a low score", () => {
    for (const code of ["bws", "bwd", "iav", "sev"]) expect(statusOf(r, code)).toBe("Present");
    expect(statusOf(rec({ arid: true, scores: { ...f01.scores, bws: 0.5 } }), "bws")).toBe("Present");
    expect(statusOf(f01, "bws")).toBe("Watch");
  });
});

describe("Insignificant Trend groundwater (PRD 5.1)", () => {
  const r = rec({ gtdTrend: "Insignificant Trend" });
  const policy = riskPillarsPolicy(r.scores, recordGaps(r), siteRiskFlags(r));
  it("sets the groundwater pillar to 0 and returns a flagged marker", () => {
    expect(policy.pillars.groundwater).toBe(0);
    expect(policy.flagged).toEqual(["groundwater"]);
    expect(riskR(policy.pillars)).toBeCloseTo(riskR(riskPillars(f01.scores)) - 0.2 * 0.76, 12);
  });
  it("makes groundwater decline Not present; a plain Trend scores as usual", () => {
    expect(statusOf(r, "gtd")).toBe("Not present");
    expect(statusOf(rec({ gtdTrend: "Trend" }), "gtd")).toBe("Present");
    expect(riskPillarsPolicy(f01.scores, {}, { gtdTrend: "Trend" }).flagged).toEqual([]);
  });
});

describe("coastal flood No Risk (PRD 5.2)", () => {
  it("is Not present whatever the score", () => {
    const r = rec({ cfrNoRisk: true, scores: { ...f01.scores, cfr: 3.6 } });
    expect(statusOf(r, "cfr")).toBe("Not present");
    expect(statusOf(rec({ scores: { ...f01.scores, cfr: 3.6 } }), "cfr")).toBe("Present");
  });
});

describe("snapped sites and missing areas (PRD 5.2)", () => {
  it("0 to 5 km away is snapped; exactly on the area, beyond 5 km and unknown are not", () => {
    expect([isSnapped(0.1), isSnapped(5), isSnapped(0), isSnapped(5.1), isSnapped(null), isSnapped(undefined)]).toEqual([true, true, false, false, false, false]);
    expect(siteRiskFlags(rec({ snapDistanceKm: 3.2 })).snappedKm).toBe(3.2);
    expect(snappedNote(3.2)).toBe("Snapped to the nearest area, 3.2 km away");
  });
  it("no area at all (null) shows No data on every area indicator and the country-level ones keep their scores", () => {
    const r = rec({ snapDistanceKm: null });
    const results = evaluateRisks("F01", r.scores, recordGaps(r), siteRiskFlags(r));
    expect(results.filter((x) => x.status === "No data").map((x) => x.code).sort()).toEqual(["bwd", "bws", "cep", "cfr", "drr", "gtd", "iav", "rfr", "sev", "tex", "udw", "usa"]);
    expect(results.find((x) => x.code === "ucw")!.status).toBe("Watch");
    expect(siteRiskFlags(r).noAreaData).toBe(true);
    expect(siteRiskFlags(rec({ snapDistanceKm: undefined })).noAreaData).toBe(false);
  });
});

describe("water-stressed (PRD 5.2)", () => {
  it("is raw baseline water stress of 40% or more, with the BRSR, CDP, GRI 303 wording", () => {
    expect([waterStressed(40), waterStressed(39.9), waterStressed(null), waterStressed(undefined)]).toEqual([true, false, false, false]);
    expect(siteRiskFlags(rec({ bwsPercent: 47.5 })).waterStressed).toBe(true);
    expect(WATER_STRESSED_LABEL).toBe("Water-stressed for BRSR, CDP, GRI 303");
  });
  it("shows the raw percent on the water stress card", () => {
    const r = rec({ bwsPercent: 47.5 });
    expect(evaluateRisks("F02", r.scores, recordGaps(r), siteRiskFlags(r)).find((x) => x.code === "bws")!.rawValue).toBe("47.5%");
  });
});

describe("the special rules leave the demo sites unchanged", () => {
  it("F01 golden values: water stress 20.9% Watch, drought 0.81 Present, sanitation 47.8% Present, textile 4.05 Extremely High", () => {
    const f = getSites(scopeFor("brand")).find((s) => s.id === "F01")!;
    const by = Object.fromEntries(f.risks.map((x) => [x.code, x]));
    expect([by.bws.rawValue, by.bws.status]).toEqual(["20.9%", "Watch"]);
    expect([by.drr.rawValue, by.drr.status]).toEqual(["0.81", "Present"]);
    expect([by.usa.rawValue, by.usa.status]).toEqual(["47.8%", "Present"]);
    expect([by.tex.score, by.tex.compositeLabel]).toEqual([4.05, "Extremely High"]);
    expect(f.riskFlags).toMatchObject({ waterStressed: false, snappedKm: null, noAreaData: false, flaggedPillars: [] });
  });
  it("every site's R is unchanged: no demo site carries a special rule that moves it", () => {
    for (const c of siteChecks) {
      const r = riskScores.find((x) => x.factoryId === c.id)!;
      const p = riskPillarsPolicy(r.scores, recordGaps(r), siteRiskFlags(r));
      expect(round(riskR(p.pillars, DEFAULT_WEIGHTS, p.missingPillars), 2)).toBe(c.R);
      expect(p.flagged).toEqual([]);
    }
  });
});
