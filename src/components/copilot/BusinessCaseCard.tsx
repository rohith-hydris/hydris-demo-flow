import type { ResolvedCase } from "@/src/lib/copilot";
import { CitationChip, StatusPill } from "@/src/components/ui";
import { RichText } from "./RichText";

/** The drafted prove-and-scale business case. Every number has a citation chip; cost is a placeholder, never an estimate. */
export function BusinessCaseCard({ item }: { item: ResolvedCase }) {
  return (
    <article className="rounded-tile border border-line bg-card p-5 shadow-card" aria-label={item.title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4>{item.title}</h4>
        <StatusPill tone="caution" shape="diamond" label={item.note} />
      </div>
      <dl className="mt-3 space-y-3">
        {item.sections.map((s) => (
          <div key={s.heading}>
            <dt className="text-sm font-semibold text-ink-500">{s.heading}</dt>
            <dd>
              {s.placeholder ? (
                <p className="mt-1 rounded-tile border border-[var(--caution-line)] bg-[var(--caution-bg)] px-3 py-2 font-semibold text-[var(--caution-fg)]">{s.text}</p>
              ) : (
                <RichText text={s.text} className="text-ink-700" />
              )}
              {s.cites.length > 0 && <span className="mt-1 flex flex-wrap gap-2">{s.cites.map((c) => <CitationChip key={c} label={c} />)}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
