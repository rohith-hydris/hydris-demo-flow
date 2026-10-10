import type { Alert, EtpDetail, Factory, FactoryPwi, RiskItem, RiskReport, RiskStatus } from "@/src/lib/data";
import {
  BandPill, Breadcrumbs, CellPill, EmptyState, HealthPill, KpiGrid, PageHeader, Panel, RiskPill, Section, Sparkline, pct, trendText,
} from "@/src/components/ui";
import { AlertList, SeverityLegend } from "./AlertList";

type Role = "brand" | "supplier";

function RiskCard({ r }: { r: RiskItem }) {
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h4 className="text-lg font-semibold">{r.name}</h4><p className="text-sm text-muted">Data: {r.vintage}</p></div>
        <RiskPill status={r.status} />
      </div>
      {r.score === null || r.scorePct === null ? (
        <p className="mt-3 text-muted">No score available.</p>
      ) : (
        <div className="mt-3">
          <div className="relative h-3 rounded-full bg-[#E6E9F1]" role="img" aria-label={`Score ${r.score.toFixed(2)} out of 5. Watch starts at 2, Present starts at 3.`}>
            <div className="h-3 rounded-full bg-brand-dark" style={{ width: `${r.scorePct}%` }} />
            <span className="absolute -top-1 h-5 w-0.5 bg-ink" style={{ left: "40%" }} />
            <span className="absolute -top-1 h-5 w-0.5 bg-ink" style={{ left: "60%" }} />
          </div>
          <div className="relative mt-1 h-5 text-sm font-semibold text-muted">
            <span className="absolute left-0">0</span>
            <span className="absolute -translate-x-1/2" style={{ left: "40%" }}>Watch 2</span>
            <span className="absolute -translate-x-1/2" style={{ left: "60%" }}>Present 3</span>
            <span className="absolute right-0">5</span>
          </div>
          <p className="num mt-1">Score {r.score.toFixed(2)} of 5{r.rawValue && <> · Value {r.rawValue}</>}</p>
        </div>
      )}
      <details className="mt-2">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-brand">Why this status</summary>
        <div className="space-y-2 pb-2">
          <p>{r.reason}</p>
          <p><strong>What would change it:</strong> {r.whatWouldChange}</p>
          <p className="text-sm text-muted"><strong>Source:</strong> {r.source} · <strong>Data from:</strong> {r.vintage}</p>
        </div>
      </details>
    </li>
  );
}

function RiskSection({ report }: { report: RiskReport }) {
  return (
    <Section title="Basin risk" hint="14 water-risk checks for this location. Open “Why this status” on any card for the plain-language reason.">
      <ul className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Risk status counts">
        {(["Present", "Watch", "Not present", "No data"] as RiskStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-2"><RiskPill status={s} /><span className="num text-xl font-bold">{report.counts[s]}</span></li>
        ))}
      </ul>
      {report.groups.map((g) => (
        <div key={g.category} className="mt-6">
          <h3 className="text-xl font-semibold text-brand-dark">{g.category}</h3>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">{g.items.map((r) => <RiskCard key={r.key} r={r} />)}</ul>
        </div>
      ))}
    </Section>
  );
}

const pillarName = { P1: "P1 Site", P2: "P2 Sub-basin", P3: "P3 Basin" };

function Tank({ pctFull }: { pctFull: number }) {
  return (
    <div className="relative h-24 w-14 shrink-0 overflow-hidden rounded-b-xl rounded-t-sm border-2 border-brand-dark bg-surface" role="img" aria-label={`Tank ${pctFull}% full`}>
      <div className="absolute inset-x-0 bottom-0 bg-brand/80 transition-[height] duration-700" style={{ height: `${pctFull}%` }} />
    </div>
  );
}

