import type { FactoryRecord } from "./types";

// PRODUCT 5.3 inputs. Coordinates are approximate and for map placement only.
// F01 is the golden-test site (sub-basin 453803). F12 is the worked-example hero for the Impact tab.
// R, rank, tier, band, PWI and quadrant are outputs: see src/lib/.
export const factories: FactoryRecord[] = [
  { id: "F01", name: "Tiruppur Mill", supplierId: "SUP1", district: "Tiruppur", lat: 11.1085, lon: 77.3411, footprintI: 0.78, replenishmentNeededM3: 98000, headcount: 2100, householdSize: 3.6, confidence: 0.72, evidenceGrade: "B" },
  { id: "F02", name: "Avinashi Road Dye House", supplierId: "SUP1", district: "Tiruppur", lat: 11.193, lon: 77.27, footprintI: 0.88, replenishmentNeededM3: 140000, headcount: 1500, householdSize: 3.6, confidence: 0.55, evidenceGrade: "C" },
  { id: "F03", name: "Uthukuli Knit Unit", supplierId: "SUP1", district: "Tiruppur", lat: 11.062, lon: 77.335, footprintI: 0.35, replenishmentNeededM3: 42000, headcount: 800, householdSize: 3.6, confidence: 0.81, evidenceGrade: "A" },
  { id: "F04", name: "Karur Finishing Works", supplierId: "SUP2", district: "Karur", lat: 10.9601, lon: 78.0766, footprintI: 0.64, replenishmentNeededM3: 76000, headcount: 1100, householdSize: 3.7, confidence: 0.66, evidenceGrade: "B" },
  { id: "F05", name: "Kulithalai Processing", supplierId: "SUP2", district: "Karur", lat: 10.94, lon: 78.41, footprintI: 0.55, replenishmentNeededM3: 54000, headcount: 900, householdSize: 3.7, confidence: 0.79, evidenceGrade: "B" },
  { id: "F06", name: "Erode Wet Process", supplierId: "SUP2", district: "Erode", lat: 11.341, lon: 77.7172, footprintI: 0.41, replenishmentNeededM3: 120000, headcount: 1400, householdSize: 3.5, confidence: 0.44, evidenceGrade: "C" },
  { id: "F07", name: "Palladam Knit Works", supplierId: "SUP3", district: "Tiruppur", lat: 10.9928, lon: 77.2865, footprintI: 0.3, replenishmentNeededM3: 30000, headcount: 600, householdSize: 3.6, confidence: 0.84, evidenceGrade: "A" },
  { id: "F08", name: "Perumanallur Garments", supplierId: "SUP3", district: "Tiruppur", lat: 11.1166, lon: 77.4166, footprintI: 0.12, replenishmentNeededM3: 9000, headcount: 1800, householdSize: 3.6, confidence: 0.88, evidenceGrade: "A" },
  { id: "F09", name: "Dharapuram Dyeing", supplierId: "SUP3", district: "Tiruppur", lat: 10.739, lon: 77.528, footprintI: 0.72, replenishmentNeededM3: 88000, headcount: 1300, householdSize: 3.6, confidence: 0.62, evidenceGrade: "C" },
  { id: "F10", name: "Ranipet Wash Unit", supplierId: "SUP4", district: "Ranipet", lat: 12.9224, lon: 79.3326, footprintI: 0.48, replenishmentNeededM3: 64000, headcount: 1000, householdSize: 3.8, confidence: 0.7, evidenceGrade: "B" },
  { id: "F11", name: "Vellore Fabrics", supplierId: "SUP4", district: "Vellore", lat: 12.9165, lon: 79.1325, footprintI: 0.25, replenishmentNeededM3: 28000, headcount: 700, householdSize: 3.8, confidence: 0.83, evidenceGrade: "A" },
  { id: "F12", name: "Ambattur Denim Unit", supplierId: "SUP5", district: "Chennai", lat: 13.1143, lon: 80.1548, footprintI: 0.91, replenishmentNeededM3: 110000, headcount: 1200, householdSize: 3.9, confidence: 0.78, evidenceGrade: "B" },
  { id: "F13", name: "Sriperumbudur Wash House", supplierId: "SUP5", district: "Kancheepuram", lat: 12.9686, lon: 79.9419, footprintI: 0.45, replenishmentNeededM3: 82000, headcount: 1150, householdSize: 3.9, confidence: 0.58, evidenceGrade: "C" },
  { id: "F14", name: "Oragadam Finishing", supplierId: "SUP5", district: "Chengalpattu", lat: 12.834, lon: 79.956, footprintI: 0.58, replenishmentNeededM3: 70000, headcount: 950, householdSize: 3.9, confidence: 0.76, evidenceGrade: "B" },
];
