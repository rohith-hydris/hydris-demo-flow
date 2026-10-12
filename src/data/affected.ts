import type { ReportRelease } from "@/src/lib/types";

// V2 Section 13. The demo event: the IMD rainfall update (LE-2347) changed PRJ-101 fills per year from 1.6 to 1.5.
export const evidenceChange = {
  id: "LE-2347", factoryId: "F12", projectId: "PRJ-101",
  what: "IMD rainfall update: PRJ-101 desilting fills per year changed from 1.6 to 1.5",
  fillsBefore: 1.6, fillsAfter: 1.5,
} as const;

export type OutputKind = "ledger" | "scorecard" | "claimPack" | "report";
export interface OutputRecord {
  id: string; label: string; kind: OutputKind; release: ReportRelease;
  /** What the output showed when it was made. A number for a score, or text. */
  before: { kind: "score"; value: number; dp: 3 | 1 } | { kind: "text"; value: string };
}

export const outputs: OutputRecord[] = [
  { id: "LE-2347", label: "Impact ledger entry LE-2347 (Sep 2026)", kind: "ledger", release: "Draft", before: { kind: "score", value: 0.795, dp: 3 } },
  { id: "SC-2026-09", label: "PWI scorecard Sep 2026 (Draft)", kind: "scorecard", release: "Draft", before: { kind: "score", value: 0.703, dp: 1 } },
  { id: "CP-F12-DRAFT", label: "Claim pack draft", kind: "claimPack", release: "Draft", before: { kind: "text", value: "Includes PRJ-101" } },
  { id: "BRSR-P6-FY2526", label: "BRSR Principle 6 FY2025-26", kind: "report", release: "Released (snapshot)", before: { kind: "text", value: "Unchanged" } },
];
