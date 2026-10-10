import { fmtScore } from "./format";
import { PRESENT_AT, WATCH_AT, type RiskResult } from "./risk";
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

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

export function explainRisk(r: RiskResult, site: Site): RiskExplanation {
  const s = r.score;
  const score = fmtScore(s);

  const headline =
    r.code === "tex" && r.compositeLabel ? `Overall water risk for textile sites is ${r.compositeLabel}.`
    : r.status === "Present" ? "This risk is present at this site."
    : r.status === "Watch" ? "This risk is worth watching at this site."
    : "This risk is not present at this site.";

  const reason =
    r.code === "ucw" ? "Always shown as Watch, because the country treats little of the wastewater it collects. The score does not change the status."
    : r.status === "Present" ? `The score of ${score} out of 5 is at or above ${fmtScore(PRESENT_AT)}.`
    : r.status === "Watch" ? `The score of ${score} out of 5 is from ${fmtScore(WATCH_AT)} up to ${fmtScore(PRESENT_AT)}.`
    : `The score of ${score} out of 5 is below ${fmtScore(WATCH_AT)}.`;

  const threshold =
    r.code === "ucw" ? "The status is fixed, so there is no threshold."
    : r.status === "Present"
      ? near(s, PRESENT_AT) ? `Exactly on the Present line (${fmtScore(PRESENT_AT)}).` : `${fmtScore(s - PRESENT_AT)} above the Present line (${fmtScore(PRESENT_AT)}).`
    : r.status === "Watch"
      ? `${fmtScore(PRESENT_AT - s)} below the Present line (${fmtScore(PRESENT_AT)}) and ${near(s, WATCH_AT) ? "exactly on" : `${fmtScore(s - WATCH_AT)} above`} the Watch line (${fmtScore(WATCH_AT)}).`
      : `${fmtScore(WATCH_AT - s)} below the Watch line (${fmtScore(WATCH_AT)}).`;

  const whatWouldChange =
    r.code === "ucw" ? "It stays Watch whatever the score."
    : r.status === "Present"
      ? near(s, PRESENT_AT) ? "It would drop to Watch with any fall in the score." : `It would drop to Watch if the score fell by more than ${fmtScore(s - PRESENT_AT)}.`
    : r.status === "Watch"
      ? `It would become Present if the score rose by ${fmtScore(PRESENT_AT - s)} or more${near(s, WATCH_AT) ? ", or Not present with any fall." : `, or Not present if it fell by more than ${fmtScore(s - WATCH_AT)}.`}`
      : `It would become Watch if the score rose by ${fmtScore(WATCH_AT - s)} or more.`;

  // The data holds only the 2050 water stress score, so only water stress has an outlook. 2030 and 2080 are not shown.
  const outlook =
    r.code === "bws"
      ? `2050 outlook: the water stress score moves from ${score} to ${fmtScore(s + site.bwsRise)} (${site.bwsRise >= 0 ? "up" : "down"} ${fmtScore(Math.abs(site.bwsRise))}).`
      : null;

  const caveats: string[] = [];
  if (r.countryLevel) caveats.push(COUNTRY_LEVEL_NOTE);
  if (r.excludedFromCounts) caveats.push("Shown separately. It is left out of the Present and Watch counts and out of R.");
  if (r.code === "tex") caveats.push("A composite. It is not used in R or in the ranking.");
  if (r.rawValue) caveats.push(`Raw value: ${r.rawValue}.`);

  return { headline, meaning: MEANING[r.code], reason, threshold, whatWouldChange, outlook, caveats, vintage: AQUEDUCT_4.has(r.code) ? "Aqueduct 4.0" : "About 2014" };
}
