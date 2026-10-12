"use client";

import { useState } from "react";
import { BookOpen, Copy, Target } from "lucide-react";
import { useScope } from "@/src/context/RoleContext";
import { catalogueItems, CRITERIA, opportunities, type CatalogueKind } from "@/src/data/opportunities";
import { rankOpportunities } from "@/src/lib/catalogue";
import { fmtScore } from "@/src/lib/format";
import { catalogueCard, type CatalogueCardView } from "@/src/lib/projectsView";
import { inScope } from "@/src/lib/scope";
import { ProposedBadge, StatusPill } from "@/src/components/ui";
import { ForecastTags, GateList } from "./ProjectsParts";

type KindFilter = "all" | CatalogueKind;
const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Reference case study", label: "Case studies" },
  { value: "Reusable template", label: "Templates" },
  { value: "Actual opportunity", label: "Opportunities" },
];

const KIND_META: Record<CatalogueKind, { tone: "info" | "neutral" | "internal"; shape: "circle" | "square" | "diamond"; label: string }> = {
  "Reference case study": { tone: "neutral", shape: "square", label: "Case study" },
  "Reusable template": { tone: "internal", shape: "diamond", label: "Template" },
  "Actual opportunity": { tone: "info", shape: "circle", label: "Opportunity" },
};
const KindChip = ({ kind }: { kind: CatalogueKind }) => <StatusPill {...KIND_META[kind]} />;

