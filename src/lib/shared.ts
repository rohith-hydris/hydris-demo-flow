import type { Participant, ProjectRecord } from "@/src/data/types";
import type { ClaimAmount } from "@/src/data/types";

// V2 Section 5.2: one physical project, many participation records. Physical benefit is stored once, on the project, and
// adding a participant never raises it. Funding share does not create claim entitlement.

const EPS = 1e-9;
export const MAX_ALLOCATION = 1;

export const totalFunding = (p: ProjectRecord) => p.participants.reduce((s, x) => s + x.fundingShare, 0);
export const totalAllocation = (p: ProjectRecord) => p.participants.reduce((s, x) => s + x.claimAllocation, 0);

/** Requested allocation above 100% is an allocation conflict. */
export const hasAllocationConflict = (p: ProjectRecord) => totalAllocation(p) > MAX_ALLOCATION + EPS;

/** "Allocation conflict: 140% requested, 100% maximum", or null. */
export const allocationConflictText = (p: ProjectRecord): string | null =>
  hasAllocationConflict(p) ? `Allocation conflict: ${Math.round(totalAllocation(p) * 100)}% requested, ${MAX_ALLOCATION * 100}% maximum` : null;

/** A participant that funds nothing but asks for a share: funding does not create entitlement, and neither does a request. */
export const claimsWithoutFunding = (x: Participant) => x.fundingShare === 0 && x.claimAllocation > 0;

const scale = (a: ClaimAmount, k: number): ClaimAmount =>
  a.unit === "kg" ? { unit: "kg", tss: a.tss * k, tn: a.tn * k, tp: a.tp * k } : { unit: a.unit, value: a.value * k };

export interface ParticipationRecord {
  projectId: string; participant: string; factoryId?: string; allocation: number;
  /** The physical benefit times this participant's allocation. */
  attributable: ClaimAmount;
}

/** One record per participant. A project with no listed participants has one implicit participant: its own factory. */
export function participationRecords(list: ProjectRecord[]): ParticipationRecord[] {
  return list.flatMap((p) =>
    p.participants.length === 0
      ? [{ projectId: p.id, participant: p.factoryId, factoryId: p.factoryId, allocation: p.attribution, attributable: scale(p.claim, p.attribution) }]
      : p.participants.filter((x) => x.claimAllocation > 0).map((x) => ({
          projectId: p.id, participant: x.participant, factoryId: x.factoryId, allocation: x.claimAllocation, attributable: scale(p.claim, x.claimAllocation),
        })),
  );
}

/**
 * Portfolio dedupe: the physical benefit of each project is counted once, however many participants it has.
 * Returns the physical total per unit (m3, people, kg).
 */
export function physicalTotals(list: ProjectRecord[]) {
  const seen = new Set<string>();
  const total = { m3: 0, people: 0, kg: { tss: 0, tn: 0, tp: 0 } };
  for (const p of list) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    if (p.claim.unit === "kg") { total.kg.tss += p.claim.tss; total.kg.tn += p.claim.tn; total.kg.tp += p.claim.tp; }
    else total[p.claim.unit] += p.claim.value;
  }
  return total;
}
