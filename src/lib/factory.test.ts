import { describe, expect, it } from "vitest";
import { projects } from "@/src/data/projects";
import { fmtCellScore, fmtPct1, fmtScore3 } from "./format";
import { GUIDE_CAPTION, guideDetail, ledgerFor, METHOD_VERSION, priorMonthSitePwi, waterBalance } from "./impact";
import { explainRisk } from "./riskCopy";
import { fmtClaim, fmtMeasure } from "./measure";
import { whyThisRank } from "./explain";
import { FACTORY_TABS, factoryHref, parseFactoryTab } from "./factoryTabs";
import { getSite, getSites } from "./selectors";
import { scopeFor } from "./scope";
import { cellDetail, traceCell, traceConfidence, traceFootprint, tracePillar, traceProject, traceRisk, traceSitePwi, traceVolumetric } from "./trace";

const brand = scopeFor("brand");
const supplier = scopeFor("supplier");
const site = (id: string) => getSite(brand, id)!;

describe("F12 impact grid matches PRODUCT 5.8 exactly", () => {
  const f12 = site("F12");
  const cell = (p: string, d: string) => f12.pwi.cells.find((c) => c.pillar === p && c.dimension === d)!;
  const row = (p: string, d: string) => {
    const c = cell(p, d);
    const det = cellDetail(c);
    return [`${p} ${d}`, det.target, det.delivered, fmtCellScore(c.score), c.grade, c.state];
  };

  // Target, delivered (counted), score, evidence grade, state: the nine rows of the 5.8 table.
  it.each([
    [["P1 Availability", "22,000 m³", "21,000 m³", "0.955", "B", "Scored"], ["P1", "Availability"]],
    [["P2 Availability", "44,000 m³", "35,000 m³", "0.795", "B", "Partially scored"], ["P2", "Availability"]],
    [["P3 Availability", "44,000 m³", "25,000 m³", "0.568", "B", "Scored"], ["P3", "Availability"]],
    [["P1 Accessibility", "1,200 people", "1,200 people", "1.00", "B", "Scored"], ["P1", "Accessibility"]],
    [["P2 Accessibility", "1,740 people", "1,500 people", "0.862", "B", "Scored"], ["P2", "Accessibility"]],
    [["P3 Accessibility", "1,740 people", "900 people", "0.517", "C", "Low confidence"], ["P3", "Accessibility"]],
    [["P1 Quality", "TSS 90% · TN 90% · TP 90%", "TSS 92.5% · TN 75% · TP 80%", "0.907", "A", "Scored"], ["P1", "Quality"]],
    [["P2 Quality", "3,000 / 450 / 75 kg (TSS / TN / TP)", "2,500 / 200 / 40 kg (TSS / TN / TP)", "0.604", "B", "Scored"], ["P2", "Quality"]],
    [["P3 Quality", "3,000 / 450 / 75 kg (TSS / TN / TP)", "0 / 0 / 0 kg (TSS / TN / TP)", "0.00", "none", "Missing input"], ["P3", "Quality"]],
  ] as const)("%j", (expected, [p, d]) => {
    expect(row(p, d)).toEqual(expected);
  });

  it("central pillars 0.954 / 0.758 / 0.382, Site PWI 69.8%, volumetric balance 73.6%; counted 68.3% (grade C on P3 Accessibility is a demo choice)", () => {
    expect([f12.pwi.pillarsCentral.P1, f12.pwi.pillarsCentral.P2, f12.pwi.pillarsCentral.P3].map(fmtScore3)).toEqual(["0.954", "0.758", "0.382"]);
    expect(fmtPct1(f12.pwi.sitePwiCentral)).toBe("69.8%");
    expect(fmtPct1(f12.pwi.volumetricBalanceCentral)).toBe("73.6%");
    expect(fmtPct1(f12.pwi.sitePwi)).toBe("68.3%");
    expect(f12.pwi.statusBand).toBe("In progress");
    expect(f12.pwi.confidence).toBe(0.78);
  });

  it("Guide-compatible toggle: 70.7% with P1 Quality scored as 1.0, against 69.8% for PWI-M 1.0", () => {
    expect(fmtPct1(f12.pwi.guide!.sitePwi)).toBe("70.7%");
    expect(fmtScore3(f12.pwi.guide!.p1)).toBe("0.982");
    expect(fmtPct1(f12.pwi.sitePwiCentral)).toBe("69.8%");
    expect(METHOD_VERSION).toBe("PWI-M 1.0");
    expect(GUIDE_CAPTION).toBe("Shows the effect of the proposed PWI-M 1.0 corrections. Reconciliation of the 20 source issues is pending.");
    expect(GUIDE_CAPTION).not.toMatch(/corrects 20|resolved/i);
  });

  it("Guide detail: 63,450 of 70,500 kg removed is 90.0%, hiding TN removal of 75%", () => {
    const g = guideDetail("F12")!;
    expect([g.removedKg, g.totalKg]).toEqual([63450, 70500]);
    expect(fmtPct1(g.massShare)).toBe("90.0%");
    expect(g.weakest).toEqual({ pollutant: "TN", removalPct: 75 });
    expect(guideDetail("F01")).toBeNull();
  });

  it("water balance: withdrawal 250,000, compliant discharge 140,000, RN 110,000, by source", () => {
    const w = waterBalance("F12")!;
    expect([w.withdrawalM3, w.basinDischargeM3, w.replenishmentNeededM3]).toEqual([250000, 140000, 110000]);
    expect(w.bySource.map((s) => [s.label, s.m3])).toEqual([["Municipal", 120000], ["Groundwater", 90000], ["Rainwater used", 10000], ["Third-party", 30000], ["Condensate", 0]]);
    expect(waterBalance("F01")).toBeNull();
  });

  it("ledger, newest first: LE-2347 (Draft), LE-2291 (Verified), LE-1880 (Audited, Locked); prior month 70.3%", () => {
    expect(ledgerFor("F12").map((l) => [l.id, l.periodStatus])).toEqual([["LE-2347", "Draft"], ["LE-2291", "Verified"], ["LE-1880", "Locked"]]);
    expect(fmtPct1(priorMonthSitePwi("F12")!)).toBe("70.3%");
    expect(ledgerFor("F01")).toEqual([]);
    expect(priorMonthSitePwi("F01")).toBeNull();
  });

  it("every cell below 1.0 has gap text; the 1.00 cell has none", () => {
    expect(f12.pwi.cells.filter((c) => c.gap === null).map((c) => `${c.pillar} ${c.dimension}`)).toEqual(["P1 Accessibility"]);
  });
});

