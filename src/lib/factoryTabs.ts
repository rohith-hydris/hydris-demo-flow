// The five tabs of the factory page, addressed as /factories/:id?tab=... (PRODUCT 3 and 4.4).
export const FACTORY_TABS = [
  { id: "overview", label: "Overview" },
  { id: "risk", label: "Risk" },
  { id: "impact", label: "Impact" },
  { id: "projects", label: "Projects" },
  { id: "evidence", label: "Evidence and reports" },
] as const;

export type FactoryTab = (typeof FACTORY_TABS)[number]["id"];
export const DEFAULT_FACTORY_TAB: FactoryTab = "overview";

export const parseFactoryTab = (v: string | null | undefined): FactoryTab =>
  FACTORY_TABS.find((t) => t.id === v)?.id ?? DEFAULT_FACTORY_TAB;

export const factoryHref = (id: string, tab?: FactoryTab) => (tab && tab !== DEFAULT_FACTORY_TAB ? `/factories/${id}?tab=${tab}` : `/factories/${id}`);
