import type { ClaimAmount, Measure } from "@/src/data/types";
import { fmtInt, round } from "./format";

// Plain-text rendering of targets, delivered benefits and claims. Volumes, people and mass are never mixed in one figure.

export const MASS_KEYS = "TSS / TN / TP";

const num = (x: number) => String(round(x, 1));

export function fmtMeasure(m: Measure): string {
  switch (m.kind) {
    case "volume": return `${fmtInt(m.m3)} m\u00b3`;
    case "people": return `${fmtInt(m.count)} people`;
    case "mass": return `${fmtInt(m.tss)} / ${fmtInt(m.tn)} / ${fmtInt(m.tp)} kg`;
    case "removal": return `TSS ${num(m.tss)}% \u00b7 TN ${num(m.tn)}% \u00b7 TP ${num(m.tp)}%`;
  }
}

export function fmtClaim(c: ClaimAmount): string {
  switch (c.unit) {
    case "m3": return `${fmtInt(c.value)} m\u00b3`;
    case "people": return `${fmtInt(c.value)} people`;
    case "kg": return `${fmtInt(c.tss)} / ${fmtInt(c.tn)} / ${fmtInt(c.tp)} kg`;
  }
}

/** A short note on what a mass figure lists, shown beside it. */
export const claimNote = (c: ClaimAmount) => (c.unit === "kg" ? `(${MASS_KEYS})` : "");
export const measureNote = (m: Measure) => (m.kind === "mass" ? `(${MASS_KEYS})` : "");
