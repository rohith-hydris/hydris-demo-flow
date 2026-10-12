import type { LedgerEntry } from "@/src/data/types";
import { sha256 } from "./sha256";

// Impact Ledger lineage (issue B4). Each entry is sealed with a hash of its own content plus the previous entry's hash, so any
// later change to an input breaks verification at that entry. The hash is a "demo hash": it shows how lineage would work, it is
// not an audit control (the demo holds no real file hashes).
//
//   hash = SHA-256( canonical JSON of the entry without its `hash` field )     the entry includes `previousHash`
//
// Canonical JSON: object keys sorted, no whitespace, so the same entry always gives the same bytes.

/** The previous hash of the first entry in a chain. */
export const GENESIS_HASH = "0".repeat(64);
export const DEMO_HASH_LABEL = "Demo hash";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json | undefined };

export function canonicalJson(value: unknown): string {
  const v = value as Json | undefined;
  if (v === undefined) return "null";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`).join(",")}}`;
}

/** The hash of an entry: its content and `previousHash`, never its own `hash`. */
export function hashEntry(entry: LedgerEntry): string {
  const { hash: _hash, ...content } = entry;
  void _hash;
  return sha256(canonicalJson(content));
}

const entryNumber = (id: string) => Number(id.replace(/\D/g, ""));

/** Chain order is entry-number order, oldest first. Entries are grouped by factory: each factory has its own chain. */
export const inChainOrder = (entries: readonly LedgerEntry[]): LedgerEntry[] => [...entries].sort((a, b) => entryNumber(a.id) - entryNumber(b.id));

/** Fills `previousHash` and `hash` along one factory's chain, oldest first. Used to seal new or edited entries. */
export function sealChain(entries: readonly LedgerEntry[]): LedgerEntry[] {
  let previous = GENESIS_HASH;
  return inChainOrder(entries).map((e) => {
    const sealed = { ...e, previousHash: previous, hash: "" };
    sealed.hash = hashEntry(sealed);
    previous = sealed.hash;
    return sealed;
  });
}

export type ChainResult = { ok: true; length: number } | { ok: false; brokenId: string; reason: "previous hash" | "hash" };

/** Walks the chain oldest first and stops at the first entry whose previous hash or own hash does not match. */
export function verifyChain(entries: readonly LedgerEntry[]): ChainResult {
  const ordered = inChainOrder(entries);
  let previous = GENESIS_HASH;
  for (const e of ordered) {
    if (e.previousHash !== previous) return { ok: false, brokenId: e.id, reason: "previous hash" };
    if (hashEntry(e) !== e.hash) return { ok: false, brokenId: e.id, reason: "hash" };
    previous = e.hash;
  }
  return { ok: true, length: ordered.length };
}

/** "Chain verified" or the first broken entry, for the timeline. */
export const chainStatusText = (r: ChainResult): string =>
  r.ok ? "Chain verified" : `Chain broken at ${r.brokenId}`;

export type EditResult = { ok: true; entries: LedgerEntry[] } | { ok: false; error: string };

/**
 * Edits an entry's content and re-seals the chain from it onward. A Locked period cannot be edited, and neither can a change
 * that would re-seal a later Locked entry: a Locked entry's hash must never change.
 */
export function editEntry(entries: readonly LedgerEntry[], id: string, patch: Partial<Omit<LedgerEntry, "id" | "hash" | "previousHash">>): EditResult {
  const ordered = inChainOrder(entries);
  const at = ordered.findIndex((e) => e.id === id);
  if (at < 0) return { ok: false, error: `No ledger entry ${id}.` };
  if (ordered[at].periodStatus === "Locked") return { ok: false, error: `${id} is in a Locked period and cannot be edited.` };
  const later = ordered.slice(at + 1).find((e) => e.periodStatus === "Locked");
  if (later) return { ok: false, error: `Editing ${id} would change ${later.id}, which is in a Locked period.` };
  const next = ordered.map((e, i) => (i === at ? { ...e, ...patch } : e));
  return { ok: true, entries: sealChain(next) };
}
