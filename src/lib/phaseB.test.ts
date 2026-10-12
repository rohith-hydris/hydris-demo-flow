import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDE_CAPTION } from "./impact";
import { coverageLine, renormalisationLine } from "./riskCopy";
import { scopeFor } from "./scope";
import { getSites } from "./selectors";
import { INTERNAL_STATUS_NOTE, STATUS_BAND_LABEL, UNCERTAINTY_STATUS, uncertaintyRange } from "./statusCopy";
import { traceConfidence } from "./trace";

const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const SELF = /phaseB\.test\.ts$/;
const sources = () => [...walk("src"), ...walk("app")].filter((f) => /\.(ts|tsx)$/.test(f) && !SELF.test(f)).map((f) => ({ f, text: readFileSync(f, "utf8") }));

describe("V2 4.3: internal status band", () => {
  it("'Certification band' and 'certification' band wording appear nowhere in the code", () => {
    for (const { f, text } of sources()) {
      expect(text, f).not.toMatch(/certification band/i);
      expect(text, f).not.toMatch(/certBand|CertBand|CertPill|certificationBand/);
    }
  });
  it("uses the new label and the non-certification line", () => {
    expect(STATUS_BAND_LABEL).toBe("Internal status band");
    expect(INTERNAL_STATUS_NOTE).toBe("Internal status. Not an external certification.");
    const t = traceConfidence(getSites(scopeFor("brand")).find((s) => s.id === "F12")!);
    expect(t.inputs.map((i) => i.label)).toContain("Internal status band");
    expect(t.inputs.find((i) => i.label === "Internal status band")!.value).toContain("Internal status. Not an external certification.");
    expect(t.inputs.map((i) => i.label)).toContain("Uncertainty range");
    expect(t.inputs.find((i) => i.label === "Correlations")!.value).toBe("Correlation assumptions: not yet defined");
    expect(t.inputs.find((i) => i.label === "Uncertainty range")!.value).toContain("Demo assumption, not yet justified");
  });
  it("grade and uncertainty are separate: the grade does not change, the range comes from the placeholder table", () => {
    expect(UNCERTAINTY_STATUS).toBe("Demo assumption, not yet justified");
    const r = uncertaintyRange(0.698, "B");
    expect(r.fraction).toBe(0.15);
    expect(r.low).toBeCloseTo(0.698 * 0.85, 12);
    expect(r.high).toBeCloseTo(0.698 * 1.15, 12);
    expect(uncertaintyRange(0.95, "D").high).toBe(1);
  });
});

describe("V2 4.4: Guide toggle caption", () => {
  it("says proposed corrections and pending reconciliation, never 'corrects 20 issues'", () => {
    expect(GUIDE_CAPTION).toBe("Shows the effect of the proposed PWI-M 1.0 corrections. Reconciliation of the 20 source issues is pending.");
    for (const { f, text } of sources()) expect(text, f).not.toMatch(/corrects \{?\w*\}? ?(20 )?issues|issues resolved/i);
  });
});

describe("V2 4.2 and 6: missing-data wording and columns", () => {
  const sites = getSites(scopeFor("brand"));
  const by = (id: string) => sites.find((s) => s.id === id)!;
  it("'missing indicators never lower R' appears in no code, test or UI copy", () => {
    for (const { f, text } of sources()) expect(text, f).not.toMatch(/never lower|never lowers/i);
  });
  it("risk tab header: F10 shows 90% coverage; no pillar is missing; the wording never calls renormalisation neutral", () => {
    expect(coverageLine(by("F10"))).toBe("Data coverage 90% (9 of 10 risk indicators have a reading)");
    expect(renormalisationLine(by("F10"))).toContain("highest of the rest");
    expect(coverageLine(by("F01"))).toContain("100%");
    for (const s of sites) expect(renormalisationLine(s)).not.toMatch(/neutral|no effect/i);
  });
  it("a missing pillar's line states the effect and that it can raise or lower R", () => {
    const fake = { ...by("F01"), missingPillars: ["groundwater" as const], renormDelta: -0.013 };
    const line = renormalisationLine(fake);
    expect(line).toContain("lowered R by 0.01");
    expect(line).toContain("can raise or lower R");
    expect(renormalisationLine({ ...fake, renormDelta: 0.02 })).toContain("raised R by 0.02");
  });
  it("Readiness is informational: F12 is 8 of 12 documents Ready, and it does not change rank or order", () => {
    expect(Math.round(by("F12").readiness * 12)).toBe(8);
    expect(sites.map((s) => s.id)).toEqual(["F12", "F02", "F01", "F09", "F04", "F14", "F13", "F06", "F05", "F10", "F03", "F07", "F11", "F08"]);
    // Band 1 sites stay visible whatever their readiness: the least ready Band 1 site is still ranked among the top 8.
    const band1 = sites.filter((s) => s.band === 1);
    expect(band1).toHaveLength(8);
    const leastReady = [...band1].sort((a, b) => a.readiness - b.readiness)[0];
    expect(sites.indexOf(leastReady)).toBeLessThan(8);
  });
  it("Coverage is 100% for every site except F02, F10 and F11, which are at 90%", () => {
    expect(sites.filter((s) => s.riskCoverage.share < 1).map((s) => [s.id, s.riskCoverage.share]).sort()).toEqual([["F02", 0.9], ["F10", 0.9], ["F11", 0.9]]);
  });
});
