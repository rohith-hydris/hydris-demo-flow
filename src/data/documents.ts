import type { FactoryId, ReadinessState } from "@/src/lib/types";
import type { DocumentRecord } from "./types";

// PRODUCT 5.11. F12 has the full list. For every other factory the spec names only the notable issues and says
// everything else is Ready, so those factories use the same twelve documents (`standardDocuments`) with the
// overrides below applied.
interface Template { order: number; name: string; period: string; state: ReadinessState; detail: string; isReport: boolean; needsAttention?: boolean }

const d = (order: number, name: string, period: string, state: ReadinessState, detail = "", isReport = false): Template =>
  ({ order, name, period, state, detail, isReport });

export const f12Documents: Template[] = [
  d(1, "Consent to Operate (state pollution control board)", "valid to 31 Mar 2028", "Ready", "", true),
  d(2, "CGWA groundwater NOC", "expired 30 Jun 2026", "Expired / out of period", "Renewal needed"),
  d(3, "OCEMS export, ETP outlet", "Apr 2025 to Mar 2026", "Ready", "Station ETP-OUT-1", true),
  d(4, "NABL lab reports, weekly TSS / TN / TP", "FY2025-26", "Failed check", "47 of 52 weekly samples; at least 48 required", true),
  d(5, "ETP inlet and outlet flow log", "FY2025-26", "Ready"),
  d(6, "Water meter log by source", "12 of 12 months", "Ready"),
  d(7, "Discharge destination and consent compliance statement", "FY2025-26", "Ready"),
  d(8, "Headcount roster, including contract workers", "Mar 2026", "Ready", "1,200 people"),
  d(9, "WASH facility audit", "3 of 4 quarters", "Low confidence", "Q3 scan has low text-recognition confidence; needs a person to confirm"),
  d(10, "Form V (water cess return)", "FY2025-26", "Missing", "Not yet uploaded"),
  d(11, "Third-party ETP audit report", "Feb 2026", "Ready", "Auditor accreditation confirmed", true),
  d(12, "Project completion certificates PRJ-101 to PRJ-106", "various", "Ready"),
];

/** The twelve documents with the F12-specific periods and issues cleared: every state Ready. */
export const standardDocuments: Template[] = [
  d(1, "Consent to Operate (state pollution control board)", "valid", "Ready", "", true),
  d(2, "CGWA groundwater NOC", "valid", "Ready"),
  d(3, "OCEMS export, ETP outlet", "FY2025-26", "Ready", "", true),
  d(4, "NABL lab reports, weekly TSS / TN / TP", "FY2025-26", "Ready", "", true),
  d(5, "ETP inlet and outlet flow log", "FY2025-26", "Ready"),
  d(6, "Water meter log by source", "12 of 12 months", "Ready"),
  d(7, "Discharge destination and consent compliance statement", "FY2025-26", "Ready"),
  d(8, "Headcount roster, including contract workers", "Mar 2026", "Ready"),
  d(9, "WASH facility audit", "4 of 4 quarters", "Ready"),
  d(10, "Form V (water cess return)", "FY2025-26", "Ready"),
  d(11, "Third-party ETP audit report", "current", "Ready", "", true),
  d(12, "Project completion certificates", "various", "Ready"),
];

type Override = Partial<Pick<Template, "period" | "state" | "detail" | "needsAttention">>;

// Spec text names the issue but not always which document; the mapping choices are noted in the comments.
const overrides: Record<FactoryId, Record<number, Override>> = {
  F01: {
    3: { needsAttention: true, detail: "OCEMS and lab COD differ by 14%, above tolerance. Both are cited; the lab report is the source of record." },
    4: { state: "Failed check", detail: "44 of 52 weekly samples; at least 48 required" },
  },
  F02: { 11: { period: "2024", state: "Expired / out of period", detail: "Report is dated 2024. A current third-party audit is needed." } },
  F06: {
    1: { period: "expired 31 Aug 2026", state: "Expired / out of period", detail: "Renewal needed" },
    // The spec says "OCEMS offline 9 days" without a state; Failed check is the closest of the five states.
    3: { state: "Failed check", detail: "OCEMS offline 9 days" },
    9: { state: "Missing", detail: "Not yet uploaded" },
    10: { state: "Missing", detail: "Not yet uploaded" },
  },
  F09: {
    // The spec says "a scanned register" without naming it; the headcount roster is the register in the list.
    8: { state: "Low confidence", detail: "Scanned register has low text-recognition confidence; needs a person to confirm" },
  },
  F13: { 6: { period: "Aug to Sep 2026", state: "Missing", detail: "Water meter log missing for Aug and Sep 2026" } },
};

export function documentsFor(factoryId: FactoryId): DocumentRecord[] {
  const base = factoryId === "F12" ? f12Documents : standardDocuments;
  const o = overrides[factoryId] ?? {};
  return base.map((t) => ({ ...t, ...o[t.order], id: `${factoryId}-D${String(t.order).padStart(2, "0")}`, factoryId }));
}

const FACTORY_IDS = ["F01", "F02", "F03", "F04", "F05", "F06", "F07", "F08", "F09", "F10", "F11", "F12", "F13", "F14"];
export const documents: DocumentRecord[] = FACTORY_IDS.flatMap(documentsFor);
