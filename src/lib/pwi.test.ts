import { describe, expect, it } from "vitest";
import { cellScores, removals } from "@/src/data/cells";
import { f12Example } from "@/src/data/f12Example";
import { factories } from "@/src/data/factories";
import { pct1, round } from "./format";
import {
  buildFactoryPwi, cellScore, cellTargets, countedValue, internalStatusBand, guideP1Quality, lowValue, p1Quality, pillarScore, replenishmentNeeded,
  sitePwi, volumetricBalance,
} from "./pwi";
import { siteChecks } from "./specCheckValues";

const pwiOf = (id: string) =>
  buildFactoryPwi(
    factories.find((f) => f.id === id)!, cellScores.find((c) => c.factoryId === id)!, removals.find((r) => r.factoryId === id)!,
    id === "F12" ? f12Example : null,
  );

describe("formulas (PRODUCT 6.1 to 6.5)", () => {
  it("cell score is min(1, B / T)", () => {
    expect(cellScore(21000, 22000).score).toBeCloseTo(0.9545, 4);
    expect(cellScore(30000, 22000).score).toBe(1);
    expect(cellScore(0, 22000).score).toBe(0);
  });

  it("a zero target never scores 1.0 on its own (V2 4.1)", () => {
    const missing = cellScore(5, 0);
    expect(missing).toMatchObject({ score: null, rollup: 0, excluded: false, flagged: true, label: "Missing input" });
    expect(cellScore(5, 0, "Defined").rollup).not.toBe(1);
  });

  it("Not applicable drops out of the pillar and the other weights renormalise", () => {
    const na = cellScore(0, 0, "Not applicable");
    expect(na).toMatchObject({ score: null, rollup: null, excluded: true, flagged: true, proposed: true });
    // A = 0.8, W = 0.6, Q excluded: (0.4 x 0.8 + 0.3 x 0.6) / 0.7
    expect(pillarScore(0.8, 0.6, na.rollup)).toBeCloseTo((0.4 * 0.8 + 0.3 * 0.6) / 0.7, 12);
  });

  it("Demonstrated zero scores 1.0 with an evidence requirement and the proposed badge", () => {
    expect(cellScore(0, 0, "Demonstrated zero")).toMatchObject({ score: 1, rollup: 1, flagged: true, needsEvidence: true, proposed: true });
  });

  it("Missing rolls up as 0 inside a pillar", () => {
    expect(pillarScore(0.9, 0.8, cellScore(0, 0).rollup)).toBeCloseTo(0.4 * 0.9 + 0.3 * 0.8, 12);
  });

  it("every cell carries a defined target state", () => {
    for (const c of buildFactoryPwi(factories[11], cellScores[11], removals[11], f12Example).cells) expect(c.targetState).toBe("Defined");
  });

  it("P1 Quality averages per-pollutant scores: F12 is 0.907, so TN cannot be hidden by TSS", () => {
    expect(round(p1Quality({ tss: 92.5, tn: 75, tp: 80 }), 3)).toBe(0.907);
    expect(p1Quality({ tss: 100, tn: 0, tp: 100 })).toBeCloseTo(2 / 3, 12);
    expect(p1Quality({ tss: 95, tn: 95, tp: 95 })).toBe(1);
  });

  it("pillar = 0.4 A + 0.3 W + 0.3 Q and site PWI is the mean of the pillars", () => {
    expect(pillarScore(1, 0, 0)).toBeCloseTo(0.4, 12);
    expect(pillarScore(0, 1, 0)).toBeCloseTo(0.3, 12);
    expect(pillarScore(0, 0, 1)).toBeCloseTo(0.3, 12);
    expect(sitePwi(1, 0.5, 0)).toBeCloseTo(0.5, 12);
  });

  it("volumetric balance = 0.2 S_A1 + 0.4 S_A2 + 0.4 S_A3", () => {
    expect(volumetricBalance(1, 0, 0)).toBeCloseTo(0.2, 12);
    expect(volumetricBalance(0, 1, 1)).toBeCloseTo(0.8, 12);
  });

  it("internal status band is checked in order", () => {
    expect(internalStatusBand(0.95, 0.49)).toBe("Low confidence");
    expect(internalStatusBand(1.0, 0.75)).toBe("Self-certified");
    expect(internalStatusBand(0.8, 0.75)).toBe("Conditional");
    expect(internalStatusBand(0.8, 0.74)).toBe("In progress");
    expect(internalStatusBand(0.6, 0.5)).toBe("In progress");
    expect(internalStatusBand(0.59, 0.9)).toBe("Not achieved");
  });

  it("grade factors: B gives 21,250 from 25,000 and C gives 8,400 from 12,000; D scores zero", () => {
    expect(lowValue(25000, "B")).toBe(21250);
    expect(lowValue(12000, "C")).toBeCloseTo(8400, 6);
    expect(lowValue(1, "D")).toBe(0);
    expect(lowValue(1, "none")).toBe(0);
  });
});