function OpportunityCard({ card, rank }: { card: CatalogueCardView; rank: number | null }) {
  return (
    <li className={`card p-5 ${card.eligible ? "" : "border-dashed border-[var(--neutral-line)] bg-[var(--neutral-bg)] shadow-none"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`grid size-12 shrink-0 place-items-center rounded-full font-display text-lg font-bold ${rank ? "bg-blue-100 text-blue-600" : "bg-[var(--neutral-bg)] text-ink-500 ring-1 ring-[var(--neutral-line)]"}`} aria-label={rank ? `Rank ${rank}` : "Not ranked"}>{rank ?? "-"}</span>
          <div>
            <h4 className={card.eligible ? "" : "text-ink-500"}>{card.id} · {card.name}</h4>
            <div className="mt-1 flex flex-wrap items-center gap-2"><KindChip kind="Actual opportunity" /><ForecastTags /></div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-ink-500">Weighted score (0 to 5)</p>
          <p className="num font-display text-numlg text-ink-900">{fmtScore(card.weighted)}</p>
          {!card.eligible && <StatusPill tone="negative" shape="triangle" label="Ineligible" />}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1 text-sm font-semibold text-ink-500">Stage 1 · Mandatory gates (Pass or Fail)</p>
        <GateList gates={opportunities.find((o) => o.id === card.id)!.gates} />
        {!card.eligible && (
          <p className="mt-2 rounded-tile border border-[var(--negative-line)] bg-[var(--negative-bg)] px-3 py-2 font-semibold text-[var(--negative-fg)]">
            Failed: {card.failedGates.map((g) => `${g.label} (${g.result})`).join("; ")}
          </p>
        )}
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-3 text-[15px] md:grid-cols-2">
        <div><dt className="font-semibold text-ink-500">Suitability</dt><dd className="text-ink-700">{card.suitability}</dd></div>
        <div><dt className="font-semibold text-ink-500">Expected outcome</dt><dd className="text-ink-700">{card.outcome}</dd></div>
        <div><dt className="font-semibold text-ink-500">Cost</dt><dd className="text-ink-700">{card.cost}</dd></div>
        <div><dt className="font-semibold text-ink-500">Timing</dt><dd className="text-ink-700">{card.timing}</dd></div>
        <div className="md:col-span-2"><dt className="font-semibold text-ink-500">Measurement needs</dt><dd className="text-ink-700">{card.measurement}</dd></div>
      </dl>

      <details className="mt-4">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-blue-600">Stage 2 · Scoring reasons</summary>
        <table className="mt-1 w-full text-left text-[15px]">
          <caption className="sr-only">Criterion scores and reasons for {card.id}</caption>
          <thead><tr className="text-ink-500"><th scope="col" className="py-1 pr-3 font-semibold">Criterion</th><th scope="col" className="py-1 pr-3 font-semibold">Weight</th><th scope="col" className="py-1 pr-3 font-semibold">Score</th><th scope="col" className="py-1 font-semibold">Reason</th></tr></thead>
          <tbody>
            {card.reasons.map((r) => (
              <tr key={r.label} className="border-t border-line align-top">
                <th scope="row" className="py-2 pr-3 font-semibold">{r.label}</th>
                <td className="num py-2 pr-3">{r.weight.toFixed(2)}</td>
                <td className="num py-2 pr-3 font-semibold">{r.score} / 5</td>
                <td className="py-2 text-ink-700">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </li>
  );
}

// V2 11: eligibility gates first, then weighted attractiveness. A failed gate is never cancelled by a high score,
// so an ineligible opportunity is listed after every eligible one and greyed with the failed gate named.
export default function CatalogueTab() {
  const scope = useScope();
  const [kind, setKind] = useState<KindFilter>("all");
  const ranked = rankOpportunities(inScope(scope, opportunities));
  let eligibleRank = 0;
  const cards = ranked.map((r) => ({ card: catalogueCard(r), rank: r.eligible ? ++eligibleRank : null }));
  const library = catalogueItems.filter((c) => kind === "all" || c.kind === kind);
  const showOpps = kind === "all" || kind === "Actual opportunity";

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="mb-2">How opportunities are evaluated</h3>
        <ol className="list-decimal space-y-1 pl-5 text-ink-700">
          <li><span className="font-semibold">Mandatory gates first.</span> Six Pass or Fail checks. One failure makes the opportunity ineligible, whatever its score.</li>
          <li><span className="font-semibold">Weighted attractiveness second.</span> Five criteria scored 0 to 5: {CRITERIA.map((c) => `${c.label.toLowerCase()} ${c.weight.toFixed(2)}`).join(", ")}.</li>
        </ol>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-ink-500">
          <ProposedBadge label="Demonstration weights, rubric adaptation pending" /> <ForecastTags />
        </p>
      </div>

      <ul className="flex flex-wrap items-center gap-2" aria-label="Filter by kind">
        {KIND_FILTERS.map((f) => (
          <li key={f.value}>
            <button type="button" aria-pressed={kind === f.value} onClick={() => setKind(f.value)}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 font-semibold ${kind === f.value ? "border-blue-600 bg-blue-600 text-white" : "border-line bg-card text-ink-700 hover:bg-blue-50"}`}>
              {f.label}
            </button>
          </li>
        ))}
      </ul>

      {showOpps && (
        <section aria-labelledby="cat-opps">
          <h3 id="cat-opps" className="mb-3 flex items-center gap-2"><Target className="size-5 text-blue-600" aria-hidden="true" /> Actual opportunities, best first</h3>
          <ul className="space-y-4">{cards.map(({ card, rank }) => <OpportunityCard key={card.id} card={card} rank={rank} />)}</ul>
        </section>
      )}

      {library.length > 0 && (
        <section aria-labelledby="cat-lib">
          <h3 id="cat-lib" className="mb-3 flex items-center gap-2"><BookOpen className="size-5 text-blue-600" aria-hidden="true" /> Reference library</h3>
          <p className="mb-3 text-ink-500">Case studies show what delivered projects achieved. Templates are reusable starting points. Neither is scored until it becomes an actual opportunity at a site.</p>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {library.map((c) => (
              <li key={c.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-2"><KindChip kind={c.kind} /><span className="text-sm font-semibold text-ink-500">{c.type}</span></div>
                <h4 className="mt-2">{c.id} · {c.name}</h4>
                {c.note && <p className="mt-1 flex items-start gap-1.5 text-[15px] text-ink-500"><Copy className="mt-1 size-4 shrink-0" aria-hidden="true" />{c.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
