import { describe, expect, it } from "vitest";
import { riskScores } from "@/src/data/risks";
import { getRankRanges, getSites } from "./selectors";
import { scopeFor } from "./scope";
import { DEFAULT_WEIGHTS, PILLAR_KEYS, riskPillarsPolicy, riskR, type Pillars } from "./risk";
import { coverageLine, renormalisationLine } from "./riskCopy";
import { siteChecks } from "./specCheckValues";

// Issue C1: the demo data shows a missing-data effect on R. F02 has no groundwater reading; F11 has no riverine flood reading.
const sites = getSites(scopeFor("brand"));
const by = (id: string) => sites.find((s) => s.id === id)!;
const rec = (id: string) => riskScores.find((r) => r.factoryId === id)!;

describe("F02: the whole groundwater pillar is missing", () => {
  const f02 = by("F02");
  it("drops groundwater out, records 90% coverage and keeps the other four pillars", () => {
    expect(f02.missingPillars).toEqual(["groundwater"]);
    expect(f02.riskCoverage).toMatchObject({ available: 9, required: 10, share: 0.9 });
    expect(coverageLine(f02)).toBe("Data coverage 90% (9 of 10 risk indicators have a reading)");
    expect(f02.risks.find((r) => r.code === "gtd")!.status).toBe("No data");
    expect(f02.riskCounts).toMatchObject({ present: 7, watch: 3 }); // 8 and 3 before; groundwater decline no longer counts
  });

  it("R with the pillar missing differs from R with the pillar imputed at the mean, in the direction the code reports", () => {
    const p = riskPillarsPolicy(rec("F02").scores, { gtd: "No data" });
    const rMissing = riskR(p.pillars, DEFAULT_WEIGHTS, p.missingPillars);
    const others = PILLAR_KEYS.filter((k) => k !== "groundwater");
    const mean = others.reduce((s, k) => s + p.pillars[k], 0) / others.length;
    const imputed: Pillars = { ...p.pillars, groundwater: mean };
    const rImputed = riskR(imputed, DEFAULT_WEIGHTS);
    expect(rMissing).not.toBeCloseTo(rImputed, 4);
    expect(rMissing).toBeGreaterThan(rImputed); // renormalising raised R here
    expect(f02.renormDelta).toBeCloseTo(rMissing - rImputed, 12);
    expect(f02.renormDelta).toBeGreaterThan(0);
  });

  it("the risk tab line states the signed effect and that it can raise or lower R", () => {
    const line = renormalisationLine(f02);
    expect(line).toContain("The groundwater pillar has no reading");
    expect(line).toContain("raised R by 0.01");
    expect(line).toContain("Renormalisation can raise or lower R");
  });

  it("R falls from 0.71 to 0.69 and the rank, band and tier do not move", () => {
    expect(f02.R).toBeCloseTo(0.69, 2);
    expect([f02.rank, f02.band, f02.tier]).toEqual([2, 1, 1]);
  });
});

describe("F11: a riverine flood gap lowers the flood pillar", () => {
  const f11 = by("F11");
  it("takes the flood pillar from the remaining coastal flood score: 0.30 to 0.20", () => {
    const r = rec("F11");
    expect(r.scores.cfr).toBeGreaterThan(0);
    const withRfr = riskPillarsPolicy(r.scores, { cep: "Error" });
    const without = riskPillarsPolicy(r.scores, r.gaps);
    expect(withRfr.pillars.flood).toBeCloseTo(0.3, 12);
    expect(without.pillars.flood).toBeCloseTo(0.2, 12);
    expect(without.pillars.flood).toBeLessThan(withRfr.pillars.flood);
    expect(without.missingPillars).toEqual([]); // the pillar still has a reading, so nothing is renormalised
  });
  it("lowers R a little (0.38 to 0.365), records 90% coverage and says the pillar uses the highest of the rest", () => {
    expect(f11.R).toBeCloseTo(0.365, 3);
    expect(f11.band).toBe(3);
    expect(f11.riskCoverage.share).toBe(0.9);
    expect(f11.risks.find((r) => r.code === "rfr")!.status).toBe("No data");
    expect(renormalisationLine(f11)).toContain("highest of the rest");
  });
});

describe("ranks are unchanged by the gaps", () => {
  it("the order, bands and tiers of all 14 sites still match PRODUCT 5.5", () => {
    expect(sites.map((s) => s.id)).toEqual(siteChecks.map((c) => c.id));
    for (const c of siteChecks) expect([by(c.id).band, by(c.id).tier]).toEqual([c.band, c.tier]);
  });
  it("every site still has a rank range, and F02 and F11 ranges stay within the network", () => {
    const ranges = getRankRanges(scopeFor("brand"));
    for (const s of sites) expect(ranges[s.id]).toBeDefined();
    for (const id of ["F02", "F11"]) { expect(ranges[id].low).toBeGreaterThanOrEqual(1); expect(ranges[id].high).toBeLessThanOrEqual(14); }
  });
});