describe("check values for all 14 sites (PRODUCT 5.5)", () => {
  describe.each(siteChecks)("$id", (c) => {
    const p = pwiOf(c.id);
    it(`pillars P1 ${c.P1}, P2 ${c.P2}, P3 ${c.P3}`, () => {
      expect([p.pillarsCentral.P1, p.pillarsCentral.P2, p.pillarsCentral.P3].map((x) => round(x, 3))).toEqual([c.P1, c.P2, c.P3]);
    });
    it(`Site PWI ${c.pwi}%`, () => expect(pct1(p.sitePwiCentral)).toBe(c.pwi));
    it(`volumetric balance ${c.volumetric}%`, () => expect(pct1(p.volumetricBalanceCentral)).toBe(c.volumetric));
    it(`internal status band ${c.cert} from central scores`, () => expect(internalStatusBand(p.sitePwiCentral, p.confidence)).toBe(c.cert));
  });
});

describe("evidence grade rule applied to counted values (PRODUCT 6.5)", () => {
  it("countedValue: A and B give central, C gives the low value, D and none give zero", () => {
    expect(countedValue(0.8, "A")).toBe(0.8);
    expect(countedValue(0.8, "B")).toBe(0.8);
    expect(countedValue(12000, "C")).toBeCloseTo(8400, 6);
    expect(countedValue(0.8, "D")).toBe(0);
    expect(countedValue(0.8, "none")).toBe(0);
  });

  it("F09 (grade C) counts 70% of its central PWI, so its band becomes Not achieved", () => {
    const p = pwiOf("F09");
    expect(internalStatusBand(p.sitePwiCentral, p.confidence)).toBe("In progress");
    expect(p.sitePwi).toBeCloseTo(0.7 * p.sitePwiCentral, 12);
    expect(p.statusBand).toBe("Not achieved");
  });

  it("grade A and B sites are unchanged: counted equals central", () => {
    for (const f of factories.filter((x) => (x.evidenceGrade === "A" || x.evidenceGrade === "B") && x.id !== "F12")) {
      const p = pwiOf(f.id);
      expect(p.sitePwi).toBeCloseTo(p.sitePwiCentral, 12);
      expect(p.volumetricBalance).toBeCloseTo(p.volumetricBalanceCentral, 12);
      expect(p.pillars).toEqual(p.pillarsCentral);
    }
  });

  it("counted never exceeds central", () => {
    for (const f of factories) {
      const p = pwiOf(f.id);
      expect(p.sitePwi).toBeLessThanOrEqual(p.sitePwiCentral + 1e-12);
    }
  });
});

