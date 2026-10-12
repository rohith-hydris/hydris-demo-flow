// V2 ADDENDUM Section 3: content of the Methodology page. Method library from PRD V2 Section 4.7. Text only, no scores.
// Nothing here is approved policy: every method, parameter and decision is a proposal under review.

/** How a parameter is shown. "reference" and "configurable" are the only values that are not under review. */
export type ParameterStatus = "proposed" | "reference" | "configurable" | "underReview" | "decisionPending" | "openQuestion";

export interface ParameterRow {
  id: string;
  parameter: string;
  /** Plain text. Rows whose value is a code constant are filled in by src/lib/methodology.ts. */
  value: string;
  status: ParameterStatus;
  /** Source of the status, for example "programme convention" or "V2 P17 C02". */
  statusNote?: string;
}

/** Rows whose value comes from a code constant carry `valueFrom`, resolved in src/lib/methodology.ts. */
export type ParameterSeed = Omit<ParameterRow, "value"> & { value?: string; valueFrom?: "dimensionWeights" | "qualityThresholds" };

export const parameterSeeds: ParameterSeed[] = [
  { id: "pillar-split", parameter: "Pillar split P1 / P2 / P3", value: "0.20 / 0.40 / 0.40", status: "proposed", statusNote: "programme convention" },
  { id: "dimension-weights", parameter: "Dimension weights A / W / Q", valueFrom: "dimensionWeights", status: "proposed" },
  { id: "quality-thresholds", parameter: "Quality thresholds", valueFrom: "qualityThresholds", status: "proposed" },
  { id: "sub-basin-rule", parameter: "Sub-basin spatial rule", value: "HydroBASINS level 10 or 12 plus 10 km buffer, clipped to level 8", status: "proposed" },
  {
    id: "pillar-eligibility", parameter: "Pillar eligibility for collective action",
    value: "Polygon and hydrological connection and collective-action eligibility. “Geography alone does not establish eligibility.”", status: "proposed",
  },
  { id: "wash-ratios", parameter: "WASH audit ratios", value: "1 water point and washbasin per 6 workers; 1 toilet per 22", status: "openQuestion", statusNote: "OQ-M10, not checked against WASH4Work" },
  { id: "household-size", parameter: "Household size h", value: "NFHS-5 district factsheets (Census 2011 fallback)", status: "reference" },
  { id: "attributable-share", parameter: "Attributable production share a", value: "1.0 default", status: "configurable" },
  { id: "mass-balance-tolerance", parameter: "Mass-balance tolerance", value: "Confidence drops one grade above 10% of freshwater withdrawal", status: "proposed" },
  { id: "monitoring-expiry", parameter: "Monitoring-expiry rule", value: "Claim stops counting when a monitoring check is 90 days overdue", status: "underReview", statusNote: "V2 P17 C02" },
  { id: "compliance-exclusion", parameter: "Compliance / additionality exclusion", value: "Compliance-only benefit is excluded from benefit", status: "underReview", statusNote: "V2 P17 C02" },
  { id: "zero-target", parameter: "Zero-target treatment", value: "Missing scores 0 and is flagged. Not applicable drops out of the pillar. Demonstrated zero shows 1.0 with an evidence requirement.", status: "decisionPending", statusNote: "V2 P08 C01" },
  { id: "quality-spillover", parameter: "Pillar eligibility of on-site quality spill-over", value: "Removal above 90% is not counted in P2 or P3 until the decision is made", status: "decisionPending", statusNote: "V2 P08 C02" },
];

export interface MethodEntry {
  id: string;
  name: string;
  family: "VWBA" | "WQBA";
  /** The PRD's "Use for" column: dimension and pillars. */
  indicator: string;
  /** The PRD's bracketed examples of where the method is used, when it gives any. */
  appliesTo?: string;
  /** Core formula as written in the PRD. */
  formula: string;
  inputs: string;
  boundary: string;
  units: string;
  counterfactual: string;
  operatingPeriod: string;
  monitoring: string;
  /** F12 project that uses this method, when one exists. */
  example?: string;
}

const TBD = "To be defined in method validation";