function PwiSection({ pwi }: { pwi: FactoryPwi | null }) {
  return (
    <Section title="Positive Water Impact" hint="How much water benefit the site delivers against its targets. Each tank shows the score.">
      {!pwi ? (
        <EmptyState title="Baseline pending" text="This factory has not submitted its water baseline yet, so there is no impact score to show." />
      ) : (
        <>
          <KpiGrid className="xl:grid-cols-5" items={[
            { label: "Site PWI", value: pct(pwi.sitePwi), context: `Low estimate ${pct(pwi.sitePwiLow)}` },
            { label: "Confidence", value: pwi.confidence.toFixed(2) },
            { label: "Certification band", value: pwi.certBand },
            { label: "Volumetric balance", value: pct(pwi.volumetricBalance) },
            { label: "Reporting period", value: pwi.period },
          ]} />
          <p className="mt-3">Replenishment needed: <strong className="num">{pwi.replenishmentNeededM3.toLocaleString("en-IN")} m³</strong></p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {pwi.cells.map((c) => (
              <div key={c.pillar + c.dimension} className="card flex gap-4 p-4">
                <Tank pctFull={c.scorePct} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-muted">{pillarName[c.pillar]} · {c.dimension}</p>
                  <p className="num text-2xl font-bold text-brand-dark">{pct(c.score)} <span className="text-base font-medium text-muted">Low {pct(c.scoreLow)} · Grade {c.grade}</span></p>
                  <CellPill state={c.state} />
                  <p className="mt-1 text-sm text-muted">Delivered {c.delivered} of {c.target} target</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="mt-4 rounded-lg border border-line bg-surface p-3 text-sm text-muted">A figure is public only when its ledger entry is Audited and its period is Locked.</p>
    </Section>
  );
}

function EtpSection({ factory, etp, alerts }: { factory: Factory; etp: EtpDetail | null; alerts: Alert[] }) {
  const h = etp?.healthHistory;
  return (
    <Section title="Wastewater plant and ZDHC" hint="Daily health of the factory's effluent treatment plant and its ZDHC tier.">
      <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
        <li className="card p-4"><p className="text-sm font-semibold text-muted">Health score now</p><p className="num mt-1 text-2xl font-bold text-brand-dark">{factory.healthScore} / 100</p><HealthPill health={factory.health} /></li>
        <li className="card p-4"><p className="text-sm font-semibold text-muted">ZDHC tier</p><p className="mt-1 text-2xl font-bold text-brand-dark">{factory.zdhcTier}</p><p className="text-muted">{trendText[factory.zdhcTrend]}</p></li>
        <li className="card p-4"><p className="text-sm font-semibold text-muted">Benefit vs pro-rated target</p><p className="num mt-1 text-2xl font-bold text-brand-dark">{factory.benefitVsTargetPct === null ? "Not available" : `${factory.benefitVsTargetPct}%`}</p></li>
        <li className="card p-4"><p className="text-sm font-semibold text-muted">Last data</p><p className="num mt-1 text-2xl font-bold text-brand-dark">{factory.lastDataDate}</p><p className="text-muted">{factory.daysWithoutData} days ago</p></li>
      </ul>
      {etp && h && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Health, last 30 days">
            <Sparkline values={h.map((p) => p.score)} guides={[50, 75]} ariaLabel={`Health score over 30 days: from ${h[0].score} on ${h[0].date} to ${h[h.length - 1].score} on ${h[h.length - 1].date}`} />
            <p className="text-sm text-muted">Dashed lines mark 50 (Watch) and 75 (Healthy).</p>
          </Panel>
          <Panel title="ZDHC tier history">
            <ul className="divide-y divide-line">
              {etp.tierHistory.map((t) => (
                <li key={t.date} className="flex flex-wrap justify-between gap-2 py-2"><span className="num">{t.date}</span><strong>{t.tier}</strong><span>{trendText[t.change]}</span></li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
      <h3 className="mb-3 mt-6 text-xl font-semibold text-brand-dark">Alerts for this plant</h3>
      <div className="mb-3"><SeverityLegend /></div>
      <AlertList alerts={alerts} />
    </Section>
  );
}

export default function FactoryDetail({ role, factory, report, pwi, etp, alerts }: { role: Role; factory: Factory; report: RiskReport; pwi: FactoryPwi | null; etp: EtpDetail | null; alerts: Alert[] }) {
  const crumbs = role === "brand"
    ? [
        { label: "Brand", href: "/brand" }, { label: "Suppliers", href: "/brand#suppliers" },
        { label: factory.supplierName, href: `/brand/suppliers/${factory.supplierId}` }, { label: factory.name },
      ]
    : [{ label: "Supplier dashboard", href: "/supplier" }, { label: factory.name }];
  return (
    <>
      <Breadcrumbs items={crumbs} />
      <PageHeader
        title={factory.name}
        subtitle={role === "supplier" ? "Your factory" : `Factory of ${factory.supplierName}`}
        meta={
          <>
            <BandPill band={factory.band} />
            <span>{role === "supplier" ? "Your" : "Brand"} priority rank <strong className="num">#{role === "supplier" ? factory.priorityRankInSupplier : factory.priorityRankInBrand}</strong></span>
            <span className="inline-flex items-center gap-2">ETP health <strong className="num">{factory.healthScore}</strong> <HealthPill health={factory.health} /></span>
            <span>ZDHC <strong>{factory.zdhcTier}</strong></span>
            <span>PWI band <strong>{factory.certBand ?? "Baseline pending"}</strong></span>
          </>
        }
      >
        <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Supplier", factory.supplierName],
            ["District", `${factory.district}, ${factory.state}`],
            ["Basin", factory.basin],
            ["Coordinates", `${factory.lat.toFixed(4)}, ${factory.lng.toFixed(4)}`],
            ["Last data date", factory.lastDataDate],
          ].map(([k, v]) => <div key={k}><dt className="text-sm font-semibold text-muted">{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </PageHeader>
      <EtpSection factory={factory} etp={etp} alerts={alerts} />
      <RiskSection report={report} />
      <PwiSection pwi={pwi} />
    </>
  );
}
