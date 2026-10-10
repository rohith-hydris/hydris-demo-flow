import type { Dimension, Pillar, ProjectStatus, CellGrade, FactoryId } from "@/src/lib/types";
import type { ClaimAmount, ProjectRecord } from "./types";

const m3 = (value: number): ClaimAmount => ({ unit: "m3", value });
const people = (value: number): ClaimAmount => ({ unit: "people", value });

function p(
  id: string, factoryId: FactoryId, name: string, pillar: Pillar, dimension: Dimension, method: string,
  claim: ClaimAmount, attribution: number, status: ProjectStatus, grade: CellGrade, note: string,
  extra: Partial<Pick<ProjectRecord, "claimBasis" | "gateReason">> = {},
): ProjectRecord {
  return { id, factoryId, name, pillar, dimension, method, claim, attribution, status, grade, note, ...extra };
}

// PRODUCT 5.10. Attribution f is a share from 0 to 1. Counted and low values are computed in src/lib/claims.ts.
export const projects: ProjectRecord[] = [
  p("PRJ-101", "F12", "Korattur tank desilting", "P2", "Availability", "VWBA volume captured", m3(27000), 1, "Validated", "B", "Capacity survey and fill record on file", { claimBasis: "30,000 x 1.5 fills x 0.60" }),
  p("PRJ-102", "F12", "Ambattur estate recharge pits", "P2", "Availability", "VWBA recharge", m3(8000), 1, "Validated", "B", "Rainfall and runoff parameters from IMD"),
  p("PRJ-103", "F12", "Pallikaranai marsh restoration", "P3", "Availability", "VWBA inundation", m3(50000), 0.5, "Validated", "B", "Collective agreement on file; counted benefit 25,000 m3"),
  p("PRJ-104", "F12", "Ambattur ward drinking water supply", "P2", "Accessibility", "VWBA WASH supply / JMP", people(1500), 1, "Validated", "B", "Functional for 12 months"),
  p("PRJ-105", "F12", "Adyar riverside toilets and water points", "P3", "Accessibility", "JMP ladder", people(900), 1, "Pending validation", "C", "Monitoring check 62 days overdue; claim lapses at 90 days"),
  p("PRJ-106", "F12", "Tertiary treatment, sub-basin", "P2", "Quality", "WQBA treatment system", { unit: "kg", tss: 2500, tn: 200, tp: 40 }, 1, "Validated", "B", "Inlet and outlet lab data on file"),
  p("PRJ-107", "F12", "Landscape recharge offset", "P2", "Availability", "VWBA recharge", m3(6000), 1, "Not counted", "none", "No baseline, no benefit (Additionality Gate)", { gateReason: "No baseline" }),
  p("PRJ-108", "F12", "ETP upgrade required by consent order", "P1", "Availability", "n/a", m3(4000), 1, "Not counted", "none", "Compliance only, not additional", { gateReason: "Compliance only" }),
  p("PRJ-201", "F02", "Noyyal check dam", "P2", "Availability", "VWBA volume captured", m3(38000), 1, "Flagged", "C", "See validation script V1"),
  p("PRJ-202", "F02", "Avinashi community WASH", "P2", "Accessibility", "JMP ladder", people(900), 1, "Pending validation", "C", "Awaiting functionality evidence"),
  p("PRJ-301", "F01", "Nallar tank desilting", "P2", "Availability", "VWBA volume captured", m3(21000), 1, "Validated", "B", ""),
  p("PRJ-302", "F01", "Noyyal riverside wetland strip", "P3", "Availability", "VWBA inundation", m3(14000), 0.4, "Pending validation", "C", "Monitoring log missing"),
  p("PRJ-303", "F01", "RO reject recovery (consent condition)", "P1", "Availability", "n/a", m3(5000), 1, "Not counted", "none", "Compliance only", { gateReason: "Compliance only" }),
  p("PRJ-401", "F09", "Recharge wells, Dharapuram", "P2", "Availability", "VWBA recharge", m3(12000), 1, "Validated", "C", "Grade C: lower bound 8,400 m3 counts"),
  p("PRJ-501", "F04", "Cauvery bank nature-based planting", "P3", "Availability", "VWBA inundation", m3(9000), 1, "Pending validation", "C", ""),
  p("PRJ-601", "F13", "Sriperumbudur lake check dam", "P2", "Availability", "VWBA volume captured", m3(20000), 1, "Pending validation", "C", ""),
  p("PRJ-701", "F14", "Oragadam lake rejuvenation", "P2", "Availability", "VWBA volume captured", m3(28000), 1, "Validated", "B", ""),
  p("PRJ-801", "F05", "School toilets and water points", "P2", "Accessibility", "JMP ladder", people(1050), 1, "Validated", "B", ""),
  p("PRJ-901", "F03", "Uthukuli pond desilting", "P2", "Availability", "VWBA volume captured", m3(14000), 1, "Validated", "A", "Calibrated survey, third-party verified"),
  p("PRJ-1001", "F11", "Vellore wetland", "P3", "Availability", "VWBA inundation", m3(18000), 1, "Validated", "B", ""),
  p("PRJ-1101", "F10", "Ranipet recharge pits", "P2", "Availability", "VWBA recharge", m3(15000), 1, "Pending validation", "B", ""),
];
