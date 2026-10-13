import type { SupplierRecord } from "./types";

// PRODUCT 5.2. SUP5 is the demo supplier login. sizeClass is illustrative, demo only.
export const suppliers: SupplierRecord[] = [
  { id: "SUP1", name: "Kongu Knit Processing", cluster: "Tiruppur", factoryIds: ["F01", "F02", "F03"], sizeClass: "MSME" },
  { id: "SUP2", name: "Cauvery Dyeing & Finishing", cluster: "Karur / Erode", factoryIds: ["F04", "F05", "F06"], sizeClass: "Large" },
  { id: "SUP3", name: "Noyyal Textile Works", cluster: "Tiruppur", factoryIds: ["F07", "F08", "F09"], sizeClass: "Large" },
  { id: "SUP4", name: "Palar Fabrics", cluster: "Ranipet / Vellore", factoryIds: ["F10", "F11"], sizeClass: "Large" },
  { id: "SUP5", name: "Coromandel Denim Mills", cluster: "Chennai belt", factoryIds: ["F12", "F13", "F14"], sizeClass: "Large" },
];
