import type { Factory } from "@/src/lib/data";

export type LayerId = "band" | "health" | "tier" | "pwi";
export interface MarkerStyle { label: string; shape: string; color: string; radius: number; weight: number; dash?: string }

// Presentation lookup only: which hardcoded category a factory belongs to, and how that category is drawn.
// Shape is carried by the text symbol, ring style and size, so colour is never the only cue.
export const layers: Record<LayerId, { label: string; keyOf: (f: Factory) => string; styles: Record<string, MarkerStyle> }> = {
  band: {
    label: "Risk band",
    keyOf: (f) => String(f.band),
    styles: {
      "1": { label: "Band 1 · Highest risk", shape: "▲", color: "#D92D20", radius: 12, weight: 3 },
      "2": { label: "Band 2 · Medium risk", shape: "◆", color: "#F79009", radius: 9, weight: 1.5 },
      "3": { label: "Band 3 · Lower risk", shape: "●", color: "#12B76A", radius: 7, weight: 1.5 },
    },
  },
  health: {
    label: "ETP health",
    keyOf: (f) => f.health,
    styles: {
      Critical: { label: "Critical", shape: "▲", color: "#D92D20", radius: 12, weight: 3 },
      Watch: { label: "Watch", shape: "◆", color: "#F79009", radius: 9, weight: 2, dash: "4 3" },
      Healthy: { label: "Healthy", shape: "●", color: "#12B76A", radius: 7, weight: 1.5 },
    },
  },
  tier: {
    label: "ZDHC tier",
    keyOf: (f) => f.zdhcTier,
    styles: {
      "Not conformant": { label: "Not conformant", shape: "▲", color: "#D92D20", radius: 12, weight: 3 },
      Foundational: { label: "Foundational", shape: "◆", color: "#F79009", radius: 10, weight: 2, dash: "4 3" },
      Progressive: { label: "Progressive", shape: "●", color: "#2347F0", radius: 8, weight: 1.5 },
      Aspirational: { label: "Aspirational", shape: "★", color: "#12B76A", radius: 7, weight: 1.5 },
    },
  },
  pwi: {
    label: "Site PWI",
    keyOf: (f) => f.certBand ?? "Baseline pending",
    styles: {
      "Low confidence": { label: "Low confidence", shape: "▲", color: "#D92D20", radius: 12, weight: 3 },
      "In progress": { label: "In progress", shape: "◆", color: "#F79009", radius: 10, weight: 2, dash: "4 3" },
      "Self-certified": { label: "Self-certified", shape: "■", color: "#2347F0", radius: 8, weight: 1.5 },
      Conditional: { label: "Conditional", shape: "●", color: "#12B76A", radius: 7, weight: 1.5 },
      "Baseline pending": { label: "Baseline pending", shape: "○", color: "#98A2B3", radius: 8, weight: 2, dash: "1 4" },
    },
  },
};
