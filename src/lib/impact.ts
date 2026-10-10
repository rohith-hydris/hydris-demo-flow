import { removals } from "@/src/data/cells";
import { f12Example } from "@/src/data/f12Example";
import { ledger } from "@/src/data/ledger";
import type { LedgerEntry } from "@/src/data/types";
import { replenishmentNeeded } from "./pwi";
import type { FactoryId } from "./types";

// Extra Impact tab inputs that exist only for the F12 worked example (PRODUCT 5.8).

export const METHOD_VERSION = f12Example.methodVersion; // "PWI-M 1.0"
/** PRODUCT 6.6 caption: the number of formula issues PWI-M 1.0 corrects. */
export const GUIDE_CORRECTIONS = 20;

export interface WaterBalance {
  withdrawalM3: number; basinDischargeM3: number; attributableShare: number; replenishmentNeededM3: number;
  bySource: { label: string; m3: number }[];
}

export function waterBalance(factoryId: FactoryId): WaterBalance | null {
  if (factoryId !== f12Example.factoryId) return null;
  const s = f12Example.withdrawalBySourceM3;
  return {
    withdrawalM3: f12Example.baselineWithdrawalM3,
    basinDischargeM3: f12Example.compliantBasinDischargeM3,
    attributableShare: f12Example.attributableShare,
    replenishmentNeededM3: replenishmentNeeded(f12Example.baselineWithdrawalM3, f12Example.compliantBasinDischargeM3, f12Example.attributableShare),
    bySource: [
      { label: "Municipal", m3: s.municipal }, { label: "Groundwater", m3: s.groundwater }, { label: "Rainwater used", m3: s.rainwaterUsed },
      { label: "Third-party", m3: s.thirdParty }, { label: "Condensate", m3: s.condensate },
    ],
  };
}

const entryNumber = (id: string) => Number(id.replace(/\D/g, ""));

/** Newest first. Ledger entry numbers are sequential, so a higher number is a later entry. Only F12 has entries. */
export const ledgerFor = (factoryId: FactoryId): LedgerEntry[] =>
  ledger.filter((l) => l.factoryId === factoryId).sort((a, b) => entryNumber(b.id) - entryNumber(a.id));

export interface GuideDetail {
  removedKg: number; totalKg: number;
  /** Total removed mass over total load: the Guide's mass-sum rule scores P1 Quality 1.0 when this reaches 90%. */
  massShare: number;
  weakest: { pollutant: "TSS" | "TN" | "TP"; removalPct: number };
}

/** Why the Guide-compatible figure differs: a mass-sum rule hides a weak pollutant (PRODUCT 6.6). F12 only. */
export function guideDetail(factoryId: FactoryId): GuideDetail | null {
  if (factoryId !== f12Example.factoryId) return null;
  const rem = removals.find((r) => r.factoryId === factoryId)!;
  const l = f12Example.baselineLoadsKg;
  const removedKg = (l.tss * rem.tss + l.tn * rem.tn + l.tp * rem.tp) / 100;
  const totalKg = l.tss + l.tn + l.tp;
  const list = [{ pollutant: "TSS" as const, removalPct: rem.tss }, { pollutant: "TN" as const, removalPct: rem.tn }, { pollutant: "TP" as const, removalPct: rem.tp }];
  return { removedKg, totalKg, massShare: removedKg / totalKg, weakest: list.sort((a, b) => a.removalPct - b.removalPct)[0] };
}

export const priorMonthSitePwi = (factoryId: FactoryId): number | null =>
  factoryId === f12Example.factoryId ? f12Example.priorMonthSitePwi : null;
