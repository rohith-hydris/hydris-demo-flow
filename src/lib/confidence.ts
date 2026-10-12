import { crossCheckDefs, selfAssessments } from "@/src/data/selfAssessment";
import type { AssessmentAnswer } from "@/src/data/types";
import type { FactoryId } from "./types";

// PRD 4.8: site confidence, used by the internal status band (src/lib/pwi.ts internalStatusBand).
//
//   answer value   = (score / 3) x evidence confidence            score 0 to 3; evidence 1.0, 0.7 or 0.5
//   answer mean    = mean of the answer values over the 52 questions
//   confidence     = max(0, answer mean - 0.10 x number of failed cross-checks XV-01 to XV-10)
//
// The PRD defines the 0 to 3 score, the three evidence confidences and the 0.10 penalty with a floor of 0. It does not say how
// the 52 answers combine, so the mean of (score / 3 x evidence confidence) is a PROPOSED choice (methodology.ts, decision V2-SC).

export const EVIDENCE_CONFIDENCES = [1.0, 0.7, 0.5] as const;
export const CROSS_CHECK_PENALTY = 0.1;
export const QUESTION_COUNT = 52;
export const CROSS_CHECK_COUNT = 10;

export interface CrossCheckResult { id: string; name: string; passed: boolean }

export const answerValue = ([score, evidence]: AssessmentAnswer) => (score / 3) * evidence;

export const answerMean = (answers: readonly AssessmentAnswer[]) =>
  answers.length === 0 ? 0 : answers.reduce((sum, a) => sum + answerValue(a), 0) / answers.length;

export interface ConfidenceBreakdown {
  answerMean: number; failed: number; penalty: number; confidence: number;
}

export function confidenceBreakdown(answers: readonly AssessmentAnswer[], crossChecks: readonly Pick<CrossCheckResult, "passed">[]): ConfidenceBreakdown {
  const mean = answerMean(answers);
  const failed = crossChecks.filter((c) => !c.passed).length;
  const penalty = CROSS_CHECK_PENALTY * failed;
  return { answerMean: mean, failed, penalty, confidence: Math.max(0, mean - penalty) };
}

/** Site confidence from the 52 answers and the cross-check results: the answer mean less 0.10 per failed check, never below 0. */
export const siteConfidence = (answers: readonly AssessmentAnswer[], crossChecks: readonly Pick<CrossCheckResult, "passed">[]): number =>
  confidenceBreakdown(answers, crossChecks).confidence;

/** The ten named cross-checks for a site, each Pass or Fail. */
export const crossChecksFor = (factoryId: FactoryId): CrossCheckResult[] => {
  const failed = new Set(selfAssessments.find((a) => a.factoryId === factoryId)?.failedChecks ?? []);
  return crossCheckDefs.map((d) => ({ id: d.id, name: d.name, passed: !failed.has(d.id) }));
};

export function confidenceOf(factoryId: FactoryId): ConfidenceBreakdown {
  const rec = selfAssessments.find((a) => a.factoryId === factoryId);
  if (!rec) throw new Error(`No self-assessment for ${factoryId}`);
  return confidenceBreakdown(rec.answers, crossChecksFor(factoryId));
}
