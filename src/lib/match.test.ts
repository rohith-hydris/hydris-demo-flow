import { describe, expect, it } from "vitest";
import { scripts, technologies, type Technology } from "@/src/data/copilotScripts";
import { MATCH_WEIGHTS, blockersFor, filterPlants, matchPlants, matchScore, type PlantProfile } from "./match";
import { scopeFor } from "./scope";
import { getSites } from "./selectors";
import { buildAnswer, copilotScope, type ResolvedBlock } from "./copilot";
import { makeTokenCtx } from "./tokens";

const tech = (id: string) => technologies.find((t) => t.id === id)!;
const plant = (over: Partial<PlantProfile> = {}): PlantProfile => ({
  id: "P", name: "Test plant", processes: ["Dyeing"], effluentProfile: "Reactive dye", etpType: "Primary + biological", etpFlowM3PerDay: 400, ...over,
});
const T: Technology = { ...tech("ec"), processes: ["Dyeing"], effluentProfiles: ["Reactive dye"], etpTypes: ["Primary + biological"], minFlowM3: 200, maxFlowM3: 600 };

describe("match score weights (PRODUCT 6.10)", () => {
  it("stay 0.35 / 0.30 / 0.20 / 0.15 and sum to 1", () => {
    expect(MATCH_WEIGHTS).toEqual({ technicalFit: 0.35, expectedBenefit: 0.3, operationalStability: 0.2, dataQuality: 0.15 });
    expect(Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
  it("the scores are unchanged: 0.80, 0.73 and 0.70", () => {
    expect(technologies.map((t) => Math.round(matchScore(t) * 100) / 100)).toEqual([0.8, 0.73, 0.7]);
  });
});

describe("hard filters (issue B7)", () => {
  it("a plant inside every filter is eligible", () => {
    expect(blockersFor(T, plant())).toEqual([]);
    expect(filterPlants(T, [plant()])).toMatchObject({ eligible: [{ id: "P" }], nearMisses: [] });
  });

  it("a plant outside the flow range is a near miss with the reason capacity, above or below", () => {
    const high = filterPlants(T, [plant({ etpFlowM3PerDay: 700 })]);
    expect(high.eligible).toEqual([]);
    expect(high.nearMisses).toHaveLength(1);
    expect(high.nearMisses[0].blocker.reason).toBe("capacity");
    expect(high.nearMisses[0].blocker.detail).toBe("flow 700 m³/day is above the 600 m³/day maximum");
    const low = filterPlants(T, [plant({ etpFlowM3PerDay: 100 })]);
    expect(low.nearMisses[0].blocker).toEqual({ reason: "capacity", detail: "flow 100 m³/day is below the 200 m³/day minimum" });
  });

  it("the flow range is inclusive at both ends", () => {
    expect(filterPlants(T, [plant({ etpFlowM3PerDay: 200 }), plant({ etpFlowM3PerDay: 600 })]).eligible).toHaveLength(2);
  });

  it("each other filter names its own blocker", () => {
    const reason = (p: PlantProfile) => filterPlants(T, [p]).nearMisses[0]?.blocker.reason;
    expect(reason(plant({ processes: ["Washing"] }))).toBe("process");
    expect(reason(plant({ effluentProfile: "Light wash" }))).toBe("effluent profile");
    expect(reason(plant({ etpType: "Primary only" }))).toBe("ETP type");
  });

  it("a plant that fails two filters is neither eligible nor a near miss", () => {
    const r = filterPlants(T, [plant({ etpFlowM3PerDay: 900, etpType: "Primary only" })]);
    expect(r).toEqual({ eligible: [], nearMisses: [] });
  });

  it("matchScore is computed only for eligible plants; a near miss carries its blocker and no score", () => {
    const r = matchPlants(T, [plant({ id: "A" }), plant({ id: "B", etpFlowM3PerDay: 900 })]);
    expect(r.eligible.map((e) => [e.plant.id, e.match])).toEqual([["A", matchScore(T)]]);
    expect(r.nearMisses.map((m) => [m.plant.id, m.blocker.reason])).toEqual([["B", "capacity"]]);
    expect(r.nearMisses[0]).not.toHaveProperty("match");
  });

  it("the demo technologies carry the new filter fields", () => {
    for (const t of technologies) {
      expect(t.processes.length).toBeGreaterThan(0);
      expect(t.effluentProfiles.length).toBeGreaterThan(0);
      expect(t.etpTypes.length).toBeGreaterThan(0);
      expect(t.minFlowM3).toBeLessThan(t.maxFlowM3);
    }
  });
});

describe("the 14 plants against the demo technologies", () => {
  const sites = getSites(scopeFor("brand"));
  it("every plant carries the attributes", () => {
    for (const s of sites) {
      expect(s.processes.length).toBeGreaterThan(0);
      expect(s.effluentProfile.length).toBeGreaterThan(0);
      expect(s.etpType.length).toBeGreaterThan(0);
      expect(s.etpFlowM3PerDay).toBeGreaterThan(0);
    }
  });
  it("Karur Finishing Works (F04) passes the hard filters for all three technologies", () => {
    const f04 = sites.filter((s) => s.id === "F04");
    for (const t of technologies) expect(filterPlants(t, f04).eligible).toHaveLength(1);
  });
  it("Tiruppur Mill (620 m³/day) is a capacity near miss for electrocoagulation, and Avinashi Road Dye House (900) for tertiary polishing", () => {
    const miss = (id: string, sid: string) => filterPlants(tech(id), sites).nearMisses.find((m) => m.plant.id === sid)?.blocker.reason;
    expect(miss("ec", "F01")).toBe("capacity");
    expect(miss("tertiary", "F02")).toBe("capacity");
  });
});

describe("C6 copilot match block", () => {
  it("scores the technologies the target plant is eligible for, and lists near misses with their blocker", () => {
    const a = buildAnswer(scripts.find((x) => x.id === "C6")!, makeTokenCtx(copilotScope("brand")));
    const t = a.blocks.find((b) => b.kind === "techTable") as Extract<ResolvedBlock, { kind: "techTable" }>;
    expect([t.passed, t.of]).toEqual([3, 3]);
    expect(t.rows).toHaveLength(3);
    expect(t.nearMisses.length).toBeGreaterThan(0);
    expect(t.nearMisses).toContainEqual({
      technology: "Electrocoagulation retrofit", plant: "Tiruppur Mill", reason: "capacity", detail: "flow 620 m³/day is above the 600 m³/day maximum",
    });
    expect(t.nearMisses.every((m) => m.reason.length > 0 && m.detail.length > 0)).toBe(true);
  });
});
