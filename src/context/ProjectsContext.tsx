"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { scenarios as seedScenarios, type ScenarioRecord } from "@/src/data/scenarios";
import { importFinding, importMany as importBatch, initialImports, type ImportMap, type ImportResult, type LiteOutcome } from "@/src/lib/catalogue";
import type { LiteFinding } from "@/src/data/opportunities";
import { defaultBaseline, type ApprovedBaseline } from "@/src/lib/impactView";
import { opportunityById } from "@/src/lib/catalogue";
import { canApproveBaseline } from "@/src/lib/baseline";
import { applyCommit, type Commitments } from "@/src/lib/funding";
import { possibleFunders, type Shortlist } from "@/src/lib/funders";
import { useRole } from "@/src/context/RoleContext";
import type { Role } from "@/src/lib/roles";

// Local, demo-only state for the Projects pages: Lite imports, scenarios the user saved, the approved delivery baseline and
// funding commitments.
// It lives in the app shell, so it survives moving between pages and resets on a full reload. Nothing is sent anywhere.

export const MAX_COMPARE = 3;

interface ProjectsState {
  imports: ImportMap;
  /** Imports a finding. The same finding twice returns the existing record and creates no duplicate. */
  importLite: (f: LiteFinding) => ImportResult;
  /** Imports several findings at once (copilot C9). Same rule: no duplicates. */
  importMany: (fs: LiteFinding[]) => LiteOutcome[];
  scenarios: ScenarioRecord[];
  /** Saves a scenario unless one with the same opportunities already exists. Returns the saved or existing record. */
  saveScenario: (factoryId: ScenarioRecord["factoryId"], name: string, items: string[]) => { scenario: ScenarioRecord; created: boolean };
  /** The scenario approved as the delivery baseline. S1 at the start of the demo (V2 12). */
  approved: ApprovedBaseline;
  /** Sets the approved baseline, only when the role may approve it (canApproveBaseline). Otherwise nothing changes. */
  approve: (s: ScenarioRecord) => void;
  /** Funding commitments recorded per opportunity. A commitment is not a result: the opportunity stays Forecast (R2). */
  commitments: Commitments;
  /** Records the role's commitment, unless canCommit refuses it. Committing twice changes nothing and still returns ok. */
  commit: (oppId: string, role: Role) => { ok: true } | { ok: false; reason: string };
  /** Funders the supplier shortlisted per opportunity. A shortlist is not a participant and changes no project (R3). */
  shortlist: Shortlist;
  /** Adds or removes a funder from the shortlist, only if the funder is currently eligible for the opportunity. */
  toggleFunder: (oppId: string, funderId: string) => { ok: true } | { ok: false; reason: string };
}

const Ctx = createContext<ProjectsState | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [imports, setImports] = useState<ImportMap>(initialImports);
  const [scenarios, setScenarios] = useState<ScenarioRecord[]>(seedScenarios);
  const [approved, setApproved] = useState<ApprovedBaseline>(defaultBaseline);
  const [commitments, setCommitments] = useState<Commitments>({});
  const [shortlist, setShortlist] = useState<Shortlist>({});
  const { role } = useRole();

  // Idempotence is decided against the current map, so a double click cannot add two records.
  const importLite = useCallback((f: LiteFinding) => {
    const res = importFinding(imports, f);
    if (res.created) setImports(res.imports);
    return res;
  }, [imports]);

  const importMany = useCallback((fs: LiteFinding[]) => {
    const res = importBatch(imports, fs);
    if (res.outcomes.some((o) => o.created)) setImports(res.imports);
    return res.outcomes;
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

  const approve = useCallback((s: ScenarioRecord) => { if (role && canApproveBaseline(role)) setApproved({ id: s.id, items: [...s.items] }); }, [role]);

  const commit = useCallback<ProjectsState["commit"]>((oppId, role) => {
    const opp = opportunityById(oppId);
    if (!opp) return { ok: false, reason: `No opportunity ${oppId}.` };
    const res = applyCommit(commitments, opp, role);
    if (!res.ok) return res;
    if (res.commitments !== commitments) setCommitments(res.commitments);
    return { ok: true };
  }, [commitments]);

  const toggleFunder = useCallback<ProjectsState["toggleFunder"]>((oppId, funderId) => {
    const opp = opportunityById(oppId);
    if (!opp) return { ok: false, reason: `No opportunity ${oppId}.` };
    const current = shortlist[oppId] ?? [];
    // Removing is always allowed; adding needs a currently eligible funder.
    if (!current.includes(funderId) && !possibleFunders(opp).eligible.some((f) => f.id === funderId)) return { ok: false, reason: "This funder does not match the opportunity." };
    setShortlist({ ...shortlist, [oppId]: current.includes(funderId) ? current.filter((x) => x !== funderId) : [...current, funderId] });
    return { ok: true };
  }, [shortlist]);

  const value = useMemo(
    () => ({ imports, importLite, importMany, scenarios, saveScenario, approved, approve, commitments, commit, shortlist, toggleFunder }),
    [imports, importLite, importMany, scenarios, saveScenario, approved, approve, commitments, commit, shortlist, toggleFunder],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProjects(): ProjectsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProjects must be used inside ProjectsProvider");
  return ctx;
}
