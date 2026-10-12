import { describe, expect, it } from "vitest";
import { removals } from "@/src/data/cells";
import { delivered } from "@/src/data/delivered";
import { f12Example } from "@/src/data/f12Example";
import { factories } from "@/src/data/factories";
import { ops } from "@/src/data/ops";
import { MONTHS_ELAPSED } from "@/src/data/tenants";
import { alertCounts, benefitBehindMessage, dataFreshness, deriveAlerts, healthBand, healthScore, isOffTrack, severityRank, tierDirection, topAlert } from "./ops";
import type { OpsRecord } from "@/src/data/types";
import { eventsOn, eventsUpTo } from "./replay";
import { replayPack } from "@/src/data/replay";
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
    const base: OpsRecord = { factoryId: "X", outletCompliancePct: 90, uptimePct: 99, dataAgeDays: 0, zdhcTier: "Progressive", tierChange: null };
    expect(isOffTrack(base)).toBe(false);
    expect(isOffTrack({ ...base, dataAgeDays: 9 })).toBe(true); // High: 7 or more days without data
    expect(isOffTrack({ ...base, zdhcTier: "Not conformant" })).toBe(true); // Critical
    expect(isOffTrack({ ...base, outletCompliancePct: 60 })).toBe(false); // Medium: health in the Watch range
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

  it("generates each plant's message from the rule that fired", () => {
    const msg = (id: string) => alerts.find((a) => a.factoryId === id)!;
    expect(msg("F13")).toMatchObject({ message: "No data for 9 days", ageDays: 9, severity: "High" });
    expect(msg("F02")).toMatchObject({ message: "ZDHC downgrade, Progressive to Foundational", ageDays: 12, severity: "High" });
    expect(msg("F06")).toMatchObject({ message: "Dropped to Not conformant; plant health is Critical (38 out of 100)", ageDays: 5, severity: "Critical" });
    expect(msg("F03")).toMatchObject({ message: "ZDHC upgrade to Aspirational", ageDays: 20, severity: "Info" });
    expect(msg("F04").message).toBe("Plant health in Watch range (72 out of 100)");
  });

  it("the nine plants with an open alert are the ones whose inputs raise a rule", () => {
    expect(alerts.map((a) => a.factoryId).sort()).toEqual(["F01", "F02", "F03", "F04", "F06", "F09", "F11", "F12", "F13"]);
  });

  it("F01 and F12 benefit alerts come from the pro-rated shares, not typed text", () => {
    const msg = (id: string) => alerts.find((a) => a.factoryId === id)!.message;
    expect(msg("F01")).toBe("Benefit behind target: P3 Basin Availability, Accessibility and Quality below 80% of pro-rated target");
    expect(msg("F12")).toBe("Benefit behind target: P3 Basin Accessibility and Quality below 80% of pro-rated target; PRJ-105 monitoring check 62 days overdue");
    expect(ops.find((o) => o.factoryId === "F01")!).not.toHaveProperty("alertMessage");
  });
});

