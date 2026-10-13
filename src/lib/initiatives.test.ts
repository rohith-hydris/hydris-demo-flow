import { describe, expect, it } from "vitest";
import { projects } from "@/src/data/projects";
import type { ProjectRecord } from "@/src/data/types";
import { opportunityById } from "./catalogue";
import { buildImpact, defaultBaseline } from "./impactView";
import { initiativeCountLine, initiativeCounts, opportunityStage, projectFundedBy, projectStage, supplierInitiatives } from "./initiatives";
import { getSites } from "./selectors";
import { scopeFor } from "./scope";
import { summaryStatus } from "./states";
import type { InitiativeStage } from "./types";

const prj = (id: string) => projects.find((p) => p.id === id)!;
const S1 = defaultBaseline().items;

describe("projectStage (AC-13)", () => {
  const TABLE: Record<string, InitiativeStage> = {
    "Validated|Validated": "Validated",
    "Pending validation|Measured": "Claimed",
    "Flagged|Not validated": "Under review",
    "Not counted|Not validated": "Not counted",
  };
  it("covers every status and benefit state combination in the seeds", () => {
    for (const p of projects) {
      const key = `${p.status}|${p.states.benefitState}`;
      expect(TABLE[key], `${p.id} ${key}`).toBeDefined();
      expect(projectStage(p), p.id).toBe(TABLE[key]);
    }
  });
  it("named projects", () => {
    expect(projectStage(prj("PRJ-103"))).toBe("Validated");
    const s105 = summaryStatus(prj("PRJ-105").states);
    expect(projectStage(prj("PRJ-105"))).toBe(s105 === "Flagged" ? "Under review" : "Claimed");
    expect(projectStage(prj("PRJ-107"))).toBe("Not counted");
    expect(projectStage(prj("PRJ-108"))).toBe("Not counted");
  });
  it("a Forecast benefit is Planned; Validated on a non-eligible claim is not Validated", () => {
    const base = prj("PRJ-101");
    const forecast: ProjectRecord = { ...base, status: "Pending validation", states: { ...base.states, benefitState: "Forecast", claimEligibility: "Under review" } };
    expect(projectStage(forecast)).toBe("Claimed");
    expect(projectStage({ status: "Validated", states: { ...base.states, benefitState: "Forecast" } })).toBe("Planned");
    expect(projectStage({ status: "Pending validation", states: { ...base.states, claimEligibility: "Under review" } })).toBe("Claimed");
  });
});

describe("opportunityStage (AC-14)", () => {
  it("Planned when in the approved baseline or committed, else Proposed", () => {
    for (const id of ["OPP-A", "OPP-B", "OPP-C"]) expect(opportunityStage(opportunityById(id)!, S1, {})).toBe("Planned");
    expect(opportunityStage(opportunityById("OPP-F")!, S1, {})).toBe("Proposed");
    expect(opportunityStage(opportunityById("OPP-D")!, S1, {})).toBe("Proposed");
    expect(opportunityStage(opportunityById("OPP-D")!, S1, { "OPP-D": { supplier: true } })).toBe("Planned");
    // OPP-F is To be agreed, so nobody can commit; a stray record still does not make it Planned.
    expect(opportunityStage(opportunityById("OPP-F")!, S1, { "OPP-F": { supplier: true } })).toBe("Proposed");
  });
});

describe("funded by (AC-15)", () => {
  it("PRJ-103 lists the two funders at 50% and leaves out the 0% host and partner", () => {
    expect(projectFundedBy(prj("PRJ-103"))).toBe("Ambattur Denim Unit (F12) 50%, Adyar Garments Ltd 50%");
  });
  it("funding is read from fundingShare only, never from the claim share", () => {
    const p = prj("PRJ-201");
    // Noyyal Exports claims 40% of the benefit but funds 0%, so it is not a funder.
    expect(projectFundedBy(p)).toBe("Avinashi Road Dye House (F02) 80%, Lumen Apparel Group 20%");
    const swapped = { ...p, participants: p.participants.map((x) => ({ ...x, claimAllocation: 1 - x.claimAllocation })) };
    expect(projectFundedBy(swapped)).toBe(projectFundedBy(p));
  });
});

describe("supplier initiatives", () => {
  const brand = scopeFor("brand");
  it("SUP5 rows: projects and opportunities with stage, funded by and a counts line", () => {
    const rows = supplierInitiatives(scopeFor("supplier"), S1, {}, { "OPP-D": ["FND-1"] });
    expect(rows.every((r) => r.supplierId === "SUP5")).toBe(true);
    expect(rows.find((r) => r.projectId === "PRJ-103")).toMatchObject({ stage: "Validated", grade: "B", attribution: "50%" });
    expect(rows.find((r) => r.opportunityId === "OPP-A")).toMatchObject({ stage: "Planned", fundedBy: "Supplier 50%, Brand 50%", forecast: true, shortlistedFunders: [] });
    expect(rows.find((r) => r.opportunityId === "OPP-D")!.shortlistedFunders).toEqual(["Illustrative public-sector bank green loan"]);
    expect(rows.find((r) => r.projectId === "PRJ-108")).toMatchObject({ stage: "Not counted", gateReason: "Compliance only" });
    const c = initiativeCounts(rows);
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(rows.length);
    expect(initiativeCountLine(c)).toMatch(/^\d+ Validated, /);
  });
  it("an opportunity that fails a gate is left out (OPP-G)", () => {
    expect(supplierInitiatives(brand, S1, {}, {}).some((r) => r.opportunityId === "OPP-G")).toBe(false);
  });
});

describe("Outcomes rows carry stage and funded by (AC-27)", () => {
  it("PRJ-103 Validated with two funders; OPP-A Planned and shared", () => {
    const rows = buildImpact(getSites(scopeFor("brand"))).outcomes;
    expect(rows.find((r) => r.project === "PRJ-103")).toMatchObject({ stage: "Validated", fundedBy: "Ambattur Denim Unit (F12) 50%, Adyar Garments Ltd 50%" });
    expect(rows.find((r) => r.trace.inputs.some((i) => i.label === "Opportunity" && i.value === "OPP-A"))).toMatchObject({ stage: "Planned", fundedBy: "Supplier 50%, Brand 50%" });
    expect(rows.every((r) => r.stage && r.fundedBy)).toBe(true);
  });
});
