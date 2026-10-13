// Product rules R1 to R5: R1 Forecast is never Measured or Validated; a commitment changes no PWI, balance or total. R2 funding does not
// create claim entitlement; nothing here reads or writes attribution or claim allocation. R3 external funders are not project participants.
// R4 a failed mandatory gate blocks commitment and funder matching. R5 funder data is placeholder data.
// Brand funding share (initiatives.ts): R1 a share of funding only, never claim allocation or attribution. R2 unrecorded is "Not recorded", never 0%.
// R3 an opportunity share is an intended split, not money paid.
import type { Funding, Opportunity } from "@/src/data/opportunities";
import { failedGates } from "./catalogue";
import type { Role } from "./roles";
import type { CommitmentStatus } from "./types";

// Who is expected to pay for an opportunity, and who has committed. Demo only.
export type Party = "supplier" | "brand";
/** Recorded commitments, per opportunity id. Demo state in ProjectsContext; resets on reload. */
export type Commitments = Record<string, { supplier?: true; brand?: true }>;

const TO_BE_AGREED: Funding = { funder: "To be agreed", supplierShare: null, brandShare: null };
/** A missing funding field means "To be agreed" (for example an opportunity imported from a Lite finding). */
export const fundingOf = (o: Pick<Opportunity, "funding">): Funding => o.funding ?? TO_BE_AGREED;

const isShare = (n: number | null): n is number => n !== null && Number.isFinite(n) && n >= 0 && n <= 1;

export function fundingIsValid(f: Funding): boolean {
  const { supplierShare: s, brandShare: b } = f;
  switch (f.funder) {
    case "Supplier": return s === 1 && b === 0;
    case "Brand": return s === 0 && b === 1;
    case "Shared": return isShare(s) && isShare(b) && s > 0 && b > 0 && Math.abs(s + b - 1) < 1e-9;
    case "To be agreed": return s === null && b === null;
  }
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** "Supplier 100%", "Supplier 50%, Brand 50%" or "To be agreed". Parties with a 0 share are left out. */
export function fundingLabel(f: Funding): string {
  if (f.funder === "To be agreed") return "To be agreed";
  const parts = [["Supplier", f.supplierShare], ["Brand", f.brandShare]] as const;
  return parts.filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => `${k} ${pct(v!)}`).join(", ");
}

/** The parties with a share above 0. None while funding is To be agreed. */
export function requiredParties(f: Funding): Party[] {
  if (f.funder === "To be agreed") return [];
  return ([["supplier", f.supplierShare], ["brand", f.brandShare]] as const).filter(([, v]) => (v ?? 0) > 0).map(([k]) => k);
}

export function commitmentStatus(o: Pick<Opportunity, "id" | "funding">, commitments: Commitments): CommitmentStatus {
  const need = requiredParties(fundingOf(o));
  const done = need.filter((p) => commitments[o.id]?.[p]).length;
  return need.length === 0 || done === 0 ? "Not committed" : done === need.length ? "Committed" : "Partly committed";
}

const shareOf = (f: Funding, role: Role) => (role === "supplier" ? f.supplierShare : f.brandShare) ?? 0;

/** Why `role` cannot record a commitment on `o`, or null when it can. */
export function canCommitReason(o: Pick<Opportunity, "gates" | "funding">, role: Role): string | null {
  const failed = failedGates(o.gates);
  if (failed.length) return `Blocked by a mandatory gate: ${failed.map((g) => `${g.label} (${g.result})`).join("; ")}.`;
  const f = fundingOf(o);
  if (f.funder === "To be agreed") return "Funding is to be agreed, so there is nothing to commit to yet.";
  if (shareOf(f, role) === 0) return `The ${role} has no funding share in this opportunity.`;
  return null;
}

export const canCommit = (o: Pick<Opportunity, "gates" | "funding">, role: Role) => canCommitReason(o, role) === null;

/** Records `role`'s commitment. Idempotent: committing twice returns the same map. */
export function applyCommit(
  commitments: Commitments, o: Opportunity, role: Role,
): { ok: true; commitments: Commitments } | { ok: false; reason: string } {
  const reason = canCommitReason(o, role);
  if (reason) return { ok: false, reason };
  if (commitments[o.id]?.[role]) return { ok: true, commitments };
  return { ok: true, commitments: { ...commitments, [o.id]: { ...commitments[o.id], [role]: true } } };
}

/** The business case "Funding needs" line: who pays for each chosen opportunity, whether they have committed, and the funders shortlisted. */
export const fundingNeedsLine = (opps: Pick<Opportunity, "id" | "funding">[], commitments: Commitments, shortlistNames: (id: string) => string[] = () => []) =>
  `Funding: ${opps.map((o) => {
    const names = shortlistNames(o.id);
    return `${o.id} ${fundingLabel(fundingOf(o))} (${commitmentStatus(o, commitments)}), shortlisted funders: ${names.length ? names.join(", ") : "none"}`;
  }).join("; ")}.`;
