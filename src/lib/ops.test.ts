import { describe, expect, it } from "vitest";
import { ops } from "@/src/data/ops";
import { alertCounts, buildAlerts, healthBand, isOffTrack, severityRank, tierDirection } from "./ops";
import { getAlerts, getSites, getSuppliers } from "./selectors";
import { scopeFor } from "./scope";

const brand = scopeFor("brand");

describe("health bands (PRODUCT 5.7)", () => {
  it("Healthy 75 to 100, Watch 50 to 74, Critical under 50", () => {
    expect([healthBand(100), healthBand(75), healthBand(74), healthBand(50), healthBand(49)]).toEqual(["Healthy", "Healthy", "Watch", "Watch", "Critical"]);
  });

  it("matches the health band column for every plant", () => {
    const expected: Record<string, string> = {
      F01: "Healthy", F02: "Watch", F03: "Healthy", F04: "Watch", F05: "Healthy", F06: "Critical", F07: "Healthy",
      F08: "Healthy", F09: "Watch", F10: "Healthy", F11: "Healthy", F12: "Healthy", F13: "Watch", F14: "Healthy",
    };
    for (const s of getSites(brand)) expect(s.health).toBe(expected[s.id]);
  });
});

describe("tier history", () => {
  it("reads direction from the tier order", () => {
    expect(tierDirection("Progressive", "Foundational")).toBe("downgrade");
    expect(tierDirection("Foundational", "Not conformant")).toBe("downgrade");
    expect(tierDirection("Progressive", "Aspirational")).toBe("upgrade");
    expect(tierDirection("Progressive", "Progressive")).toBeNull();
  });

  it("F02 and F06 dropped; F03 and F11 improved; the rest are stable", () => {
    const dir = Object.fromEntries(getSites(brand).map((s) => [s.id, s.tierDirection]));
    expect(dir.F02).toBe("downgrade");
    expect(dir.F06).toBe("downgrade");
    expect(dir.F03).toBe("upgrade");
    expect(dir.F11).toBe("upgrade");
    expect(Object.values(dir).filter((d) => d === null)).toHaveLength(10);
  });
});

describe("off-track plants (PRODUCT 5.7, 6.9)", () => {
  it("are F06, F02 and F13", () => {
    expect(getSites(brand).filter((s) => s.offTrack).map((s) => s.id).sort()).toEqual(["F02", "F06", "F13"]);
  });

  it("the suppliers with an off-track plant are SUP1, SUP2 and SUP5 (Noyyal and Palar are on track)", () => {
    expect(getSuppliers(brand).filter((s) => s.offTrack).map((s) => s.id)).toEqual(["SUP1", "SUP2", "SUP5"]);
  });

  it("a Critical or High alert, a tier drop, or benefit below 80% of target each make a plant off-track", () => {
    const base = { factoryId: "X", healthScore: 90, zdhcTier: "Progressive" as const, tierChange: null, highestAlert: null, alertMessage: null, alertAgeDays: null };
    expect(isOffTrack(base)).toBe(false);
    expect(isOffTrack({ ...base, highestAlert: "High" })).toBe(true);
    expect(isOffTrack({ ...base, highestAlert: "Critical" })).toBe(true);
    expect(isOffTrack({ ...base, highestAlert: "Medium" })).toBe(false);
    expect(isOffTrack({ ...base, tierChange: { from: "Progressive", to: "Foundational", daysAgo: 3 } })).toBe(true);
    expect(isOffTrack({ ...base, tierChange: { from: "Progressive", to: "Aspirational", daysAgo: 3 } })).toBe(false);
    expect(isOffTrack(base, 0.79)).toBe(true);
    expect(isOffTrack(base, 0.8)).toBe(false);
  });
});

describe("alerts (PRODUCT 4.2, DESIGN 5.2)", () => {
  const alerts = getAlerts(brand);

  it("counts 1 Critical, 2 High, 4 Medium and 2 Info", () => {
    expect(alertCounts(alerts)).toEqual({ Critical: 1, High: 2, Medium: 4, Info: 2 });
  });

  it("lists one alert per plant with an open alert, most severe first", () => {
    expect(alerts).toHaveLength(9);
    const ranks = alerts.map((a) => severityRank(a.severity));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(alerts[0]).toMatchObject({ factoryId: "F06", severity: "Critical" });
  });

  it("carries the spec message for each plant", () => {
    expect(alerts.find((a) => a.factoryId === "F13")!.message).toBe("No data for 9 days (water meter log)");
    expect(alerts.find((a) => a.factoryId === "F02")!.message).toBe("ZDHC downgrade and TSS above limit on 3 of last 7 days");
  });

  it("builds the same list straight from the data", () => {
    expect(buildAlerts(ops).map((a) => a.id)).toEqual(alerts.map((a) => a.id));
  });
});

describe("severity rule consistency (PRODUCT 5.7)", () => {
  // Critical for Not conformant or Critical health; High for any downgrade; Info for upgrades; Medium for Watch health.
  it("the stated alert for each plant agrees with the rule", () => {
    for (const o of ops) {
      const sev = o.highestAlert;
      if (o.zdhcTier === "Not conformant" || healthBand(o.healthScore) === "Critical") expect(sev).toBe("Critical");
      if (o.tierChange && tierDirection(o.tierChange.from, o.tierChange.to) === "downgrade") expect(["Critical", "High"]).toContain(sev);
      if (healthBand(o.healthScore) === "Watch") expect(sev).not.toBeNull();
      if (sev === "Info") expect(o.tierChange && tierDirection(o.tierChange.from, o.tierChange.to)).toBe("upgrade");
    }
  });
});