describe("F12 worked example (PRODUCT 5.8, 6.6)", () => {
  const p = pwiOf("F12");

  it("Site PWI 69.8%, volumetric balance 73.6%, band In progress (central, as in the PRD)", () => {
    expect(pct1(p.sitePwiCentral)).toBe(69.8);
    expect(pct1(p.volumetricBalanceCentral)).toBe(73.6);
    expect(internalStatusBand(p.sitePwiCentral, p.confidence)).toBe("In progress");
  });

  it("with every F12 cell at grade A or B the counted figures equal the PRD's 69.8%, 73.6% and In progress", () => {
    // The demo grades F12 P3 Accessibility C (monitoring check overdue). That is a demo choice and lowers the counted
    // PWI below the PRD's 69.8%. This fixture sets that cell to B so the PRD worked example stays reproducible.
    const fixture = { ...f12Example, cells: f12Example.cells.map((c) => (c.grade === "C" ? { ...c, grade: "B" as const } : c)) };
    const f = factories.find((x) => x.id === "F12")!;
    const q = buildFactoryPwi(f, cellScores.find((c) => c.factoryId === "F12")!, removals.find((r) => r.factoryId === "F12")!, fixture);
    expect(q.cells.every((c) => c.score === 0 || c.grade === "A" || c.grade === "B")).toBe(true);
    expect(pct1(q.sitePwi)).toBe(69.8);
    expect(pct1(q.volumetricBalance)).toBe(73.6);
    expect(q.statusBand).toBe("In progress");
  });

  it("as demoed, the grade C on P3 Accessibility lowers counted PWI below the central 69.8%", () => {
    expect(p.sitePwi).toBeLessThan(p.sitePwiCentral);
    expect(p.cells.find((c) => c.pillar === "P3" && c.dimension === "Accessibility")!.counted).toBeCloseTo(0.7 * p.cells.find((c) => c.pillar === "P3" && c.dimension === "Accessibility")!.score, 12);
    expect(p.volumetricBalance).toBeCloseTo(p.volumetricBalanceCentral, 12); // only an Accessibility cell is grade C
  });

  it("Guide-compatible figure is 70.7% (P1 Quality scored as 1.0 by the mass-sum rule)", () => {
    expect(p.guide).not.toBeNull();
    expect(p.guide!.p1Quality).toBeCloseTo(1, 9);
    expect(round(p.guide!.p1, 3)).toBe(0.982);
    expect(pct1(p.guide!.sitePwi)).toBe(70.7);
  });

  it("mass-sum rule: 63,450 of 70,500 kg removed is 90.0%", () => {
    const { tss, tn, tp } = f12Example.baselineLoadsKg;
    expect(tss + tn + tp).toBe(70500);
    expect(guideP1Quality(f12Example.baselineLoadsKg, { tss: 92.5, tn: 75, tp: 80 })).toBeCloseTo(1, 9);
  });

  it("RN = 250,000 - 140,000 = 110,000 and matches the factory master", () => {
    const rn = replenishmentNeeded(f12Example.baselineWithdrawalM3, f12Example.compliantBasinDischargeM3, f12Example.attributableShare);
    expect(rn).toBe(110000);
    expect(rn).toBe(factories.find((f) => f.id === "F12")!.replenishmentNeededM3);
  });

  it("baseline loads follow from flow and influent concentration (150,000 m3 at 400 / 60 / 10 mg/L)", () => {
    const { etpFlowM3, influentMgPerL, baselineLoadsKg } = f12Example;
    expect(etpFlowM3 * influentMgPerL.tss / 1000).toBe(baselineLoadsKg.tss);
    expect(etpFlowM3 * influentMgPerL.tn / 1000).toBe(baselineLoadsKg.tn);
    expect(etpFlowM3 * influentMgPerL.tp / 1000).toBe(baselineLoadsKg.tp);
  });

  it("withdrawal by source totals 250,000 m3", () => {
    expect(Object.values(f12Example.withdrawalBySourceM3).reduce((a, b) => a + b, 0)).toBe(f12Example.baselineWithdrawalM3);
  });

  it("targets from the 5.9 rules equal the 5.8 targets (22,000 / 44,000 m3 and 1,200 / 1,740 people)", () => {
    const f = factories.find((x) => x.id === "F12")!;
    const t = cellTargets(f.replenishmentNeededM3, f.headcount, f.householdSize);
    expect(t.availability).toEqual({ P1: 22000, P2: 44000, P3: 44000 });
    expect(t.accessibility.P1).toBe(1200);
    expect(round(t.accessibility.P2, 6)).toBe(1740);
  });

  it("entered cell scores S agree with delivered / target from the worked table (within rounding)", () => {
    for (const c of p.cells) {
      const w = f12Example.cells.find((x) => x.pillar === c.pillar && x.dimension === c.dimension)!;
      if (w.target.kind === "volume" && w.delivered.kind === "volume") expect(c.score).toBeCloseTo(w.delivered.m3 / w.target.m3, 2);
      if (w.target.kind === "people" && w.delivered.kind === "people") expect(c.score).toBeCloseTo(w.delivered.count / w.target.count, 2);
      if (w.target.kind === "mass" && w.delivered.kind === "mass") {
        const mean = (w.delivered.tss / w.target.tss + w.delivered.tn / w.target.tn + w.delivered.tp / w.target.tp) / 3;
        expect(c.score).toBeCloseTo(mean, 2);
      }
    }
  });

  it("cell states and grades follow the 5.8 table", () => {
    const cell = (pillar: string, dim: string) => p.cells.find((c) => c.pillar === pillar && c.dimension === dim)!;
    expect(cell("P2", "Availability")).toMatchObject({ state: "Partially scored", grade: "B" });
    expect(cell("P3", "Accessibility")).toMatchObject({ state: "Low confidence", grade: "C" });
    expect(cell("P3", "Quality")).toMatchObject({ state: "Missing input", grade: "none", score: 0 });
    expect(cell("P1", "Quality")).toMatchObject({ state: "Scored", grade: "A" });
  });

  it("gap text exists for every cell below 1.0 and for none at 1.0", () => {
    for (const c of p.cells) expect(c.gap === null).toBe(c.score >= 1);
    expect(p.cells.find((c) => c.pillar === "P3" && c.dimension === "Quality")!.gap).toContain("basin Quality project");
  });

  it("prior month Site PWI was 70.3%, current is 69.8%", () => {
    expect(pct1(f12Example.priorMonthSitePwi)).toBe(70.3);
  });

  it("only F12 carries the Guide-compatible comparison", () => {
    expect(pwiOf("F01").guide).toBeNull();
  });
});

