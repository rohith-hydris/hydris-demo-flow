import type { DeliveredRecord } from "./types";

// Delivered benefit per site: the inputs behind the cell scores (PRODUCT 5.4, 5.9). src/lib/pwi.ts computes every
// Availability and Accessibility score as min(1, delivered / target) with the 5.9 targets.
// Seeded once from the PRODUCT 5.4 cell scores x target, rounded to whole units (down or up per cell, whichever keeps the
// site PWI and volumetric balance at their 5.5 check values). Every cell score is within 0.001 of PRODUCT 5.4. Illustrative.
// F12 is not listed: its delivered amounts come from the worked example (PRODUCT 5.8, src/data/f12Example.ts).
// P2 and P3 Quality have no kg data for these sites (PRODUCT 5.9 shows the score only), so their score stays an input.
export const delivered: DeliveredRecord[] = [
  { factoryId: "F01", availabilityM3: { P1: 17640, P2: 27440, P3: 13720 }, accessibilityPeople: { P1: 2100, P2: 2184, P3: 1229 }, qualityScore: { P2: 0.55, P3: 0.1 } },
  { factoryId: "F02", availabilityM3: { P1: 21000, P2: 25200, P3: 11200 }, accessibilityPeople: { P1: 1350, P2: 1073, P3: 585 }, qualityScore: { P2: 0.35, P3: 0.0 } },
  { factoryId: "F03", availabilityM3: { P1: 7980, P2: 14280, P3: 10080 }, accessibilityPeople: { P1: 800, P2: 936, P3: 728 }, qualityScore: { P2: 0.8, P3: 0.45 } },
  { factoryId: "F04", availabilityM3: { P1: 12920, P2: 18240, P3: 9120 }, accessibilityPeople: { P1: 1100, P2: 965, P3: 520 }, qualityScore: { P2: 0.5, P3: 0.15 } },
  { factoryId: "F05", availabilityM3: { P1: 9936, P2: 17280, P3: 11880 }, accessibilityPeople: { P1: 900, P2: 1033, P3: 729 }, qualityScore: { P2: 0.7, P3: 0.4 } },
  { factoryId: "F06", availabilityM3: { P1: 16800, P2: 19200, P3: 7200 }, accessibilityPeople: { P1: 1190, P2: 875, P3: 350 }, qualityScore: { P2: 0.3, P3: 0.0 } },
  { factoryId: "F07", availabilityM3: { P1: 5760, P2: 10560, P3: 8400 }, accessibilityPeople: { P1: 600, P2: 718, P3: 585 }, qualityScore: { P2: 0.85, P3: 0.55 } },
  { factoryId: "F08", availabilityM3: { P1: 1800, P2: 3420, P3: 2880 }, accessibilityPeople: { P1: 1800, P2: 2223, P3: 1989 }, qualityScore: { P2: 0.9, P3: 0.7 } },
  { factoryId: "F09", availabilityM3: { P1: 15488, P2: 22880, P3: 14080 }, accessibilityPeople: { P1: 1300, P2: 1183, P3: 676 }, qualityScore: { P2: 0.55, P3: 0.2 } },
  { factoryId: "F10", availabilityM3: { P1: 11520, P2: 19200, P3: 12800 }, accessibilityPeople: { P1: 1000, P2: 1120, P3: 770 }, qualityScore: { P2: 0.65, P3: 0.3 } },
  { factoryId: "F11", availabilityM3: { P1: 5488, P2: 10080, P3: 8400 }, accessibilityPeople: { P1: 700, P2: 931, P3: 784 }, qualityScore: { P2: 0.85, P3: 0.6 } },
  { factoryId: "F13", availabilityM3: { P1: 13120, P2: 18040, P3: 9840 }, accessibilityPeople: { P1: 1093, P2: 1000, P3: 500 }, qualityScore: { P2: 0.4, P3: 0.05 } },
  { factoryId: "F14", availabilityM3: { P1: 13020, P2: 21840, P3: 14560 }, accessibilityPeople: { P1: 950, P2: 1129, P3: 799 }, qualityScore: { P2: 0.72, P3: 0.35 } },
];
