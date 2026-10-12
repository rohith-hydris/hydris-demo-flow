import { describe, expect, it } from "vitest";
import { documents } from "@/src/data/documents";
import { inspections } from "@/src/data/inspections";
import { projects } from "@/src/data/projects";
import {
  additionalityGate, awaitingValidation, displayNote, documentsForFactory, projectBenefit, projectsFor, readinessCounts, statusCounts, totalsByUnit, trustScore, inspectionStatus, inspectionIssues, reviewInspection,
} from "./claims";
import { pct1 } from "./format";

const project = (id: string) => projects.find((p) => p.id === id)!;

describe("project claims (PRODUCT 5.10)", () => {
  it("has 21 projects: 11 Validated, 6 Pending validation, 1 Flagged, 3 Not counted", () => {
    expect(projects).toHaveLength(21);
    expect(statusCounts()).toEqual({ Validated: 11, "Pending validation": 6, Flagged: 1, "Not counted": 3 });
  });

  it("7 claims await validation (Pending validation or Flagged)", () => {
    expect(awaitingValidation()).toBe(7);
  });

  it("PRJ-103: claimed 50,000 at 50% attribution counts 25,000 with a low value of 21,250 (script V2)", () => {
    const b = projectBenefit(project("PRJ-103"));
    expect(b.attributed).toEqual({ unit: "m3", value: 25000 });
    expect(b.counted).toEqual({ unit: "m3", value: 25000 });
    expect(b.low).toEqual({ unit: "m3", value: 21250 });
  });

  it("PRJ-401: grade C counts the lower bound, 8,400 of 12,000", () => {
    const b = projectBenefit(project("PRJ-401"));
    expect((b.counted as { value: number }).value).toBeCloseTo(8400, 6);
    expect(b.attributed).toEqual({ unit: "m3", value: 12000 });
    expect((b.low as { value: number }).value).toBeCloseTo(8400, 6);
  });

  it("PRJ-201 is Flagged: 38,000 claimed, 0 counted, low value 0 (script V1)", () => {
    const b = projectBenefit(project("PRJ-201"));
    expect(project("PRJ-201").status).toBe("Flagged");
    expect(b.attributed).toEqual({ unit: "m3", value: 38000 });
    expect(b.counted).toEqual({ unit: "m3", value: 0 });
    expect(b.low).toEqual({ unit: "m3", value: 0 });
  });

  it("Not counted and Pending validation claims count zero today; Pending is marked provisional", () => {
    expect(projectBenefit(project("PRJ-107")).counted).toEqual({ unit: "m3", value: 0 });
    expect(projectBenefit(project("PRJ-105")).counted).toEqual({ unit: "people", value: 0 });
    expect(projectBenefit(project("PRJ-105")).provisional).toBe(true);
    expect(projectBenefit(project("PRJ-101")).provisional).toBe(false);
  });

  it("mass claims keep TSS, TN and TP separate (PRJ-106)", () => {
    expect(projectBenefit(project("PRJ-106")).counted).toEqual({ unit: "kg", tss: 2500, tn: 200, tp: 40 });
  });

  it("a flagged claim shows a plain sentence for its role, not the internal 'validation script' pointer", () => {
    const p = project("PRJ-201");
    expect(p.note).toBe("See validation script V1");
    expect(displayNote(p, true)).toBe("Flagged. Open the Validation agent to see the checks behind this flag.");
    expect(displayNote(p, false)).toBe("Flagged by the brand. Upload evidence to respond.");
    expect(displayNote(project("PRJ-105"), true)).toBe("Monitoring check 62 days overdue; claim lapses at 90 days");
  });

  it("PRJ-101 claim basis: 30,000 x 1.5 fills x 0.60 = 27,000", () => {
    expect(30000 * 1.5 * 0.6).toBe(27000);
    expect(project("PRJ-101").claim).toEqual({ unit: "m3", value: 27000 });
  });

  it("totals are kept per unit and never mixed", () => {
    const t = totalsByUnit(projectsFor("F12"), "claimed");
    expect(t.m3).toBeGreaterThan(0);
    expect(t.people).toBe(1500 + 900);
    expect(t.kg).toEqual({ tss: 2500, tn: 200, tp: 40 });
  });
});

