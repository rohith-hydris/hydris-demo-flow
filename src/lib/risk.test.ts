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
