import { describe, expect, it } from "vitest";
import { fmtDaysAgo, fmtInt, fmtM3, fmtPct1, fmtScore, fmtScore3, pct1, round } from "./format";
import { MATCH_WEIGHTS, matchScore } from "./match";

describe("format (DESIGN 6)", () => {
  it("rounds half up despite floating-point noise", () => {
    expect(round(0.795, 2)).toBe(0.8);
    expect(round(0.465, 2)).toBe(0.47);
    expect(round(0.6981, 3)).toBe(0.698);
    expect(round(-0.465, 2)).toBe(-0.47);
  });

  it("PWI to one decimal as a percentage", () => {
    expect(fmtPct1(0.698)).toBe("69.8%");
    expect(fmtPct1(0.689)).toBe("68.9%");
    expect(fmtPct1(1)).toBe("100.0%");
    expect(pct1(0.7073)).toBe(70.7);
  });

  it("R, I and cell scores to two decimals; pillars to three where the PRD shows three", () => {
    expect(fmtScore(0.84)).toBe("0.84");
    expect(fmtScore(0.5)).toBe("0.50");
    expect(fmtScore3(0.955)).toBe("0.955");
    expect(fmtScore3(1)).toBe("1.000");
  });

  it("volumes with thousands separators and units", () => {
    expect(fmtInt(1011000)).toBe("1,011,000");
    expect(fmtM3(110000)).toBe("110,000 m³");
  });

  it("days ago", () => {
    expect(fmtDaysAgo(12)).toBe("12 days ago");
    expect(fmtDaysAgo(1)).toBe("1 day ago");
  });
});

describe("tech-to-plant match score (PRODUCT 6.10, copilot answer C6)", () => {
  const rows = [
    { name: "Hydris tertiary polishing module", m: { technicalFit: 0.9, expectedBenefit: 0.8, operationalStability: 0.6, dataQuality: 0.8 }, match: 0.8 },
    { name: "Electrocoagulation retrofit", m: { technicalFit: 0.8, expectedBenefit: 0.7, operationalStability: 0.6, dataQuality: 0.8 }, match: 0.73 },
    { name: "Membrane bioreactor upgrade", m: { technicalFit: 0.7, expectedBenefit: 0.85, operationalStability: 0.4, dataQuality: 0.8 }, match: 0.7 },
  ];

  it.each(rows)("$name scores $match", ({ m, match }) => {
    expect(round(matchScore(m), 2)).toBe(match);
  });

  it("weights are 0.35, 0.30, 0.20, 0.15 and sum to 1", () => {
    expect(Object.values(MATCH_WEIGHTS)).toEqual([0.35, 0.3, 0.2, 0.15]);
    expect(Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
});
