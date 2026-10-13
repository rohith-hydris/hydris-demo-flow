import type { OpportunityType } from "./opportunities";
import { DEMO_TODAY } from "./tenants";

// Illustrative placeholder funders, demo only. None is a real offer: no real scheme name, rate or limit appears here (R5).
export interface Funder {
  id: string; name: string; instrument: "Loan" | "Grant" | "Programme support";
  projectTypes: OpportunityType[];
  /** "India" or a state name. */
  regions: string[];
  supplierSizes: ("MSME" | "Large")[];
  /** Ticket size in lakh INR. */
  minLakh: number; maxLakh: number;
  requires: string[];
  /** ISO date. */
  lastChecked: string;
  placeholder: true;
}

const REUSE: OpportunityType[] = ["Reuse / efficiency", "Effluent treatment"];
const NATURE: OpportunityType[] = ["Nature-based", "Community / access"];
const BOTH_SIZES: Funder["supplierSizes"] = ["MSME", "Large"];
const base = { lastChecked: DEMO_TODAY, placeholder: true } as const;

export const funders: Funder[] = [
  { id: "FND-1", name: "Illustrative public-sector bank green loan", instrument: "Loan", projectTypes: REUSE, regions: ["India"], supplierSizes: BOTH_SIZES, minLakh: 20, maxLakh: 150, requires: ["Audited accounts", "Detailed project report"], ...base },
  { id: "FND-2", name: "Illustrative MSME green finance scheme", instrument: "Loan", projectTypes: REUSE, regions: ["India"], supplierSizes: ["MSME"], minLakh: 5, maxLakh: 50, requires: ["Audited accounts", "Quotation from an equipment supplier"], ...base },
  { id: "FND-3", name: "Illustrative development-finance sustainability-linked loan", instrument: "Loan", projectTypes: REUSE, regions: ["India"], supplierSizes: ["Large"], minLakh: 100, maxLakh: 800, requires: ["Audited accounts", "Detailed project report", "Sustainability targets"], ...base },
  { id: "FND-4", name: "Illustrative water-resilience grant", instrument: "Grant", projectTypes: NATURE, regions: ["India"], supplierSizes: BOTH_SIZES, minLakh: 10, maxLakh: 60, requires: ["Project proposal", "Monitoring plan"], ...base },
  { id: "FND-5", name: "Illustrative CSR water programme", instrument: "Grant", projectTypes: NATURE, regions: ["Tamil Nadu"], supplierSizes: BOTH_SIZES, minLakh: 10, maxLakh: 100, requires: ["Project proposal", "Community consent"], ...base },
  { id: "FND-6", name: "Illustrative brand supplier-finance programme", instrument: "Programme support", projectTypes: REUSE, regions: ["India"], supplierSizes: BOTH_SIZES, minLakh: 10, maxLakh: 200, requires: ["Supplier agreement", "Detailed project report"], ...base },
];
