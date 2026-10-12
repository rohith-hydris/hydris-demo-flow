import { describe, expect, it } from "vitest";
import { GROUPED_ISSUES, HIGH_ISSUES, issuesRegister, methodLibrary, openDecisions, parameterSeeds } from "@/src/data/methodology";
import { DIMENSION_WEIGHTS } from "./pwi";
import { METHODOLOGY_TABS, methodologyHref, parameterRows, parseMethodologyTab, statusBadge } from "./methodology";
import { GUIDE_CAPTION, SOURCE_ISSUE_COUNT } from "./statusCopy";

describe("methodology page content", () => {
  it("has the four tabs and falls back to Parameters", () => {
    expect(METHODOLOGY_TABS.map((t) => t.id)).toEqual(["parameters", "methods", "issues", "decisions"]);
    expect(parseMethodologyTab("issues")).toBe("issues");
    expect(parseMethodologyTab("nope")).toBe("parameters");
    expect(methodologyHref()).toBe("/methodology");
    expect(methodologyHref("methods")).toBe("/methodology?tab=methods");
  });

  it("reads dimension weights and the quality threshold from the code constants", () => {
    const rows = Object.fromEntries(parameterRows().map((r) => [r.id, r.value]));
    expect(rows["dimension-weights"]).toBe(`${DIMENSION_WEIGHTS.Availability.toFixed(2)} / ${DIMENSION_WEIGHTS.Accessibility.toFixed(2)} / ${DIMENSION_WEIGHTS.Quality.toFixed(2)}`);
    expect(rows["dimension-weights"]).toBe("0.40 / 0.30 / 0.30");
    expect(rows["quality-thresholds"]).toBe("90% / +5% / +5%");
    expect(parameterRows().every((r) => r.value.length > 0)).toBe(true);
  });

  it("lists all 13 parameters and shows every under-review or decision-pending row as Proposed, under review", () => {
    expect(parameterSeeds).toHaveLength(13);
    for (const r of parameterRows().filter((p) => ["proposed", "underReview", "decisionPending"].includes(p.status))) {
      expect(statusBadge(r.status).label).toBe("Proposed, under review");
    }
    const by = Object.fromEntries(parameterRows().map((r) => [r.id, r.status]));
    expect(by["household-size"]).toBe("reference");
    expect(by["zero-target"]).toBe("decisionPending");
    expect(statusBadge("reference").label).toBe("Reference value");
  });

  it("keeps the nine-method library with the fields the addendum requires", () => {
    expect(methodLibrary).toHaveLength(9);
    expect(methodLibrary.filter((m) => m.family === "VWBA")).toHaveLength(5);
    for (const m of methodLibrary) {
      for (const k of ["boundary", "units", "counterfactual", "operatingPeriod", "monitoring", "formula"] as const) expect(m[k].length).toBeGreaterThan(0);
    }
  });

  it("marks every issue Proposed, never Resolved, and its counts add up to the 20 source issues", () => {
    expect(issuesRegister).toHaveLength(17);
    expect(issuesRegister.every((i) => i.status === "Proposed")).toBe(true);
    expect(JSON.stringify(issuesRegister)).not.toMatch(/resolved/i);
    expect(issuesRegister.filter((i) => i.severity === "High")).toHaveLength(HIGH_ISSUES);
    expect(HIGH_ISSUES + GROUPED_ISSUES).toBe(SOURCE_ISSUE_COUNT);
    expect(GUIDE_CAPTION).toContain("Reconciliation of the 20 source issues is pending");
  });

  it("lists the open decisions from the addendum with an owner placeholder", () => {
    const ids = openDecisions.map((d) => d.id);
    for (const id of ["OQ-M1", "OQ-M10", "OQ-M11", "OQ-X1", "OQ-X2"]) expect(ids).toContain(id);
    expect(openDecisions.length).toBeGreaterThanOrEqual(10);
    expect(openDecisions.every((d) => d.owner === "To be assigned")).toBe(true);
  });
});
