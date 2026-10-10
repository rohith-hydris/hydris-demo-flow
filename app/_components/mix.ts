import type { CertBand, Health, SupplierSummary, ZdhcTier } from "@/src/lib/data";
import { healthMeta, tierMeta, type Segment, type ShapeKind, type Tone } from "@/src/components/ui";

// Presentation lookups only: order and look of each category. Counts and widths come from the data layer.
const HEALTHS: Health[] = ["Healthy", "Watch", "Critical"];
const TIERS: ZdhcTier[] = ["Aspirational", "Progressive", "Foundational", "Not conformant"];
const CERTS: CertBand[] = ["Conditional", "In progress", "Self-certified", "Low confidence", "Not achieved"];
const certMeta: Record<CertBand, { tone: Tone; shape: ShapeKind }> = {
  Conditional: { tone: "positive", shape: "circle" },
  "In progress": { tone: "caution", shape: "diamond" },
  "Self-certified": { tone: "info", shape: "square" },
  "Low confidence": { tone: "negative", shape: "triangle" },
  "Not achieved": { tone: "neutral", shape: "dash" },
};

export const healthSegments = (s: SupplierSummary): Segment[] =>
  HEALTHS.map((h) => ({ label: h, count: s.healthMix[h], pct: s.healthMixPct[h], ...healthMeta[h] }));
export const tierSegments = (s: SupplierSummary): Segment[] =>
  TIERS.map((t) => ({ label: t, count: s.tierMix[t], pct: s.tierMixPct[t], ...tierMeta[t] }));
export const certSegments = (s: SupplierSummary): Segment[] =>
  CERTS.map((c) => ({ label: c, count: s.certBandSpread[c], pct: s.certBandSpreadPct[c], ...certMeta[c] }));
