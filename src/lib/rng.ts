// Small seeded generator (mulberry32) so the rank range is the same on every run (PRODUCT 4.5).
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fixed seed for the demo's rank-range simulation. The spec gives no value, so this is a constant of ours. */
export const RANK_RANGE_SEED = 20261010;
