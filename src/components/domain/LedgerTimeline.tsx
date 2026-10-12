import type { LedgerEntry } from "@/src/data/types";
import { CitationChip, LedgerPill, PeriodPill, StatusPill } from "@/src/components/ui";
import { DEMO_HASH_LABEL, chainStatusText, verifyChain } from "@/src/lib/ledger";

const shortHash = (h: string) => `${h.slice(0, 8)}…${h.slice(-4)}`;

/** Vertical timeline of Impact Ledger entries (DESIGN 4.13), newest first, with the demo hash chain check. */
export default function LedgerTimeline({ entries }: { entries: LedgerEntry[] }) {
  const chain = verifyChain(entries);
  return (
    <div>
      <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-ink-500">
        {chain.ok
          ? <StatusPill tone="positive" shape="circle" label={chainStatusText(chain)} />
          : <StatusPill tone="negative" shape="triangle" label={chainStatusText(chain)} />}
        <span>{DEMO_HASH_LABEL}: each entry is sealed with the previous entry&apos;s hash. A demo reference, not an audit control.</span>
      </p>
      <ol className="relative ml-3 border-l-2 border-line">
        {entries.map((e) => (
          <li key={e.id} className="relative pb-6 pl-6 last:pb-0">
            <span aria-hidden="true" className="absolute -left-[9px] top-1.5 size-4 rounded-full border-2 border-blue-600 bg-card" />
            <div className="flex flex-wrap items-center gap-2">
              <CitationChip label={e.id} />
              <span className="font-semibold text-ink-900">{e.period}</span>
              {!chain.ok && chain.brokenId === e.id && <StatusPill tone="negative" shape="triangle" label="First broken entry" />}
            </div>
            <p className="mt-1 text-ink-700">{e.what}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <LedgerPill status={e.entryStatus} />
              <PeriodPill period={e.periodStatus} label="Period" />
            </div>
            <p className="mt-2 text-sm text-ink-500">
              {e.methodVersion} · {e.formula}
            </p>
            <p className="num mt-1 text-sm text-ink-500">{DEMO_HASH_LABEL} {shortHash(e.hash)} · previous {shortHash(e.previousHash)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
