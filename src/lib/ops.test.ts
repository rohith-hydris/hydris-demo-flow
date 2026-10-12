import { describe, expect, it } from "vitest";
import { removals } from "@/src/data/cells";
import { delivered } from "@/src/data/delivered";
import { f12Example } from "@/src/data/f12Example";
import { factories } from "@/src/data/factories";
import { ops } from "@/src/data/ops";
import { MONTHS_ELAPSED } from "@/src/data/tenants";
import { alertCounts, buildAlerts, benefitBehindMessage, healthBand, isOffTrack, severityRank, tierDirection } from "./ops";
import { buildFactoryPwi, proRatedBenefitShare } from "./pwi";
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

  it("builds the same list from the data, where F01 and F12 derive their benefit alert", () => {
    const withAlert = ops.filter((o) => o.highestAlert !== null && (o.alertMessage !== null || o.benefitBehindAlert));
    expect(alerts.map((a) => a.id).sort()).toEqual(withAlert.map((o) => `AL-${o.factoryId}`).sort());
  });

  it("F01 and F12 benefit alerts come from the pro-rated shares, not typed text", () => {
    const msg = (id: string) => alerts.find((a) => a.factoryId === id)!.message;
    expect(msg("F01")).toBe("Benefit behind target: P3 Basin Availability, Accessibility and Quality below 80% of pro-rated target");
    expect(msg("F12")).toBe("Benefit behind target: P3 Basin Accessibility and Quality below 80% of pro-rated target; PRJ-105 monitoring check 62 days overdue");
    expect(ops.find((o) => o.factoryId === "F01")!.alertMessage).toBeNull();
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

describe("benefit against pro-rated target (PRODUCT 6.9)", () => {
  const pwiOf = (id: string) => buildFactoryPwi(
    factories.find((f) => f.id === id)!, delivered.find((d) => d.factoryId === id), removals.find((r) => r.factoryId === id)!, id === "F12" ? f12Example : null,
  );

  it("Availability share is delivered m3 over RN x months / 12", () => {
    // F12: (21,000 + 35,000 + 25,000) delivered over 110,000 x 6 / 12
    expect(proRatedBenefitShare(pwiOf("F12"), 6).availability).toBeCloseTo(81000 / 55000, 12);
    expect(proRatedBenefitShare(pwiOf("F12"), 12).availability).toBeCloseTo(81000 / 110000, 12);
  });

  it("Quality kg is pro-rated the same way, and people targets are not", () => {
    const b = proRatedBenefitShare(pwiOf("F12"), 6);
    // P2 and P3 Quality: 2,740 kg delivered of 3,525 kg x 2 cells... pooled over both cells' targets, halved
    expect(b.quality).toBeCloseTo(2740 / (2 * 3525 * 0.5), 12);
    const w = (months: number) => proRatedBenefitShare(pwiOf("F12"), months).cells.find((c) => c.pillar === "P3" && c.dimension === "Accessibility")!.share;
    expect(w(6)).toBeCloseTo(900 / 1740, 12);
    expect(w(12)).toBe(w(6));
  });

  it("with the demo months elapsed, F01 and F12 stay on-track and only F06 is below 80%", () => {
    const below = factories.filter((f) => proRatedBenefitShare(pwiOf(f.id), MONTHS_ELAPSED).availability < 0.8).map((f) => f.id);
    expect(below).toEqual(["F06"]);
    const off = (id: string) => getSites(brand).find((s) => s.id === id)!.offTrack;
    expect([off("F01"), off("F12")]).toEqual([false, false]);
    for (const id of ["F03", "F05", "F07", "F08", "F10", "F11", "F14"]) expect(off(id)).toBe(false);
  });

  it("the share feeds Site.offTrack: a lower share would make F01 off-track", () => {
    const f01 = ops.find((o) => o.factoryId === "F01")!;
    expect(isOffTrack(f01, proRatedBenefitShare(pwiOf("F01"), 12).availability)).toBe(true); // 0.60 of a full-year target
    expect(isOffTrack(f01, proRatedBenefitShare(pwiOf("F01"), MONTHS_ELAPSED).availability)).toBe(false);
  });

  it("no message when no P3 cell is behind", () => {
    expect(benefitBehindMessage({ availability: 1, quality: null, cells: [{ pillar: "P3", dimension: "Availability", share: 0.9 }] })).toBeNull();
  });
});
