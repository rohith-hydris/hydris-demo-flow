// Product rules R1 to R5: R1 Forecast is never Measured or Validated; a commitment changes no PWI, balance or total. R2 funding does not
// create claim entitlement; nothing here derives funding from attribution or claim allocation. R3 external funders are not project participants.
// R4 a failed mandatory gate blocks commitment and funder matching. R5 funder data is placeholder data.
import { factories } from "@/src/data/factories";
import { funders } from "@/src/data/funders";
import { opportunities as allOpportunities, type Opportunity } from "@/src/data/opportunities";
import { projects as allProjects } from "@/src/data/projects";
import { suppliers } from "@/src/data/suppliers";
import type { ClaimAmount, ProjectRecord } from "@/src/data/types";
import { gatesPass } from "./catalogue";
import { fmtInt, fmtKg, fmtM3, fmtPeople } from "./format";
import { commitmentStatus, fundingLabel, fundingOf, type Commitments } from "./funding";
import { fmtLakh, fmtOutcome } from "./projectsView";
import type { Scope } from "./scope";
import { countsTowardPwi } from "./states";
import { fmtMeasure } from "./measure";
import type { Site } from "./selectors";
import type { Shortlist } from "./funders";
import type { CellGrade, Dimension, FactoryId, InitiativeKind, InitiativeStage, Pillar, SupplierId, Where } from "./types";
import type { PwiCell } from "./pwi";
import type { Measure } from "@/src/data/types";

// Product rules R1 to R3 for brand funding: R1 a brand funding share is a share of funding only; it never reads or writes claim allocation or
// attribution and changes no claim, PWI value, balance or Impact total. R2 an unrecorded share is shown as "Not recorded", never 0%.
// R3 an opportunity stays Forecast: its brand share is an intended split, not money paid.
// The initiatives a supplier has taken, as the brand sees them: projects and gate-passing opportunities, each with a stage and funding.
// Funded by comes from funding shares only, never from attribution or claim allocation.

export const INITIATIVE_STAGES: readonly InitiativeStage[] = ["Validated", "Claimed", "Planned", "Proposed", "Under review", "Measured on site", "Not counted"];

/** One mapping from the summary status and the benefit state. countsTowardPwi is the rule in states.ts, not re-derived. */
export function projectStage(p: Pick<ProjectRecord, "status" | "states">): InitiativeStage {
  if (p.status === "Not counted") return "Not counted";
  if (p.status === "Flagged") return "Under review";
  const bs = p.states.benefitState;
  if (bs === "Validated" && countsTowardPwi(p.states)) return "Validated";
  if (bs === "Measured" || p.status === "Pending validation") return "Claimed";
  return "Planned"; // benefitState Forecast
}

/** Planned once it is in the approved baseline or someone has committed; otherwise Proposed. */
export const opportunityStage = (o: Pick<Opportunity, "id" | "funding">, approvedItems: readonly string[], commitments: Commitments): InitiativeStage =>
  approvedItems.includes(o.id) || commitmentStatus(o, commitments) !== "Not committed" ? "Planned" : "Proposed";

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Participants with a funding share above 0, "Name 50%, Name 50%". Falls back to the project's own funding share. */
export function projectFundedBy(p: Pick<ProjectRecord, "participants" | "fundingShare">): string {
  const payers = p.participants.filter((x) => x.fundingShare > 0);
  if (payers.length) return payers.map((x) => `${x.participant} ${pct(x.fundingShare)}`).join(", ");
  return p.fundingShare !== null && p.fundingShare > 0 ? `Factory ${pct(p.fundingShare)}` : "Not recorded";
}

export const opportunityFundedBy = (o: Pick<Opportunity, "funding">) => fundingLabel(fundingOf(o));

const fmtClaim = (a: ClaimAmount, k: number) =>
  a.unit === "m3" ? fmtM3(a.value * k) : a.unit === "people" ? fmtPeople(a.value * k) : `TSS ${fmtKg(a.tss * k)}, TN ${fmtKg(a.tn * k)}, TP ${fmtKg(a.tp * k)}`;

const WHERE: Record<Pillar, Where> = { P1: "Inside the factory", P2: "Outside: sub-basin", P3: "Outside: basin" };
export const whereOf = (pillar: Pillar): Where => WHERE[pillar];
export const WHERE_ORDER: readonly Where[] = ["Inside the factory", "Outside: sub-basin", "Outside: basin"];

const SITE_ACTION: Record<Dimension, string> = {
  Availability: "On-site water recycled and reused (site meters)",
  Accessibility: "Workers with safe water and sanitation (WASH audit)",
  Quality: "Treatment removal at the ETP (lab results)",
};
const SITE_NOTE = "Counted once through the site's P1 cell. Shown here so on-site delivery is visible.";
const NOT_RECORDED = "Measurements not recorded in the demo";

