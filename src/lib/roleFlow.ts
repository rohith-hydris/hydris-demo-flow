import type { Role } from "./roles";

// Page heading by role, and the brand's validation caption.

export const validationBy = (brandName: string) => `Validation by ${brandName}.`;

export interface PageHeading { breadcrumbRoot: "Portfolio" | "My factories"; scopeLine: string; showSupplierFilter: boolean }
export interface HeadingInfo { brandName: string; supplierName: string; supplierCount: number; factoryCount: number }

const suppliersText = (n: number) => (n === 1 ? "1 supplier" : `${n} suppliers`);
const factoriesText = (n: number) => (n === 1 ? "1 factory" : `${n} factories`);

export function rolePageHeading(role: Role, info: HeadingInfo): PageHeading {
  return role === "brand"
    ? { breadcrumbRoot: "Portfolio", showSupplierFilter: true, scopeLine: `${info.brandName} · ${suppliersText(info.supplierCount)} · ${factoriesText(info.factoryCount)}` }
    : { breadcrumbRoot: "My factories", showSupplierFilter: false, scopeLine: `${info.supplierName} · ${factoriesText(info.factoryCount)}. Showing only your factories.` };
}
