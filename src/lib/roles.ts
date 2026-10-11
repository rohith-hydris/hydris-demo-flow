import { BRAND_TENANT, SUPPLIER_TENANT } from "@/src/data/tenants";

export type Role = "brand" | "supplier";
export const ROLES: readonly Role[] = ["brand", "supplier"];

export const parseRole = (v: unknown): Role | null => (v === "brand" || v === "supplier" ? v : null);

export interface NavItem {
  href: string;
  label: string;
  /** Path prefixes that keep this item highlighted, for example drill-down pages. */
  match: string[];
  sparkle?: boolean;
}

// PRODUCT 3 and V2 15 (Projects is added in a later phase): same items for both roles; the Portfolio item adapts its label.
export function navItemsFor(role: Role): NavItem[] {
  return [
    { href: "/portfolio", label: role === "brand" ? "Portfolio" : "My factories", match: ["/portfolio", "/suppliers", "/factories"] },
    { href: "/ranking", label: "Ranking", match: ["/ranking"] },
    { href: "/impact", label: "Impact", match: ["/impact"] },
    { href: "/claims", label: "Claims & Evidence", match: ["/claims"] },
    { href: "/copilot", label: "Copilot", match: ["/copilot"], sparkle: true },
  ];
}

export const isNavActive = (item: NavItem, pathname: string) =>
  item.match.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const tenantFor = (role: Role) => ({
  name: role === "brand" ? BRAND_TENANT.name : SUPPLIER_TENANT.name,
  initials: role === "brand" ? BRAND_TENANT.initials : SUPPLIER_TENANT.initials,
  roleLabel: role === "brand" ? "Brand" : "Supplier",
});
