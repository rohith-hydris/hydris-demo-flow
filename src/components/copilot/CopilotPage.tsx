"use client";

import { useRole } from "@/src/context/RoleContext";
import CopilotScreen from "./CopilotScreen";

/** Keyed by role, so switching role starts a fresh conversation in the new scope. */
export default function CopilotPage() {
  const { role } = useRole();
  if (!role) return null;
  return <CopilotScreen key={role} role={role} />;
}
