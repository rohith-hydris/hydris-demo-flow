import type { LedgerEntry } from "@/src/data/types";
import { CitationChip, LedgerPill, PeriodPill } from "@/src/components/ui";

/** Vertical timeline of Impact Ledger entries (DESIGN 4.13), newest first. */
export default function LedgerTimeline({ entries }: { entries: LedgerEntry[] }) {
  return (
    <ol className="relative ml-3 border-l-2 border-line">
      {entries.map((e) => (
        <li key={e.id} className="relative pb-6 pl-6 last:pb-0">
          <span aria-hidden="true" className="absolute -left-[9px] top-1.5 size-4 rounded-full border-2 border-blue-600 bg-card" />
          <div className="flex flex-wrap items-center gap-2">
            <CitationChip label={e.id} />
            <span className="font-semibold text-ink-900">{e.period}</span>
          </div>
          <p className="mt-1 text-ink-700">{e.what}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <LedgerPill status={e.entryStatus} />
            <PeriodPill period={e.periodStatus} label="Period" />
          </div>
        </li>
      ))}
    </ol>
  );
}
