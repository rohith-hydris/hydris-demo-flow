import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS, PILLAR_KEYS, type Weights } from "./risk";
import { displayPercents, isDefaultWeights, setWeight } from "./weights";

const sum = (w: Weights) => PILLAR_KEYS.reduce((s, k) => s + w[k], 0);
const total = (p: Record<string, number>) => Object.values(p).reduce((a, b) => a + b, 0);

describe("setWeight: moving one slider rescales the others to keep 100% (PRODUCT 4.5)", () => {
  it("sets the chosen weight and keeps the total at 1", () => {
    const w = setWeight(DEFAULT_WEIGHTS, "flood", 0.4);
    expect(w.flood).toBeCloseTo(0.4, 12);
    expect(sum(w)).toBeCloseTo(1, 12);
  });

  it("keeps the other four in the same proportions", () => {
    const w = setWeight(DEFAULT_WEIGHTS, "scarcity", 0.5);
    // Others were 0.20 / 0.20 / 0.15 / 0.15 (sum 0.70) and now share 0.50.
    expect(w.groundwater / w.drought).toBeCloseTo(1, 12);
    expect(w.flood / w.community).toBeCloseTo(1, 12);
    expect(w.groundwater / w.flood).toBeCloseTo(0.2 / 0.15, 12);
    expect(w.groundwater).toBeCloseTo((0.2 / 0.7) * 0.5, 12);
  });

  it("at 100% every other weight is zero; from there they share what is left equally", () => {
    const all = setWeight(DEFAULT_WEIGHTS, "drought", 1);
    expect([all.scarcity, all.groundwater, all.flood, all.community]).toEqual([0, 0, 0, 0]);
    const back = setWeight(all, "drought", 0.6);
    expect(back.scarcity).toBeCloseTo(0.1, 12);
    expect(sum(back)).toBeCloseTo(1, 12);
  });

  it("clamps to 0 and 1", () => {
    expect(setWeight(DEFAULT_WEIGHTS, "flood", -0.3).flood).toBe(0);
    expect(setWeight(DEFAULT_WEIGHTS, "flood", 1.7).flood).toBe(1);
  });

  it("stays at 1 through a long run of moves", () => {
    let w = DEFAULT_WEIGHTS;
    const keys = PILLAR_KEYS;
    for (let i = 0; i < 500; i++) w = setWeight(w, keys[i % 5], ((i * 37) % 101) / 100);
    expect(sum(w)).toBeCloseTo(1, 9);
    for (const k of keys) expect(w[k]).toBeGreaterThanOrEqual(0);
  });

  it("does not change the weights it is given", () => {
    const before = { ...DEFAULT_WEIGHTS };
    setWeight(DEFAULT_WEIGHTS, "scarcity", 0.9);
    expect(DEFAULT_WEIGHTS).toEqual(before);
  });
});

describe("displayPercents: whole numbers that add up to exactly 100", () => {
  it("shows the defaults as 30 / 20 / 20 / 15 / 15", () => {
    expect(Object.values(displayPercents(DEFAULT_WEIGHTS))).toEqual([30, 20, 20, 15, 15]);
  });

  it("always totals 100, whatever the weights", () => {
    let w = DEFAULT_WEIGHTS;
    for (let i = 0; i < 300; i++) {
      w = setWeight(w, PILLAR_KEYS[(i * 3) % 5], ((i * 53) % 97) / 100);
      expect(total(displayPercents(w))).toBe(100);
    }
  });

  it("the slider you moved keeps the exact whole number you chose", () => {
    for (const v of [7, 33, 47, 58, 71, 94]) {
      const w = setWeight(DEFAULT_WEIGHTS, "groundwater", v / 100);
      expect(displayPercents(w).groundwater).toBe(v);
    }
  });

  it("uses the largest remainder: three equal thirds show 34 / 33 / 33", () => {
    const w = { scarcity: 1 / 3, groundwater: 1 / 3, drought: 1 / 3, flood: 0, community: 0 } as Weights;
    expect(displayPercents(w)).toEqual({ scarcity: 34, groundwater: 33, drought: 33, flood: 0, community: 0 });
  });
});

describe("isDefaultWeights", () => {
  it("is true for the defaults and false after a move", () => {
    expect(isDefaultWeights(DEFAULT_WEIGHTS)).toBe(true);
    expect(isDefaultWeights(setWeight(DEFAULT_WEIGHTS, "flood", 0.16))).toBe(false);
    expect(isDefaultWeights(setWeight(setWeight(DEFAULT_WEIGHTS, "flood", 0.5), "flood", 0.15))).toBe(true);
  });
});
