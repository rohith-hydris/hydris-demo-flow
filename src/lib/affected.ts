import { outputs, type OutputRecord } from "@/src/data/affected";
import { fmtCellScore, fmtPct1 } from "./format";
import type { CalculationValidity } from "./types";

// V2 Section 13. A changed input flags every Draft output that used it. A Released output keeps its snapshot: it is never
// altered, only flagged for a restatement decision.

export type OutputOutcome = "Recalculated" | "Flagged for review" | "Not altered";

export interface AffectedOutput {
  output: OutputRecord; outcome: OutputOutcome;
  /** Value now, where the output is a live score; null otherwise. */
  now: number | null;
  calculationValidity: CalculationValidity | null;
  /** Set on a Released output: the review the change calls for. */
  banner: string | null;
}

export const RESTATEMENT_BANNER = "A changed baseline does not alter a released report. Review whether a restatement is needed.";

/** `currentSitePwi` is the site PWI now (0 to 1), `currentP2Availability` the recalculated cell score. */
export function affectedOutputs(currentSitePwi: number, currentP2Availability: number, list: OutputRecord[] = outputs): AffectedOutput[] {
  return list.map((output) => {
    if (output.release === "Released (snapshot)") {
      return { output, outcome: "Not altered", now: null, calculationValidity: null, banner: RESTATEMENT_BANNER };
    }
    if (output.kind === "ledger") return { output, outcome: "Recalculated", now: currentP2Availability, calculationValidity: "Valid", banner: null };
    if (output.kind === "scorecard") return { output, outcome: "Flagged for review", now: currentSitePwi, calculationValidity: null, banner: null };
    return { output, outcome: "Flagged for review", now: null, calculationValidity: null, banner: null };
  });
}

export const flaggedCount = (rows: AffectedOutput[]) => rows.filter((r) => r.outcome === "Flagged for review").length;

/** What an output showed when it was made, as text. */
export function fmtBefore(o: AffectedOutput): string {
  const b = o.output.before;
  if (b.kind === "text") return b.value;
  return o.output.kind === "ledger" ? `P2 Availability ${fmtCellScore(b.value)}` : fmtPct1(b.value);
}

/** One line for the state now, as the Affected outputs panel shows it. */
export function fmtStateNow(o: AffectedOutput): string {
  if (o.outcome === "Recalculated") return `Recalculated, ${o.calculationValidity ?? "Valid"}${o.now !== null ? ` (P2 Availability now ${fmtCellScore(o.now)})` : ""}`;
  if (o.outcome === "Flagged for review") return `Flagged for review${o.now !== null ? ` (value now ${fmtPct1(o.now)})` : ""}`;
  return "Not altered";
}
