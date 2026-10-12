import type { OpsRecord } from "./types";

// PRODUCT 5.7 (Module 06): the plant signals as INPUTS. Health score, health band, alerts, severity and off-track are all derived in
// src/lib/ops.ts (healthScore, deriveAlerts, isOffTrack); nothing derived is stored here.
// Seeded so every site keeps its PRODUCT 5.7 health band, health score and highest alert severity. Illustrative.
//  - outletCompliancePct: share of outlet readings within consent limits. uptimePct: monitoring uptime (OCEMS and meters).
//  - dataAgeDays: days since the last reading; 7 or more is a data gap (F06 OCEMS offline 9 days, F13 water meter log 9 days).
//  - benefitBehindAlert: the plant tracks "benefit behind target" from its pro-rated benefit shares (issue A3).
export const ops: OpsRecord[] = [
  { factoryId: "F01", outletCompliancePct: 64.2, uptimePct: 98, dataAgeDays: 0, zdhcTier: "Progressive", tierChange: null, benefitBehindAlert: true },
  { factoryId: "F02", outletCompliancePct: 38.3, uptimePct: 94, dataAgeDays: 1, zdhcTier: "Foundational", tierChange: { from: "Progressive", to: "Foundational", daysAgo: 12 } },
  { factoryId: "F03", outletCompliancePct: 85.4, uptimePct: 99, dataAgeDays: 0, zdhcTier: "Aspirational", tierChange: { from: "Progressive", to: "Aspirational", daysAgo: 20 } },
  { factoryId: "F04", outletCompliancePct: 57.1, uptimePct: 95, dataAgeDays: 2, zdhcTier: "Progressive", tierChange: null },
  { factoryId: "F05", outletCompliancePct: 74.2, uptimePct: 98, dataAgeDays: 0, zdhcTier: "Progressive", tierChange: null },
  { factoryId: "F06", outletCompliancePct: 16.7, uptimePct: 70, dataAgeDays: 9, zdhcTier: "Not conformant", tierChange: { from: "Foundational", to: "Not conformant", daysAgo: 5 } },
  { factoryId: "F07", outletCompliancePct: 88.8, uptimePct: 99, dataAgeDays: 0, zdhcTier: "Aspirational", tierChange: null },
  { factoryId: "F08", outletCompliancePct: 93.8, uptimePct: 99, dataAgeDays: 0, zdhcTier: "Aspirational", tierChange: null },
  { factoryId: "F09", outletCompliancePct: 46.2, uptimePct: 95, dataAgeDays: 1, zdhcTier: "Foundational", tierChange: null },
  { factoryId: "F10", outletCompliancePct: 67.1, uptimePct: 97, dataAgeDays: 1, zdhcTier: "Progressive", tierChange: null },
  { factoryId: "F11", outletCompliancePct: 83.8, uptimePct: 99, dataAgeDays: 0, zdhcTier: "Aspirational", tierChange: { from: "Progressive", to: "Aspirational", daysAgo: 31 } },
  { factoryId: "F12", outletCompliancePct: 70.0, uptimePct: 98, dataAgeDays: 1, zdhcTier: "Progressive", tierChange: null, benefitBehindAlert: true, overdueMonitoring: { project: "PRJ-105" } },
  { factoryId: "F13", outletCompliancePct: 45.0, uptimePct: 70, dataAgeDays: 9, zdhcTier: "Foundational", tierChange: null },
  { factoryId: "F14", outletCompliancePct: 72.5, uptimePct: 98, dataAgeDays: 0, zdhcTier: "Progressive", tierChange: null },
];
