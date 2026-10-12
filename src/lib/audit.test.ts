import { describe, expect, it } from "vitest";
import { BAND1_NOTE, LARGE_FOOTPRINT_NOTE, RANK_RANGE_NOTE } from "./explain";
import { sitePwiChange } from "./impact";
import { acceptedShare } from "./claims";
import { RISK_COUNTED, RISK_TOTAL } from "./risk";

describe("figures that components used to type in", () => {
  it("threshold notes come from the ranking constants", () => {
    expect(BAND1_NOTE).toBe("Band 1 starts at 0.60");
    expect(LARGE_FOOTPRINT_NOTE).toBe("A large footprint starts at 0.50");
    expect(RANK_RANGE_NOTE).toContain("500 draws");
    expect(RANK_RANGE_NOTE).toContain("20%");
    expect(RANK_RANGE_NOTE).toContain("wider than 3 positions");
  });
  it("risk counts: 14 risks, 13 counted", () => {
    expect(RISK_TOTAL).toBe(14);
    expect(RISK_COUNTED).toBe(13);
  });
  it("F12 month-on-month change is 0.5 points down (70.3% to 69.8%)", () => {
    expect(sitePwiChange(0.698, 0.703)).toEqual({ direction: "down", points: "0.5" });
  });
  it("acceptedShare guards a zero claim", () => {
    expect(acceptedShare(0, 0)).toBe(0);
    expect(acceptedShare(50000, 25000)).toBe(0.5);
  });
});