describe("Why this rank (PRODUCT 4.4)", () => {
  const all = getSites(brand);

  it("F12: the exact sentence from the spec", () => {
    expect(whyThisRank(site("F12"), all)).toBe(
      "Ranked 1 of 14. It sits in Band 1 (R 0.84, at or above 0.60) and has the largest water footprint in the band (I 0.91). Quadrant: Act now.",
    );
  });

  it("F02 has the 2nd largest footprint of 8 in Band 1", () => {
    expect(whyThisRank(site("F02"), all)).toContain("Ranked 2 of 14.");
    expect(whyThisRank(site("F02"), all)).toContain("has the 2nd largest water footprint of 8 in the band (I 0.88)");
  });

  it("Band 2 and Band 3 use their own R ranges", () => {
    expect(whyThisRank(site("F05"), all)).toContain("Band 2 (R 0.58, from 0.40 up to 0.60)");
    expect(whyThisRank(site("F05"), all)).toContain("Quadrant: Reduce footprint.");
    expect(whyThisRank(site("F08"), all)).toContain("Band 3 (R 0.32, below 0.40)");
    expect(whyThisRank(site("F08"), all)).toContain("Ranked 14 of 14");
  });

  it("a supplier is ranked among its own factories: F14 is 2 of 3", () => {
    const own = getSites(supplier);
    expect(whyThisRank(getSite(supplier, "F14")!, own)).toBe(
      "Ranked 2 of 3. It sits in Band 1 (R 0.61, at or above 0.60) and has the 2nd largest water footprint of 3 in the band (I 0.58). Quadrant: Act now.",
    );
  });
});

