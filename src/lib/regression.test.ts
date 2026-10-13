import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { liteFindings, opportunities } from "@/src/data/opportunities";
import { projects } from "@/src/data/projects";
import baseline from "./regression.baseline.json";
import { importFinding, initialImports, rankOpportunities } from "./catalogue";
import { applyCommit, canCommit, type Commitments } from "./funding";
import { buildImpact, countedTotal, defaultBaseline } from "./impactView";
import { possibleFunders } from "./funders";
import { supplierInitiatives } from "./initiatives";
import { getAlerts, getPortfolio, getSites } from "./selectors";
import { scopeFor } from "./scope";

// AC-1: figures recorded before the Fix / Improve / Fund work (regression.baseline.json). The change is additive, so they must not move.
const snapshot = (role: "brand" | "supplier") => {
  const sc = scopeFor(role);
  const p = getPortfolio(sc);
  return {
    sites: Object.fromEntries(getSites(sc).map((s) => [s.id, [s.pwi.sitePwi, s.pwi.sitePwiCentral, s.pwi.volumetricBalance]])),
    rollup: p.rollup, band1: p.band1Count, alerts: p.alerts, openAlerts: getAlerts(sc).length, offTrack: p.offTrackCount,
  };
};

/** Every commitment any role may record, for every opportunity. */
const commitAll = (): Commitments => {
  let c: Commitments = {};
  for (const o of opportunities) for (const role of ["supplier", "brand"] as const) {
    if (!canCommit(o, role)) continue;
    const r = applyCommit(c, o, role);
    if (r.ok) c = r.commitments;
  }
  return c;
};

describe("regression (AC-1, AC-3)", () => {
  it("site PWI (counted and central), balance, portfolio, Band 1, alerts and off-track are unchanged", () => {
    expect(snapshot("brand")).toEqual(baseline.brand);
    expect(snapshot("supplier")).toEqual(baseline.supplier);
  });
  it("Opportunities, Catalogue and Scenarios behave as before", () => {
    const f = liteFindings.find((x) => x.id === "LITE-0187")!;
    const first = importFinding(initialImports(), f);
    expect(importFinding(first.imports, f).message).toContain("No duplicate created.");
    const g = rankOpportunities().find((r) => r.opportunity.id === "OPP-G")!;
    expect(g.eligible).toBe(false);
    expect(g.weighted).toBeCloseTo(4.45, 10);
    expect(defaultBaseline().id).toBe("S1");
  });
});

const shortlistAll = () => Object.fromEntries(opportunities.map((o) => [o.id, possibleFunders(o).eligible.map((f) => f.id)]));

describe("R1 and R2 (AC-9, AC-10)", () => {
  it("R1: committing every opportunity and shortlisting every eligible funder changes no PWI, balance or Validated / Measured total", () => {
    const c = commitAll();
    expect(Object.keys(c).length).toBeGreaterThan(0);
    for (const role of ["brand", "supplier"] as const) {
      const sites = getSites(scopeFor(role));
      const before = buildImpact(sites, defaultBaseline(), {});
      const after = buildImpact(sites, defaultBaseline(), c);
      const counted = (i: typeof before) => [...i.quantity, ...i.access, ...Object.values(i.quality).flat()].map((r) => [r.split.Validated, r.split.Measured, countedTotal(r.split)]);
      expect(counted(after)).toEqual(counted(before));
      expect(after.outcomes.filter((o) => o.state !== "Forecast").map((o) => [o.id, o.state, o.value])).toEqual(before.outcomes.filter((o) => o.state !== "Forecast").map((o) => [o.id, o.state, o.value]));
      expect(after.outcomes.filter((o) => o.stage === "Validated" || o.stage === "Claimed").every((o) => o.state !== "Forecast")).toBe(true);
    }
    expect(snapshot("brand")).toEqual(baseline.brand);
  });
  it("R2: funding.ts, funders.ts and initiatives.ts never read the claim allocation", () => {
    for (const f of ["./funding.ts", "./funders.ts", "./initiatives.ts"]) expect(readFileSync(fileURLToPath(new URL(f, import.meta.url)), "utf8")).not.toMatch(/claimAllocation/);
  });
  it("R2: committing and shortlisting do not change any attribution or claim share", () => {
    const before = JSON.stringify(projects.map((p) => [p.id, p.attribution, p.participants.map((x) => x.claimAllocation)]));
    const c = commitAll();
    supplierInitiatives(scopeFor("brand"), defaultBaseline().items, c, shortlistAll());
    buildImpact(getSites(scopeFor("brand")), defaultBaseline(), c);
    expect(JSON.stringify(projects.map((p) => [p.id, p.attribution, p.participants.map((x) => x.claimAllocation)]))).toBe(before);
  });
});
