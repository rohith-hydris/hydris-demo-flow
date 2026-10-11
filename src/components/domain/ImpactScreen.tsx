"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRole, useScope } from "@/src/context/RoleContext";
import { suppliers } from "@/src/data/suppliers";
import { buildImpact, POLLUTANT_KEYS, POLLUTANT_LABEL, type OutcomeRow } from "@/src/lib/impactView";
import { PILLAR_NAMES } from "@/src/lib/pwi";
import { getSites } from "@/src/lib/selectors";
import { AppMain, DataTable, PageHeader, SelectControl, Toolbar, type Column } from "@/src/components/ui";
import { PillarBars, StateLegend, ValueStatePill } from "./ImpactPanels";
import { useTrace } from "./Trace";

const COLLAPSED = 20;

function OutcomesTable({ rows }: { rows: OutcomeRow[] }) {
  const { open } = useTrace();
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, COLLAPSED);
  const columns: Column<OutcomeRow>[] = [
    {
      key: "outcome", header: "Outcome", className: "min-w-64 py-2",
      cell: (r) => (
        <div>
          <button type="button" onClick={() => open(r.trace)} aria-label={`Where this number comes from: ${r.outcome}, ${r.factoryName}`} className="min-h-11 text-left font-semibold text-blue-600 hover:underline">{r.outcome}</button>
          <Link href={`/factories/${r.factoryId}?tab=impact`} className="block text-sm text-ink-500 hover:underline">{r.factoryName}</Link>
        </div>
      ),
    },
    { key: "dimension", header: "Dimension", className: "min-w-28", cell: (r) => r.dimension },
    { key: "pillar", header: "Pillar", className: "min-w-32", cell: (r) => `${PILLAR_NAMES[r.pillar]} ${r.pillar}` },
    { key: "value", header: "Value", className: "min-w-56 py-2 font-semibold text-ink-900", cell: (r) => r.value },
    { key: "state", header: "State", className: "min-w-44", cell: (r) => (<div className="flex flex-col items-start gap-1 py-2"><ValueStatePill state={r.state} />{r.stateNote && <span className="text-sm text-ink-500">{r.stateNote}</span>}</div>) },
    { key: "project", header: "Project", className: "min-w-28 text-ink-700", cell: (r) => r.project ?? "None" },
    { key: "method", header: "Method", className: "min-w-48 py-2 text-ink-700", cell: (r) => r.method },
    { key: "period", header: "Period", className: "min-w-48 py-2 text-ink-700", cell: (r) => r.period },
    { key: "evidence", header: "Evidence", className: "min-w-52 py-2 text-ink-700", cell: (r) => r.evidence },
  ];
  return (
    <>
      <DataTable columns={columns} rows={shown} rowKey={(r) => r.id} caption="Outcomes with value, state, project, method, period and evidence" minWidth="1400px" />
      {rows.length > COLLAPSED && (
        <div className="mt-3 flex justify-center">
          <button type="button" className="btn btn-secondary" onClick={() => setAll((a) => !a)} aria-expanded={all}>{all ? "Show fewer" : `Show all ${rows.length} outcomes`}</button>
        </div>
      )}
    </>
  );
}

// Impact (V2 9): quantity, quality and access kept apart, each split into Validated, Measured and Forecast.
export default function ImpactScreen() {
  const { role } = useRole();
  const scope = useScope();
  const params = useSearchParams();
  const all = useMemo(() => getSites(scope), [scope]);

  const supplierParam = params.get("supplier");
  const supplierId = role === "brand" && suppliers.some((s) => s.id === supplierParam) ? supplierParam : null;
  const inSupplier = all.filter((s) => !supplierId || s.supplierId === supplierId);
  const factoryParam = params.get("factory");
  const factoryId = inSupplier.some((s) => s.id === factoryParam) ? factoryParam : null;
  const sites = useMemo(() => inSupplier.filter((s) => !factoryId || s.id === factoryId), [inSupplier, factoryId]);

  const impact = useMemo(() => buildImpact(sites), [sites]);
  const scopeLabel = factoryId ? sites[0].name : supplierId ? suppliers.find((s) => s.id === supplierId)!.name : role === "brand" ? "All suppliers" : "Your factories";

  return (
    <>
      <PageHeader
        title="Impact"
        subtitle="Quantity, quality and access, kept apart and never blended into one number. Every value says whether it is Validated, Measured or only a Forecast."
        crumbs={[{ label: "Portfolio", href: "/portfolio" }, { label: "Impact" }]}
        actions={sites.length === 1 ? <Link href={`/factories/${sites[0].id}?tab=impact`} className="btn btn-secondary">Open factory Impact tab</Link> : undefined}
      />
      <AppMain>
        <div className="card p-5">
          <Toolbar>
            {role === "brand" && (
              <SelectControl param="supplier" label="Supplier" defaultValue="all" options={[{ value: "all", label: "All suppliers" }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
            )}
            <SelectControl param="factory" label="Factory" defaultValue="all" options={[{ value: "all", label: "All factories" }, ...inSupplier.map((s) => ({ value: s.id, label: s.name }))]} />
            <StateLegend />
          </Toolbar>
          <p className="text-sm text-ink-500">
            Showing {scopeLabel}, FY2025-26. PWI uses Measured and Validated benefit only. A Forecast comes from opportunities and scenarios, is a demo estimate, and is never added to a Measured or Validated total.
          </p>
        </div>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-3">
          <section className="card p-6" aria-labelledby="impact-quantity">
            <h3 id="impact-quantity">Quantity</h3>
            <p className="mb-5 mt-1 text-ink-500">Water volume, m³ per year</p>
            <PillarBars rows={impact.quantity} unit="m³" />
          </section>

          <section className="card p-6" aria-labelledby="impact-quality">
            <h3 id="impact-quality">Quality</h3>
            <p className="mb-5 mt-1 text-ink-500">Pollutant load, kg per year, one pollutant at a time. Never summed across pollutants.</p>
            <div className="space-y-6">
              {POLLUTANT_KEYS.map((k) => (
                <div key={k}>
                  <h4 className="mb-3">{POLLUTANT_LABEL[k]}</h4>
                  <PillarBars rows={impact.quality[k]} unit="kg" />
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm text-ink-500">
              Site P1 is plant removal against the 90% target. The demo records baseline influent loads for {impact.qualityP1.withLoads} of {impact.qualityP1.of} {impact.qualityP1.of === 1 ? "factory" : "factories"} in view, so P1 kg appear only for those.
            </p>
          </section>

          <section className="card p-6" aria-labelledby="impact-access">
            <h3 id="impact-access">Access</h3>
            <p className="mb-5 mt-1 text-ink-500">People with a safe, working water and sanitation service</p>
            <PillarBars rows={impact.access} unit="people" />
            <p className="mt-5 rounded-tile bg-blue-50 p-3 text-ink-700">Reuse or cleaner discharge does not establish access. Service and beneficiary evidence are required.</p>
          </section>
        </div>

        <section className="mt-10" aria-labelledby="impact-outcomes">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="impact-outcomes">Outcomes</h2>
              <p className="mt-1 max-w-3xl text-ink-500">Select an outcome name to see its method, period, inputs, evidence, source opportunity and the calculation version.</p>
            </div>
            <p className="text-ink-500" aria-live="polite">{impact.outcomes.length} outcomes</p>
          </div>
          <OutcomesTable key={`${supplierId}-${factoryId}`} rows={impact.outcomes} />
        </section>
      </AppMain>
    </>
  );
}
