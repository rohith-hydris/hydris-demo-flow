import { describe, expect, it } from "vitest";
import { opportunities } from "@/src/data/opportunities";
import { projects } from "@/src/data/projects";
import { buildImpact, defaultBaseline } from "./impactView";
import { initiativeCounts, siteMeasurementRows, supplierInitiatives, whereCountLine, whereOf } from "./initiatives";
import { getSites, getSupplierInitiatives } from "./selectors";
import { scopeFor } from "./scope";

const brand = scopeFor("brand");
const S1 = defaultBaseline().items;
const rows = () => getSupplierInitiatives(brand, S1, {}, {});

describe("where", () => {
  it("whereOf maps pillars", () => {
    expect([whereOf("P1"), whereOf("P2"), whereOf("P3")]).toEqual(["Inside the factory", "Outside: sub-basin", "Outside: basin"]);
  });
  it("projects and opportunities take where from their pillar", () => {
    for (const r of rows()) {
      const pillar = r.projectId ? projects.find((p) => p.id === r.projectId)!.pillar : r.opportunityId ? opportunities.find((o) => o.id === r.opportunityId)!.pillar : "P1";
      expect(r.where).toBe(whereOf(pillar));
    }
  });
  it("count line omits empty locations", () => {
    expect(whereCountLine([{ where: "Outside: basin" }, { where: "Inside the factory" }, { where: "Inside the factory" }])).toBe("2 Inside the factory, 1 Outside: basin");
  });
});

describe("site measurement rows", () => {
  const sites = getSites(brand);
  it("three per factory, one per P1 cell, read from the grid", () => {
    for (const s of sites) {
      const r = siteMeasurementRows(s);
      expect(r).toHaveLength(3);
      const p1 = s.pwi.cells.filter((c) => c.pillar === "P1");
      expect(r.map((x) => x.score)).toEqual(p1.map((c) => c.score));
      expect(r.every((x) => x.kind === "Site measurement" && x.stage === "Measured on site" && x.where === "Inside the factory" && !x.forecast)).toBe(true);
    }
  });
  it("F12 availability shows delivered of target and the breakdown", () => {
    const f12 = siteMeasurementRows(sites.find((s) => s.id === "F12")!).find((r) => r.id.endsWith("Availability"))!;
    expect(f12.delivered).toMatch(/ of /);
    expect(f12.breakdown!.map((b) => b.label)).toEqual(["Recycled", "Reclaimed grey water", "On-site recharge"]);
  });
  it("a cell with no delivered amount says so plainly", () => {
    const none = sites.flatMap(siteMeasurementRows).filter((r) => r.delivered === "Measurements not recorded in the demo");
    for (const r of none) expect(r.value).toBe("Score only, measurements not recorded in the demo");
  });
  it("supplierInitiatives adds them in factory order, and changes no Impact figure (R1)", () => {
    const all = rows();
    expect(all.filter((r) => r.kind === "Site measurement")).toHaveLength(3 * sites.length);
    expect(all.map((r) => r.factoryId)).toEqual([...all.map((r) => r.factoryId)].sort());
    expect(initiativeCounts(all)["Measured on site"]).toBe(3 * sites.length);
    expect(supplierInitiatives(brand, S1, {}, {}).some((r) => r.kind === "Site measurement")).toBe(false);
    const before = JSON.stringify(buildImpact(sites, defaultBaseline(), {}).quantity);
    rows();
    expect(JSON.stringify(buildImpact(sites, defaultBaseline(), {}).quantity)).toBe(before);
  });
});
