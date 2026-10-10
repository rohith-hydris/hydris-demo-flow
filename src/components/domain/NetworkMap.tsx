"use client";

import { useState } from "react";
import Link from "next/link";
import { tamilNaduOutline } from "@/src/data/tnOutline";
import { fmtPct1, fmtScore } from "@/src/lib/format";
import { outlinePath, pinRadius, project, viewSize } from "@/src/lib/mapGeometry";
import type { Site } from "@/src/lib/selectors";
import type { Band } from "@/src/lib/types";

// Pin style by risk band (DESIGN 4.14): a tinted fill with a ring. The ring pattern differs per band so colour is
// never the only cue: Band 1 solid and thick, Band 2 dashed, Band 3 solid and thin.
const pinStyle: Record<Band, { fill: string; ring: string; width: number; dash?: string }> = {
  1: { fill: "var(--negative-bg)", ring: "var(--negative-fill)", width: 3.5 },
  2: { fill: "var(--caution-bg)", ring: "var(--caution-fill)", width: 3, dash: "5 3" },
  3: { fill: "var(--positive-bg)", ring: "var(--positive-fill)", width: 2 },
};

const legend: { band: Band; label: string }[] = [
  { band: 1, label: "Band 1 · highest risk" },
  { band: 2, label: "Band 2 · medium risk" },
  { band: 3, label: "Band 3 · lower risk" },
];

/** Stylised Tamil Nadu dot-grid map. Pins are placed by latitude and longitude; there is no tile service. */
export default function NetworkMap({ sites }: { sites: Site[] }) {
  const { width, height } = viewSize();
  const [active, setActive] = useState<string | null>(null);
  const hovered = sites.find((s) => s.id === active);
  // Larger pins first, so smaller ones in the same cluster stay visible on top.
  const drawOrder = [...sites].sort((a, b) => pinRadius(b.footprintI) - pinRadius(a.footprintI));

  return (
    <div>
      <div className="panel relative overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="group" aria-label="Map of the factory network in Tamil Nadu. Pins are coloured by risk band and sized by footprint.">
          <defs>
            <pattern id="tn-dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.3" fill="var(--blue-500)" opacity="0.28" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#tn-dots)" />
          <path d={outlinePath(tamilNaduOutline)} fill="var(--blue-100)" stroke="var(--blue-500)" strokeOpacity="0.55" strokeWidth="1.5" strokeLinejoin="round" />
          {drawOrder.map((s) => {
            const { x, y } = project(s.lat, s.lon);
            const st = pinStyle[s.band];
            const on = active === s.id;
            return (
              <Link
                key={s.id} href={`/factories/${s.id}`}
                aria-label={`${s.name}, Band ${s.band}, risk ${fmtScore(s.R)}, footprint ${s.footprintI === null ? "pending" : fmtScore(s.footprintI)}, PWI ${fmtPct1(s.pwi.sitePwi)}. Open factory.`}
                onMouseEnter={() => setActive(s.id)} onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.id)} onBlur={() => setActive(null)}
              >
                <circle cx={x} cy={y} r={pinRadius(s.footprintI) + (on ? 3 : 0)} fill={st.fill} stroke={st.ring} strokeWidth={st.width} strokeDasharray={st.dash} />
                <circle cx={x} cy={y} r={pinRadius(s.footprintI) + 2} fill="none" stroke="var(--card)" strokeWidth="1.5" opacity="0.9" pointerEvents="none" />
              </Link>
            );
          })}
        </svg>

        {hovered && (
          <div
            aria-hidden="true"
            className="card pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-full p-3 text-sm"
            style={{ left: `${(project(hovered.lat, hovered.lon).x / width) * 100}%`, top: `calc(${(project(hovered.lat, hovered.lon).y / height) * 100}% - ${pinRadius(hovered.footprintI) + 8}px)` }}
          >
            <p className="font-semibold text-ink-900">{hovered.name}</p>
            <p className="num text-ink-700">
              R {fmtScore(hovered.R)} · I {hovered.footprintI === null ? "pending" : fmtScore(hovered.footprintI)} · PWI {fmtPct1(hovered.pwi.sitePwi)}
            </p>
          </div>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-700">
        {legend.map((l) => (
          <li key={l.band} className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
              <circle cx="12" cy="12" r="8" fill={pinStyle[l.band].fill} stroke={pinStyle[l.band].ring} strokeWidth={pinStyle[l.band].width} strokeDasharray={pinStyle[l.band].dash} />
            </svg>
            {l.label}
          </li>
        ))}
        <li className="text-ink-500">Larger pin = larger footprint (I)</li>
      </ul>

      <table className="sr-only">
        <caption>Factories on the network map</caption>
        <thead><tr><th>Factory</th><th>Risk band</th><th>Risk R</th><th>Footprint I</th><th>PWI</th></tr></thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td><td>Band {s.band}</td><td>{fmtScore(s.R)}</td>
              <td>{s.footprintI === null ? "pending" : fmtScore(s.footprintI)}</td><td>{fmtPct1(s.pwi.sitePwi)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
