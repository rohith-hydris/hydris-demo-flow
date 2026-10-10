// PRODUCT 5.1 and 5.2: tenants, reporting period and the demo "today". Illustrative data.
export const BRAND_TENANT = { name: "Lumen Apparel Group", initials: "LA" } as const;

export const DEMO_SUPPLIER_ID = "SUP5";
export const SUPPLIER_TENANT = { name: "Coromandel Denim Mills", initials: "CD" } as const;

export const REPORTING_PERIOD = { label: "FY2025-26", status: "Locked" } as const;
export const CURRENT_MONTH = { label: "September 2026", status: "Draft" } as const;
export const TODAY = "10 Oct 2026";