describe("F12 projects agree with the 5.8 worked cells (spec cross-check)", () => {
  const f12 = projectsFor("F12");
  const sumAttributed = (pillar: string, dim: string) =>
    f12
      .filter((p) => p.pillar === pillar && p.dimension === dim && p.status !== "Not counted")
      .reduce((sum, p) => sum + (projectBenefit(p).attributed as { value: number }).value, 0);

  it("P2 Availability: desilting 27,000 + recharge 8,000 = 35,000 (the 6,000 landscape offset is excluded)", () => expect(sumAttributed("P2", "Availability")).toBe(35000));
  it("P3 Availability: wetland 50,000 x 50% = 25,000", () => expect(sumAttributed("P3", "Availability")).toBe(25000));
  it("P2 Accessibility: 1,500 people", () => expect(sumAttributed("P2", "Accessibility")).toBe(1500));
  it("P3 Accessibility: 900 people", () => expect(sumAttributed("P3", "Accessibility")).toBe(900));
});

describe("Additionality Gate (PRODUCT 4.4)", () => {
  it("F12 excludes PRJ-107 (no baseline) and PRJ-108 (compliance only), and counts the other six", () => {
    const gate = additionalityGate("F12");
    expect(gate.excluded.map((e) => [e.project.id, e.reason])).toEqual([["PRJ-107", "No baseline"], ["PRJ-108", "Compliance only"]]);
    expect(gate.counted).toHaveLength(6);
  });

  it("F01 excludes PRJ-303 (compliance only)", () => {
    expect(additionalityGate("F01").excluded.map((e) => e.project.id)).toEqual(["PRJ-303"]);
  });

  it("F06, F07 and F08 have no registered projects", () => {
    for (const id of ["F06", "F07", "F08"]) expect(projectsFor(id)).toHaveLength(0);
  });
});

describe("document readiness (PRODUCT 5.11)", () => {
  it("F12 has 12 documents: 8 Ready, 1 Missing, 1 Failed check, 1 Expired, 1 Low confidence", () => {
    const list = documentsForFactory("F12");
    expect(list).toHaveLength(12);
    expect(readinessCounts(list)).toEqual({ Ready: 8, Missing: 1, "Failed check": 1, "Expired / out of period": 1, "Low confidence": 1 });
  });

  it("F12 detail: NABL 47 of 52, CGWA NOC expired, Form V missing, WASH audit low confidence", () => {
    const byName = (n: string) => documentsForFactory("F12").find((d) => d.name.startsWith(n))!;
    expect(byName("NABL")).toMatchObject({ state: "Failed check", detail: "47 of 52 weekly samples; at least 48 required" });
    expect(byName("CGWA")).toMatchObject({ state: "Expired / out of period", detail: "Renewal needed" });
    expect(byName("Form V")).toMatchObject({ state: "Missing" });
    expect(byName("WASH")).toMatchObject({ state: "Low confidence" });
  });

  it("F01: NABL samples 44 of 52 fail the check; OCEMS and lab COD differ by 14%", () => {
    const list = documentsForFactory("F01");
    expect(list.find((d) => d.name.startsWith("NABL"))).toMatchObject({ state: "Failed check", detail: "44 of 52 weekly samples; at least 48 required" });
    expect(list.find((d) => d.name.startsWith("OCEMS"))!.detail).toContain("14%");
    expect(readinessCounts(list).Ready).toBe(11);
  });

  it("F02: third-party ETP audit dated 2024 is Expired", () => {
    expect(documentsForFactory("F02").find((d) => d.name.startsWith("Third-party"))).toMatchObject({ state: "Expired / out of period", period: "2024" });
  });

  it("F06: consent expired 31 Aug 2026; OCEMS offline 9 days; Form V and WASH audit missing", () => {
    const list = documentsForFactory("F06");
    expect(list.find((d) => d.name.startsWith("Consent"))).toMatchObject({ state: "Expired / out of period", period: "expired 31 Aug 2026" });
    expect(list.find((d) => d.name.startsWith("OCEMS"))!.detail).toBe("OCEMS offline 9 days");
    expect(list.filter((d) => d.state === "Missing").map((d) => d.name.split(" ")[0]).sort()).toEqual(["Form", "WASH"]);
  });

  it("F13: water meter log missing for Aug and Sep 2026", () => {
    expect(documentsForFactory("F13").find((d) => d.name.startsWith("Water meter"))).toMatchObject({ state: "Missing" });
  });

  it("F09 has exactly one Low confidence document", () => {
    expect(readinessCounts(documentsForFactory("F09"))["Low confidence"]).toBe(1);
  });

  it("every other factory is fully Ready", () => {
    for (const id of ["F03", "F04", "F05", "F07", "F08", "F10", "F11", "F14"]) {
      expect(readinessCounts(documentsForFactory(id)).Ready).toBe(12);
    }
  });

  it("has 14 x 12 documents with unique ids", () => {
    expect(documents).toHaveLength(168);
    expect(new Set(documents.map((d) => d.id)).size).toBe(168);
  });
});