export const methodLibrary: MethodEntry[] = [
  {
    id: "vwba-volume-captured", name: "VWBA Volume captured", family: "VWBA", indicator: "Availability, P2 and P3", appliesTo: "Check dam, pond, tank desilting",
    formula: "VWB = V_capacity × n_fills × (1 − e_loss) − V_counterfactual", inputs: "Capacity survey, fills per year, evaporation loss",
    boundary: "Project catchment as surveyed", units: "m³ per year", counterfactual: "Tank at pre-desilting capacity, same rainfall",
    operatingPeriod: "5 years from 1 Apr 2025", monitoring: "Annual capacity survey and fill record", example: "PRJ-101 Korattur tank desilting",
  },
  {
    id: "vwba-recharge", name: "VWBA Recharge", family: "VWBA", indicator: "Availability, P1 to P3", appliesTo: "Wells, pits, infiltration basins",
    formula: "VWB = A × P × C_r × η_inf", inputs: "Catchment m², rainfall m (IMD or CHIRPS), runoff coefficient, infiltration efficiency",
    boundary: "Project catchment as surveyed", units: "m³ per year", counterfactual: "No pits; runoff leaves the estate",
    operatingPeriod: "5 years from 1 Apr 2025", monitoring: "Quarterly pit inspection and rainfall log", example: "PRJ-102 Ambattur estate recharge pits",
  },
  {
    id: "vwba-withdrawal-reduction", name: "VWBA Withdrawal reduction", family: "VWBA", indicator: "Availability, P2 and P3",
    formula: "VWB = W_baseline − W_project", inputs: "Metered or modelled withdrawal before and after",
    boundary: TBD, units: "m³ per year", counterfactual: "Baseline withdrawal (W_baseline)", operatingPeriod: TBD, monitoring: TBD,
  },
  {
    id: "vwba-inundation", name: "VWBA Inundation", family: "VWBA", indicator: "Availability, P3", appliesTo: "Wetland restore",
    formula: "VWB = Δ(inundated area × mean depth) per year", inputs: "JRC Global Surface Water, bathymetry",
    boundary: "Project catchment as surveyed", units: "m³ per year", counterfactual: "Pre-restoration inundated area and depth",
    operatingPeriod: "10 years from 1 Jan 2025", monitoring: "Annual satellite inundation and depth survey", example: "PRJ-103 Pallikaranai marsh restoration",
  },
  {
    id: "vwba-wash-supply", name: "VWBA WASH supply", family: "VWBA", indicator: "Accessibility and Availability",
    formula: "VWB = N × q × 365 ÷ 1,000", inputs: "People served N, litres per person per day q (WHO 50 to 100)",
    boundary: "Project catchment as surveyed", units: "m³ per year (people served for Accessibility)", counterfactual: "Households below basic service before project",
    operatingPeriod: "12 months functional, then 5 years", monitoring: "Quarterly functionality check", example: "PRJ-104 Ambattur ward drinking water supply",
  },
  {
    id: "wqba-treatment-system", name: "WQBA Treatment System", family: "WQBA", indicator: "Quality, P1 to P3",
    formula: "ΔL = (C_in × Q_in − C_out × Q_out) ÷ 1,000", inputs: "Inlet and outlet concentration (mg/L) and flow (m³)",
    boundary: "Plant inlet and outlet, matched flows", units: "kg per year, per pollutant (TSS, TN, TP)", counterfactual: "Same plant without tertiary stage, matched inlet and outlet flows",
    operatingPeriod: "Plant operating life", monitoring: "Weekly lab, monthly roll-up", example: "PRJ-106 Tertiary treatment, sub-basin",
  },
  {
    id: "wqba-simple-method", name: "WQBA Simple Method", family: "WQBA", indicator: "Quality, P2 and P3", appliesTo: "Urban runoff",
    formula: "L = 0.01 × P × P_j × R_v × C × A, with R_v = 0.05 + 0.009 × I", inputs: "Rainfall mm, area ha, % impervious, event mean concentration",
    boundary: TBD, units: "kg per year, per pollutant", counterfactual: TBD, operatingPeriod: TBD, monitoring: TBD,
  },
  {
    id: "wqba-pollutant-reduction", name: "WQBA Pollutant Reduction Efficiency", family: "WQBA", indicator: "Quality, P2 and P3",
    formula: "ΔL = A × (UAL_pre − UAL_post)", inputs: "Area, unit-area loading rates before and after",
    boundary: TBD, units: "kg per year, per pollutant", counterfactual: "Pre-project unit-area load (UAL_pre)", operatingPeriod: TBD, monitoring: TBD,
  },
  {
    id: "wqba-monitoring", name: "WQBA Water Quality Monitoring", family: "WQBA", indicator: "Quality, P2 and P3",
    formula: "ΔL from paired upstream and downstream, or before and after, sampling", inputs: "Paired upstream and downstream, or before and after, samples",
    boundary: TBD, units: "kg per year, per pollutant", counterfactual: "Upstream or before-project sampling", operatingPeriod: TBD, monitoring: TBD,
  },
];

export const METHOD_LIBRARY_STATUS = "Catalogue retained; each formula pending validation";
export const METHOD_LIBRARY_NOTE = "Capacity, rainfall capture and service demand do not automatically equal additional annual water benefit.";
export const METHOD_FIELDS_NOTE = `Fields marked “${TBD}” are not yet specified in the PRD or the addendum. They are shown as gaps, not filled with estimates.`;

export interface IssueRow {
  n: number;
  issue: string;
  severity: "High" | "Medium or Low";
  resolution: string;
  test: string;
  /** Always "Proposed". The register never shows Resolved (V2 P13 C01). */
  status: "Proposed";
}

const THEME_RESOLUTION = "Addressed in PRD Sections 4.1 to 4.8 (proposed correction)";
const THEME_TEST = "To be written";
const themes = [
  "Discharge destination and compliance", "Landscape irrigation offsets", "VWBA steps", "Fixed P1 access", "Undefined beneficiaries", "Household size",
  "Attribution", "Confidence scale", "Radius pillars", "Zero targets", "Indian data sources", "Portfolio weighting",
];

