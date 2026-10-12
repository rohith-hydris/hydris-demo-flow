import type { SelfAssessmentRecord } from "./types";

// PRD 4.8: the site confidence inputs. A 52-question self-assessment (each answer scored 0 to 3, each with an evidence
// confidence of 1.0, 0.7 or 0.5) and ten cross-checks XV-01 to XV-10 (each failure subtracts 0.10). The PRD gives neither the
// question wording nor the check definitions, so both are demo stubs. Answers are illustrative, tuned once so each site
// reproduces the confidence in PRODUCT 5.3 to within 0.01 (see src/lib/confidence.ts); the failed checks echo issues the demo
// data already shows (OCEMS offline, expired consent or audit, a missing meter log, an overdue monitoring check).

export const questions = [
  { id: "SA-01", theme: "Metering and water balance", text: "Stub question 1 on metering and water balance" },
  { id: "SA-02", theme: "Metering and water balance", text: "Stub question 2 on metering and water balance" },
  { id: "SA-03", theme: "Metering and water balance", text: "Stub question 3 on metering and water balance" },
  { id: "SA-04", theme: "Metering and water balance", text: "Stub question 4 on metering and water balance" },
  { id: "SA-05", theme: "Metering and water balance", text: "Stub question 5 on metering and water balance" },
  { id: "SA-06", theme: "Metering and water balance", text: "Stub question 6 on metering and water balance" },
  { id: "SA-07", theme: "Metering and water balance", text: "Stub question 7 on metering and water balance" },
  { id: "SA-08", theme: "Metering and water balance", text: "Stub question 8 on metering and water balance" },
  { id: "SA-09", theme: "Effluent treatment", text: "Stub question 1 on effluent treatment" },
  { id: "SA-10", theme: "Effluent treatment", text: "Stub question 2 on effluent treatment" },
  { id: "SA-11", theme: "Effluent treatment", text: "Stub question 3 on effluent treatment" },
  { id: "SA-12", theme: "Effluent treatment", text: "Stub question 4 on effluent treatment" },
  { id: "SA-13", theme: "Effluent treatment", text: "Stub question 5 on effluent treatment" },
  { id: "SA-14", theme: "Effluent treatment", text: "Stub question 6 on effluent treatment" },
  { id: "SA-15", theme: "Effluent treatment", text: "Stub question 7 on effluent treatment" },
  { id: "SA-16", theme: "Effluent treatment", text: "Stub question 8 on effluent treatment" },
  { id: "SA-17", theme: "Monitoring and lab data", text: "Stub question 1 on monitoring and lab data" },
  { id: "SA-18", theme: "Monitoring and lab data", text: "Stub question 2 on monitoring and lab data" },
  { id: "SA-19", theme: "Monitoring and lab data", text: "Stub question 3 on monitoring and lab data" },
  { id: "SA-20", theme: "Monitoring and lab data", text: "Stub question 4 on monitoring and lab data" },
  { id: "SA-21", theme: "Monitoring and lab data", text: "Stub question 5 on monitoring and lab data" },
  { id: "SA-22", theme: "Monitoring and lab data", text: "Stub question 6 on monitoring and lab data" },
  { id: "SA-23", theme: "Monitoring and lab data", text: "Stub question 7 on monitoring and lab data" },
  { id: "SA-24", theme: "Monitoring and lab data", text: "Stub question 8 on monitoring and lab data" },
  { id: "SA-25", theme: "Chemicals and ZDHC", text: "Stub question 1 on chemicals and zdhc" },
  { id: "SA-26", theme: "Chemicals and ZDHC", text: "Stub question 2 on chemicals and zdhc" },
  { id: "SA-27", theme: "Chemicals and ZDHC", text: "Stub question 3 on chemicals and zdhc" },
  { id: "SA-28", theme: "Chemicals and ZDHC", text: "Stub question 4 on chemicals and zdhc" },
  { id: "SA-29", theme: "Chemicals and ZDHC", text: "Stub question 5 on chemicals and zdhc" },
  { id: "SA-30", theme: "Chemicals and ZDHC", text: "Stub question 6 on chemicals and zdhc" },
  { id: "SA-31", theme: "Community and WASH", text: "Stub question 1 on community and wash" },
  { id: "SA-32", theme: "Community and WASH", text: "Stub question 2 on community and wash" },
  { id: "SA-33", theme: "Community and WASH", text: "Stub question 3 on community and wash" },
  { id: "SA-34", theme: "Community and WASH", text: "Stub question 4 on community and wash" },
  { id: "SA-35", theme: "Community and WASH", text: "Stub question 5 on community and wash" },
  { id: "SA-36", theme: "Community and WASH", text: "Stub question 6 on community and wash" },
  { id: "SA-37", theme: "Community and WASH", text: "Stub question 7 on community and wash" },
  { id: "SA-38", theme: "Community and WASH", text: "Stub question 8 on community and wash" },
  { id: "SA-39", theme: "Governance and records", text: "Stub question 1 on governance and records" },
  { id: "SA-40", theme: "Governance and records", text: "Stub question 2 on governance and records" },
  { id: "SA-41", theme: "Governance and records", text: "Stub question 3 on governance and records" },
  { id: "SA-42", theme: "Governance and records", text: "Stub question 4 on governance and records" },
  { id: "SA-43", theme: "Governance and records", text: "Stub question 5 on governance and records" },
  { id: "SA-44", theme: "Governance and records", text: "Stub question 6 on governance and records" },
  { id: "SA-45", theme: "Governance and records", text: "Stub question 7 on governance and records" },
  { id: "SA-46", theme: "Governance and records", text: "Stub question 8 on governance and records" },
  { id: "SA-47", theme: "Basin projects", text: "Stub question 1 on basin projects" },
  { id: "SA-48", theme: "Basin projects", text: "Stub question 2 on basin projects" },
  { id: "SA-49", theme: "Basin projects", text: "Stub question 3 on basin projects" },
  { id: "SA-50", theme: "Basin projects", text: "Stub question 4 on basin projects" },
  { id: "SA-51", theme: "Basin projects", text: "Stub question 5 on basin projects" },
  { id: "SA-52", theme: "Basin projects", text: "Stub question 6 on basin projects" },
] as const;