describe("derived cells for the other sites (PRODUCT 5.9)", () => {
  it("delivered benefit B = S x T for Availability and Accessibility cells", () => {
    const p = pwiOf("F01");
    const a2 = p.cells.find((c) => c.pillar === "P2" && c.dimension === "Availability")!;
    expect(a2.target).toEqual({ kind: "volume", m3: 0.4 * 98000 });
    expect(a2.delivered).toMatchObject({ kind: "volume" });
    expect((a2.delivered as { m3: number }).m3).toBeCloseTo(0.7 * 0.4 * 98000, 6); // 27,440 m3, floating-point safe
  });

  it("P1 Quality shows removal percentages, P2 and P3 Quality show the score only", () => {
    const p = pwiOf("F01");
    expect(p.cells.find((c) => c.pillar === "P1" && c.dimension === "Quality")!.delivered).toEqual({ kind: "removal", tss: 91, tn: 78, tp: 82 });
    expect(p.cells.find((c) => c.pillar === "P2" && c.dimension === "Quality")!.delivered).toBeNull();
  });

  it("every cell of a site carries the site's evidence grade, except zero-score cells which have none", () => {
    const p = pwiOf("F04");
    for (const c of p.cells) expect(c.grade).toBe(c.score === 0 ? "none" : "B");
  });

  it("a cell with a score of 0 is Missing input (F02, F06, F12 P3 Quality)", () => {
    for (const id of ["F02", "F06", "F12"]) {
      expect(pwiOf(id).cells.find((c) => c.pillar === "P3" && c.dimension === "Quality")!.state).toBe("Missing input");
    }
  });

  it("F06 shows Low confidence on every scored cell", () => {
    const states = pwiOf("F06").cells.filter((c) => c.score > 0).map((c) => c.state);
    expect(new Set(states)).toEqual(new Set(["Low confidence"]));
  });

  it("F13 P2 Availability is Low confidence; F01 P3 Availability and F02 P2 Availability are Partially scored", () => {
    const state = (id: string, pillar: string, dim: string) => pwiOf(id).cells.find((c) => c.pillar === pillar && c.dimension === dim)!.state;
    expect(state("F13", "P2", "Availability")).toBe("Low confidence");
    expect(state("F01", "P3", "Availability")).toBe("Partially scored");
    expect(state("F02", "P2", "Availability")).toBe("Partially scored");
    expect(state("F01", "P2", "Availability")).toBe("Scored");
  });

  it("the low value never exceeds the central value", () => {
    for (const f of factories) {
      const p = pwiOf(f.id);
      expect(p.sitePwiLow).toBeLessThanOrEqual(p.sitePwi + 1e-12);
      for (const c of p.cells) expect(c.low).toBeLessThanOrEqual(c.score + 1e-12);
    }
  });
});
