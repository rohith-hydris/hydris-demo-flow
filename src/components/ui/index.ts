export * from "./StatusPill";
export * from "./ProposedBadge";
export * from "./Bars";
export * from "./Layout";
export * from "./Controls";
export * from "./Tabs";
export * from "./Segmented";
export * from "./CitationChip";
export { default as DataTable, RowLink, type Column } from "./DataTable";

// Display formatting only. Values arrive final from the data layer.
export const pct = (v: number | null) => (v === null ? "Pending" : `${Math.round(v * 100)}%`);
