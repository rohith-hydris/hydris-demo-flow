// PRODUCT 5.1 and 5.2: tenants, reporting period and the demo "today". Illustrative data.
export const BRAND_TENANT = { name: "Lumen Apparel Group", initials: "LA" } as const;

/** Every demo factory is in Tamil Nadu. Used to match funders by region. */
export const DEMO_REGION = "Tamil Nadu";

export const DEMO_SUPPLIER_ID = "SUP5";
export const SUPPLIER_TENANT = { name: "Coromandel Denim Mills", initials: "CD" } as const;

export const REPORTING_PERIOD = { label: "FY2025-26", status: "Locked" } as const;
export const CURRENT_MONTH = { label: "September 2026", status: "Draft" } as const;
/** Demo estimate: months of the monitoring year elapsed, April to September 2026 (CURRENT_MONTH). Pro-rates annual targets. */
export const MONTHS_ELAPSED = 6;
export const TODAY = "10 Oct 2026";
/** The demo's "today" as an ISO date, for the day counts in src/lib (monitoring overdue days). The same day as TODAY. */
export const DEMO_TODAY = "2026-10-10";
