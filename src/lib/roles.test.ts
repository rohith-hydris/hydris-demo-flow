import { describe, expect, it } from "vitest";
import { isNavActive, navItemsFor, parseRole, tenantFor } from "./roles";

describe("roles", () => {
  it("parses only the two known roles", () => {
    expect(parseRole("brand")).toBe("brand");
    expect(parseRole("supplier")).toBe("supplier");
    expect(parseRole("admin")).toBeNull();
    expect(parseRole(null)).toBeNull();
  });

  it("names the demo tenants", () => {
    expect(tenantFor("brand")).toMatchObject({ name: "Lumen Apparel Group", roleLabel: "Brand" });
    expect(tenantFor("supplier")).toMatchObject({ name: "Coromandel Denim Mills", roleLabel: "Supplier" });
  });

  it("gives both roles the same four routes, with the first label adapted", () => {
    const brand = navItemsFor("brand");
    const supplier = navItemsFor("supplier");
    expect(brand.map((i) => i.href)).toEqual(["/portfolio", "/ranking", "/claims", "/copilot"]);
    expect(supplier.map((i) => i.href)).toEqual(brand.map((i) => i.href));
    expect(brand[0].label).toBe("Portfolio");
    expect(supplier[0].label).toBe("My factories");
  });

  it("keeps Portfolio active on supplier and factory pages only", () => {
    const [portfolio, ranking] = navItemsFor("brand");
    expect(isNavActive(portfolio, "/portfolio")).toBe(true);
    expect(isNavActive(portfolio, "/suppliers/SUP1")).toBe(true);
    expect(isNavActive(portfolio, "/factories/F12")).toBe(true);
    expect(isNavActive(portfolio, "/ranking")).toBe(false);
    expect(isNavActive(ranking, "/ranking")).toBe(true);
    expect(isNavActive(ranking, "/rankings")).toBe(false);
  });
});
