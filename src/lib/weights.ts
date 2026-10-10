import { DEFAULT_WEIGHTS, PILLAR_KEYS, type Weights } from "./risk";
import type { PillarKey } from "./types";

// The live weights panel (PRODUCT 4.5, DESIGN 4.9): five sliders that always add up to 100%.

/**
 * Set one weight and rescale the other four in proportion so the total stays 1. If the others are all zero they share
 * what is left equally. `value` is a fraction from 0 to 1.
 */
export function setWeight(weights: Weights, key: PillarKey, value: number): Weights {
  const v = Math.max(0, Math.min(1, value));
  const others = PILLAR_KEYS.filter((k) => k !== key);
  const othersSum = others.reduce((s, k) => s + weights[k], 0);
  const left = 1 - v;
  const next = { ...weights, [key]: v } as Weights;
  for (const k of others) next[k] = othersSum > 0 ? (weights[k] / othersSum) * left : left / others.length;
  return next;
}

/** Whole-number percentages that always add up to exactly 100 (largest remainder), so the panel never reads 99% or 101%. */
export function displayPercents(weights: Weights): Record<PillarKey, number> {
  const raw = PILLAR_KEYS.map((k) => ({ k, exact: weights[k] * 100 }));
  const floors = raw.map((r) => ({ ...r, whole: Math.floor(r.exact + 1e-9) }));
  let remaining = 100 - floors.reduce((s, r) => s + r.whole, 0);
  const byRemainder = [...floors].sort((a, b) => (b.exact - b.whole) - (a.exact - a.whole) || PILLAR_KEYS.indexOf(a.k) - PILLAR_KEYS.indexOf(b.k));
  for (const r of byRemainder) {
    if (remaining <= 0) break;
    r.whole += 1;
    remaining -= 1;
  }
  return Object.fromEntries(floors.map((r) => [r.k, r.whole])) as Record<PillarKey, number>;
}

export const isDefaultWeights = (w: Weights) => PILLAR_KEYS.every((k) => Math.abs(w[k] - DEFAULT_WEIGHTS[k]) < 1e-9);
