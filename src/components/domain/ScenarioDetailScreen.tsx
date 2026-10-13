"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/src/context/RoleContext";
import { useProjects } from "@/src/context/ProjectsContext";
import { fmtPct1 } from "@/src/lib/format";
import { compareRows } from "@/src/lib/projectsView";
import { AppMain, EmptyState, PageHeader } from "@/src/components/ui";
import { ForecastTags } from "./ProjectsParts";
import { DeliveryStrip, ResultNotes, ScenarioActions, useScenarioModel } from "./ScenarioParts";

// /projects/scenarios/:id (V2 15): one scenario, its results against the no-project baseline, business case and approval.
export default function ScenarioDetailScreen({ scenarioId }: { scenarioId: string }) {
  const { role } = useRole();
  const router = useRouter();
  const { scenarios, approved } = useProjects();
  const { site, evaluate, baseline } = useScenarioModel();
  useEffect(() => {
    if (role === "brand") router.replace("/actions");
  }, [role, router]);
  const scenario = scenarios.find((s) => s.id === scenarioId);
  const crumbs = [{ label: "Projects", href: "/projects?tab=scenarios" }, { label: scenario ? `${scenario.id} ${scenario.name}` : "Scenario" }];

  if (role === "brand") return null;
  if (!scenario) {
    return (
      <>
        <PageHeader title="Scenario not found" crumbs={crumbs} />
        <AppMain><EmptyState title="No scenario with this id" text="Scenarios you build live in this session only. Open Projects to build or pick one." action={{ label: "Back to scenarios", href: "/projects?tab=scenarios" }} /></AppMain>
      </>
    );
  }

  const result = evaluate(scenario.items);
  const rows = compareRows([baseline, result]);
  return (
    <>
      <PageHeader
        title={`${scenario.id} · ${scenario.name}`}
        subtitle={`${scenario.blurb} ${site.name}. Site PWI forecast ${fmtPct1(result.pwi)} against ${fmtPct1(baseline.pwi)} with no project.`}
        crumbs={crumbs}
        meta={<ForecastTags />}
      />
      <AppMain>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[15px]">
            <caption className="sr-only">{scenario.name} against the no-project baseline</caption>
            <thead><tr className="bg-blue-50 text-ink-700"><th scope="col" className="px-4 py-3 font-semibold">Outcome</th><th scope="col" className="px-4 py-3 font-semibold">No-project baseline</th><th scope="col" className="px-4 py-3 font-semibold">{scenario.name}</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-line"><th scope="row" className="px-4 py-3 font-semibold">{r.label}</th>{r.values.map((v, i) => <td key={i} className="num px-4 py-3">{v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5"><ResultNotes result={result} baseline={baseline} /></div>
        <div className="mt-6"><ScenarioActions scenario={scenario} /></div>
        {approved.id && <div className="mt-8"><DeliveryStrip /></div>}
      </AppMain>
    </>
  );
}
