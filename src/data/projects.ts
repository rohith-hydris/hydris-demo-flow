import { summaryStatus, type EligibilityChecks } from "@/src/lib/states";
import type { CellGrade, Dimension, FactoryId, Pillar, ReviewStates } from "@/src/lib/types";
import type { ClaimAmount, Participant, ProjectRecord } from "./types";

const m3 = (value: number): ClaimAmount => ({ unit: "m3", value });
const people = (value: number): ClaimAmount => ({ unit: "people", value });

// V2 Section 2 migration: rule-based starting states for the 21 projects, then the named exceptions.
type Kind = "validated" | "pending" | "flagged" | "notCounted";
const KIND_STATES: Record<Kind, ReviewStates> = {
  validated: { evidenceAcceptance: "Accepted", calculationValidity: "Valid", benefitState: "Validated", claimEligibility: "Eligible", reportRelease: "Not included" },
  pending: { evidenceAcceptance: "Pending", calculationValidity: "Valid", benefitState: "Measured", claimEligibility: "Under review", reportRelease: "Not included" },
  flagged: { evidenceAcceptance: "Rejected", calculationValidity: "Needs recalculation", benefitState: "Not validated", claimEligibility: "Allocation conflict", reportRelease: "Not included" },
  notCounted: { evidenceAcceptance: "Pending", calculationValidity: "Valid", benefitState: "Not validated", claimEligibility: "Not eligible", reportRelease: "Not included" },
};

const PASS: EligibilityChecks = { insidePolygon: "Pass", hydrologicallyConnected: "Pass", collectiveAction: "Pass" };
const COLLECTIVE_UNKNOWN: EligibilityChecks = { ...PASS, collectiveAction: "Unknown" };

// V2 5.1 defaults, used where a project has no custom text.
const DEFAULT_DETAIL = {
  boundary: "Project catchment as surveyed",
  counterfactual: "No project, same rainfall year",
  operatingPeriod: "Claim period as registered",
  monitoringRequirement: "Quarterly check with log",
};

interface Extra {
  claimBasis?: string; gateReason?: ProjectRecord["gateReason"];
  states?: Partial<ReviewStates>; detail?: Partial<typeof DEFAULT_DETAIL>;
  fundingShare?: number | null; checks?: EligibilityChecks; participants?: Participant[];
}

function p(
  id: string, factoryId: FactoryId, name: string, pillar: Pillar, dimension: Dimension, method: string,
  claim: ClaimAmount, attribution: number, kind: Kind, grade: CellGrade, note: string, extra: Extra = {},
): ProjectRecord {
  const states: ReviewStates = { ...KIND_STATES[kind], ...extra.states };
  return {
    id, factoryId, name, pillar, dimension, method, claim, attribution, grade, note,
    status: summaryStatus(states), states,
    ...DEFAULT_DETAIL, ...extra.detail,
    fundingShare: extra.fundingShare ?? null,
    // Assumption (not in V2): Eligible and Not eligible projects pass all three checks; Under review and Allocation conflict
    // projects have collective-action eligibility Unknown, except where V2 names the checks.
    eligibilityChecks: extra.checks ?? (kind === "pending" || kind === "flagged" ? COLLECTIVE_UNKNOWN : PASS),
    participants: extra.participants ?? [],
    claimBasis: extra.claimBasis, gateReason: extra.gateReason,
  };
}

const RELEASED = { reportRelease: "Released (snapshot)" } as const;

// V2 5.2: shared projects. Physical benefit is the project's claim; each participant claims an allocation of it.
const marshParticipants: Participant[] = [
  { participant: "Pallikaranai Marsh Trust", role: "Host", fundingShare: 0, eligiblePillarRole: "none", eligibility: "Not a claimant", claimAllocation: 0, claimState: "n/a" },
  { participant: "Wetland Works (NGO)", role: "Implementing partner", fundingShare: 0, eligiblePillarRole: "none", eligibility: "Not a claimant", claimAllocation: 0, claimState: "n/a" },
  { participant: "Ambattur Denim Unit (F12)", role: "Contributor", fundingShare: 0.5, eligiblePillarRole: "P3 collective action", eligibility: "Eligible", claimAllocation: 0.5, claimState: "Eligible", factoryId: "F12" },
  { participant: "Adyar Garments Ltd", role: "Contributor", fundingShare: 0.5, eligiblePillarRole: "P3 collective action", eligibility: "Eligible", claimAllocation: 0.5, claimState: "Eligible" },
];
const checkDamParticipants: Participant[] = [
  { participant: "Avinashi Road Dye House (F02)", role: "Host", fundingShare: 1, eligiblePillarRole: "P2 sub-basin", eligibility: "Under review", claimAllocation: 1, claimState: "Conflict", factoryId: "F02" },
  { participant: "Noyyal Exports", role: "Contributor", fundingShare: 0, eligiblePillarRole: "P2 sub-basin", eligibility: "Under review", claimAllocation: 0.4, claimState: "Conflict" },
];

