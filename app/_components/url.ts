export type Params = Record<string, string | string[] | undefined>;

export const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

// Builds a link that keeps the current query and applies a patch (undefined removes a key).
export function href(base: string, current: Params, patch: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) if (typeof v === "string" && v) q.set(k, v);
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}
