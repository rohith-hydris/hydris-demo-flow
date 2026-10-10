import { describe, expect, it } from "vitest";
import { countLine, portfolioKpis, supplierKpis } from "./kpis";
import { getPortfolio, getSupplier } from "./selectors";
import { scopeFor } from "./scope";

describe("KPI strips (PRODUCT 4.2, DESIGN 5.2)", () => {
  const brand = portfolioKpis(getPortfolio(scopeFor("brand")), "brand");
  const byLabel = (label: string) => brand.find((k) => k.label === label)!;

  it("brand: PWI shows 68.9% unweighted beside 62.6% RN-weighted with the caption", () => {
    const k = byLabel("Portfolio PWI");
    expect(k.value).toBe("68.9%");
    expect(k.extra).toEqual([{ label: "RN-weighted", value: "62.6%" }]);
    expect(k.context).toContain("RN-weighted stops a small site hiding a large one");
  });

  it("brand: 8 sites of 14 in Band 1, 9 open alerts split by severity, 7 claims, 3 plants off-track", () => {
    expect(byLabel("Sites in Band 1")).toMatchObject({ value: 8, context: "of 14 sites, risk R of 0.60 or more" });
    expect(byLabel("Open alerts")).toMatchObject({ value: 9, context: "1 Critical · 2 High · 4 Medium · 2 Info" });
    expect(byLabel("Claims to validate").value).toBe(7);
    expect(byLabel("Plants off-track").value).toBe(3);
  });

  it("supplier role: the same strip, scoped to the three Coromandel factories", () => {
    const k = portfolioKpis(getPortfolio(scopeFor("supplier")), "supplier");
    expect(k[0].label).toBe("PWI across your factories");
    expect(k.find((x) => x.label === "Sites in Band 1")).toMatchObject({ value: 3, context: "of 3 sites, risk R of 0.60 or more" });
    expect(k.find((x) => x.label === "Open alerts")!.value).toBe(2);
    expect(k.find((x) => x.label === "Plants off-track")!.value).toBe(1);
  });

  it("supplier detail totals for Kongu Knit Processing: R 0.66, PWI 64.2% / 58.5%, RN 280,000", () => {
    const k = supplierKpis(getSupplier(scopeFor("brand"), "SUP1")!);
    const get = (label: string) => k.find((x) => x.label.startsWith(label))!;
    expect(get("Average risk").value).toBe("0.66");
    expect(get("PWI")).toMatchObject({ value: "64.2%", extra: [{ label: "RN-weighted", value: "58.5%" }] });
    expect(get("Replenishment").value).toBe("280,000");
    expect(get("Average plant health").value).toBe(77); // (78 + 61 + 91) / 3 = 76.67
  });

  it("describes counts with correct plurals", () => {
    expect(countLine(5, 14)).toBe("5 suppliers · 14 factories");
    expect(countLine(null, 3)).toBe("3 factories");
    expect(countLine(1, 1)).toBe("1 supplier · 1 factory");
  });
});
