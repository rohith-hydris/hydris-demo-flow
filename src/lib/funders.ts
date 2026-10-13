import { funders as allFunders, type Funder } from "@/src/data/funders";
import { suppliers } from "@/src/data/suppliers";
import { DEMO_REGION } from "@/src/data/tenants";
import type { Opportunity } from "@/src/data/opportunities";
import type { SupplierRecord } from "@/src/data/types";
import { gatesPass } from "./catalogue";
import type { Blocker } from "./types";

// Possible funders for an opportunity, matched by hard filters. Product rules R1 to R5:
// R1 matching changes no PWI, balance or Validated / Measured total. R2 it reads and writes no attribution or claim allocation.
// R3 a funder is not a project participant. R4 a failed mandatory gate returns no funders. R5 funder data is placeholder data.

export const PLACEHOLDER_NOTE = "Illustrative placeholder. Not a real offer. Verify terms with the funder.";

type Opp = Pick<Opportunity, "type" | "capexLakh" | "gates">;

/** The first hard filter the funder fails, in a fixed order, or null. A capex above the funder maximum is not a blocker. */
function blockerOf(o: Opp, s: Pick<SupplierRecord, "sizeClass">, f: Funder): Blocker | null {
  if (!f.projectTypes.includes(o.type)) return "project-type";
  if (!f.regions.includes("India") && !f.regions.includes(DEMO_REGION)) return "region";
  if (!f.supplierSizes.includes(s.sizeClass)) return "supplier-size";
  if (o.capexLakh < f.minLakh) return "minimum-ticket";
  return null;
}

export function filterFunders(o: Opp, supplier: Pick<SupplierRecord, "sizeClass">, funders: Funder[]): { eligible: Funder[]; nearMisses: { funder: Funder; blocker: Blocker }[] } {
  const eligible: Funder[] = [];
  const nearMisses: { funder: Funder; blocker: Blocker }[] = [];
  if (!gatesPass(o.gates)) return { eligible, nearMisses };
  for (const funder of funders) {
    const blocker = blockerOf(o, supplier, funder);
    if (blocker) nearMisses.push({ funder, blocker });
    else eligible.push(funder);
  }
  return { eligible, nearMisses };
}

/** Share of the capex the funder could cover, 0 to 1. */
export const coverage = (o: Pick<Opportunity, "capexLakh">, f: Pick<Funder, "maxLakh">) => Math.min(1, f.maxLakh / o.capexLakh);

/** Highest coverage first, then name. */
export const rankFunders = (o: Pick<Opportunity, "capexLakh">, eligible: Funder[]): Funder[] =>
  [...eligible].sort((a, b) => coverage(o, b) - coverage(o, a) || a.name.localeCompare(b.name));

export const claimNote = (f: Pick<Funder, "instrument">): string =>
  f.instrument === "Loan" ? "A loan does not give the lender a share of the benefit."
    : f.instrument === "Grant" ? "Open decision V2-GRANT: a grant may affect whether the project is additional and who can claim the benefit."
      : "Programme funding is recorded separately from claim allocation.";

const BLOCKER_TEXT: Record<Blocker, string> = {
  "project-type": "Project type not covered", region: "Region not covered",
  "supplier-size": "Supplier size not eligible", "minimum-ticket": "Below the minimum ticket size",
};
export const blockerText = (b: Blocker) => BLOCKER_TEXT[b];

/** Funders a supplier shortlisted, per opportunity id. Demo state in ProjectsContext. */
export type Shortlist = Record<string, string[]>;

/** Eligible funders (ranked) and near misses for an opportunity, using the supplier that owns its factory. */
export function possibleFunders(o: Opp & Pick<Opportunity, "factoryId">, funders: Funder[] = allFunders) {
  const supplier = suppliers.find((s) => s.factoryIds.includes(o.factoryId))!;
  const { eligible, nearMisses } = filterFunders(o, supplier, funders);
  return { eligible: rankFunders(o, eligible), nearMisses };
}