// PRODUCT 5.10 with the V2 migration. `attribution` is the eligible benefit attribution f; `fundingShare` is separate.
// Counted and low values are computed in src/lib/claims.ts.
export const projects: ProjectRecord[] = [
  p("PRJ-101", "F12", "Korattur tank desilting", "P2", "Availability", "VWBA volume captured", m3(27000), 1, "validated", "B", "Capacity survey and fill record on file", {
    claimBasis: "30,000 x 1.5 fills x 0.60", states: RELEASED,
    detail: { counterfactual: "Tank at pre-desilting capacity, same rainfall", operatingPeriod: "5 years from 1 Apr 2025", monitoringRequirement: "Annual capacity survey and fill record" },
  }),
  p("PRJ-102", "F12", "Ambattur estate recharge pits", "P2", "Availability", "VWBA recharge", m3(8000), 1, "validated", "B", "Rainfall and runoff parameters from IMD", {
    states: RELEASED,
    detail: { counterfactual: "No pits; runoff leaves the estate", operatingPeriod: "5 years from 1 Apr 2025", monitoringRequirement: "Quarterly pit inspection and rainfall log" },
  }),
  p("PRJ-103", "F12", "Pallikaranai marsh restoration", "P3", "Availability", "VWBA inundation", m3(50000), 0.5, "validated", "B", "Collective agreement on file; counted benefit 25,000 m3", {
    states: RELEASED, fundingShare: 0.5, participants: marshParticipants,
    detail: { counterfactual: "Pre-restoration inundated area and depth", operatingPeriod: "10 years from 1 Jan 2025", monitoringRequirement: "Annual satellite inundation and depth survey" },
  }),
  p("PRJ-104", "F12", "Ambattur ward drinking water supply", "P2", "Accessibility", "VWBA WASH supply / JMP", people(1500), 1, "validated", "B", "Functional for 12 months", {
    states: RELEASED,
    detail: { counterfactual: "Households below basic service before project", operatingPeriod: "12 months functional, then 5 years", monitoringRequirement: "Quarterly functionality check" },
  }),
  p("PRJ-105", "F12", "Adyar riverside toilets and water points", "P3", "Accessibility", "JMP ladder", people(900), 1, "pending", "C", "Monitoring check 62 days overdue; claim lapses at 90 days", {
    states: { evidenceAcceptance: "Accepted with warning", reportRelease: "Draft" },
    detail: { counterfactual: "Facilities absent before project", operatingPeriod: "12 months functional", monitoringRequirement: "Quarterly functionality check (62 days overdue)" },
  }),
  p("PRJ-106", "F12", "Tertiary treatment, sub-basin", "P2", "Quality", "WQBA treatment system", { unit: "kg", tss: 2500, tn: 200, tp: 40 }, 1, "validated", "B", "Inlet and outlet lab data on file", {
    states: RELEASED,
    detail: { counterfactual: "Same plant without tertiary stage, matched inlet and outlet flows", operatingPeriod: "Plant operating life", monitoringRequirement: "Weekly lab, monthly roll-up" },
  }),
  p("PRJ-107", "F12", "Landscape recharge offset", "P2", "Availability", "VWBA recharge", m3(6000), 1, "notCounted", "none", "No baseline, no benefit (Additionality Gate)", { gateReason: "No baseline" }),
  p("PRJ-108", "F12", "ETP upgrade required by consent order", "P1", "Availability", "n/a", m3(4000), 1, "notCounted", "none", "Compliance only, not additional", { gateReason: "Compliance only" }),
  p("PRJ-201", "F02", "Noyyal check dam", "P2", "Availability", "VWBA volume captured", m3(38000), 1, "flagged", "C", "See validation script V1", { fundingShare: 1, participants: checkDamParticipants }),
  p("PRJ-202", "F02", "Avinashi community WASH", "P2", "Accessibility", "JMP ladder", people(900), 1, "pending", "C", "Awaiting functionality evidence"),
  p("PRJ-301", "F01", "Nallar tank desilting", "P2", "Availability", "VWBA volume captured", m3(21000), 1, "validated", "B", ""),
  p("PRJ-302", "F01", "Noyyal riverside wetland strip", "P3", "Availability", "VWBA inundation", m3(14000), 0.4, "pending", "C", "Monitoring log missing"),
  p("PRJ-303", "F01", "RO reject recovery (consent condition)", "P1", "Availability", "n/a", m3(5000), 1, "notCounted", "none", "Compliance only", { gateReason: "Compliance only" }),
  p("PRJ-401", "F09", "Recharge wells, Dharapuram", "P2", "Availability", "VWBA recharge", m3(12000), 1, "validated", "C", "Grade C: lower bound 8,400 m3 counts", { states: { evidenceAcceptance: "Accepted with warning" } }),
  // V2 5.1 eligibility example: polygon Pass, connected Pass, collective-action eligibility Unknown.
  p("PRJ-501", "F04", "Cauvery bank nature-based planting", "P3", "Availability", "VWBA inundation", m3(9000), 1, "pending", "C", "", { checks: { insidePolygon: "Pass", hydrologicallyConnected: "Pass", collectiveAction: "Unknown" } }),
  p("PRJ-601", "F13", "Sriperumbudur lake check dam", "P2", "Availability", "VWBA volume captured", m3(20000), 1, "pending", "C", ""),
  p("PRJ-701", "F14", "Oragadam lake rejuvenation", "P2", "Availability", "VWBA volume captured", m3(28000), 1, "validated", "B", ""),
  p("PRJ-801", "F05", "School toilets and water points", "P2", "Accessibility", "JMP ladder", people(1050), 1, "validated", "B", ""),
  p("PRJ-901", "F03", "Uthukuli pond desilting", "P2", "Availability", "VWBA volume captured", m3(14000), 1, "validated", "A", "Calibrated survey, third-party verified"),
  p("PRJ-1001", "F11", "Vellore wetland", "P3", "Availability", "VWBA inundation", m3(18000), 1, "validated", "B", ""),
  p("PRJ-1101", "F10", "Ranipet recharge pits", "P2", "Availability", "VWBA recharge", m3(15000), 1, "pending", "B", ""),
];
