import type { Technology } from "@/src/data/copilotScripts";

// PRODUCT 6.10: tech-to-plant match score (Module 06), used by copilot answer C6.
// Two stages. Hard filters first (filterPlants): a plant that fails a filter is never scored. Then the score for the plants that pass.
export const MATCH_WEIGHTS = { technicalFit: 0.35, expectedBenefit: 0.3, operationalStability: 0.2, dataQuality: 0.15 } as const;

export interface MatchInputs { technicalFit: number; expectedBenefit: number; operationalStability: number; dataQuality: number }

export const matchScore = (m: MatchInputs) =>
  MATCH_WEIGHTS.technicalFit * m.technicalFit +
  MATCH_WEIGHTS.expectedBenefit * m.expectedBenefit +
  MATCH_WEIGHTS.operationalStability * m.operationalStability +
  MATCH_WEIGHTS.dataQuality * m.dataQuality;

/** The plant attributes the hard filters read. A Site (src/lib/selectors.ts) has all of them. */
export interface PlantProfile {
  id: string; name: string;
  processes: readonly string[]; effluentProfile: string; etpType: string;
  /** ETP flow, m3 per day. */
  etpFlowM3PerDay: number;
}

export type BlockerReason = "process" | "effluent profile" | "ETP type" | "capacity";
export interface Blocker { reason: BlockerReason; detail: string }

/** Every hard filter the plant fails for this technology. Empty means the plant is eligible. */
export function blockersFor(tech: Technology, plant: PlantProfile): Blocker[] {
  const out: Blocker[] = [];
  if (!plant.processes.some((p) => tech.processes.includes(p))) out.push({ reason: "process", detail: `runs ${plant.processes.join(" and ").toLowerCase()}, not ${tech.processes.join(", ").toLowerCase()}` });
  if (!tech.effluentProfiles.includes(plant.effluentProfile)) out.push({ reason: "effluent profile", detail: `${plant.effluentProfile.toLowerCase()} effluent is outside what it treats` });
  if (!tech.etpTypes.includes(plant.etpType)) out.push({ reason: "ETP type", detail: `${plant.etpType} ETP is not one it connects to` });
  if (plant.etpFlowM3PerDay < tech.minFlowM3) out.push({ reason: "capacity", detail: `flow ${plant.etpFlowM3PerDay} m³/day is below the ${tech.minFlowM3} m³/day minimum` });
  if (plant.etpFlowM3PerDay > tech.maxFlowM3) out.push({ reason: "capacity", detail: `flow ${plant.etpFlowM3PerDay} m³/day is above the ${tech.maxFlowM3} m³/day maximum` });
  return out;
}

export interface FilterResult<P extends PlantProfile> {
  /** Plants that pass every hard filter. Only these are scored. */
  eligible: P[];
  /** Plants that fail exactly one filter, with the blocker. A plant that fails two or more is not close and is left out of both lists. */
  nearMisses: { plant: P; blocker: Blocker }[];
}

/** Hard-filter stage: split the plants into eligible and near misses for one technology. */
export function filterPlants<P extends PlantProfile>(tech: Technology, plants: readonly P[]): FilterResult<P> {
  const eligible: P[] = [];
  const nearMisses: FilterResult<P>["nearMisses"] = [];
  for (const plant of plants) {
    const b = blockersFor(tech, plant);
    if (b.length === 0) eligible.push(plant);
    else if (b.length === 1) nearMisses.push({ plant, blocker: b[0] });
  }
  return { eligible, nearMisses };
}

/** Match score for the eligible plants only. A near miss is returned with its blocker and no score. */
export function matchPlants<P extends PlantProfile>(tech: Technology, plants: readonly P[]) {
  const { eligible, nearMisses } = filterPlants(tech, plants);
  return { eligible: eligible.map((plant) => ({ plant, match: matchScore(tech) })), nearMisses };
}
