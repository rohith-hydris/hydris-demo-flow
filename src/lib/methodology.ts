import { parameterSeeds, type ParameterRow, type ParameterStatus } from "@/src/data/methodology";
import { DIMENSION_WEIGHTS, REMOVAL_TARGET } from "./pwi";

// V2 ADDENDUM Section 3: the Methodology page. Values that exist as code constants are read from them, so the page
// and the calculations can never disagree.

export const METHODOLOGY_PATH = "/methodology";

export const METHODOLOGY_TABS = [
  { id: "parameters", label: "Parameters" },
  { id: "methods", label: "Method library" },
  { id: "issues", label: "Source formula issues register" },
  { id: "decisions", label: "Open decisions" },
] as const;
export type MethodologyTab = (typeof METHODOLOGY_TABS)[number]["id"];
export const DEFAULT_METHODOLOGY_TAB: MethodologyTab = "parameters";
export const parseMethodologyTab = (v: string | null | undefined): MethodologyTab =>
  METHODOLOGY_TABS.find((t) => t.id === v)?.id ?? DEFAULT_METHODOLOGY_TAB;

export const methodologyHref = (tab?: MethodologyTab) => (tab && tab !== DEFAULT_METHODOLOGY_TAB ? `${METHODOLOGY_PATH}?tab=${tab}` : METHODOLOGY_PATH);

const two = (x: number) => x.toFixed(2);

export function parameterRows(): ParameterRow[] {
  const resolved = {
    dimensionWeights: `${two(DIMENSION_WEIGHTS.Availability)} / ${two(DIMENSION_WEIGHTS.Accessibility)} / ${two(DIMENSION_WEIGHTS.Quality)}`,
    qualityThresholds: `${Math.round(REMOVAL_TARGET * 100)}% / +5% / +5%`,
  };
  return parameterSeeds.map(({ valueFrom, value, ...rest }) => ({ ...rest, value: valueFrom ? resolved[valueFrom] : (value ?? "") }));
}

/** CLAUDE.md: "Decision pending" and under-review methods must read "Proposed, under review", never approved. */
export const statusBadge = (s: ParameterStatus): { label: string; kind: "proposed" | "reference" | "configurable" | "question" } =>
  s === "reference" ? { label: "Reference value", kind: "reference" }
  : s === "configurable" ? { label: "Configurable", kind: "configurable" }
  : s === "openQuestion" ? { label: "Open question", kind: "question" }
  : { label: "Proposed, under review", kind: "proposed" };
