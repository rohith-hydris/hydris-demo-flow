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

  it("gives each role six routes: Projects for the supplier, Supplier actions for the brand", () => {
    const brand = navItemsFor("brand");
    const supplier = navItemsFor("supplier");
    expect(brand.map((i) => i.href)).toEqual(["/portfolio", "/ranking", "/impact", "/actions", "/claims", "/copilot"]);
    expect(brand[3]).toMatchObject({ label: "Supplier actions", match: ["/actions"] });
    expect(supplier.map((i) => i.href)).toEqual(["/portfolio", "/ranking", "/impact", "/projects", "/claims", "/copilot"]);
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