describe("severity rule consistency (PRODUCT 5.7)", () => {
  // Critical for Not conformant or Critical health; High for any downgrade; Info for upgrades; Medium for Watch health.
  it("the derived alert for each plant agrees with the rule", () => {
    for (const o of ops) {
      const sev = topAlert(deriveAlerts(o))?.severity ?? null;
      if (o.zdhcTier === "Not conformant" || healthBand(healthScore(o)) === "Critical") expect(sev).toBe("Critical");
      if (o.tierChange && tierDirection(o.tierChange.from, o.tierChange.to) === "downgrade") expect(["Critical", "High"]).toContain(sev);
      if (healthBand(healthScore(o)) === "Watch") expect(sev).not.toBeNull();
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

// ---- B6: health and alerts are derived from inputs ------------------------------------------------------------------------------

const row = (over: Partial<OpsRecord> = {}): OpsRecord => ({ factoryId: "X", outletCompliancePct: 100, uptimePct: 100, dataAgeDays: 0, zdhcTier: "Progressive", tierChange: null, ...over });
const rules = (r: OpsRecord) => deriveAlerts(r).map((a) => [a.rule, a.severity]);

describe("plant health is a weighted mix of the inputs (proposed weights)", () => {
  it("0.60 outlet compliance + 0.25 uptime + 0.15 data freshness, rounded", () => {
    expect(healthScore(row())).toBe(100);
    expect(healthScore(row({ outletCompliancePct: 0 }))).toBe(40);
    expect(healthScore(row({ uptimePct: 0 }))).toBe(75);
    expect(healthScore(row({ dataAgeDays: 30 }))).toBe(85);
    expect(healthScore(row({ outletCompliancePct: 50, uptimePct: 80, dataAgeDays: 15 }))).toBe(Math.round(0.6 * 50 + 0.25 * 80 + 0.15 * 50));
  });
  it("data freshness falls linearly to 0 over 30 days and never goes negative", () => {
    expect([dataFreshness(0), dataFreshness(15), dataFreshness(30), dataFreshness(45)]).toEqual([100, 50, 0, 0]);
  });
  it("a better input does not reduce health", () => {
    expect(healthScore(row({ outletCompliancePct: 70 }))).toBeGreaterThanOrEqual(healthScore(row({ outletCompliancePct: 60 })));
    expect(healthScore(row({ dataAgeDays: 2 }))).toBeGreaterThanOrEqual(healthScore(row({ dataAgeDays: 9 })));
  });
});

describe("each severity rule (PRODUCT 5.7)", () => {
  it("Critical: the tier is Not conformant", () => {
    expect(rules(row({ zdhcTier: "Not conformant" }))).toEqual([["not-conformant", "Critical"]]);
    expect(deriveAlerts(row({ zdhcTier: "Not conformant", tierChange: { from: "Foundational", to: "Not conformant", daysAgo: 5 } }))[0])
      .toMatchObject({ message: "Dropped to Not conformant", ageDays: 5 });
  });
  it("Critical: plant health is under 50", () => {
    const r = row({ outletCompliancePct: 20, uptimePct: 80 }); // 12 + 20 + 15 = 47
    expect(healthScore(r)).toBe(47);
    expect(rules(r)).toEqual([["critical-health", "Critical"]]);
    expect(rules(row({ outletCompliancePct: 25, uptimePct: 80 }))).not.toContainEqual(["critical-health", "Critical"]); // 50 is Watch
  });
  it("High: any ZDHC downgrade", () => {
    expect(rules(row({ tierChange: { from: "Aspirational", to: "Progressive", daysAgo: 3 } }))).toEqual([["tier-downgrade", "High"]]);
    expect(deriveAlerts(row({ tierChange: { from: "Aspirational", to: "Progressive", daysAgo: 3 } }))[0]).toMatchObject({ message: "ZDHC downgrade, Aspirational to Progressive", ageDays: 3 });
  });
  it("High: 7 or more days without data, and not 6", () => {
    expect(rules(row({ dataAgeDays: 7 }))).toContainEqual(["no-data", "High"]);
    expect(rules(row({ dataAgeDays: 6 })).some(([r]) => r === "no-data")).toBe(false);
    expect(deriveAlerts(row({ dataAgeDays: 9 })).find((a) => a.rule === "no-data")).toMatchObject({ message: "No data for 9 days", ageDays: 9 });
  });
  it("Medium: plant health in the Watch range (50 to 74)", () => {
    const r = row({ outletCompliancePct: 50, uptimePct: 100 }); // 30 + 25 + 15 = 70
    expect(rules(r)).toEqual([["watch-health", "Medium"]]);
    expect(deriveAlerts(r)[0].message).toBe("Plant health in Watch range (70 out of 100)");
    expect(rules(row({ outletCompliancePct: 82, uptimePct: 100 }))).toEqual([]); // 89
  });
  it("Medium: benefit behind target, from the pro-rated shares", () => {
    const behind = { availability: 1, quality: null, cells: [{ pillar: "P3" as const, dimension: "Accessibility" as const, share: 0.5 }] };
    const ok = { availability: 1, quality: null, cells: [{ pillar: "P3" as const, dimension: "Accessibility" as const, share: 0.9 }] };
    const r = row({ benefitBehindAlert: true });
    expect(deriveAlerts(r, behind)).toEqual([{ rule: "benefit-behind", severity: "Medium", ageDays: null, message: "Benefit behind target: P3 Basin Accessibility below 80% of pro-rated target" }]);
    expect(deriveAlerts(r, ok)).toEqual([]);
    expect(deriveAlerts(row(), behind)).toEqual([]); // a plant that does not track it raises none
  });
  it("Info: a ZDHC upgrade", () => {
    expect(rules(row({ tierChange: { from: "Progressive", to: "Aspirational", daysAgo: 20 } }))).toEqual([["tier-upgrade", "Info"]]);
  });
  it("the most severe rule sets the plant's severity, and only the rules at that severity form the message", () => {
    const r = row({ zdhcTier: "Not conformant", dataAgeDays: 9, tierChange: { from: "Foundational", to: "Not conformant", daysAgo: 5 } });
    expect(deriveAlerts(r).map((a) => a.severity)).toEqual(["Critical", "High", "High"]);
    expect(topAlert(deriveAlerts(r))).toMatchObject({ severity: "Critical", message: "Dropped to Not conformant", ageDays: 5 });
    expect(topAlert([])).toBeNull();
  });
});

describe("the 14 plants keep their health and severity (PRODUCT 5.7)", () => {
  const HEALTH: Record<string, number> = { F01: 78, F02: 61, F03: 91, F04: 72, F05: 84, F06: 38, F07: 93, F08: 96, F09: 66, F10: 79, F11: 90, F12: 81, F13: 55, F14: 83 };
  const SEVERITY: Record<string, string | null> = {
    F01: "Medium", F02: "High", F03: "Info", F04: "Medium", F05: null, F06: "Critical", F07: null, F08: null, F09: "Medium", F10: null, F11: "Info", F12: "Medium", F13: "High", F14: null,
  };
  const sites = getSites(brand);
  it("health scores are unchanged", () => {
    for (const s of sites) expect(s.healthScore).toBe(HEALTH[s.id]);
  });
  it("highest severity is unchanged for all 14", () => {
    for (const s of sites) expect(s.highestAlert).toBe(SEVERITY[s.id]);
  });
  it("no plant has a typed health score or alert in the data", () => {
    for (const o of ops) for (const k of ["healthScore", "highestAlert", "alertMessage", "alertAgeDays"]) expect(o).not.toHaveProperty(k);
  });
});

describe("replay events reference derived alerts", () => {
  it("every event names a rule its plant actually raises, and takes its severity and text from it", () => {
    const sites = getSites(brand);
    for (const e of replayPack) {
      const alert = sites.find((s) => s.id === e.factoryId)!.alerts.find((a) => a.rule === e.rule)!;
      expect(alert).toBeDefined();
      expect(eventsOn(e.day).find((x) => x.factoryId === e.factoryId && x.rule === e.rule)).toMatchObject({ severity: alert.severity, message: alert.message });
    }
  });
  it("the three events V2 names: F06 not conformant on day 4, F02 downgrade on day 5, F13 no data on day 6", () => {
    expect(eventsOn(4)).toMatchObject([{ factoryId: "F06", severity: "Critical", message: "Dropped to Not conformant" }]);
    expect(eventsOn(5)).toMatchObject([{ factoryId: "F02", severity: "High", message: "ZDHC downgrade, Progressive to Foundational" }]);
    expect(eventsOn(6)).toMatchObject([{ factoryId: "F13", severity: "High", message: "No data for 9 days" }]);
    expect(eventsUpTo(99)).toHaveLength(replayPack.length);
  });
  it("an event for a rule the plant does not raise is an error, not a made-up alert", () => {
    expect(() => eventsUpTo(14, [{ day: 1, factoryId: "F08", rule: "no-data" }])).toThrow(/raises no/);
  });
});
