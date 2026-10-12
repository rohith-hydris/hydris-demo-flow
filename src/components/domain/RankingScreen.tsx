"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRole, useScope } from "@/src/context/RoleContext";
import { REPORTING_PERIOD } from "@/src/data/tenants";
import { DEFAULT_WEIGHTS, type Weights } from "@/src/lib/risk";
import { tenantFor } from "@/src/lib/roles";
import { getRankRanges, getSites } from "@/src/lib/selectors";
import { isDefaultWeights } from "@/src/lib/weights";
import { COVERAGE_READINESS_NOTE } from "@/src/lib/statusCopy";
import { AppMain, PageHeader, Section } from "@/src/components/ui";
import QuadrantScatter from "./QuadrantScatter";
import RankTable from "./RankTable";
import WeightsPanel from "./WeightsPanel";
import WhyRankCard from "./WhyRankCard";

const ARROWS_MS = 2500;

// Ranking (PRODUCT 4.5, Module 02): the scatter, live weights, the ranked table and the rank range.
// A supplier sees only its own factories, ranked among themselves.
export default function RankingScreen() {
  const { role } = useRole();
  const scope = useScope();
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [picked, setPicked] = useState<string | null>(null);
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const [announce, setAnnounce] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const sites = useMemo(() => getSites(scope, weights), [scope, weights]);
  const ranges = useMemo(() => getRankRanges(scope, weights), [scope, weights]);
  const selected = sites.find((s) => s.id === picked) ?? sites[0];
  const tenant = tenantFor(role!);

  function change(next: Weights) {
    // Work out how far each site moves, so the table can show it for a moment.
    const before = new Map(sites.map((s) => [s.id, s.rank]));
    const after = getSites(scope, next);
    const moved: Record<string, number> = {};
    for (const s of after) {
      const d = (before.get(s.id) ?? s.rank) - s.rank;
      if (d !== 0) moved[s.id] = d;
    }
    setWeights(next);
    setDeltas(moved);
    setAnnounce(`Ranking updated. ${after[0].name} is ranked first.`);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDeltas({}), ARROWS_MS);
  }

  return (
    <>
      <PageHeader
        title="Ranking"
        subtitle={role === "brand"
          ? "Rank shows priority for action, not performance. More benefit delivered never raises priority."
          : "Your factories, ranked among themselves. Rank shows priority for action, not performance."}
        meta={<p className="text-ink-500">{tenant.name} · {REPORTING_PERIOD.label}</p>}
      />
      <AppMain>
        <div className="grid items-start gap-5 lg:grid-cols-12">
          <div className="card p-6 lg:col-span-7">
            <h3 className="mb-4">Risk against footprint</h3>
            <QuadrantScatter sites={sites} selectedId={selected?.id ?? null} onSelect={setPicked} />
          </div>
          <div className="space-y-5 lg:col-span-5">
            <WeightsPanel weights={weights} onChange={change} onReset={() => change(DEFAULT_WEIGHTS)} />
            {selected && <WhyRankCard site={selected} scopeSites={sites} range={ranges[selected.id]} weightsChanged={!isDefaultWeights(weights)} />}
          </div>
        </div>

        <Section title="Ranked sites" hint="Band first, then footprint. The rank range shows how steady each rank is when the weights move.">
          <RankTable sites={sites} ranges={ranges} deltas={deltas} selectedId={selected?.id ?? null} onSelect={setPicked} />
          <p className="mt-3 text-sm text-ink-500">{COVERAGE_READINESS_NOTE}</p>
        </Section>
        <p className="sr-only" role="status" aria-live="polite">{announce}</p>
      </AppMain>
    </>
  );
}
