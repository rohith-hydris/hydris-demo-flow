import { f12Boundary } from "@/src/data/f12Balance";
import { f12Example } from "@/src/data/f12Example";
import { projects } from "@/src/data/projects";
import { projectBenefit } from "./claims";
import { REMOVAL_TARGET } from "./pwi";
import type { FactoryId } from "./types";

// V2 Sections 7 and 8: the water-balance boundary and quality accounting for F12.

export interface BoundaryBalance {
  withdrawalM3: number; totalDischargeM3: number; sameBasinDischargeM3: number;
  /** Discharge to another basin, the sea or out of compliance. Counts as zero for replenishment. */
  otherDischargeM3: number;
  consumptionM3: number; storageChangeM3: number;
  /** withdrawal - (discharge + consumption + storage change). */
  errorM3: number; errorShareOfWithdrawal: number;
  /** True when withdrawal = discharge + consumption + storage + error. */
  reconciles: boolean;
  internalRecirculationM3: number;
  /** RN = discharge not counted + consumption + storage change + error. A programme definition, not physical consumption. */
  replenishmentNeededM3: number;
  rnParts: { label: string; m3: number }[];
  condensateOrigin: string; transfers: string; dischargeDestination: string;
}

export function boundaryBalance(factoryId: FactoryId): BoundaryBalance | null {
  if (factoryId !== f12Boundary.factoryId) return null;
  const w = f12Example.baselineWithdrawalM3;
  const total = f12Example.etpFlowM3;
  const same = f12Example.compliantBasinDischargeM3;
  const other = total - same;
  const error = w - (total + f12Boundary.meteredConsumptionM3 + f12Boundary.changeInStorageM3);
  const rnParts = [
    { label: "Discharge not counted", m3: other }, { label: "Metered consumption", m3: f12Boundary.meteredConsumptionM3 },
    { label: "Change in storage", m3: f12Boundary.changeInStorageM3 }, { label: "Error", m3: error },
  ];
  return {
    withdrawalM3: w, totalDischargeM3: total, sameBasinDischargeM3: same, otherDischargeM3: other,
    consumptionM3: f12Boundary.meteredConsumptionM3, storageChangeM3: f12Boundary.changeInStorageM3,
    errorM3: error, errorShareOfWithdrawal: error / w,
    reconciles: total + f12Boundary.meteredConsumptionM3 + f12Boundary.changeInStorageM3 + error === w,
    internalRecirculationM3: f12Boundary.internalRecirculationM3,
    replenishmentNeededM3: rnParts.reduce((s, p) => s + p.m3, 0), rnParts,
    condensateOrigin: f12Boundary.condensateOrigin, transfers: f12Boundary.transfers, dischargeDestination: f12Boundary.dischargeDestination,
  };
}

// ---- Quality accounting (V2 Section 8) --------------------------------------------------------------------------------------

type Pollutant = "tss" | "tn" | "tp";
const POLLUTANTS: readonly Pollutant[] = ["tss", "tn", "tp"];

export interface QualityColumn {
  pollutant: Pollutant;
  baselineLoadKg: number;
  /** Total treatment removal at the plant: baseline load x removal %. */
  totalRemovalKg: number; removalPct: number;
  /** Incremental project benefit against the counterfactual (PRJ-106). */
  incrementalKg: number;
  /** What is counted in P2 today (validated project benefit). */
  eligibleP2Kg: number;
  /** Proposed automatic spill-over: removal above the 90% target. Not counted. Decision pending. */
  spilloverKg: number;
}

export function qualityAccounting(factoryId: FactoryId, removalPct: Record<Pollutant, number>): QualityColumn[] | null {
  if (factoryId !== f12Example.factoryId) return null;
  const prj = projects.find((p) => p.id === "PRJ-106");
  const claimed = prj && prj.claim.unit === "kg" ? prj.claim : { unit: "kg" as const, tss: 0, tn: 0, tp: 0 };
  const counted = prj ? projectBenefit(prj).counted : null;
  const countedKg = counted && counted.unit === "kg" ? counted : { unit: "kg" as const, tss: 0, tn: 0, tp: 0 };
  return POLLUTANTS.map((pollutant) => {
    const baseline = f12Example.baselineLoadsKg[pollutant];
    const pct = removalPct[pollutant];
    return {
      pollutant, baselineLoadKg: baseline, removalPct: pct, totalRemovalKg: (baseline * pct) / 100,
      incrementalKg: claimed[pollutant], eligibleP2Kg: countedKg[pollutant],
      spilloverKg: Math.max(0, (baseline * (pct - REMOVAL_TARGET * 100)) / 100),
    };
  });
}

// ---- Load reduction guard ---------------------------------------------------------------------------------------------------

export interface LoadReduction { valid: boolean; kg: number | null; message: string }

/**
 * kg = mg/L x m3 / 1,000. A lower concentration alone does not prove a load reduction when flows differ, so
 * inlet and outlet flows must match (within the tolerance) before a reduction is accepted.
 */
export function loadReduction(
  inlet: { mgPerL: number; flowM3: number }, outlet: { mgPerL: number; flowM3: number }, tolerance = 0.02,
): LoadReduction {
  const matched = Math.abs(inlet.flowM3 - outlet.flowM3) <= tolerance * inlet.flowM3;
  if (!matched) return { valid: false, kg: null, message: "Flows do not match" };
  return { valid: true, kg: (inlet.mgPerL * inlet.flowM3) / 1000 - (outlet.mgPerL * outlet.flowM3) / 1000, message: "Valid load reduction" };
}
