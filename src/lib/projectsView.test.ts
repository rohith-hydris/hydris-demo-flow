import { describe, expect, it } from "vitest";
import { cellScores, removals } from "@/src/data/cells";
import { f12Example } from "@/src/data/f12Example";
import { factories } from "@/src/data/factories";
import { opportunities } from "@/src/data/opportunities";
import { scenarios } from "@/src/data/scenarios";
import { rankOpportunities } from "./catalogue";
import { buildImpact, defaultBaseline } from "./impactView";
import { buildFactoryPwi } from "./pwi";
import { buildBusinessCase, catalogueCard, compareRows, deliveryRows, lineageStates, overlapLine } from "./projectsView";
import { evaluateScenario } from "./scenarios";
import { getSites } from "./selectors";
import { scopeFor } from "./scope";

const site = () => buildFactoryPwi(factories.find((f) => f.id === "F12")!, cellScores.find((c) => c.factoryId === "F12")!, removals.find((r) => r.factoryId === "F12")!, f12Example);
const run = (items: string[]) => evaluateScenario(site(), 110000, items);
const items = (id: string) => scenarios.find((s) => s.id === id)!.items;

describe("Phase E: catalogue cards", () => {
  const ranked = rankOpportunities(opportunities);
  const cards = ranked.map(catalogueCard);
  it("orders C, D, B, E, A, F, then ineligible G", () => {
    expect(cards.map((c) => c.id)).toEqual(["OPP-C", "OPP-D", "OPP-B", "OPP-E", "OPP-A", "OPP-F", "OPP-G"]);
  });
  it("OPP-G is ineligible and names the failed gates", () => {
    const g = cards[6];
    expect(g.eligible).toBe(false);
    expect(g.weighted).toBeCloseTo(4.45, 10);
    expect(g.failedGates.map((x) => x.label)).toEqual(["Hydrologically connected", "Collective-action eligibility"]);
    expect(g.suitability).toContain("hydrologically connected (Fail)");
  });
  it("every card has suitability, outcome, cost, timing, measurement and five reasons", () => {
    for (const c of cards) {
      expect([c.suitability, c.outcome, c.cost, c.timing, c.measurement].every((t) => t.length > 0)).toBe(true);
      expect(c.reasons).toHaveLength(5);
    }
    expect(cards[0].outcome).toContain("+600 people");
    expect(cards[1].cost).toContain("savings ₹9 lakh/yr");
  });
});

describe("Phase E: scenario comparison and business case", () => {
  it("compare rows keep quantity, each pollutant and access apart", () => {
    const rows = compareRows([run([]), run(items("S1"))]);
    expect(rows.map((r) => r.label)).toEqual(expect.arrayContaining(["Quantity added", "Quality added: TSS", "Quality added: TN", "Quality added: TP", "Access added"]));
    const get = (l: string) => rows.find((r) => r.label === l)!.values;
    expect(get("Site PWI forecast (low value)")).toEqual(["69.8% (69.8%)", "81.6% (78.6%)"]);
    expect(get("Payback")).toEqual(["n/a", "No financial payback"]);
    expect(get("Access added")).toEqual(["None", "+600 people"]);
  });
  it("shows the shared-water line only when D and E are both chosen", () => {
    expect(overlapLine(run(items("S2")))).toBe("Shared water reconciled: -2,500 m³/yr");
    expect(overlapLine(run(["OPP-D"]))).toBeNull();
  });
  it("business case for S1 is a draft, covers all sections and adds stewardship value when there is no payback", () => {
    const s1 = scenarios.find((s) => s.id === "S1")!;
    const alts = ["S2", "S3"].map((id) => ({ id, name: id, result: run(items(id)) }));
    const bc = buildBusinessCase(s1, run(items("S1")), run([]), alts, "Ambattur Denim Unit");
    expect(bc.note).toBe("Draft for review. Demo estimates.");
    const heads = bc.sections.map((x) => x.heading);
    expect(heads).toEqual(expect.arrayContaining(["Scope", "Alternatives compared", "Funding needs", "Operating and monitoring costs", "Assumptions", "Risks", "Responsibilities", "Timing", "Uncertainty"]));
    expect(heads).toContain("Stewardship value (no financial payback)");
    expect(bc.sections.find((x) => x.heading === "Funding needs")!.lines[0]).toContain("₹205 lakh");
    expect(bc.sections.every((x) => x.cites.length > 0)).toBe(true);
  });
  it("S2 business case has no stewardship-value fallback because it pays back", () => {
    const s2 = scenarios.find((s) => s.id === "S2")!;
    const bc = buildBusinessCase(s2, run(items("S2")), run([]), [], "Ambattur Denim Unit");
    expect(bc.sections.map((x) => x.heading)).not.toContain("Stewardship value (no financial payback)");
  });
});

describe("Phase E: delivery baseline and lineage", () => {
  it("approved S1 shows measured to date as zero and never as Measured", () => {
    const rows = deliveryRows(run(items("S1")), 0.698);
    expect(rows[0]).toMatchObject({ label: "Site PWI", forecast: "81.6%" });
    expect(rows.slice(1).every((r) => r.measured.startsWith("0"))).toBe(true);
  });
  it("impact forecast follows the approved baseline", () => {
    const sites = getSites(scopeFor("brand")).filter((s) => s.id === "F12");
    const forecastOf = (b: { id: string; items: string[] }) => buildImpact(sites, b).outcomes.filter((o) => o.state === "Forecast").map((o) => o.project ?? o.outcome);
    expect(buildImpact(sites).outcomes.filter((o) => o.state === "Forecast")).toHaveLength(3);
    expect(forecastOf({ id: "S2", items: items("S2") })).toHaveLength(2);
    expect(defaultBaseline().id).toBe("S1");
  });
  it("lineage advances with import, scenario and approval", () => {
    expect(lineageStates(false, false, false)).toEqual(["done", "next", "pending", "pending", "pending", "pending"]);
    expect(lineageStates(true, true, false)).toEqual(["done", "done", "done", "next", "pending", "pending"]);
    expect(lineageStates(true, true, true)).toEqual(["done", "done", "done", "done", "done", "next"]);
  });
});