export const issuesRegister: IssueRow[] = [
  { n: 1, issue: "Pollutant formula 1,000x too high unless V is in m³/day", severity: "High", resolution: "kg = mg/L × m³ ÷ 1,000 on monthly volumes", test: "Unit test on handbook example", status: "Proposed" },
  { n: 2, issue: "Load uses withdrawal rather than ETP flow", severity: "High", resolution: "Use ETP inlet and outlet flows", test: "Fixture with differing flows", status: "Proposed" },
  { n: 3, issue: "P2 and P3 quality targets undefined", severity: "High", resolution: "5% of baseline influent load per pollutant", test: "Target freeze test", status: "Proposed" },
  { n: 4, issue: "Rainwater counted three times", severity: "High", resolution: "Count once, in freshwater withdrawal", test: "Water-balance test", status: "Proposed" },
  { n: 5, issue: "% reduction sums kg so TSS hides N and P", severity: "High", resolution: "Average per-pollutant scores", test: "F12 example (TN 75% visible)", status: "Proposed" },
  ...themes.map((t, i): IssueRow => ({ n: 6 + i, issue: t, severity: "Medium or Low", resolution: THEME_RESOLUTION, test: THEME_TEST, status: "Proposed" })),
];

/** Counts from the PWI Engine review: five High issues listed above, plus fifteen Medium and Low issues grouped into the twelve themes. */
export const HIGH_ISSUES = 5;
export const GROUPED_ISSUES = 15;
export const ISSUES_NOTE = "Reconciliation against the source files is incomplete. These are proposed conclusions (V2 P13 C01).";
export const THEMES_NOTE = "Rows 6 to 17 are twelve grouped themes covering the fifteen Medium and Low issues. The grouping is still to be checked (OQ-M11).";

export interface DecisionRow {
  id: string;
  decision: string;
  appearsIn: string;
  /** Placeholder until the team names an owner. */
  owner: string;
  status: "Open" | "Proposed, under review";
}

const OWNER = "To be assigned";

export const openDecisions: DecisionRow[] = [
  { id: "OQ-M1", decision: "Which default: the Methodology Guide or PWI-M 1.0. This PRD follows PWI-M 1.0 and keeps the Guide figure for comparison pending sign-off.", appearsIn: "Guide-compatible toggle on the F12 Impact tab", owner: OWNER, status: "Open" },
  { id: "OQ-M10", decision: "WASH audit ratios (1 water point and washbasin per 6 workers; 1 toilet per 22) are not checked against WASH4Work.", appearsIn: "Parameters tab, P1 Accessibility", owner: OWNER, status: "Open" },
  { id: "OQ-M11", decision: "Whether the twelve grouped themes match the PWI Engine review of the 15 Medium and Low issues.", appearsIn: "Source formula issues register", owner: OWNER, status: "Open" },
  { id: "OQ-X1", decision: "How the footprint score I is normalised. The demo uses fixed I values.", appearsIn: "Ranking, factory Overview", owner: OWNER, status: "Open" },
  { id: "OQ-X2", decision: "One vocabulary for status labels. “Low confidence” appears in three vocabularies today.", appearsIn: "Status badges across the app", owner: OWNER, status: "Open" },
  { id: "V2-ZT", decision: "Zero-target roll-up: how Missing, Not applicable and Demonstrated zero feed the pillar (V2 P08 C01).", appearsIn: "PWI grid cell popover", owner: OWNER, status: "Proposed, under review" },
  { id: "V2-QS", decision: "Eligibility of on-site quality spill-over above 90% in P2 and P3 (V2 P08 C02).", appearsIn: "Impact tab, Quality accounting", owner: OWNER, status: "Proposed, under review" },
  { id: "V2-CR", decision: "Compliance and additionality exclusion, and the 90-day monitoring-expiry rule (V2 P17 C02).", appearsIn: "Additionality Gate card, PRJ-105", owner: OWNER, status: "Proposed, under review" },
  { id: "V2-MD", decision: "Missing-data policy for risk score R: a missing indicator drops out and weights renormalise, which can raise or lower R (V2 P15 C01, P16 C01).", appearsIn: "Risk tab header, Ranking coverage column", owner: OWNER, status: "Proposed, under review" },
  { id: "V2-SC", decision: "How the 52 self-assessment answers combine into site confidence. The PRD gives the 0 to 3 score, the evidence confidences (1.0, 0.7, 0.5) and the 0.10 penalty per failed check XV-01 to XV-10, but not the combination. The demo uses the mean of (score / 3 x evidence confidence).", appearsIn: "Site confidence on Overview and Impact, status band", owner: OWNER, status: "Proposed, under review" },
  { id: "V2-SA", decision: "Whether a supplier may approve a scenario as the delivery baseline. The demo reserves approval for the brand.", appearsIn: "Projects, Scenarios", owner: OWNER, status: "Proposed, under review" },
  { id: "V2-CC", decision: "Which entries count toward claims: Validated only, or Measured as well.", appearsIn: "Impact and Claims and Evidence", owner: OWNER, status: "Proposed, under review" },
];