describe("field inspections (PRODUCT 5.11, script V3)", () => {
  it("trust scores are 85.7%, 100%, 66.7% and (INS-0415) 100%", () => {
    expect(inspections.map((i) => pct1(trustScore(i)))).toEqual([85.7, 100, 66.7, 100, 80]);
  });

  it("INS-0412 has one Fail (step 9, VC-06) and one Warn (step 11, VC-21); 12 of 14 steps passed", () => {
    const i = inspections.find((x) => x.id === "INS-0412")!;
    expect([i.passed, i.steps, inspectionStatus(i)]).toEqual([12, 14, "Needs review"]);
    expect(i.stepDetail!.map((s) => [s.n, s.result, s.check])).toEqual([[9, "Fail", "VC-06"], [11, "Warn", "VC-21"]]);
  });

  it("statuses are derived: INS-0408 Validated; INS-0399 and INS-0412 Needs review; INS-0418 Rejected steps", () => {
    expect(inspections.map((i) => [i.id, inspectionStatus(i)])).toEqual([
      ["INS-0412", "Needs review"], ["INS-0408", "Validated"], ["INS-0399", "Needs review"], ["INS-0415", "Validated"], ["INS-0418", "Rejected steps"],
    ]);
  });
});

// ---- B8: inspection report states ----------------------------------------------------------------------------------------------