describe("risk card text (PRODUCT 4.4)", () => {
  const explain = (id: string, code: string) => {
    const s = site(id);
    return explainRisk(s.risks.find((r) => r.code === code)!, s);
  };

  it("F01 water stress is Watch with its threshold position, outlook and raw value", () => {
    const e = explain("F01", "bws");
    expect(e.headline).toBe("This risk is worth watching at this site.");
    expect(e.reason).toBe("The score of 2.09 out of 5 is from 2.00 up to 3.00.");
    expect(e.threshold).toBe("0.91 below the Present line (3.00) and 0.09 above the Watch line (2.00).");
    expect(e.whatWouldChange).toContain("Present if the score rose by 0.91 or more");
    expect(e.outlook).toBe("2050 outlook: the water stress score moves from 2.09 to 2.59 (up 0.50).");
    expect(e.caveats).toContain("Raw value: 20.9%.");
    expect(e.vintage).toBe("Aqueduct 4.0");
  });

  it("F01 drought is Present, ~2014 data, no outlook", () => {
    const e = explain("F01", "drr");
    expect(e.headline).toBe("This risk is present at this site.");
    expect(e.threshold).toBe("1.05 above the Present line (3.00).");
    expect(e.whatWouldChange).toBe("It would drop to Watch if the score fell by more than 1.05.");
    expect(e.outlook).toBeNull();
    expect(e.vintage).toBe("About 2014");
    expect(e.caveats).toContain("Raw value: 0.81.");
  });

  it("a score exactly on the Present line drops with any fall", () => {
    expect(explain("F01", "iav").threshold).toBe("Exactly on the Present line (3.00).");
    expect(explain("F01", "iav").whatWouldChange).toBe("It would drop to Watch with any fall in the score.");
  });

  it("F01 textile composite: Extremely High, and not used in R", () => {
    const e = explain("F01", "tex");
    expect(e.headline).toBe("Overall water risk for textile sites is Extremely High.");
    expect(e.caveats.join(" ")).toContain("not used in R");
  });

  it("country-level risks carry the spec note; ucw is always Watch", () => {
    expect(explain("F01", "rri").caveats).toContain("Country-level, identical across sites, not used for within-country ranking.");
    const u = explain("F12", "ucw");
    expect(u.reason).toContain("Always shown as Watch");
    expect(u.whatWouldChange).toBe("It stays Watch whatever the score.");
  });

  it("coastal eutrophication is flagged as separate and out of the counts", () => {
    expect(explain("F01", "cep").caveats.join(" ")).toContain("left out of the Present and Watch counts");
  });

  it("only water stress has an outlook (the data holds only the 2050 score)", () => {
    for (const code of ["bwd", "iav", "sev", "gtd", "drr"]) expect(explain("F12", code).outlook).toBeNull();
    expect(explain("F12", "bws").outlook).toContain("from 4.75 to 5.00");
  });
});

