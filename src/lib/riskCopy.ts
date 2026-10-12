import { fmtScore } from "./format";
import { PILLAR_LABELS, PRESENT_AT, UCW_ALWAYS_WATCH, WATCH_AT, type RiskResult } from "./risk";
import type { Site } from "./selectors";
import type { RiskCode } from "./types";

// Plain-language text for a risk card (PRODUCT 4.4): headline, reason, threshold position, what would change it,
// outlook for scarcity risks and caveats. Built from templates; only the numbers come from the data.

/** What each indicator measures, in plain words. */
const MEANING: Record<RiskCode, string> = {
  bws: "How much of the available water in the area is already withdrawn each year.",
  bwd: "How fast surface water and groundwater are being used up faster than they refill.",
  iav: "How much the water supply swings from one year to the next.",
  sev: "How much the water supply swings between the wet and dry seasons.",
  gtd: "How fast the groundwater table is falling.",
  drr: "How exposed the area is to drought.",
  rfr: "How exposed the area is to river flooding.",
  cfr: "How exposed the area is to coastal flooding.",
  ucw: "How much of the wastewater collected in the country is not treated.",
  cep: "How likely nutrients that reach the coast are to cause algae blooms.",
  udw: "How many people nearby lack improved drinking water.",
  usa: "How many people nearby lack improved sanitation.",
  rri: "How the country scores on reported environmental and social risk (RepRisk).",
  tex: "A combined water risk score, weighted for textile operations.",
};

/** Only these four indicators are Aqueduct 4.0 data (PRODUCT 4.4 vintage note); the rest are about 2014. */
const AQUEDUCT_4 = new Set<RiskCode>(["bws", "bwd", "iav", "sev"]);
export const VINTAGE_NOTE = "Only water stress, depletion, interannual and seasonal variability are Aqueduct 4.0. Others are about 2014.";
export const COUNTRY_LEVEL_NOTE = "Country-level, identical across sites, not used for within-country ranking.";

export interface RiskExplanation {
  headline: string;
  meaning: string;
  reason: string;
  threshold: string;
  whatWouldChange: string;
  outlook: string | null;
  caveats: string[];
  vintage: "Aqueduct 4.0" | "About 2014";
}

const move = (from: number, to: number) => `${fmtScore(to)} (${to >= from ? "up" : "down"} ${fmtScore(Math.abs(to - from))})`;
export const OUTLOOK_2080_NOTE = "2080 not available in Aqueduct 4.0";
/** "2030: 2.09 to 2.30 (up 0.21). 2050: ... 2080 not available in Aqueduct 4.0." */
export const outlookText = (score: number, o: { y2030: number; y2050: number }) =>
  `2030: the score moves from ${fmtScore(score)} to ${move(score, o.y2030)}. 2050: from ${fmtScore(score)} to ${move(score, o.y2050)}. ${OUTLOOK_2080_NOTE}.`;

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** The wording for a ucw card that is fixed at Watch. Used only while UCW_ALWAYS_WATCH is true. */
export const UCW_FIXED_TEXT = {
  reason: "Always shown as Watch, because the country treats little of the wastewater it collects. The score does not change the status.",
  threshold: "The status is fixed, so there is no threshold.",
  whatWouldChange: "It stays Watch whatever the score.",
} as const;

