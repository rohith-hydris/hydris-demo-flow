"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { scenarios as seedScenarios, type ScenarioRecord } from "@/src/data/scenarios";
import { importFinding, initialImports, type ImportMap, type ImportResult } from "@/src/lib/catalogue";
import type { LiteFinding } from "@/src/data/opportunities";
import { defaultBaseline, type ApprovedBaseline } from "@/src/lib/impactView";

// Local, demo-only state for the Projects pages: Lite imports, scenarios the user saved, and the approved delivery baseline.
// It lives in the app shell, so it survives moving between pages and resets on a full reload. Nothing is sent anywhere.

export const MAX_COMPARE = 3;

interface ProjectsState {
  imports: ImportMap;
  /** Imports a finding. The same finding twice returns the existing record and creates no duplicate. */
  importLite: (f: LiteFinding) => ImportResult;
  scenarios: ScenarioRecord[];
  /** Saves a scenario unless one with the same opportunities already exists. Returns the saved or existing record. */
  saveScenario: (factoryId: ScenarioRecord["factoryId"], name: string, items: string[]) => { scenario: ScenarioRecord; created: boolean };
  /** The scenario approved as the delivery baseline. S1 at the start of the demo (V2 12). */
  approved: ApprovedBaseline;
  approve: (s: ScenarioRecord) => void;
}

const Ctx = createContext<ProjectsState | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [imports, setImports] = useState<ImportMap>(initialImports);
  const [scenarios, setScenarios] = useState<ScenarioRecord[]>(seedScenarios);
  const [approved, setApproved] = useState<ApprovedBaseline>(defaultBaseline);

  // Idempotence is decided against the current map, so a double click cannot add two records.
  const importLite = useCallback((f: LiteFinding) => {
    const res = importFinding(imports, f);
    if (res.created) setImports(res.imports);
    return res;
  }, [imports]);

  const saveScenario = useCallback<ProjectsState["saveScenario"]>((factoryId, name, items) => {
    const key = [...items].sort().join("|");
    const existing = scenarios.find((s) => [...s.items].sort().join("|") === key);
    if (existing) return { scenario: existing, created: false };
    const n = scenarios.filter((s) => s.id.startsWith("C")).length + 1;
    const scenario: ScenarioRecord = { id: `C${n}`, factoryId, name: name.trim() || `Custom ${n}`, items, blurb: "Built in the scenario builder." };
    setScenarios((list) => [...list, scenario]);
    return { scenario, created: true };
  }, [scenarios]);

  const approve = useCallback((s: ScenarioRecord) => setApproved({ id: s.id, items: [...s.items] }), []);

  const value = useMemo(() => ({ imports, importLite, scenarios, saveScenario, approved, approve }), [imports, importLite, scenarios, saveScenario, approved, approve]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProjects(): ProjectsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProjects must be used inside ProjectsProvider");
  return ctx;
}
