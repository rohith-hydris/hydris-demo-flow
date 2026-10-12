import { describe, expect, it } from "vitest";
import { factories } from "@/src/data/factories";
import { tamilNaduOutline } from "@/src/data/tnOutline";
import { inView, outlinePath, pinRadius, project, TN_VIEW, viewSize } from "./mapGeometry";
import { getSites, getSuppliers } from "./selectors";
import { scopeFor } from "./scope";
import { filterByBand, parseBand, parseSiteSort, parseSupplierSort, sortSites, sortSuppliers } from "./sort";

const brand = scopeFor("brand");
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("sorting the supplier list (PRODUCT 4.2)", () => {
  const suppliers = getSuppliers(brand);

  it("risk (default): highest average R first, so Coromandel Denim Mills leads", () => {
    expect(ids(sortSuppliers(suppliers, "risk"))).toEqual(["SUP5", "SUP1", "SUP2", "SUP3", "SUP4"]);
  });
  it("name: A to Z", () => {
    expect(sortSuppliers(suppliers, "name").map((s) => s.name)).toEqual([
      "Cauvery Dyeing & Finishing", "Coromandel Denim Mills", "Kongu Knit Processing", "Noyyal Textile Works", "Palar Fabrics",
    ]);
  });
  it("PWI: weakest counted RN-weighted figure first", () => {
    expect(ids(sortSuppliers(suppliers, "pwi"))).toEqual(["SUP2", "SUP1", "SUP3", "SUP5", "SUP4"]);
  });
  it("alerts: most severe first (Critical SUP2, then High SUP1 and SUP5), none last", () => {
    const sorted = sortSuppliers(suppliers, "alerts");
    expect(sorted[0].id).toBe("SUP2");
    expect(ids(sorted).slice(0, 3).sort()).toEqual(["SUP1", "SUP2", "SUP5"]);
    expect(sorted.at(-1)!.openAlerts).toBeGreaterThanOrEqual(0);
  });
  it("does not change the list it is given", () => {
    const before = ids(suppliers);
    sortSuppliers(suppliers, "name");
    expect(ids(suppliers)).toEqual(before);
  });
});

describe("sorting and filtering factories (PRODUCT 4.3)", () => {
  const kongu = getSites(brand).filter((s) => s.supplierId === "SUP1");

  it("rank (default) is the network rank: F02 (2), F01 (3), F03 (11)", () => {
    expect(ids(sortSites(kongu, "rank"))).toEqual(["F02", "F01", "F03"]);
  });
  it("risk R: highest first", () => expect(ids(sortSites(kongu, "risk"))).toEqual(["F01", "F02", "F03"]));
  it("footprint I: largest first", () => expect(ids(sortSites(kongu, "footprint"))).toEqual(["F02", "F01", "F03"]));
  it("PWI: weakest first", () => expect(ids(sortSites(kongu, "pwi"))).toEqual(["F02", "F01", "F03"]));
  it("band: Band 1 first, then rank", () => expect(ids(sortSites(kongu, "band"))).toEqual(["F02", "F01", "F03"]));

  it("filters by band", () => {
    const all = getSites(brand);
    expect(filterByBand(all, 1)).toHaveLength(8);
    expect(filterByBand(all, 2)).toHaveLength(4);
    expect(filterByBand(all, 3)).toHaveLength(2);
    expect(filterByBand(all, null)).toHaveLength(14);
  });

  it("parses unknown query values to the defaults", () => {
    expect(parseSupplierSort("nonsense")).toBe("risk");
    expect(parseSiteSort(undefined)).toBe("rank");
    expect(parseBand("2")).toBe(2);
    expect(parseBand("9")).toBeNull();
  });
});

describe("network map geometry (DESIGN 4.14)", () => {
  it("every factory lies inside the map window", () => {
    for (const f of factories) expect(inView(f.lat, f.lon)).toBe(true);
  });

  it("projects linearly with north up and east to the right", () => {
    const f12 = factories.find((f) => f.id === "F12")!; // Chennai, north-east
    const f10 = factories.find((f) => f.id === "F10")!; // Ranipet
    const f07 = factories.find((f) => f.id === "F07")!; // Palladam, south-west
    const a = project(f12.lat, f12.lon);
    const b = project(f10.lat, f10.lon);
    const c = project(f07.lat, f07.lon);
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(c.y);
    expect(a.x).toBeGreaterThan(b.x);
    expect(b.x).toBeGreaterThan(c.x);
  });

  it("maps the window corners to the SVG corners", () => {
    const { width, height } = viewSize();
    expect(project(TN_VIEW.maxLat, TN_VIEW.minLon)).toEqual({ x: 0, y: 0 });
    const br = project(TN_VIEW.minLat, TN_VIEW.maxLon);
    expect(br.x).toBeCloseTo(width, 9);
    expect(br.y).toBeCloseTo(height, 9);
  });

  it("pin size grows with footprint I; a site without I gets the smallest pin", () => {
    expect(pinRadius(0.9)).toBeGreaterThan(pinRadius(0.1));
    expect(pinRadius(null)).toBe(pinRadius(0));
  });

  it("builds a closed outline path from the hand-drawn points", () => {
    const path = outlinePath(tamilNaduOutline);
    expect(path.startsWith("M")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.match(/L/g)).toHaveLength(tamilNaduOutline.length - 1);
  });
});
