import type { LedgerEntry } from "./types";

// PRODUCT 5.8: Impact Ledger entries for F12 (ledger timeline and the "why did P2 drop" answer).
export const ledger: LedgerEntry[] = [
  { id: "LE-2291", factoryId: "F12", period: "Aug 2026", what: "P2 Availability 0.836 (desilting 1.6 fills/yr)", entryStatus: "Validated", periodStatus: "Verified", p2Availability: 0.836, desiltingFills: 1.6 },
  { id: "LE-2347", factoryId: "F12", period: "Sep 2026", what: "P2 Availability 0.795 (desilting recomputed to 1.5 fills/yr from IMD rainfall update)", entryStatus: "Validated", periodStatus: "Draft", p2Availability: 0.795, desiltingFills: 1.5 },
  { id: "LE-1880", factoryId: "F12", period: "FY2025-26", what: "Baseline and frozen targets (RN 110,000 m3)", entryStatus: "Audited", periodStatus: "Locked" },
];
