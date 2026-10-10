import { fmtInt, fmtPct1, fmtScore } from "./format";
import { healthBand } from "./ops";
import { bandOf } from "./rank";
import type { Rollup } from "./rollup";
import type { Portfolio, SupplierView } from "./selectors";
import type { Role } from "./roles";

// Text for the KPI strips (PRODUCT 4.2, 4.3). Every figure comes from the roll-ups; nothing is typed in.

export interface KpiData {
  label: string; value: string | number; context?: string; valueLabel?: string; wide?: boolean;
  extra?: { label: string; value: string }[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const BAND_LABEL = { 1: "Band 1 · highest risk", 2: "Band 2 · medium risk", 3: "Band 3 · lower risk" } as const;

export function portfolioKpis(p: Portfolio, role: Role): KpiData[] {
  const totalAlerts = p.alerts.Critical + p.alerts.High + p.alerts.Medium + p.alerts.Info;
  return [
    {
      label: role === "brand" ? "Portfolio PWI" : "PWI across your factories",
      value: fmtPct1(p.rollup.pwiUnweighted), valueLabel: "Unweighted",
      extra: [{ label: "RN-weighted", value: fmtPct1(p.rollup.pwiRnWeighted) }],
      context: "Positive Water Impact. RN-weighted stops a small site hiding a large one.",
      wide: true,
    },
    { label: "Sites in Band 1", value: p.band1Count, context: `of ${p.factoryCount} sites, risk R of 0.60 or more` },
    {
      label: "Open alerts", value: totalAlerts,
      context: `${p.alerts.Critical} Critical · ${p.alerts.High} High · ${p.alerts.Medium} Medium · ${p.alerts.Info} Info`,
    },
    { label: "Claims to validate", value: p.claimsAwaitingValidation, context: "Pending validation or Flagged" },
    { label: "Plants off-track", value: p.offTrackCount, context: "Critical or High alert, or a tier drop" },
  ];
}

export function supplierKpis(s: SupplierView): KpiData[] {
  const r: Rollup = s.rollup;
  return [
    { label: "Average risk (R)", value: fmtScore(r.avgR), context: BAND_LABEL[bandOf(r.avgR)] },
    {
      label: "PWI", value: fmtPct1(r.pwiUnweighted), valueLabel: "Unweighted",
      extra: [{ label: "RN-weighted", value: fmtPct1(r.pwiRnWeighted) }],
      context: "Positive Water Impact, both ways", wide: true,
    },
    { label: "Volumetric balance", value: fmtPct1(r.volumetricBalance), context: "Water returned against water needed. Shown apart from PWI." },
    { label: "Average plant health", value: Math.round(r.avgHealth), context: `${healthBand(r.avgHealth)}, out of 100` },
    { label: "Replenishment needed (m³)", value: fmtInt(r.totalRnM3), context: "RN: the water the site must give back" },
  ];
}

export const countLine = (suppliers: number | null, factories: number) =>
  [suppliers === null ? null : plural(suppliers, "supplier", "suppliers"), plural(factories, "factory", "factories")].filter(Boolean).join(" · ");
