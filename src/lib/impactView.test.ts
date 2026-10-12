import { describe, expect, it } from "vitest";
import { buildImpact, countedTotal } from "./impactView";
import { getSites } from "./selectors";
import { scopeFor } from "./scope";

const brand = scopeFor("brand");
const supplier = scopeFor("supplier");
const f12 = () => getSites(brand).filter((s) => s.id === "F12");

describe("impact destination (V2 9)", () => {
  it("reproduces the F12 outcomes table", () => {
    const i = buildImpact(f12());
    expect(i.quantity.map((r) => [r.split.Validated, r.split.Measured, r.split.Forecast])).toEqual([[21000, 0, 0], [35000, 0, 0], [25000, 0, 8000]]);
    expect(i.access.map((r) => [r.split.Validated, r.split.Measured, r.split.Forecast])).toEqual([[1200, 0, 0], [1500, 0, 0], [0, 900, 600]]);
    expect(i.quality.tss[1].split.Validated).toBe(2500);
    expect(i.quality.tn[1].split.Validated).toBe(200);
    expect(i.quality.tp[1].split.Validated).toBe(40);
    expect(i.quality.tn[2].split).toEqual({ Validated: 0, Measured: 0, Forecast: 260 });
    expect(i.quality.tn[0].split.Validated).toBe(6750);
  });

  it("keeps Forecast out of the counted totals and never relabels it", () => {
    const i = buildImpact(f12());
    expect(countedTotal(i.quantity[2].split)).toBe(25000);
    const forecastRows = i.outcomes.filter((o) => o.state === "Forecast");
    expect(forecastRows).toHaveLength(3);
    expect(forecastRows.every((o) => o.trace.note?.includes("Forecast"))).toBe(true);
    // Forecast exists only for opportunities: no outcome row for a project is Forecast.
    expect(i.outcomes.filter((o) => o.project && o.state === "Forecast")).toHaveLength(0);
  });

  it("shows PRJ-105 as Measured, not Validated, and leaves Not counted projects out", () => {
    const i = buildImpact(f12());
    expect(i.outcomes.find((o) => o.project === "PRJ-105")?.state).toBe("Measured");
    expect(i.outcomes.some((o) => o.project === "PRJ-107" || o.project === "PRJ-108")).toBe(false);
  });

  it("scopes by role: a supplier sees only its own factories", () => {
    const i = buildImpact(getSites(supplier));
    expect(new Set(i.outcomes.map((o) => o.factoryId))).toEqual(new Set(["F12", "F13", "F14"]));
  });

  it("gives every outcome row a traceable record with method version, period and source opportunity", () => {
    for (const o of buildImpact(getSites(brand)).outcomes) {
      expect(o.trace.method.version).toBe("PWI-M 1.0");
      const labels = o.trace.inputs.map((x) => x.label);
      expect(labels).toContain("Source opportunity");
      expect(o.period.length).toBeGreaterThan(0);
    }
  });
});
