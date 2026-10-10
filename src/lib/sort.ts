import { severityRank } from "./ops";
import type { Site, SupplierView } from "./selectors";
import type { Band } from "./types";

// Sorting and filtering for the Portfolio supplier list (PRODUCT 4.2) and the supplier factory list (PRODUCT 4.3).

export const SUPPLIER_SORTS = ["risk", "name", "pwi", "alerts"] as const;
export type SupplierSort = (typeof SUPPLIER_SORTS)[number];
export const DEFAULT_SUPPLIER_SORT: SupplierSort = "risk";

export const SITE_SORTS = ["rank", "risk", "footprint", "pwi", "band"] as const;
export type SiteSort = (typeof SITE_SORTS)[number];
export const DEFAULT_SITE_SORT: SiteSort = "rank";

export const parseSupplierSort = (v: string | null | undefined): SupplierSort =>
  SUPPLIER_SORTS.find((s) => s === v) ?? DEFAULT_SUPPLIER_SORT;
export const parseSiteSort = (v: string | null | undefined): SiteSort => SITE_SORTS.find((s) => s === v) ?? DEFAULT_SITE_SORT;
export const parseBand = (v: string | null | undefined): Band | null => (v === "1" ? 1 : v === "2" ? 2 : v === "3" ? 3 : null);

/** Risk: highest average R first. Name: A to Z. PWI: weakest RN-weighted figure first. Alerts: most severe, then most open. */
export function sortSuppliers(list: SupplierView[], key: SupplierSort): SupplierView[] {
  const byName = (a: SupplierView, b: SupplierView) => a.name.localeCompare(b.name);
  const sorted = [...list];
  switch (key) {
    case "name": return sorted.sort(byName);
    case "risk": return sorted.sort((a, b) => b.rollup.avgR - a.rollup.avgR || byName(a, b));
    case "pwi": return sorted.sort((a, b) => a.rollup.pwiRnWeighted - b.rollup.pwiRnWeighted || byName(a, b));
    case "alerts":
      return sorted.sort(
        (a, b) =>
          (a.highestAlert ? severityRank(a.highestAlert) : 99) - (b.highestAlert ? severityRank(b.highestAlert) : 99) ||
          b.openAlerts - a.openAlerts || byName(a, b),
      );
  }
}

/** Rank: priority order. Risk R and footprint I: highest first. PWI: weakest first. Band: Band 1 first, then rank. */
export function sortSites(list: Site[], key: SiteSort): Site[] {
  const byRank = (a: Site, b: Site) => a.rank - b.rank;
  const sorted = [...list];
  switch (key) {
    case "rank": return sorted.sort(byRank);
    case "risk": return sorted.sort((a, b) => b.R - a.R || byRank(a, b));
    case "footprint": return sorted.sort((a, b) => (b.footprintI ?? -1) - (a.footprintI ?? -1) || byRank(a, b));
    case "pwi": return sorted.sort((a, b) => a.pwi.sitePwi - b.pwi.sitePwi || byRank(a, b));
    case "band": return sorted.sort((a, b) => a.band - b.band || byRank(a, b));
  }
}

export const filterByBand = (list: Site[], band: Band | null): Site[] => (band === null ? list : list.filter((s) => s.band === band));
