import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { opportunities } from "@/src/data/opportunities";
import { projects } from "@/src/data/projects";
import { projectBenefit } from "./claims";
import { buildImpact, defaultBaseline } from "./impactView";
import { brandAmountText, brandFundingCell, opportunityBrandShare, outsideBrandSummary, projectBrandShare, supplierInitiatives, WHERE_ORDER } from "./initiatives";
import { allocationConflictText, totalAllocation, totalFunding } from "./shared";
import { getSites, getSupplierInitiatives } from "./selectors";
import { scopeFor } from "./scope";
import baseline from "./regression.baseline.json";

const brand = scopeFor("brand");
const opp = (id: string) => opportunities.find((o) => o.id === id)!;
const prj = (id: string) => projects.find((p) => p.id === id)!;
const rows = () => getSupplierInitiatives(brand, defaultBaseline().items, {}, {});
const oppCell = (id: string) => rows().find((r) => r.opportunityId === id)!.brandFunding;
const prjCell = (id: string) => rows().find((r) => r.projectId === id)!.brandFunding;

describe("opportunity brand share (AC-4, AC-5)", () => {
  it("reads funding.brandShare", () => {
    for (const id of ["OPP-A", "OPP-B", "OPP-C"]) expect(opportunityBrandShare(opp(id))).toBe(0.5);
    for (const id of ["OPP-D", "OPP-E", "OPP-H"]) expect(opportunityBrandShare(opp(id))).toBe(0);
    for (const id of ["OPP-F", "OPP-G"]) expect(opportunityBrandShare(opp(id))).toBeNull();
    expect(opportunityBrandShare({})).toBeNull();
  });
  it("cells", () => {
    expect(oppCell("OPP-A")).toMatchObject({ status: "share", text: "50%", amountLakh: 47.5 });
    expect(oppCell("OPP-B").amountLakh).toBe(35);
    expect(oppCell("OPP-C").amountLakh).toBe(20);
    expect(oppCell("OPP-F")).toMatchObject({ status: "to-be-agreed", text: "To be agreed" });
    expect(brandAmountText(oppCell("OPP-A"))).toBe("₹47.5 lakh planned");
  });
});

describe("project brand share (AC-6, AC-7)", () => {
  it("PRJ-103 reads 0%", () => {
    expect(projectBrandShare(prj("PRJ-103"))).toBe(0);
    expect(prjCell("PRJ-103")).toMatchObject({ status: "share", text: "0%", amountLakh: null });
  });
  it("no participants, or a split that does not sum to 1, is Not recorded", () => {
    expect(projectBrandShare({ participants: [] })).toBeNull();
    const p = prj("PRJ-103");
    const short = { participants: p.participants.map((x, i) => (i === 2 ? { ...x, fundingShare: 0.4 } : x)) };
    expect(projectBrandShare(short)).toBeNull();
    expect(brandFundingCell({ where: "Outside: basin", kind: "Project", brandShare: null, capexLakh: null })).toMatchObject({ status: "not-recorded", text: "Not recorded" });
    expect(prjCell("PRJ-202")).toMatchObject({ status: "not-recorded", text: "Not recorded" });
  });
  it("PRJ-201 is seeded with a 20% brand share and nothing it computes has moved", () => {
    const p = prj("PRJ-201");
    expect(projectBrandShare(p)).toBeCloseTo(0.2, 10);
    expect(prjCell("PRJ-201").text).toBe("20%");
    expect(p.participants.find((x) => x.participant === "Avinashi Road Dye House (F02)")!.fundingShare).toBe(0.8);
    expect(totalFunding(p)).toBeCloseTo(1, 10);
    const brandP = p.participants.find((x) => x.isBrand)!;
    expect(brandP).toMatchObject({ role: "Contributor", claimAllocation: 0, claimState: "n/a" });
    expect(p.status).toBe("Flagged");
    expect(p.attribution).toBe(1);
    expect(totalAllocation(p)).toBeCloseTo(1.4, 10);
    expect(allocationConflictText(p)).toBe("Allocation conflict: 140% requested, 100% maximum");
    expect(projectBenefit(p)).toMatchObject({ attributed: { value: 38000 }, counted: { value: 0 }, low: { value: 0 } });
  });
});

describe("n/a, rounding, summary (AC-8, AC-9, AC-10)", () => {
  it("inside rows and site measurements are n/a", () => {
    const inside = rows().filter((r) => r.where === "Inside the factory");
    expect(inside.some((r) => r.kind === "Site measurement")).toBe(true);
    for (const r of inside) expect(r.brandFunding).toMatchObject({ status: "not-applicable", text: "n/a" });
    expect(rows().filter((r) => r.where !== "Inside the factory").every((r) => r.brandFunding.status !== "not-applicable")).toBe(true);
  });
  it("rounds to whole percents; 0.125 of capex 40 is 5 lakh", () => {
    expect(brandFundingCell({ where: "Outside: basin", kind: "Project", brandShare: 0.335, capexLakh: null }).text).toBe("34%");
    expect(brandFundingCell({ where: "Outside: basin", kind: "Opportunity", brandShare: 0.125, capexLakh: 40 }).amountLakh).toBe(5);
  });
  it("summary matches the rows under every Where / Stage / Factory filter", () => {
    const all = rows();
    const factories = [undefined, ...new Set(all.map((r) => r.factoryId))];
    const stages = [undefined, ...new Set(all.map((r) => r.stage))];
    for (const f of factories) for (const s of stages) for (const w of [undefined, ...WHERE_ORDER]) {
      const view = all.filter((r) => (!f || r.factoryId === f) && (!s || r.stage === s) && (!w || r.where === w));
      const out = view.filter((r) => r.where !== "Inside the factory");
      const sum = outsideBrandSummary(view);
      expect(sum.outsideActions).toBe(out.length);
      expect(sum.brandCoFunded).toBe(out.filter((r) => r.brandFunding.text !== "0%" && /^\d+%$/.test(r.brandFunding.text)).length);
      expect(sum.notRecorded).toBe(out.filter((r) => r.brandFunding.text === "Not recorded" || r.brandFunding.text === "To be agreed").length);
    }
  });
});

describe("R1 (AC-1, AC-11)", () => {
  it("PWI, balance, portfolio and Impact are unchanged", () => {
    const sites = getSites(brand);
    expect(Object.fromEntries(sites.map((s) => [s.id, [s.pwi.sitePwi, s.pwi.sitePwiCentral, s.pwi.volumetricBalance]]))).toEqual(baseline.brand.sites);
    const before = JSON.stringify(buildImpact(sites, defaultBaseline(), {}));
    supplierInitiatives(brand, defaultBaseline().items, {}, {}, { sites });
    expect(JSON.stringify(buildImpact(sites, defaultBaseline(), {}))).toBe(before);
  });
  it("the brand-share functions never read the claim allocation", () => {
    const src = readFileSync(fileURLToPath(new URL("./initiatives.ts", import.meta.url)), "utf8");
    const fn = src.slice(src.indexOf("export function projectBrandShare"), src.indexOf("export interface InitiativeRow"));
    expect(fn.length).toBeGreaterThan(500);
    expect(fn).not.toMatch(/claimAllocation|attribution/);
  });
});