/** "21,000 of 22,000 m³", "1,200 of 1,200 people" or "TSS 92.5%, TN 75%, TP 80% against 90%". */
function fmtDelivered(d: Measure, t: Measure | null): string {
  if (d.kind === "removal") return `TSS ${d.tss}%, TN ${d.tn}%, TP ${d.tp}% against ${t?.kind === "removal" ? t.tss : 90}%`;
  if (d.kind === "volume" && t?.kind === "volume") return `${fmtInt(d.m3)} of ${fmtM3(t.m3)}`;
  if (d.kind === "people" && t?.kind === "people") return `${fmtInt(d.count)} of ${fmtPeople(t.count)}`;
  return fmtMeasure(d);
}

/** Exactly three rows per factory, one per P1 cell, read from the PWI grid. Display only: no score is recomputed and no total reads them. */
export function siteMeasurementRows(site: Pick<Site, "id" | "name" | "supplierId" | "pwi">): InitiativeRow[] {
  return site.pwi.cells.filter((c: PwiCell) => c.pillar === "P1").map((c) => ({
    id: `${site.id}-P1-${c.dimension}`, supplierId: site.supplierId, factoryId: site.id, factoryName: site.name, name: SITE_ACTION[c.dimension],
    kind: "Site measurement" as InitiativeKind, where: whereOf("P1"), stage: "Measured on site" as InitiativeStage,
    value: c.delivered ? fmtDelivered(c.delivered, c.target) : `Score only, ${NOT_RECORDED.charAt(0).toLowerCase()}${NOT_RECORDED.slice(1)}`,
    delivered: c.delivered ? fmtDelivered(c.delivered, c.target) : NOT_RECORDED, target: c.target ? fmtMeasure(c.target) : "No target recorded",
    score: c.score, counted: c.counted, breakdown: c.breakdown.map((b) => ({ ...b })),
    fundedBy: "Not recorded", shortlistedFunders: [], grade: c.grade, attribution: null,
    projectId: null, opportunityId: null, forecast: false, gateReason: null, note: SITE_NOTE,
    brandShare: null, capexLakh: null, brandFunding: { status: "not-applicable", text: "n/a", share: null, amountLakh: null },
  }));
}

/** Share of funding the brand pays on a project: null when there are no participants or the split does not sum to 1 (R2). */
export function projectBrandShare(p: Pick<ProjectRecord, "participants">): number | null {
  if (p.participants.length === 0) return null;
  if (Math.abs(p.participants.reduce((s, x) => s + x.fundingShare, 0) - 1) > 0.001) return null;
  return p.participants.filter((x) => x.isBrand === true).reduce((s, x) => s + x.fundingShare, 0);
}
/** Intended brand share of an opportunity; null while funding is To be agreed or missing. */
export const opportunityBrandShare = (o: Pick<Opportunity, "funding">): number | null => o.funding?.brandShare ?? null;

export interface BrandFundingCell { text: string; share: number | null; amountLakh: number | null; status: "share" | "not-recorded" | "to-be-agreed" | "not-applicable" }

/** What the Brand funding column shows. Only outside actions have a brand share. */
export function brandFundingCell(row: Pick<InitiativeRow, "where" | "kind" | "brandShare" | "capexLakh">): BrandFundingCell {
  const none = { share: null, amountLakh: null } as const;
  if (row.where === "Inside the factory" || row.kind === "Site measurement") return { ...none, status: "not-applicable", text: "n/a" };
  if (row.brandShare === null) return row.kind === "Opportunity" ? { ...none, status: "to-be-agreed", text: "To be agreed" } : { ...none, status: "not-recorded", text: "Not recorded" };
  return {
    status: "share", text: pct(row.brandShare), share: row.brandShare,
    amountLakh: row.kind === "Opportunity" && row.capexLakh !== null ? row.brandShare * row.capexLakh : null,
  };
}

export const brandAmountText = (c: BrandFundingCell) => (c.amountLakh === null ? null : `${fmtLakh(c.amountLakh)} planned`);

/** Counts for the line under the stage summary. */
export function outsideBrandSummary(rows: Pick<InitiativeRow, "where" | "brandFunding">[]) {
  const outside = rows.filter((r) => r.where !== "Inside the factory");
  return {
    outsideActions: outside.length,
    brandCoFunded: outside.filter((r) => r.brandFunding.status === "share" && (r.brandFunding.share ?? 0) > 0).length,
    notRecorded: outside.filter((r) => r.brandFunding.status === "not-recorded" || r.brandFunding.status === "to-be-agreed").length,
  };
}

