"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { parseRole, type Role } from "@/src/lib/roles";
import { scopeFor, type Scope } from "@/src/lib/scope";

// Demo-only role switch. The role lives in sessionStorage so a refresh keeps it, with an in-memory fallback
// when storage is blocked. useSyncExternalStore gives `undefined` on the server and during hydration.
const KEY = "hydris.role";
const listeners = new Set<() => void>();
let memoryRole: Role | null = null;

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

function readRole(): Role | null {
  try { return parseRole(window.sessionStorage.getItem(KEY)); } catch { return memoryRole; }
}

function writeRole(role: Role | null) {
  memoryRole = role;
  try {
    if (role) window.sessionStorage.setItem(KEY, role);
    else window.sessionStorage.removeItem(KEY);
  } catch { /* storage blocked: the in-memory copy still works for this tab */ }
  listeners.forEach((fn) => fn());
}

interface RoleState {
  role: Role | null;
  /** What this role may see: brand = 5 suppliers and 14 factories, supplier = SUP5 only. Null until a role is chosen. */
  scope: Scope | null;
  /** False until the browser has read the stored role, so pages do not redirect too early. */
  ready: boolean;
  setRole: (role: Role) => void;
  clearRole: () => void;
}

const RoleContext = createContext<RoleState | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore<Role | null | undefined>(subscribe, readRole, () => undefined);
  const value = useMemo<RoleState>(
    () => ({
      role: snapshot ?? null, scope: snapshot ? scopeFor(snapshot) : null, ready: snapshot !== undefined,
      setRole: writeRole, clearRole: () => writeRole(null),
    }),
    [snapshot],
  );
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}

/** The current role's data scope. Only valid on inner pages, which AppGate renders once a role exists. */
export function useScope(): Scope {
  const { scope } = useRole();
  if (!scope) throw new Error("useScope needs a role: render it inside AppGate");
  return scope;
}
