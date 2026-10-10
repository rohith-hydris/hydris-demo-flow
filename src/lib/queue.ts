import { documents } from "@/src/data/documents";
import { inspections } from "@/src/data/inspections";
import { projects } from "@/src/data/projects";
import type { DocumentRecord, InspectionRecord, ProjectRecord } from "@/src/data/types";
import { PROJECT_STATUSES, projectBenefit, statusCounts, totalsByUnit, trustScore, type ProjectBenefit } from "./claims";
import { canSeeFactory, type Scope } from "./scope";
import { getSites, type Site } from "./selectors";
import type { CellGrade, ProjectStatus } from "./types";

// The Claims and Evidence review queue (PRODUCT 4.6): project claims, audit and compliance reports, field inspections.

export const CLAIMS_TABS = [
  { id: "claims", label: "Project claims" },
  { id: "reports", label: "Audit and compliance reports" },
  { id: "inspections", label: "Field inspections" },
] as const;
export type ClaimsTab = (typeof CLAIMS_TABS)[number]["id"];
export const parseClaimsTab = (v: string | null | undefined): ClaimsTab => CLAIMS_TABS.find((t) => t.id === v)?.id ?? "claims";

export interface QueueFilters {
  supplierId?: string; factoryId?: string;
  /** A project status on the claims tab, a readiness state on reports, Validated or Needs review on inspections. */
  status?: string;
  pillar?: "P2" | "P3"; grade?: CellGrade;
}

const GRADES: CellGrade[] = ["A", "B", "C", "D", "none"];

/** Reads filters from query-string values, dropping anything that is not a valid choice. */
export function parseQueueFilters(get: (key: string) => string | null | undefined): QueueFilters {
  const f: QueueFilters = {};
  const take = (k: string) => { const v = get(k); return v && v !== "all" ? v : undefined; };
  f.supplierId = take("supplier"); f.factoryId = take("factory"); f.status = take("status");
  const pillar = take("pillar");
  if (pillar === "P2" || pillar === "P3") f.pillar = pillar;
  const grade = take("grade");
  if (grade && (GRADES as string[]).includes(grade)) f.grade = grade as CellGrade;
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as QueueFilters;
}

function siteMap(scope: Scope): Map<string, Site> {
  return new Map(getSites(scope).map((s) => [s.id, s]));
}
const inFilter = (site: Site, f: QueueFilters) =>
  (!f.supplierId || site.supplierId === f.supplierId) && (!f.factoryId || site.id === f.factoryId);

// ---- Project claims ----------------------------------------------------------------------------------------------

export interface ClaimRow { project: ProjectRecord; site: Site; benefit: ProjectBenefit }

// Needs a look first: Flagged, then Pending validation, then what is settled.
const CLAIM_ORDER: ProjectStatus[] = ["Flagged", "Pending validation", "Validated", "Not counted"];

export function claimRows(scope: Scope, f: QueueFilters = {}): ClaimRow[] {
  const sites = siteMap(scope);
  return projects
    .filter((p) => canSeeFactory(scope, p.factoryId))
    .filter((p) => inFilter(sites.get(p.factoryId)!, f))
    .filter((p) => !f.status || p.status === f.status)
    .filter((p) => !f.pillar || p.pillar === f.pillar)
    .filter((p) => !f.grade || p.grade === f.grade)
    .map((p) => ({ project: p, site: sites.get(p.factoryId)!, benefit: projectBenefit(p) }))
    .sort((a, b) =>
      CLAIM_ORDER.indexOf(a.project.status) - CLAIM_ORDER.indexOf(b.project.status) ||
      a.site.rank - b.site.rank || a.project.id.localeCompare(b.project.id, undefined, { numeric: true }));
}

type UnitTotals = ReturnType<typeof totalsByUnit>;

export interface ClaimSummary {
  counts: Record<ProjectStatus, number>;
  total: number;
  /** Each project's attributable share (claim x attribution), per unit. Units are never mixed. */
  claimed: UnitTotals;
  /** What counts today: Validated claims only. */
  accepted: UnitTotals;
}

/** Bulk status counts and per-unit totals. Only the supplier and factory filters narrow these. */
export function claimSummary(scope: Scope, f: Pick<QueueFilters, "supplierId" | "factoryId"> = {}): ClaimSummary {
  const list = claimRows(scope, f).map((r) => r.project);
  return { counts: statusCounts(list), total: list.length, claimed: totalsByUnit(list, "claimed"), accepted: totalsByUnit(list, "counted") };
}

// ---- Audit and compliance reports ---------------------------------------------------------------------------------

export interface ReportRow { doc: DocumentRecord; site: Site }
const READINESS_ORDER = ["Failed check", "Missing", "Expired / out of period", "Low confidence", "Ready"];

export function reportRows(scope: Scope, f: QueueFilters = {}): ReportRow[] {
  const sites = siteMap(scope);
  return documents
    .filter((d) => d.isReport && canSeeFactory(scope, d.factoryId))
    .filter((d) => inFilter(sites.get(d.factoryId)!, f))
    .filter((d) => !f.status || d.state === f.status)
    .map((doc) => ({ doc, site: sites.get(doc.factoryId)! }))
    .sort((a, b) => READINESS_ORDER.indexOf(a.doc.state) - READINESS_ORDER.indexOf(b.doc.state) || a.site.rank - b.site.rank || a.doc.order - b.doc.order);
}

export const reportStateCounts = (rows: ReportRow[]) =>
  Object.fromEntries(READINESS_ORDER.map((s) => [s, rows.filter((r) => r.doc.state === s).length])) as Record<string, number>;

// ---- Field inspections ---------------------------------------------------------------------------------------------

export interface InspectionRow { inspection: InspectionRecord; site: Site; trust: number }

export function inspectionRows(scope: Scope, f: QueueFilters = {}): InspectionRow[] {
  const sites = siteMap(scope);
  return inspections
    .filter((i) => canSeeFactory(scope, i.factoryId))
    .filter((i) => inFilter(sites.get(i.factoryId)!, f))
    .filter((i) => !f.status || i.status === f.status)
    .map((inspection) => ({ inspection, site: sites.get(inspection.factoryId)!, trust: trustScore(inspection) }))
    .sort((a, b) => Number(a.inspection.status === "Validated") - Number(b.inspection.status === "Validated") || a.site.rank - b.site.rank);
}

export const CLAIM_STATUSES = PROJECT_STATUSES;