describe("inspection status is derived from the steps and the review log (issue B8)", () => {
  const base = { id: "INS-T", factoryId: "F12", date: "1 Oct 2026", source: "Field Glasses" as const };
  const clean = { ...base, steps: 10, passed: 10 };
  const withFail = {
    ...base, steps: 10, passed: 9,
    stepDetail: [{ n: 4, instruction: "Photograph the outlet", result: "Fail" as const, check: "VC-06", reason: "Blurry." }],
  };
  const withWarn = {
    ...base, steps: 10, passed: 9,
    stepDetail: [{ n: 7, instruction: "Read the meter", result: "Warn" as const, check: "VC-21", reason: "Far from history." }],
  };
  const reviewer = { user: "R. Menon", time: "7 Oct 2026, 09:40" };

  it("every step passed: Validated", () => {
    expect(inspectionStatus(clean)).toBe("Validated");
    expect(inspectionIssues(clean)).toEqual({ fails: 0, warns: 0, unresolved: 0 });
  });

  it("any Fail makes Needs review", () => {
    expect(inspectionStatus(withFail)).toBe("Needs review");
    expect(inspectionIssues(withFail)).toEqual({ fails: 1, warns: 0, unresolved: 0 });
  });

  it("a Warn alone needs review too, and steps that did not pass with no detail count as unresolved", () => {
    expect(inspectionStatus(withWarn)).toBe("Needs review");
    const noDetail = { ...base, steps: 15, passed: 10 };
    expect(inspectionIssues(noDetail)).toEqual({ fails: 0, warns: 0, unresolved: 5 });
    expect(inspectionStatus(noDetail)).toBe("Needs review");
  });

  it("override with a reason: Needs review becomes Validated, and the reason, user and time are logged", () => {
    const r = reviewInspection(withFail, { action: "override", ...reviewer, reason: "  Plant lead confirmed by call.  " });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(inspectionStatus(r.inspection)).toBe("Validated");
    expect(r.inspection.reviewLog).toEqual([{ action: "override", user: "R. Menon", time: "7 Oct 2026, 09:40", reason: "Plant lead confirmed by call." }]);
    expect(withFail).not.toHaveProperty("reviewLog"); // the input is not changed
  });

  it("an override without a reason is refused and changes nothing", () => {
    for (const reason of ["", "   "]) {
      expect(reviewInspection(withFail, { action: "override", ...reviewer, reason })).toEqual({ ok: false, error: "A reason is required to override." });
    }
  });

  it("request retake: Needs review becomes Rejected steps, naming the step", () => {
    const r = reviewInspection(withFail, { action: "retake", ...reviewer, step: 4 });
    expect(r.ok && inspectionStatus(r.inspection)).toBe("Rejected steps");
    expect(r.ok && r.inspection.reviewLog).toEqual([{ action: "retake", user: "R. Menon", time: "7 Oct 2026, 09:40", step: 4 }]);
  });

  it("a retake must name a failed or warned step that exists", () => {
    expect(reviewInspection(withFail, { action: "retake", ...reviewer, step: 1 })).toEqual({ ok: false, error: "Step 1 is not a failed or warned step of INS-T." });
    expect(reviewInspection({ ...base, steps: 15, passed: 10 }, { action: "retake", ...reviewer, step: 3 }).ok).toBe(false); // no step detail to point at
  });

  it("override, then retake: the override stays logged and the latest action decides, so the report is Rejected steps", () => {
    const o = reviewInspection(withFail, { action: "override", ...reviewer, reason: "Confirmed by call." });
    if (!o.ok) throw new Error("override failed");
    const r = reviewInspection(o.inspection, { action: "retake", user: "R. Menon", time: "8 Oct 2026, 11:15", step: 4 });
    expect(r.ok && inspectionStatus(r.inspection)).toBe("Rejected steps");
    expect(r.ok && r.inspection.reviewLog!.map((e) => e.action)).toEqual(["override", "retake"]);
  });

  it("confirm: a report with only a warning can be confirmed and becomes Validated", () => {
    const r = reviewInspection(withWarn, { action: "confirm", ...reviewer });
    expect(r.ok && inspectionStatus(r.inspection)).toBe("Validated");
    expect(r.ok && r.inspection.reviewLog).toEqual([{ action: "confirm", user: "R. Menon", time: "7 Oct 2026, 09:40" }]);
  });

  it("confirm is refused while a step has failed, or did not pass with no detail", () => {
    const msg = "A failed step cannot be confirmed. Override with a reason or request a retake.";
    expect(reviewInspection(withFail, { action: "confirm", ...reviewer })).toEqual({ ok: false, error: msg });
    expect(reviewInspection({ ...base, steps: 15, passed: 10 }, { action: "confirm", ...reviewer })).toEqual({ ok: false, error: msg });
  });

  it("a report with every step passed has nothing to review", () => {
    expect(reviewInspection(clean, { action: "confirm", ...reviewer })).toEqual({ ok: false, error: "INS-T has no failed or warned steps. There is nothing to review." });
  });

  it("a reviewer name and a time are required", () => {
    expect(reviewInspection(withFail, { action: "override", user: " ", time: "t", reason: "r" }).ok).toBe(false);
    expect(reviewInspection(withFail, { action: "override", user: "u", time: "", reason: "r" }).ok).toBe(false);
  });

  it("the demo inspection INS-0418 has a logged override with its reason, user and time, then a retake: Rejected steps", () => {
    const i = inspections.find((x) => x.id === "INS-0418")!;
    expect(inspectionStatus(i)).toBe("Rejected steps");
    expect(i.reviewLog).toHaveLength(2);
    expect(i.reviewLog![0]).toMatchObject({ action: "override", user: "R. Menon, Lumen Apparel Group", time: "7 Oct 2026, 09:40" });
    expect(i.reviewLog![0].reason!.length).toBeGreaterThan(0);
    expect(i.reviewLog![1]).toMatchObject({ action: "retake", step: 6 });
  });

  it("INS-0412 moves through each transition from its data", () => {
    const i = inspections.find((x) => x.id === "INS-0412")!;
    expect(inspectionStatus(i)).toBe("Needs review");
    const retake = reviewInspection(i, { action: "retake", ...reviewer, step: 9 });
    expect(retake.ok && inspectionStatus(retake.inspection)).toBe("Rejected steps");
    expect(reviewInspection(i, { action: "confirm", ...reviewer }).ok).toBe(false); // step 9 failed
  });
});