export function explainRisk(r: RiskResult, site: Site, ucwAlwaysWatch: boolean = UCW_ALWAYS_WATCH): RiskExplanation {
  const fixedWatch = r.code === "ucw" && ucwAlwaysWatch;
  const vintage = AQUEDUCT_4.has(r.code) ? "Aqueduct 4.0" : "About 2014";
  if (r.gap) {
    const inR = !r.excludedFromCounts && r.code !== "ucw" && r.code !== "rri" && r.code !== "tex";
    return {
      headline: r.gap === "No data" ? "No data for this indicator at this site." : "Could not be assessed.",
      meaning: MEANING[r.code],
      reason: r.gap === "No data" ? "No reading is available, so no status is given." : "The assessment returned an error, so no status is given.",
      threshold: "Not applicable without a reading.",
      whatWouldChange: "A valid reading would give it a status.",
      outlook: null,
      caveats: [inR ? "Left out of its pillar: the pillar takes the highest of the indicators that remain. Data coverage is lower." : "Left out of R and the counts."],
      vintage,
    };
  }
  const s = r.score;
  const score = fmtScore(s);

  const headline =
    r.code === "tex" && r.compositeLabel ? `Overall water risk for textile sites is ${r.compositeLabel}.`
    : r.status === "Present" ? "This risk is present at this site."
    : r.status === "Watch" ? "This risk is worth watching at this site."
    : "This risk is not present at this site.";

  const reason =
    fixedWatch ? UCW_FIXED_TEXT.reason
    : r.status === "Present" ? `The score of ${score} out of 5 is at or above ${fmtScore(PRESENT_AT)}.`
    : r.status === "Watch" ? `The score of ${score} out of 5 is from ${fmtScore(WATCH_AT)} up to ${fmtScore(PRESENT_AT)}.`
    : `The score of ${score} out of 5 is below ${fmtScore(WATCH_AT)}.`;

  const threshold =
    fixedWatch ? UCW_FIXED_TEXT.threshold
    : r.status === "Present"
      ? near(s, PRESENT_AT) ? `Exactly on the Present line (${fmtScore(PRESENT_AT)}).` : `${fmtScore(s - PRESENT_AT)} above the Present line (${fmtScore(PRESENT_AT)}).`
    : r.status === "Watch"
      ? `${fmtScore(PRESENT_AT - s)} below the Present line (${fmtScore(PRESENT_AT)}) and ${near(s, WATCH_AT) ? "exactly on" : `${fmtScore(s - WATCH_AT)} above`} the Watch line (${fmtScore(WATCH_AT)}).`
      : `${fmtScore(WATCH_AT - s)} below the Watch line (${fmtScore(WATCH_AT)}).`;

  const whatWouldChange =
    fixedWatch ? UCW_FIXED_TEXT.whatWouldChange
    : r.status === "Present"
      ? near(s, PRESENT_AT) ? "It would drop to Watch with any fall in the score." : `It would drop to Watch if the score fell by more than ${fmtScore(s - PRESENT_AT)}.`
    : r.status === "Watch"
      ? `It would become Present if the score rose by ${fmtScore(PRESENT_AT - s)} or more${near(s, WATCH_AT) ? ", or Not present with any fall." : `, or Not present if it fell by more than ${fmtScore(s - WATCH_AT)}.`}`
      : `It would become Watch if the score rose by ${fmtScore(WATCH_AT - s)} or more.`;

  // Aqueduct 4.0 has 2030 and 2050 for water stress, depletion and the two variability indicators. 2080 is not in the dataset,
  // and the card says so. Every other risk shows no outlook.
  const outlook = r.outlook ? outlookText(s, r.outlook) : null;

  const caveats: string[] = [];
  if (r.countryLevel) caveats.push(COUNTRY_LEVEL_NOTE);
  if (r.excludedFromCounts) caveats.push("Shown separately. It is left out of the Present and Watch counts and out of R.");
  if (r.code === "tex") caveats.push("A composite. It is not used in R or in the ranking.");
  if (r.rawValue) caveats.push(`Raw value: ${r.rawValue}.`);

  return { headline, meaning: MEANING[r.code], reason, threshold, whatWouldChange, outlook, caveats, vintage: AQUEDUCT_4.has(r.code) ? "Aqueduct 4.0" : "About 2014" };
}

// ---- V2 4.2: data coverage and the renormalisation effect ------------------------------------------------------------------

/** "Data coverage 90%" with the counts behind it. */
export const coverageLine = (site: Site) =>
  `Data coverage ${Math.round(site.riskCoverage.share * 100)}% (${site.riskCoverage.available} of ${site.riskCoverage.required} risk indicators have a reading)`;

export const hasMissingPillar = (site: Site) => site.missingPillars.length > 0;

/**
 * What the missing-data policy did to R. It never claims renormalisation is neutral: with a missing pillar it states the
 * effect with its sign, and without one it says nothing needed renormalising.
 */
export function renormalisationLine(site: Site): string {
  if (!hasMissingPillar(site)) {
    return site.riskCoverage.available < site.riskCoverage.required
      ? "Every pillar still has a reading, so the weights did not change. A missing indicator drops out and its pillar uses the highest of the rest."
      : "Every indicator has a reading, so no indicator dropped out.";
  }
  const names = site.missingPillars.map((k) => PILLAR_LABELS[k].toLowerCase()).join(" and ");
  const d = site.renormDelta;
  const effect = Math.abs(d) < 0.005 ? "changed R by less than 0.01" : `${d > 0 ? "raised" : "lowered"} R by ${fmtScore(Math.abs(d))}`;
  return `The ${names} pillar has no reading, so it dropped out and the other weights were renormalised. Against scoring it at the mean of the other pillars, this ${effect}. Renormalisation can raise or lower R.`;
}

/** What a special rule did to a risk card, in plain words (PRD 5.1, 5.2). */
export const RULE_NOTE = {
  "Arid area": "Arid area: scored as the maximum scarcity, so this scarcity risk is Present.",
  "Insignificant Trend": "Insignificant trend: no groundwater decline to score, so this risk is Not present and the pillar is 0.",
  "No Risk": "Coastal flood category is No Risk, so this risk is Not present.",
} as const;
