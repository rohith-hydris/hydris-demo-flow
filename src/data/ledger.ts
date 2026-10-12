import type { LedgerEntry } from "./types";

// PRODUCT 5.8: Impact Ledger entries for F12, one per cell of the 3 x 3 grid (issue B4), each with its lineage: the facts it read,
// the method version, the formula and the inputs. Entries form a hash chain (src/lib/ledger.ts), oldest first by entry number.
// `previousHash` and `hash` are demo hashes sealed by sealChain(); the ledger tests verify them. Illustrative.
// The inputs for the new Sep 2026 entries are the delivered and target amounts of the F12 worked example (src/data/f12Example.ts).
const PWI = "PWI-M 1.0";
const MIN = "S = min(1, delivered ÷ target)";

export const ledger: LedgerEntry[] = [
  {
    id: "LE-1880", factoryId: "F12", period: "FY2025-26", what: "Baseline and frozen targets (RN 110,000 m3)", entryStatus: "Audited", periodStatus: "Locked",
    factIds: ["FACT-F12-WMETER-FY2526", "FACT-F12-DISCHARGE-FY2526", "FACT-F12-ROSTER-MAR26"], methodVersion: PWI,
    formula: "RN = a × (W_fw − D_basin); targets T_A = 0.20 / 0.40 / 0.40 × RN, T_W = E, E × (h − 1) ÷ 2",
    inputs: [
      { label: "Baseline freshwater withdrawal W_fw", value: 250000, unit: "m3" }, { label: "Compliant same-basin discharge D_basin", value: 140000, unit: "m3" },
      { label: "Attributable share a", value: 1, unit: "ratio" }, { label: "Headcount E", value: 1200, unit: "people" }, { label: "Household size h", value: 3.9, unit: "people" },
    ],
    previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
    hash: "d8bb98a8289bd519e942b12a00b517da44a139f3df0a16e4847b475e90dd9df5",
  },
  {
    id: "LE-2291", factoryId: "F12", period: "Aug 2026", what: "P2 Availability 0.836 (desilting 1.6 fills/yr)", entryStatus: "Validated", periodStatus: "Verified", p2Availability: 0.836, desiltingFills: 1.6,
    cell: { pillar: "P2", dimension: "Availability" }, factIds: ["FACT-PRJ-101-FILLS-AUG26", "FACT-PRJ-102-RECHARGE-AUG26"], methodVersion: PWI,
    formula: "Desilting = capacity × fills per year × net fraction; S = min(1, (desilting + recharge) ÷ target)",
    inputs: [
      { label: "Desilted capacity", value: 30000, unit: "m3" }, { label: "Fills per year", value: 1.6, unit: "fills" }, { label: "Net fraction", value: 0.6, unit: "ratio" },
      { label: "Recharge", value: 8000, unit: "m3" }, { label: "Target", value: 44000, unit: "m3" },
    ],
    previousHash: "d8bb98a8289bd519e942b12a00b517da44a139f3df0a16e4847b475e90dd9df5",
    hash: "be2cb389b5ecad8b965f494334f5ebd220c7628f681cb7e812efad03408a5c25",
  },
  {
    id: "LE-2341", factoryId: "F12", period: "Sep 2026", what: "P1 Availability, on-site recycling, reclaim and recharge", entryStatus: "Validated", periodStatus: "Draft",
    cell: { pillar: "P1", dimension: "Availability" }, factIds: ["FACT-F12-REUSE-METERS-SEP26"], methodVersion: PWI, formula: MIN,
    inputs: [{ label: "Delivered", value: 21000, unit: "m3" }, { label: "Target", value: 22000, unit: "m3" }],
    previousHash: "be2cb389b5ecad8b965f494334f5ebd220c7628f681cb7e812efad03408a5c25",
    hash: "a609f0b52db1bb786b25aa5b56a1aa80077a1bc7c022c44d458fea6e67b74cf8",
  },
  {
    id: "LE-2342", factoryId: "F12", period: "Sep 2026", what: "P1 Accessibility, headcount served on site", entryStatus: "Validated", periodStatus: "Draft",
    cell: { pillar: "P1", dimension: "Accessibility" }, factIds: ["FACT-F12-ROSTER-MAR26"], methodVersion: PWI, formula: MIN,
    inputs: [{ label: "Delivered", value: 1200, unit: "people" }, { label: "Target", value: 1200, unit: "people" }],
    previousHash: "a609f0b52db1bb786b25aa5b56a1aa80077a1bc7c022c44d458fea6e67b74cf8",
    hash: "3c89964c3211728e7cd1ce15dfdb45b0c20c9dc1012a74fca92d01dbedd1ddf5",
  },
  {
    id: "LE-2343", factoryId: "F12", period: "Sep 2026", what: "P1 Quality, ETP pollutant removal", entryStatus: "Validated", periodStatus: "Draft",
    cell: { pillar: "P1", dimension: "Quality" }, factIds: ["FACT-F12-NABL-LAB-FY2526", "FACT-F12-OCEMS-ETPOUT1"], methodVersion: PWI,
    formula: "S = mean over TSS, TN, TP of min(1, removal ÷ 90%)",
    inputs: [
      { label: "TSS removal", value: 92.5, unit: "%" }, { label: "TN removal", value: 75, unit: "%" }, { label: "TP removal", value: 80, unit: "%" }, { label: "Target removal", value: 90, unit: "%" },
    ],
    previousHash: "3c89964c3211728e7cd1ce15dfdb45b0c20c9dc1012a74fca92d01dbedd1ddf5",
    hash: "1e975ebb09aca1194f3afea6fc4cc7de7c33f24e205e75cf36f4a0f47bbb8d65",
  },
  {
    id: "LE-2344", factoryId: "F12", period: "Sep 2026", what: "P2 Accessibility, ward drinking water supply", entryStatus: "Validated", periodStatus: "Draft",
    cell: { pillar: "P2", dimension: "Accessibility" }, factIds: ["FACT-PRJ-104-WASH-SEP26"], methodVersion: PWI, formula: MIN,
    inputs: [{ label: "Delivered", value: 1500, unit: "people" }, { label: "Target", value: 1740, unit: "people" }],
    previousHash: "1e975ebb09aca1194f3afea6fc4cc7de7c33f24e205e75cf36f4a0f47bbb8d65",
    hash: "edef2b667ef8f675d00995fb074c17d377579fb7a67bf759cd9fa14715ad43f7",
  },
  {
    id: "LE-2345", factoryId: "F12", period: "Sep 2026", what: "P2 Quality, sub-basin tertiary treatment", entryStatus: "Validated", periodStatus: "Draft",
    cell: { pillar: "P2", dimension: "Quality" }, factIds: ["FACT-PRJ-106-LAB-INLET-OUTLET"], methodVersion: PWI,
    formula: "S = mean over TSS, TN, TP of min(1, delivered kg ÷ target kg)",
    inputs: [
      { label: "TSS delivered", value: 2500, unit: "kg" }, { label: "TN delivered", value: 200, unit: "kg" }, { label: "TP delivered", value: 40, unit: "kg" },
      { label: "TSS target", value: 3000, unit: "kg" }, { label: "TN target", value: 450, unit: "kg" }, { label: "TP target", value: 75, unit: "kg" },
    ],
    previousHash: "edef2b667ef8f675d00995fb074c17d377579fb7a67bf759cd9fa14715ad43f7",
    hash: "ca8541b07e19ca2fedc97853b6cd833b0f72d283bccde25c8fc837054b442e0b",
  },
  {
    id: "LE-2346", factoryId: "F12", period: "Sep 2026", what: "P3 Availability, Pallikaranai marsh restoration at 50% attribution", entryStatus: "Validated", periodStatus: "Draft",
    cell: { pillar: "P3", dimension: "Availability" }, factIds: ["FACT-PRJ-103-INUNDATION-JRC", "FACT-PRJ-103-AGREEMENT"], methodVersion: PWI,
    formula: "Counted = inundation volume × attribution share; S = min(1, counted ÷ target)",
    inputs: [{ label: "Inundation volume", value: 50000, unit: "m3" }, { label: "Attribution share", value: 0.5, unit: "ratio" }, { label: "Target", value: 44000, unit: "m3" }],
    previousHash: "ca8541b07e19ca2fedc97853b6cd833b0f72d283bccde25c8fc837054b442e0b",
    hash: "a728178a1ca28e4046184deaf97494ef7e8a9bed597e97b7567a5039607f54ea",
  },
  {
    id: "LE-2347", factoryId: "F12", period: "Sep 2026", what: "P2 Availability 0.795 (desilting recomputed to 1.5 fills/yr from IMD rainfall update)", entryStatus: "Validated", periodStatus: "Draft", p2Availability: 0.795, desiltingFills: 1.5,
    cell: { pillar: "P2", dimension: "Availability" }, factIds: ["FACT-PRJ-101-FILLS-SEP26", "FACT-IMD-RAINFALL-UPDATE", "FACT-PRJ-102-RECHARGE-AUG26"], methodVersion: PWI,
    formula: "Desilting = capacity × fills per year × net fraction; S = min(1, (desilting + recharge) ÷ target)",
    inputs: [
      { label: "Desilted capacity", value: 30000, unit: "m3" }, { label: "Fills per year", value: 1.5, unit: "fills" }, { label: "Net fraction", value: 0.6, unit: "ratio" },
      { label: "Recharge", value: 8000, unit: "m3" }, { label: "Target", value: 44000, unit: "m3" },
    ],
    previousHash: "a728178a1ca28e4046184deaf97494ef7e8a9bed597e97b7567a5039607f54ea",
    hash: "0c31024ba3851b02bbde90727008ea20c7c193e2e68cfac4904ef253ccfad984",
  },
  {
    id: "LE-2348", factoryId: "F12", period: "Sep 2026", what: "P3 Accessibility, Adyar riverside toilets and water points (monitoring check overdue)", entryStatus: "Validated", periodStatus: "Draft",
    cell: { pillar: "P3", dimension: "Accessibility" }, factIds: ["FACT-PRJ-105-WASH-AUDIT"], methodVersion: PWI, formula: MIN,
    inputs: [{ label: "Delivered", value: 900, unit: "people" }, { label: "Target", value: 1740, unit: "people" }],
    previousHash: "0c31024ba3851b02bbde90727008ea20c7c193e2e68cfac4904ef253ccfad984",
    hash: "5c5f2c1fcb2929d827deda4ac6b180f729edf3d3f572c3de30d316cf5fd651a7",
  },
  {
    id: "LE-2349", factoryId: "F12", period: "Sep 2026", what: "P3 Quality, no basin quality project registered", entryStatus: "Validated", periodStatus: "Draft",
    cell: { pillar: "P3", dimension: "Quality" }, factIds: [], methodVersion: PWI,
    formula: "S = mean over TSS, TN, TP of min(1, delivered kg ÷ target kg); no baseline, no benefit",
    inputs: [
      { label: "TSS delivered", value: 0, unit: "kg" }, { label: "TN delivered", value: 0, unit: "kg" }, { label: "TP delivered", value: 0, unit: "kg" },
      { label: "TSS target", value: 3000, unit: "kg" }, { label: "TN target", value: 450, unit: "kg" }, { label: "TP target", value: 75, unit: "kg" },
    ],
    previousHash: "5c5f2c1fcb2929d827deda4ac6b180f729edf3d3f572c3de30d316cf5fd651a7",
    hash: "fe3d4b95d1d9ce018dd321c643c13ce817d5d4e06042234052c8ecb4b20119ef",
  },
];
