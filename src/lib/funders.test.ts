import { describe, expect, it } from "vitest";
import { funders } from "@/src/data/funders";
import { opportunities } from "@/src/data/opportunities";
import { suppliers } from "@/src/data/suppliers";
import { DEMO_TODAY } from "@/src/data/tenants";
import { opportunityById } from "./catalogue";
import { blockerText, claimNote, coverage, filterFunders, possibleFunders, rankFunders } from "./funders";

const opp = (id: string) => opportunityById(id)!;
const ids = (fs: { id: string }[]) => fs.map((f) => f.id);
const near = (id: string) => possibleFunders(opp(id)).nearMisses.map((m) => [m.funder.id, m.blocker]);
const pct = (o: string, f: string) => Math.round(coverage(opp(o), funders.find((x) => x.id === f)!) * 100);
const COROMANDEL = suppliers.find((s) => s.name === "Coromandel Denim Mills")!;

describe("funder data (R5)", () => {
  it("six placeholder funders, all named Illustrative, checked on the demo day", () => {
    expect(ids(funders)).toEqual(["FND-1", "FND-2", "FND-3", "FND-4", "FND-5", "FND-6"]);
    for (const f of funders) {
      expect(f.name.startsWith("Illustrative")).toBe(true);
      expect(f.placeholder).toBe(true);
      expect(f.lastChecked).toBe(DEMO_TODAY);
    }
  });
  it("supplier sizes: Kongu is MSME, everyone else Large", () => {
    expect(suppliers.filter((s) => s.sizeClass === "MSME").map((s) => s.name)).toEqual(["Kongu Knit Processing"]);
  });
});

describe("filterFunders (AC-11 to AC-16)", () => {
  it("AC-11 OPP-D", () => {
    const r = possibleFunders(opp("OPP-D"));
    expect(ids(r.eligible)).toEqual(["FND-6", "FND-1"]);
    expect(pct("OPP-D", "FND-6")).toBe(100);
    expect(pct("OPP-D", "FND-1")).toBe(100);
    expect(near("OPP-D")).toEqual([["FND-2", "supplier-size"], ["FND-3", "minimum-ticket"], ["FND-4", "project-type"], ["FND-5", "project-type"]]);
  });
  it("AC-12 OPP-A", () => {
    expect(ids(possibleFunders(opp("OPP-A")).eligible)).toEqual(["FND-5", "FND-4"]);
    expect(pct("OPP-A", "FND-5")).toBe(100);
    expect(pct("OPP-A", "FND-4")).toBe(63);
    expect(near("OPP-A")).toEqual([["FND-1", "project-type"], ["FND-2", "project-type"], ["FND-3", "project-type"], ["FND-6", "project-type"]]);
  });
  it("AC-13 OPP-E", () => {
    const r = possibleFunders(opp("OPP-E"));
    expect(ids(r.eligible).sort()).toEqual(["FND-1", "FND-6"]);
    expect(pct("OPP-E", "FND-1")).toBe(100);
    expect(pct("OPP-E", "FND-6")).toBe(100);
    expect(near("OPP-E")).toContainEqual(["FND-3", "minimum-ticket"]);
    expect(near("OPP-E")).toContainEqual(["FND-2", "supplier-size"]);
  });
  it("AC-14 a failed gate returns nothing (OPP-G)", () => {
    expect(possibleFunders(opp("OPP-G"))).toEqual({ eligible: [], nearMisses: [] });
    expect(filterFunders(opp("OPP-G"), COROMANDEL, funders)).toEqual({ eligible: [], nearMisses: [] });
  });
  it("AC-15 an MSME supplier with capex 30 gets FND-2 and FND-3 is a supplier-size near miss", () => {
    const msme = suppliers.find((s) => s.sizeClass === "MSME")!;
    const o = { ...opp("OPP-E"), capexLakh: 30 };
    const r = filterFunders(o, msme, funders);
    expect(ids(r.eligible)).toContain("FND-2");
    expect(coverage(o, funders[1])).toBe(1);
    expect(r.nearMisses.find((m) => m.funder.id === "FND-3")!.blocker).toBe("supplier-size");
  });
  it("AC-16 capex above the maximum is not a blocker", () => {
    const o = { ...opp("OPP-D"), capexLakh: 500 };
    const r = filterFunders(o, COROMANDEL, funders);
    expect(ids(r.eligible)).toContain("FND-1");
    expect(Math.round(coverage(o, funders[0]) * 100)).toBe(30);
  });
  it("the first failing filter is reported, and a region outside India and Tamil Nadu blocks", () => {
    const f = { ...funders[0], regions: ["Kerala"], projectTypes: ["Nature-based" as const] };
    expect(filterFunders(opp("OPP-D"), COROMANDEL, [f]).nearMisses[0].blocker).toBe("project-type");
    expect(filterFunders(opp("OPP-D"), COROMANDEL, [{ ...f, projectTypes: ["Reuse / efficiency" as const] }]).nearMisses[0].blocker).toBe("region");
  });
});

describe("rankFunders, claimNote, blockerText (AC-17)", () => {
  it("ranks by coverage then name, whatever the input order", () => {
    const o = opp("OPP-A");
    expect(ids(rankFunders(o, [funders[3], funders[4]]))).toEqual(["FND-5", "FND-4"]);
    expect(ids(rankFunders(o, [funders[4], funders[3]]))).toEqual(["FND-5", "FND-4"]);
    expect(ids(rankFunders(opp("OPP-D"), [funders[0], funders[5]]))).toEqual(["FND-6", "FND-1"]);
  });
  it("copy", () => {
    expect(claimNote(funders[0])).toBe("A loan does not give the lender a share of the benefit.");
    expect(claimNote(funders[3])).toContain("V2-GRANT");
    expect(claimNote(funders[5])).toBe("Programme funding is recorded separately from claim allocation.");
    expect(blockerText("minimum-ticket")).toBe("Below the minimum ticket size");
  });
  it("every seeded opportunity can be matched", () => {
    for (const o of opportunities) expect(() => possibleFunders(o)).not.toThrow();
  });
});
