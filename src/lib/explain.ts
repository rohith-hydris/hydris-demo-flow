import { fmtScore } from "./format";
import { I_LARGE, R_BAND1, R_BAND2 } from "./rank";
import type { Site } from "./selectors";

// Plain-language text generated from the data (PRODUCT 4.4 "Why this rank"). Numbers are filled in, never typed.

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/**
 * "Ranked 1 of 14. It sits in Band 1 (R 0.84, at or above 0.60) and has the largest water footprint in the band
 * (I 0.91). Quadrant: Act now." `scopeSites` are the sites ranked together (all 14 for a brand, own 3 for a supplier).
 */
export function whyThisRank(site: Site, scopeSites: Site[]): string {
  const R = fmtScore(site.R);
  const band =
    site.band === 1 ? `Band 1 (R ${R}, at or above ${fmtScore(R_BAND1)})`
    : site.band === 2 ? `Band 2 (R ${R}, from ${fmtScore(R_BAND2)} up to ${fmtScore(R_BAND1)})`
    : `Band 3 (R ${R}, below ${fmtScore(R_BAND2)})`;

  const peers = scopeSites.filter((s) => s.band === site.band).sort((a, b) => a.rank - b.rank);
  let footprint: string;
  if (site.footprintI === null) {
    footprint = "has no impact score yet, so it ranks last in its band";
  } else {
    const I = fmtScore(site.footprintI);
    const bigger = peers.filter((p) => p.footprintI !== null && p.footprintI > site.footprintI!).length;
    if (peers.length === 1) footprint = `is the only site in the band (I ${I})`;
    else if (bigger === 0) footprint = `has the largest water footprint in the band (I ${I})`;
    else footprint = `has the ${ordinal(bigger + 1)} largest water footprint of ${peers.length} in the band (I ${I})`;
  }
  return `Ranked ${site.rank} of ${scopeSites.length}. It sits in ${band} and ${footprint}. Quadrant: ${site.quadrant}.`;
}

/** Where a site sits against the two quadrant lines, for the Overview tab. */
export const quadrantLines = { R: R_BAND1, I: I_LARGE } as const;