describe("traceability drawer content (PRODUCT 1, DESIGN 4.12)", () => {
  const f12 = site("F12");

  it("Site PWI: value, formula, inputs, method PWI-M 1.0 and grade", () => {
    const t = traceSitePwi(f12);
    expect(t.title).toBe("Site PWI (counted)");
    expect(t.value).toBe("68.3%");
    expect(t.formula[0]).toBe("Site PWI = (P1 + P2 + P3) ÷ 3, from counted cell scores");
    expect(t.inputs.map((i) => [i.label, i.value])).toEqual([
      ["P1, site (counted)", "0.954"], ["P2, sub-basin (counted)", "0.758"], ["P3, basin (counted)", "0.336"],
      ["Site PWI, central", "69.8%"], ["Site confidence", "0.78"],
    ]);
    expect(t.method).toEqual({ name: "Positive Water Impact", version: "PWI-M 1.0" });
    expect(t.grade!.grade).toBe("B");
  });

  it("pillar, cell and volumetric traces carry their inputs", () => {
    expect(tracePillar(f12, "P2").value).toBe("0.758");
    expect(tracePillar(f12, "P2").inputs.map((i) => i.value)).toEqual(["0.795", "0.862", "0.604"]);
    const c = traceCell(f12, f12.pwi.cells.find((x) => x.pillar === "P2" && x.dimension === "Availability")!);
    expect(c.value).toBe("0.795");
    expect(c.inputs.map((i) => i.cite)).toContain("PRJ-101");
    expect(c.inputs.map((i) => i.label).join("|")).toContain("Desilting");
    expect(traceVolumetric(f12).value).toBe("73.6%");
  });

  it("R lists the five pillars with weights; I and confidence are traceable", () => {
    const t = traceRisk(f12);
    expect(t.value).toBe("0.84");
    expect(t.inputs).toHaveLength(5);
    expect(t.inputs[0]).toMatchObject({ label: "Scarcity (weight 0.30)", value: "0.95" });
    expect(traceFootprint(f12).value).toBe("0.91");
    expect(traceConfidence(f12).value).toBe("0.78");
    expect(traceConfidence(f12).note).toBe("Net Positive claims need external assurance.");
  });

  it("project benefit: PRJ-103 counts 25,000 m³ with a low value of 21,250 m³", () => {
    const t = traceProject(projects.find((p) => p.id === "PRJ-103")!);
    expect(t.value).toBe("25,000 m³");
    expect(t.inputs.find((i) => i.label === "Claimed")!.value).toBe("50,000 m³");
    expect(t.inputs.find((i) => i.label === "Attribution share f")!.value).toBe("50%");
    expect(t.inputs.find((i) => i.label === "Low value")!.value).toBe("21,250 m³");
    expect(t.grade!.grade).toBe("B");
  });

  it("a flagged project counts nothing", () => {
    expect(traceProject(projects.find((p) => p.id === "PRJ-201")!).value).toBe("0 m³");
  });
});

describe("number formatting for the grid", () => {
  it("cell scores show 2 decimals, or 3 where the PRD shows 3", () => {
    expect(["0.955", "0.8", 1, 0, 0.9074].map((v) => fmtCellScore(Number(v)))).toEqual(["0.955", "0.80", "1.00", "0.00", "0.907"]);
  });
  it("measures and claims", () => {
    expect(fmtMeasure({ kind: "volume", m3: 110000 })).toBe("110,000 m³");
    expect(fmtClaim({ unit: "kg", tss: 2500, tn: 200, tp: 40 })).toBe("2,500 / 200 / 40 kg");
    expect(fmtClaim({ unit: "people", value: 1500 })).toBe("1,500 people");
  });
});

describe("factory tabs (PRODUCT 3, 4.4)", () => {
  it("has the five tabs in order and defaults to overview", () => {
    expect(FACTORY_TABS.map((t) => t.id)).toEqual(["overview", "risk", "impact", "projects", "evidence"]);
    expect(parseFactoryTab(null)).toBe("overview");
    expect(parseFactoryTab("nonsense")).toBe("overview");
    expect(parseFactoryTab("impact")).toBe("impact");
  });
  it("builds links with ?tab= only for non-default tabs", () => {
    expect(factoryHref("F12")).toBe("/factories/F12");
    expect(factoryHref("F12", "impact")).toBe("/factories/F12?tab=impact");
  });
});
