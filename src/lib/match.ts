// PRODUCT 6.10: tech-to-plant match score (Module 06), used by copilot answer C6.
export const MATCH_WEIGHTS = { technicalFit: 0.35, expectedBenefit: 0.3, operationalStability: 0.2, dataQuality: 0.15 } as const;

export interface MatchInputs { technicalFit: number; expectedBenefit: number; operationalStability: number; dataQuality: number }

export const matchScore = (m: MatchInputs) =>
  MATCH_WEIGHTS.technicalFit * m.technicalFit +
  MATCH_WEIGHTS.expectedBenefit * m.expectedBenefit +
  MATCH_WEIGHTS.operationalStability * m.operationalStability +
  MATCH_WEIGHTS.dataQuality * m.dataQuality;
