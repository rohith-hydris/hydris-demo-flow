"use client";

import { CheckCheck, ClipboardCheck, FileClock } from "lucide-react";
import { evidenceChange } from "@/src/data/affected";
import { affectedOutputs, flaggedCount, fmtBefore, type AffectedOutput } from "@/src/lib/affected";
import { fmtCellScore, fmtPct1 } from "@/src/lib/format";
import type { Site } from "@/src/lib/selectors";
import { StatusPill } from "@/src/components/ui";
import MockAction from "./MockAction";

const before = fmtBefore;

function Outcome({ o }: { o: AffectedOutput }) {
  if (o.outcome === "Recalculated") return <StatusPill tone="positive" shape="circle" label={`Recalculated, ${o.calculationValidity ?? "Valid"}`} />;
  if (o.outcome === "Flagged for review") return <StatusPill tone="caution" shape="diamond" label="Flagged for review" />;
  return <StatusPill tone="neutral" shape="square" label="Not altered" />;
}

/** V2 13: a changed input flags Draft outputs. A Released report keeps its snapshot and only gets a review prompt. F12 only. */
export default function AffectedOutputsPanel({ site }: { site: Site }) {
  if (site.id !== evidenceChange.factoryId) return null;
  const p2a = site.pwi.cells.find((c) => c.pillar === "P2" && c.dimension === "Availability")!.score;
  const rows = affectedOutputs(site.pwi.sitePwi, p2a);
  const released = rows.find((r) => r.banner);
  const flagged = flaggedCount(rows);

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3>Affected outputs</h3>
        <p className="text-ink-500">{flagged} draft {flagged === 1 ? "output" : "outputs"} flagged for review</p>
      </div>
      <p className="mt-1 max-w-3xl text-ink-700">
        <span className="font-semibold">{evidenceChange.id}:</span> {evidenceChange.what}.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-[15px]">
          <caption className="sr-only">Outputs affected by the changed evidence</caption>
          <thead>
            <tr>
              {["Output", "Before", "State now"].map((h, i) => <th key={h} scope="col" className={`bg-blue-50 px-3 py-3 text-sm font-semibold text-ink-700 ${i === 0 ? "rounded-l-tile" : i === 2 ? "rounded-r-tile" : ""}`}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.output.id}>
                <td className="border-b border-line px-3 py-3 font-semibold text-ink-900">
                  {r.output.label}
                  {r.output.release === "Released (snapshot)" && <span className="ml-2 text-sm font-normal text-ink-500">Released snapshot</span>}
                </td>
                <td className="num border-b border-line px-3 py-3 text-ink-700">{before(r)}</td>
                <td className="border-b border-line px-3 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <Outcome o={r} />
                    {r.now !== null && r.outcome === "Flagged for review" && <span className="text-sm text-ink-500">Value now <span className="num font-semibold text-ink-700">{fmtPct1(r.now)}</span></span>}
                    {r.now !== null && r.outcome === "Recalculated" && <span className="text-sm text-ink-500">P2 Availability now <span className="num font-semibold text-ink-700">{fmtCellScore(r.now)}</span></span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {released?.banner && (
        <p role="note" className="mt-4 rounded-tile border border-line bg-blue-50 p-4 font-semibold text-ink-900">{released.banner}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <MockAction label="Review flagged items" done="Review started (demo)" icon={ClipboardCheck} />
        <MockAction label="Acknowledge" done="Acknowledged (demo)" icon={CheckCheck} />
        <MockAction label="Request restatement decision" done="Decision requested (demo)" icon={FileClock} />
      </div>
    </div>
  );
}
