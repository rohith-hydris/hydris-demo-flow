import { cellScores, removals } from "@/src/data/cells";
import { f12Example } from "@/src/data/f12Example";
import { factories } from "@/src/data/factories";
import { ops } from "@/src/data/ops";
import { projects } from "@/src/data/projects";
import { riskScores } from "@/src/data/risks";
import { suppliers } from "@/src/data/suppliers";
import type { FactoryRecord, OpsRecord, SupplierRecord } from "@/src/data/types";
import { awaitingValidation, readinessShare } from "./claims";
import { alertCounts, buildAlerts, healthBand, highestSeverity, isOffTrack, tierDirection, type Alert } from "./ops";
import { buildFactoryPwi, type FactoryPwi } from "./pwi";
import { rankRanges, rankSites, type RankInput, type RankRange } from "./rank";
import { rollup, type Rollup } from "./rollup";
import {
  DEFAULT_WEIGHTS, bwsRise, evaluateRisks, renormalisationDelta, riskCounts, riskPillarsPolicy, topDrivers,
  type Pillars, type RiskCoverage, type RiskCounts, type RiskResult, type Weights,
} from "./risk";
import { canSeeFactory, type Scope } from "./scope";
import type { Band, FactoryId, Health, PillarKey, Quadrant, Severity, SupplierId, Tier, TierDirection, ZdhcTier } from "./types";

// The only place the data in src/data/ is joined to the formulas. Components read from here, never from src/data/.
// Scores, bands, ranks and tiers are computed on the fly from inputs; nothing computed is stored.

interface StaticSite {
  record: FactoryRecord; supplierName: string;
  pillars: Pillars; missingPillars: PillarKey[]; coverage: RiskCoverage;
  risks: RiskResult[]; riskCounts: RiskCounts; bwsRise: number;
  pwi: FactoryPwi; ops: OpsRecord; health: Health; tierDirection: TierDirection | null; offTrack: boolean;
}

function buildStatic(): StaticSite[] {
  return factories.map((record) => {
    const riskRecord = riskScores.find((r) => r.factoryId === record.id)!;
    const scores = riskRecord.scores;
    const gaps = riskRecord.gaps ?? {};
    const policy = riskPillarsPolicy(scores, gaps);
    const opsRow = ops.find((o) => o.factoryId === record.id)!;
    const risks = evaluateRisks(record.id, scores, gaps);
    return {
      record,
      supplierName: suppliers.find((s) => s.id === record.supplierId)!.name,
      pillars: policy.pillars, missingPillars: policy.missingPillars, coverage: policy.coverage, risks, riskCounts: riskCounts(risks), bwsRise: bwsRise(scores),
      pwi: buildFactoryPwi(
        record,
        cellScores.find((c) => c.factoryId === record.id)!,
        removals.find((r) => r.factoryId === record.id)!,
        record.id === f12Example.factoryId ? f12Example : null,
      ),
      ops: opsRow,
      health: healthBand(opsRow.healthScore),
      tierDirection: opsRow.tierChange ? tierDirection(opsRow.tierChange.from, opsRow.tierChange.to) : null,
      offTrack: isOffTrack(opsRow),
    };
  });
}

const STATIC = buildStatic();

export interface Site {
  id: FactoryId; name: string; supplierId: SupplierId; supplierName: string; district: string;
  lat: number; lon: number;
  footprintI: number | null; replenishmentNeededM3: number; headcount: number; householdSize: number;
  confidence: number; evidenceGrade: FactoryRecord["evidenceGrade"];
  pillars: Pillars; drivers: PillarKey[];
  /** V2 4.2: share of risk indicators with a usable reading, the pillars that dropped out, and the effect on R. */
  riskCoverage: RiskCoverage; missingPillars: PillarKey[]; renormDelta: number;
  /** Share of documents that are Ready (V2 4.2). Informational only: never used to filter, sort or rank. */
  readiness: number;
  risks: RiskResult[]; riskCounts: RiskCounts; bwsRise: number;
  /** Risk score R for the weights in use. */
  R: number; band: Band; quadrant: Quadrant;
  /** Rank and tier among the sites in the requested scope (a supplier ranks its own factories among themselves). */
  rank: number; tier: Tier;
  /** Rank and tier across the whole network. */
  networkRank: number; networkTier: Tier;
  pwi: FactoryPwi;
  healthScore: number; health: Health; zdhcTier: ZdhcTier;
  tierChange: OpsRecord["tierChange"]; tierDirection: TierDirection | null;
  highestAlert: Severity | null; alertMessage: string | null; alertAgeDays: number | null;
  offTrack: boolean;
}

const toRankInput = (s: StaticSite): RankInput => ({
  id: s.record.id, pillars: s.pillars, footprintI: s.record.footprintI, presentCount: s.riskCounts.present, bwsRise: s.bwsRise,
  missingPillars: s.missingPillars,
});