export const crossCheckDefs = [
  { id: "XV-01", name: "OCEMS flow agrees with the ETP flow log" },
  { id: "XV-02", name: "OCEMS and lab COD agree within tolerance" },
  { id: "XV-03", name: "Water meter log is complete for the period" },
  { id: "XV-04", name: "Water balance closes within 10% of withdrawal" },
  { id: "XV-05", name: "Consent to Operate is valid for the period" },
  { id: "XV-06", name: "Third-party audit report is within the period" },
  { id: "XV-07", name: "Headcount roster agrees with the WASH audit" },
  { id: "XV-08", name: "Compliant discharge does not exceed withdrawal" },
  { id: "XV-09", name: "Project monitoring checks are current" },
  { id: "XV-10", name: "Baseline and targets unchanged since the freeze" },
] as const;

/** Answers are [score 0 to 3, evidence confidence], in question order. */
export const selfAssessments: SelfAssessmentRecord[] = [
  {
    factoryId: "F01",
    failedChecks: ["XV-02"],
    answers: [
      [3, 1.0], [3, 0.5], [3, 1.0], [3, 1.0], [3, 0.7], [2, 1.0], [3, 1.0], [3, 0.5], [3, 1.0], [2, 1.0], [3, 1.0], [3, 1.0], [3, 0.5],
      [3, 1.0], [2, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0],
      [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [2, 1.0], [3, 0.7], [2, 1.0], [3, 0.7], [2, 1.0], [2, 1.0], [3, 0.5], [2, 1.0], [2, 1.0],
      [2, 1.0], [3, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [3, 0.5], [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 0.5], [2, 0.7],
    ],
  },
  {
    factoryId: "F02",
    failedChecks: ["XV-06"],
    answers: [
      [3, 1.0], [1, 1.0], [3, 1.0], [3, 1.0], [2, 0.5], [2, 0.7], [3, 1.0], [2, 0.5], [3, 0.7], [3, 1.0], [1, 1.0], [2, 1.0], [1, 1.0],
      [2, 1.0], [3, 1.0], [3, 1.0], [2, 0.7], [2, 1.0], [2, 0.7], [3, 0.7], [3, 1.0], [3, 1.0], [3, 0.5], [2, 0.5], [3, 0.7], [3, 0.7],
      [3, 1.0], [2, 0.5], [3, 0.5], [2, 1.0], [2, 1.0], [2, 1.0], [1, 1.0], [3, 0.5], [3, 1.0], [3, 1.0], [1, 1.0], [1, 1.0], [3, 0.5],
      [2, 0.5], [2, 1.0], [2, 1.0], [2, 1.0], [3, 0.7], [2, 0.7], [3, 0.7], [2, 1.0], [3, 1.0], [2, 0.5], [3, 0.7], [3, 0.7], [2, 1.0],
    ],
  },
  {
    factoryId: "F03",
    failedChecks: [],
    answers: [
      [3, 1.0], [3, 1.0], [2, 0.7], [3, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [3, 0.7], [2, 1.0],
      [2, 0.7], [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [2, 1.0], [2, 1.0], [3, 0.5], [3, 0.5], [2, 1.0], [3, 1.0],
      [2, 1.0], [3, 1.0], [3, 0.7], [2, 0.7], [3, 1.0], [3, 0.5], [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [3, 0.7], [3, 1.0], [3, 1.0],
      [3, 1.0], [3, 1.0], [3, 1.0], [2, 0.7], [2, 0.7], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [2, 0.7], [2, 1.0], [2, 0.7], [3, 0.5],
    ],
  },
  {
    factoryId: "F04",
    failedChecks: [],
    answers: [
      [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 0.7], [3, 0.7], [2, 0.7], [3, 1.0], [3, 1.0], [3, 1.0], [1, 1.0], [1, 1.0], [3, 0.7],
      [1, 1.0], [2, 0.7], [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.5], [3, 0.7], [2, 1.0], [1, 1.0], [3, 0.7], [3, 0.5], [2, 1.0], [1, 1.0],
      [3, 0.7], [2, 0.5], [1, 1.0], [2, 0.5], [3, 0.7], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [2, 0.7], [1, 1.0], [3, 1.0],
      [2, 0.5], [2, 0.7], [3, 0.5], [3, 1.0], [3, 0.7], [2, 0.7], [2, 0.5], [2, 1.0], [3, 0.5], [1, 1.0], [3, 0.5], [3, 0.5], [3, 1.0],
    ],
  },
  {
    factoryId: "F05",
    failedChecks: [],
    answers: [
      [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [2, 0.7], [3, 0.5], [3, 1.0], [3, 1.0], [3, 0.5], [3, 0.5], [3, 0.5],
      [2, 0.7], [3, 0.5], [3, 1.0], [3, 1.0], [3, 0.5], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 0.7], [3, 0.5], [2, 0.7], [3, 1.0],
      [3, 1.0], [3, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [2, 0.7], [2, 0.7], [3, 0.5], [3, 1.0], [3, 0.7],
      [3, 1.0], [3, 1.0], [2, 0.7], [2, 1.0], [3, 1.0], [2, 0.7], [2, 1.0], [3, 1.0], [2, 1.0], [2, 1.0], [3, 1.0], [3, 0.7], [3, 1.0],
    ],
  },
  {
    factoryId: "F06",
    failedChecks: ["XV-01", "XV-05"],
    answers: [
      [3, 0.7], [1, 1.0], [2, 0.7], [2, 1.0], [2, 0.7], [3, 1.0], [1, 1.0], [1, 1.0], [1, 1.0], [2, 0.5], [3, 0.5], [3, 1.0], [1, 1.0],
      [3, 1.0], [1, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [3, 0.7], [3, 0.7], [3, 0.5], [2, 0.7], [2, 0.7], [2, 0.7],
      [1, 1.0], [2, 0.7], [2, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [3, 1.0], [1, 1.0], [3, 0.7], [3, 0.7], [1, 1.0], [3, 0.7], [3, 1.0],
      [2, 1.0], [2, 1.0], [3, 0.7], [3, 0.7], [3, 0.5], [2, 0.7], [3, 0.7], [2, 1.0], [3, 1.0], [3, 0.5], [3, 0.7], [3, 1.0], [1, 1.0],
    ],
  },
  {
    factoryId: "F07",
    failedChecks: [],
    answers: [
      [3, 1.0], [3, 1.0], [3, 0.5], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.5], [3, 1.0], [3, 1.0], [2, 1.0], [3, 0.5],
      [3, 0.7], [2, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 0.7], [3, 0.7], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0],
      [3, 1.0], [3, 0.5], [3, 1.0], [2, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 1.0], [2, 1.0], [3, 0.7], [3, 1.0],
      [3, 0.5], [3, 1.0], [3, 0.5], [3, 1.0], [3, 1.0], [3, 0.7], [3, 0.5], [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.5], [3, 1.0], [3, 0.7],
    ],
  },
  {
    factoryId: "F08",
    failedChecks: [],
    answers: [
      [3, 1.0], [3, 0.7], [3, 0.7], [3, 0.7], [2, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [2, 1.0], [3, 0.7],
      [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [3, 0.7], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 1.0],
      [3, 0.7], [3, 0.7], [2, 1.0], [2, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0],
      [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [2, 1.0], [3, 0.7], [3, 1.0],
    ],
  },
  {
    factoryId: "F09",
    failedChecks: [],
    answers: [
      [3, 1.0], [3, 0.7], [2, 0.5], [2, 1.0], [2, 0.5], [3, 0.7], [2, 0.7], [2, 0.7], [1, 1.0], [3, 0.5], [2, 0.5], [2, 0.7], [3, 0.7],
      [2, 0.7], [2, 0.7], [3, 1.0], [3, 1.0], [2, 1.0], [2, 0.7], [3, 1.0], [1, 1.0], [2, 0.7], [3, 1.0], [2, 0.5], [2, 0.7], [2, 0.5],
      [3, 0.7], [3, 1.0], [3, 0.7], [3, 1.0], [1, 0.7], [1, 1.0], [3, 1.0], [3, 1.0], [2, 0.5], [1, 1.0], [2, 0.7], [2, 1.0], [2, 0.7],
      [3, 1.0], [3, 0.5], [3, 0.5], [3, 1.0], [1, 1.0], [3, 1.0], [2, 0.7], [3, 1.0], [3, 1.0], [3, 0.5], [2, 0.5], [1, 1.0], [3, 1.0],
    ],
  },
  {
    factoryId: "F10",
    failedChecks: [],
    answers: [
      [2, 0.7], [2, 1.0], [2, 0.7], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.5], [2, 0.7], [3, 0.7], [3, 0.7], [2, 0.7],
      [3, 0.7], [3, 1.0], [2, 0.7], [3, 1.0], [2, 1.0], [3, 1.0], [2, 0.7], [3, 0.5], [3, 1.0], [3, 1.0], [2, 0.7], [3, 1.0], [3, 0.5],
      [2, 0.7], [2, 0.7], [3, 0.7], [3, 0.7], [3, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [3, 0.7], [3, 0.5], [3, 0.7],
      [2, 1.0], [3, 0.5], [3, 0.7], [2, 1.0], [2, 0.7], [2, 0.7], [3, 0.5], [2, 0.7], [3, 1.0], [3, 0.5], [3, 0.5], [3, 0.5], [2, 1.0],
    ],
  },
  {
    factoryId: "F11",
    failedChecks: [],
    answers: [
      [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [3, 0.7], [2, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [3, 0.5],
      [3, 1.0], [3, 0.7], [3, 1.0], [2, 1.0], [3, 1.0], [3, 1.0], [3, 0.5], [3, 0.7], [3, 0.5], [2, 1.0], [2, 1.0], [3, 1.0], [2, 1.0],
      [2, 1.0], [3, 1.0], [3, 0.5], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [2, 1.0],
      [3, 1.0], [2, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [3, 0.7], [3, 0.5], [2, 1.0], [3, 0.7], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0],
    ],
  },
  {
    factoryId: "F12",
    failedChecks: ["XV-09"],
    answers: [
      [3, 1.0], [3, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [3, 0.7], [3, 0.7], [2, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [2, 1.0], [3, 0.7],
      [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [2, 1.0], [3, 1.0],
      [3, 0.7], [3, 0.7], [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [2, 1.0], [3, 1.0], [2, 1.0],
      [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [2, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0],
    ],
  },
  {
    factoryId: "F13",
    failedChecks: ["XV-03"],
    answers: [
      [3, 0.5], [1, 1.0], [3, 1.0], [3, 1.0], [1, 1.0], [3, 1.0], [3, 1.0], [1, 1.0], [2, 0.7], [3, 0.5], [2, 0.7], [3, 1.0], [2, 1.0],
      [1, 1.0], [2, 0.5], [3, 1.0], [3, 1.0], [2, 1.0], [2, 1.0], [3, 1.0], [2, 1.0], [2, 0.5], [3, 0.5], [3, 0.7], [2, 0.7], [3, 1.0],
      [3, 0.7], [2, 0.5], [3, 0.5], [3, 0.7], [3, 0.7], [2, 0.7], [1, 1.0], [2, 1.0], [3, 0.7], [2, 1.0], [3, 1.0], [2, 0.7], [2, 1.0],
      [3, 1.0], [3, 0.5], [3, 1.0], [2, 1.0], [3, 1.0], [3, 1.0], [2, 0.5], [3, 1.0], [3, 1.0], [3, 1.0], [1, 1.0], [3, 1.0], [2, 0.5],
    ],
  },
  {
    factoryId: "F14",
    failedChecks: [],
    answers: [
      [2, 0.7], [3, 1.0], [3, 0.7], [3, 1.0], [3, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [3, 0.7], [2, 0.7], [2, 0.7],
      [3, 1.0], [3, 1.0], [2, 1.0], [2, 1.0], [3, 1.0], [3, 1.0], [3, 1.0], [3, 0.5], [2, 0.7], [3, 1.0], [3, 1.0], [2, 0.7], [3, 1.0],
      [2, 0.7], [2, 1.0], [2, 0.7], [3, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [2, 1.0], [3, 1.0], [3, 0.5], [3, 0.5],
      [2, 1.0], [3, 0.5], [2, 0.7], [2, 1.0], [2, 0.7], [3, 1.0], [3, 0.5], [3, 0.7], [3, 1.0], [3, 1.0], [3, 0.7], [3, 0.7], [2, 1.0],
    ],
  },
];
