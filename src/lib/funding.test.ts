import { describe, expect, it } from "vitest";
import { opportunities, type Funding } from "@/src/data/opportunities";
import { opportunityById } from "./catalogue";
import { applyCommit, canCommit, canCommitReason, commitmentStatus, fundingIsValid, fundingLabel, fundingOf, requiredParties } from "./funding";

const SUP: Funding = { funder: "Supplier", supplierShare: 1, brandShare: 0 };
const BRAND: Funding = { funder: "Brand", supplierShare: 0, brandShare: 1 };
const SHARED: Funding = { funder: "Shared", supplierShare: 0.5, brandShare: 0.5 };
const TBA: Funding = { funder: "To be agreed", supplierShare: null, brandShare: null };
const opp = (id: string) => opportunityById(id)!;

describe("funding (AC-4, AC-5)", () => {
  it("accepts the four valid shapes and rejects bad shares", () => {
    for (const f of [SUP, BRAND, SHARED, TBA]) expect(fundingIsValid(f)).toBe(true);
    expect(fundingIsValid({ funder: "Shared", supplierShare: 0.5, brandShare: 0.4 })).toBe(false);
    expect(fundingIsValid({ funder: "Shared", supplierShare: -0.2, brandShare: 1.2 })).toBe(false);
    expect(fundingIsValid({ funder: "Shared", supplierShare: 1.5, brandShare: -0.5 })).toBe(false);
    expect(fundingIsValid({ funder: "Supplier", supplierShare: 1.1, brandShare: 0 })).toBe(false);
  });
  it("every seeded opportunity has valid funding, and a missing field is To be agreed", () => {
    for (const o of opportunities) expect(fundingIsValid(fundingOf(o))).toBe(true);
    expect(fundingOf({})).toEqual(TBA);
  });
  it("labels", () => {
    expect(fundingLabel(SUP)).toBe("Supplier 100%");
    expect(fundingLabel(SHARED)).toBe("Supplier 50%, Brand 50%");
    expect(fundingLabel(TBA)).toBe("To be agreed");
    expect(requiredParties(SHARED)).toEqual(["supplier", "brand"]);
    expect(requiredParties(TBA)).toEqual([]);
  });
});

describe("commitments (AC-6, AC-7, AC-8)", () => {
  it("commitmentStatus", () => {
    expect(commitmentStatus(opp("OPP-A"), {})).toBe("Not committed");
    expect(commitmentStatus(opp("OPP-A"), { "OPP-A": { supplier: true } })).toBe("Partly committed");
    expect(commitmentStatus(opp("OPP-A"), { "OPP-A": { supplier: true, brand: true } })).toBe("Committed");
    expect(commitmentStatus(opp("OPP-D"), { "OPP-D": { supplier: true } })).toBe("Committed");
    expect(commitmentStatus(opp("OPP-F"), { "OPP-F": { supplier: true, brand: true } })).toBe("Not committed");
  });
  it("canCommit refuses with a reason", () => {
    expect(canCommit(opp("OPP-G"), "brand")).toBe(false);
    expect(canCommitReason(opp("OPP-G"), "brand")).toContain("Hydrologically connected");
    for (const o of opportunities.filter((x) => fundingOf(x).funder === "To be agreed")) {
      expect(canCommit(o, "supplier")).toBe(false);
      expect(canCommitReason(o, "supplier")!.length).toBeGreaterThan(0);
    }
    expect(canCommit(opp("OPP-D"), "brand")).toBe(false);
    expect(canCommitReason(opp("OPP-D"), "brand")!.length).toBeGreaterThan(0);
    expect(canCommit(opp("OPP-D"), "supplier")).toBe(true);
    expect(canCommitReason(opp("OPP-D"), "supplier")).toBeNull();
  });
  it("R5: a failed or unknown gate blocks commitment even with a share", () => {
    const blocked = { ...opp("OPP-A"), gates: { ...opp("OPP-A").gates, additional: "Unknown" as const } };
    expect(canCommit(blocked, "supplier")).toBe(false);
  });
  it("committing twice leaves the same state (idempotent)", () => {
    const once = applyCommit({}, opp("OPP-A"), "supplier");
    expect(once.ok).toBe(true);
    if (!once.ok) return;
    const twice = applyCommit(once.commitments, opp("OPP-A"), "supplier");
    expect(twice).toEqual({ ok: true, commitments: once.commitments });
    if (twice.ok) expect(twice.commitments).toBe(once.commitments);
    expect(applyCommit({}, opp("OPP-G"), "brand").ok).toBe(false);
  });
});

describe("business case funding line (AC-30) and journey (AC-26)", () => {
  it("names the funding and commitment status of each S1 opportunity", async () => {
    const { defaultBaseline } = await import("./impactView");
    const { fundingNeedsLine } = await import("./funding");
    const s1 = defaultBaseline().items.map((id) => opportunityById(id)!);
    expect(fundingNeedsLine(s1, { "OPP-A": { supplier: true } }, (id) => (id === "OPP-A" ? ["Illustrative CSR water programme"] : []))).toBe(
      "Funding: OPP-A Supplier 50%, Brand 50% (Partly committed), shortlisted funders: Illustrative CSR water programme; OPP-B Supplier 50%, Brand 50% (Not committed), shortlisted funders: none; OPP-C Supplier 50%, Brand 50% (Not committed), shortlisted funders: none.",
    );
  });
  it("journey steps by role", async () => {
    const { journeyStepsFor, STEP_FOR_PROJECTS_TAB, JOURNEY_STEPS } = await import("./journey");
    expect(journeyStepsFor("supplier")).toBe(JOURNEY_STEPS);
    expect(journeyStepsFor("brand").map((s) => s.label)).toEqual(["Risk", "Supplier actions", "Evidence review", "Impact", "Reporting"]);
    expect(journeyStepsFor("brand")[1].href).toBe("/actions");
    expect(Object.keys(STEP_FOR_PROJECTS_TAB)).toEqual(["opportunities", "catalogue", "scenarios"]);
  });
});