/** Sites in scope, ranked among themselves, sorted by rank. */
export function getSites(scope: Scope, weights: Weights = DEFAULT_WEIGHTS): Site[] {
  const network = rankSites(STATIC.map(toRankInput), weights);
  const inScope = STATIC.filter((s) => canSeeFactory(scope, s.record.id));
  const scoped = rankSites(inScope.map(toRankInput), weights);
  return scoped.map((r) => {
    const s = STATIC.find((x) => x.record.id === r.id)!;
    const n = network.find((x) => x.id === r.id)!;
    const f = s.record;
    return {
      id: f.id, name: f.name, supplierId: f.supplierId, supplierName: s.supplierName, district: f.district, lat: f.lat, lon: f.lon,
      footprintI: f.footprintI, replenishmentNeededM3: f.replenishmentNeededM3, headcount: f.headcount, householdSize: f.householdSize,
      confidence: f.confidence, evidenceGrade: f.evidenceGrade,
      pillars: s.pillars, drivers: topDrivers(s.pillars), riskCoverage: s.coverage, missingPillars: s.missingPillars,
      renormDelta: renormalisationDelta(s.pillars, weights, s.missingPillars), readiness: readinessShare(f.id), risks: s.risks, riskCounts: s.riskCounts, bwsRise: s.bwsRise,
      R: r.R, band: r.band, quadrant: r.quadrant, rank: r.rank, tier: r.tier, networkRank: n.rank, networkTier: n.tier,
      pwi: s.pwi,
      healthScore: s.ops.healthScore, health: s.health, zdhcTier: s.ops.zdhcTier,
      tierChange: s.ops.tierChange, tierDirection: s.tierDirection,
      highestAlert: s.ops.highestAlert, alertMessage: s.ops.alertMessage, alertAgeDays: s.ops.alertAgeDays,
      offTrack: s.offTrack,
    };
  });
}

/** One site, or undefined when it does not exist or is outside the scope. */
export const getSite = (scope: Scope, id: FactoryId, weights?: Weights): Site | undefined =>
  getSites(scope, weights).find((s) => s.id === id);

/** 5th to 95th percentile rank range for each site in scope (PRODUCT 4.5). */
export function getRankRanges(scope: Scope, weights: Weights = DEFAULT_WEIGHTS): Record<FactoryId, RankRange> {
  return rankRanges(STATIC.filter((s) => canSeeFactory(scope, s.record.id)).map(toRankInput), weights);
}

const toRollupSites = (sites: Site[]) =>
  sites.map((s) => ({
    R: s.R, pwi: s.pwi.sitePwi, pwiCentral: s.pwi.sitePwiCentral, volumetricBalance: s.pwi.volumetricBalance,
    replenishmentNeededM3: s.replenishmentNeededM3, healthScore: s.healthScore,
  }));

export interface SupplierView {
  id: SupplierId; name: string; cluster: string; sites: Site[];
  rollup: Rollup;
  tierMix: Record<ZdhcTier, number>;
  openAlerts: number; highestAlert: Severity | null;
  claimsAwaitingValidation: number;
  offTrack: boolean;
}

const TIERS: readonly ZdhcTier[] = ["Aspirational", "Progressive", "Foundational", "Not conformant"];

export function getSuppliers(scope: Scope, weights: Weights = DEFAULT_WEIGHTS): SupplierView[] {
  const sites = getSites(scope, weights);
  return suppliers
    .filter((s: SupplierRecord) => scope.supplierIds.includes(s.id))
    .map((s) => {
      const own = sites.filter((x) => x.supplierId === s.id);
      return {
        id: s.id, name: s.name, cluster: s.cluster, sites: own,
        rollup: rollup(toRollupSites(own)),
        tierMix: Object.fromEntries(TIERS.map((t) => [t, own.filter((x) => x.zdhcTier === t).length])) as Record<ZdhcTier, number>,
        openAlerts: own.filter((x) => x.highestAlert !== null).length,
        highestAlert: highestSeverity(own.map((x) => x.highestAlert)),
        claimsAwaitingValidation: awaitingValidation(projects.filter((p) => own.some((x) => x.id === p.factoryId))),
        offTrack: own.some((x) => x.offTrack),
      };
    });
}

export const getSupplier = (scope: Scope, id: SupplierId, weights?: Weights): SupplierView | undefined =>
  getSuppliers(scope, weights).find((s) => s.id === id);

/** Open alerts for plants in scope. */
export const getAlerts = (scope: Scope): Alert[] => buildAlerts(ops.filter((o) => canSeeFactory(scope, o.factoryId)));

export interface Portfolio {
  supplierCount: number; factoryCount: number;
  rollup: Rollup;
  band1Count: number;
  alerts: Record<Severity, number>;
  claimsAwaitingValidation: number;
  offTrackCount: number;
}

export function getPortfolio(scope: Scope, weights: Weights = DEFAULT_WEIGHTS): Portfolio {
  const sites = getSites(scope, weights);
  return {
    supplierCount: scope.supplierIds.length, factoryCount: sites.length,
    rollup: rollup(toRollupSites(sites)),
    band1Count: sites.filter((s) => s.band === 1).length,
    alerts: alertCounts(getAlerts(scope)),
    claimsAwaitingValidation: awaitingValidation(projects.filter((p) => canSeeFactory(scope, p.factoryId))),
    offTrackCount: sites.filter((s) => s.offTrack).length,
  };
}