export interface InitiativeRow {
  /** Brand share of funding and the capex it applies to, for the Brand funding column. */
  brandShare: number | null; capexLakh: number | null; brandFunding: BrandFundingCell;
  kind: InitiativeKind; where: Where;
  /** Site measurements only. */
  delivered?: string; target?: string; score?: number | null; counted?: number | null;
  breakdown?: { label: string; value: number; unit: "m3" | "people" | "kg" }[];
  note?: string;
  id: string; supplierId: SupplierId; factoryId: FactoryId; factoryName: string; name: string; stage: InitiativeStage;
  value: string; fundedBy: string;
  /** Names of the funders the supplier shortlisted. Opportunities only; a shortlist is not a participant (R3). */
  shortlistedFunders: string[];
  /** Projects only. */
  grade: CellGrade | null; attribution: string | null;
  projectId: string | null; opportunityId: string | null;
  /** True for opportunities: their value is a Forecast. */
  forecast: boolean;
  /** Why a Not counted project does not count. */
  gateReason: string | null;
}

/** Projects, and opportunities that pass every mandatory gate, for the factories in scope. */
export function supplierInitiatives(
  scope: Pick<Scope, "factoryIds">, approvedItems: readonly string[], commitments: Commitments, shortlist: Shortlist,
  data: { projects?: ProjectRecord[]; opportunities?: Opportunity[]; sites?: Pick<Site, "id" | "name" | "supplierId" | "pwi">[] } = {},
): InitiativeRow[] {
  const nameOf = (id: FactoryId) => factories.find((f) => f.id === id)?.name ?? id;
  const supplierOf = (id: FactoryId) => suppliers.find((s) => s.factoryIds.includes(id))!.id;
  const projectRows: InitiativeRow[] = (data.projects ?? allProjects).filter((p) => scope.factoryIds.includes(p.factoryId)).map((p) => {
    const stage = projectStage(p);
    const brandShare = projectBrandShare(p);
    return {
      brandShare, capexLakh: null, brandFunding: brandFundingCell({ where: whereOf(p.pillar), kind: "Project", brandShare, capexLakh: null }),
      kind: "Project" as const, where: whereOf(p.pillar), id: p.id, supplierId: supplierOf(p.factoryId), factoryId: p.factoryId, factoryName: nameOf(p.factoryId), name: p.name, stage,
      value: fmtClaim(p.claim, p.attribution), fundedBy: projectFundedBy(p), shortlistedFunders: [],
      grade: p.grade, attribution: pct(p.attribution), projectId: p.id, opportunityId: null, forecast: false,
      gateReason: stage === "Not counted" ? p.gateReason ?? "Not eligible" : null,
    };
  });
  const oppRows: InitiativeRow[] = (data.opportunities ?? allOpportunities).filter((o) => scope.factoryIds.includes(o.factoryId) && gatesPass(o.gates)).map((o) => ({
    brandShare: opportunityBrandShare(o), capexLakh: o.capexLakh,
    brandFunding: brandFundingCell({ where: whereOf(o.pillar), kind: "Opportunity", brandShare: opportunityBrandShare(o), capexLakh: o.capexLakh }),
    kind: "Opportunity" as const, where: whereOf(o.pillar), id: o.id, supplierId: supplierOf(o.factoryId), factoryId: o.factoryId, factoryName: nameOf(o.factoryId), name: o.name,
    stage: opportunityStage(o, approvedItems, commitments), value: fmtOutcome(o), fundedBy: opportunityFundedBy(o),
    shortlistedFunders: (shortlist[o.id] ?? []).map((id) => funders.find((f) => f.id === id)?.name ?? id),
    grade: null, attribution: null, projectId: null, opportunityId: o.id, forecast: true, gateReason: null,
  }));
  const siteRows = (data.sites ?? []).filter((x) => scope.factoryIds.includes(x.id)).flatMap(siteMeasurementRows);
  // Deterministic: factory id, then where, then the order projects, opportunities, site measurements.
  const rank = (r: InitiativeRow) => WHERE_ORDER.indexOf(r.where);
  return [...projectRows, ...oppRows, ...siteRows].sort((a, b) => a.factoryId.localeCompare(b.factoryId) || rank(a) - rank(b));
}

export const initiativeCounts = (rows: Pick<InitiativeRow, "stage">[]): Record<InitiativeStage, number> =>
  Object.fromEntries(INITIATIVE_STAGES.map((s) => [s, rows.filter((r) => r.stage === s).length])) as Record<InitiativeStage, number>;

/** "3 Validated, 1 Claimed, 2 Planned": stages with no rows are left out. */
export const initiativeCountLine = (c: Record<InitiativeStage, number>) =>
  INITIATIVE_STAGES.filter((s) => c[s] > 0).map((s) => `${c[s]} ${s}`).join(", ") || "No initiatives";

/** "4 Inside the factory, 2 Outside: sub-basin, 3 Outside: basin": locations with no rows are left out. */
export const whereCountLine = (rows: Pick<InitiativeRow, "where">[]) =>
  WHERE_ORDER.map((w) => [w, rows.filter((r) => r.where === w).length] as const).filter(([, n]) => n > 0).map(([w, n]) => `${n} ${w}`).join(", ") || "No actions";
