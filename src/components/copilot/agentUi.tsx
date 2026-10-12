import { FileCheck2, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import type { AgentId } from "@/src/data/copilotScripts";

// Each agent has its own icon and tint (DESIGN 5.7): Copilot blue, Evidence green, Validation violet.
export const AGENT_ICON: Record<AgentId, LucideIcon> = { copilot: Sparkles, evidence: FileCheck2, validation: ShieldCheck };

export const AGENT_TINT: Record<AgentId, string> = {
  copilot: "bg-blue-100 text-blue-600",
  evidence: "bg-[var(--positive-bg)] text-[var(--positive-fg)]",
  validation: "bg-[var(--internal-bg)] text-[var(--internal-fg)]",
};

export function AgentAvatar({ agent, size = "md" }: { agent: AgentId; size?: "sm" | "md" }) {
  const Icon = AGENT_ICON[agent];
  return (
    <span className={`grid shrink-0 place-items-center rounded-full ${AGENT_TINT[agent]} ${size === "sm" ? "size-8" : "size-10"}`} aria-hidden="true">
      <Icon className={size === "sm" ? "size-4" : "size-5"} />
    </span>
  );
}
