import type { Alert, EtpDetail, Trend, ZdhcTier } from "../types";
import { factoriesBase } from "./suppliers-factories";

// Builder (module load only): 30 daily points from 6 hand-authored anchors
// (days 0, 6, 12, 18, 24, 29), with a fixed small wobble. The last point is the current health score.
const ANCHORS: Record<string, number[]> = {
  "tiruppur-mill": [64, 61, 57, 52, 48, 42], "avinashi-unit": [55, 57, 60, 59, 57, 58],
  "palladam-dye-house": [70, 72, 75, 77, 79, 81], "site-a-chennai": [74, 73, 72, 70, 68, 66],
  "ranipet-processing": [55, 52, 48, 44, 41, 38], "sriperumbudur-unit": [76, 77, 76, 78, 77, 77],
  "coimbatore-spinning": [87, 88, 88, 89, 88, 88], "erode-dyeing-works": [66, 65, 64, 64, 63, 63],
  "karur-unit": [85, 86, 88, 89, 90, 91], "mysuru-cut-and-sew": [82, 84, 86, 88, 89, 90],
  "bengaluru-hub": [83, 84, 84, 85, 84, 84], "nanjangud-unit": [79, 80, 80, 81, 80, 80],
  "ballari-weave": [52, 51, 50, 49, 48, 47], "hubballi-unit": [70, 69, 70, 69, 69, 69],
  "davangere-processing": [72, 71, 72, 70, 71, 71],
};
const DAYS = [0, 6, 12, 18, 24, 29];

function history(id: string, end: string) {
  const a = ANCHORS[id];
  const last = new Date(`${end}T00:00:00Z`);
  return Array.from({ length: 30 }, (_, i) => {
    const seg = Math.min(4, DAYS.findIndex((d, k) => i >= d && i <= DAYS[k + 1]));
    const t = (i - DAYS[seg]) / (DAYS[seg + 1] - DAYS[seg]);
    const base = a[seg] + (a[seg + 1] - a[seg]) * t;
    const wobble = i === 29 ? 0 : ((i * 7) % 5) - 2;
    const d = new Date(last);
    d.setUTCDate(last.getUTCDate() - (29 - i));
    return { date: d.toISOString().slice(0, 10), score: Math.round(base + wobble * 0.6) };
  });
}

const h = (date: string, tier: ZdhcTier, change: Trend) => ({ date, tier, change });
const TIERS: Record<string, ReturnType<typeof h>[]> = {
  "tiruppur-mill": [h("2026-10-09", "Not conformant", "Downgraded"), h("2026-06-12", "Foundational", "Same"), h("2026-01-20", "Foundational", "Upgraded")],
  "avinashi-unit": [h("2026-08-03", "Foundational", "Same"), h("2026-03-15", "Foundational", "Upgraded")],
  "palladam-dye-house": [h("2026-10-05", "Progressive", "Upgraded"), h("2026-05-21", "Foundational", "Same")],
  "site-a-chennai": [h("2026-10-09", "Foundational", "Downgraded"), h("2026-04-18", "Progressive", "Upgraded"), h("2025-11-02", "Foundational", "Same")],
  "ranipet-processing": [h("2026-07-30", "Not conformant", "Same"), h("2026-02-11", "Not conformant", "Downgraded")],
  "sriperumbudur-unit": [h("2026-06-02", "Progressive", "Same"), h("2025-12-09", "Progressive", "Upgraded")],
  "coimbatore-spinning": [h("2026-05-14", "Aspirational", "Same"), h("2025-10-27", "Aspirational", "Upgraded")],
  "erode-dyeing-works": [h("2026-04-22", "Foundational", "Same"), h("2025-11-30", "Foundational", "Upgraded")],
  "karur-unit": [h("2026-10-04", "Aspirational", "Upgraded"), h("2026-03-08", "Progressive", "Same")],
  "mysuru-cut-and-sew": [h("2026-10-07", "Aspirational", "Upgraded"), h("2026-04-01", "Progressive", "Same")],
  "bengaluru-hub": [h("2026-05-09", "Progressive", "Same"), h("2025-12-20", "Progressive", "Upgraded")],
  "nanjangud-unit": [h("2026-06-18", "Progressive", "Same"), h("2026-01-07", "Progressive", "Upgraded")],
  "ballari-weave": [h("2026-07-11", "Foundational", "Same"), h("2026-02-25", "Foundational", "Upgraded")],
  "hubballi-unit": [h("2026-06-26", "Foundational", "Same"), h("2025-12-14", "Foundational", "Upgraded")],
  "davangere-processing": [h("2026-05-30", "Progressive", "Same"), h("2025-11-19", "Progressive", "Upgraded")],
};

export const etpByFactory: Record<string, EtpDetail> = Object.fromEntries(
  factoriesBase.map((f) => [f.id, {
    factoryId: f.id, healthHistory: history(f.id, f.lastDataDate), tierHistory: TIERS[f.id], benefitVsTargetPct: f.benefitVsTargetPct,
  }]),
);

type A = Omit<Alert, "factoryName" | "supplierId" | "supplierName">;
const a = (r: A): Alert => {
  const f = factoriesBase.find((x) => x.id === r.factoryId)!;
  return { ...r, factoryName: f.name, supplierId: f.supplierId, supplierName: f.supplierName };
};

// Newest first.
export const alerts: Alert[] = [
  a({ id: "al-01", factoryId: "ranipet-processing", severity: "Critical", date: "2026-10-10", reason: "The plant's health score is Critical (38) and it has sent no data for 9 days. Please check the plant now.", status: "Open", assignee: null }),
  a({ id: "al-02", factoryId: "site-a-chennai", severity: "High", date: "2026-10-09", reason: "ZDHC tier dropped from Progressive to Foundational.", status: "Assigned", assignee: "R. Mehta" }),
  a({ id: "al-03", factoryId: "tiruppur-mill", severity: "Critical", date: "2026-10-09", reason: "ZDHC tier dropped to Not conformant and the health score is Critical (42).", status: "Open", assignee: null }),
  a({ id: "al-04", factoryId: "ballari-weave", severity: "Critical", date: "2026-10-09", reason: "The plant's health score is Critical (47).", status: "Acknowledged", assignee: null }),
  a({ id: "al-05", factoryId: "erode-dyeing-works", severity: "High", date: "2026-10-08", reason: "No data from this plant for 8 days.", status: "Open", assignee: null }),
  a({ id: "al-06", factoryId: "hubballi-unit", severity: "Medium", date: "2026-10-08", reason: "Water benefit is 76% of the target so far this period. It is behind target.", status: "Open", assignee: null }),
  a({ id: "al-07", factoryId: "avinashi-unit", severity: "Medium", date: "2026-10-07", reason: "The plant's health score is in the Watch range (58).", status: "Open", assignee: null }),
  a({ id: "al-08", factoryId: "mysuru-cut-and-sew", severity: "Info", date: "2026-10-07", reason: "ZDHC tier improved to Aspirational.", status: "Acknowledged", assignee: null }),
  a({ id: "al-09", factoryId: "davangere-processing", severity: "Medium", date: "2026-10-06", reason: "The plant's health score is in the Watch range (71).", status: "Acknowledged", assignee: null }),
  a({ id: "al-10", factoryId: "palladam-dye-house", severity: "Info", date: "2026-10-05", reason: "ZDHC tier improved to Progressive.", status: "Acknowledged", assignee: null }),
  a({ id: "al-11", factoryId: "karur-unit", severity: "Info", date: "2026-10-04", reason: "ZDHC tier improved to Aspirational.", status: "Acknowledged", assignee: null }),
];
