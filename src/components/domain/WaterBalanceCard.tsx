import { balanceGradeNote, boundaryBalance } from "@/src/lib/boundary";
import { fmtInt, fmtPct1 } from "@/src/lib/format";
import { waterBalance } from "@/src/lib/impact";
import type { Site } from "@/src/lib/selectors";
import { ProposedBadge, StatusPill } from "@/src/components/ui";

const m3 = (n: number) => `${fmtInt(n)} m³`;

function Line({ label, value, indent = false, strong = false }: { label: string; value: string; indent?: boolean; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${indent ? "pl-5 text-sm" : ""}`}>
      <dt className={strong ? "font-semibold text-ink-900" : "text-ink-700"}>{label}</dt>
      <dd className={`num ${strong ? "font-semibold text-ink-900" : "text-ink-700"}`}>{value}</dd>
    </div>
  );
}

/** V2 7: whole-site balance on the external boundary. F12 has the full balance; other sites show RN only. */
export default function WaterBalanceCard({ site }: { site: Site }) {
  const bb = boundaryBalance(site.id);
  const wb = waterBalance(site.id);

  if (!bb || !wb) {
    return (
      <>
        <h3>Water balance</h3>
        <p className="num mt-4 font-display text-numlg text-ink-900">{m3(site.replenishmentNeededM3)}</p>
        <p className="text-ink-700">Replenishment needed (RN): the water the site must give back.</p>
        <p className="mt-2 text-sm text-ink-500">Freshwater withdrawal, discharge and consumption are not part of the demo data for this site.</p>
      </>
    );
  }

  const signed = (n: number) => `${n >= 0 ? "+" : "−"}${fmtInt(Math.abs(n))} m³`;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3>Water balance</h3>
        <ProposedBadge label="Boundary under review" />
      </div>
      <p className="mt-2 text-sm text-ink-500">Whole site, external boundary: freshwater withdrawal = total discharge + metered consumption + change in storage ± error.</p>

      <dl className="mt-4 space-y-2">
        <Line label="Freshwater withdrawal" value={m3(bb.withdrawalM3)} strong />
        {wb.bySource.map((s) => <Line key={s.label} label={s.label} value={m3(s.m3)} indent />)}
        <div className="border-t border-line pt-2"><Line label="Total discharge (ETP flow)" value={m3(bb.totalDischargeM3)} strong /></div>
        <Line label="of which same-basin, within consent" value={m3(bb.sameBasinDischargeM3)} indent />
        <Line label="of which other basin, sea or out of compliance (counts as zero)" value={m3(bb.otherDischargeM3)} indent />
        <Line label="Metered consumption" value={m3(bb.consumptionM3)} strong />
        <Line label="Change in storage" value={signed(bb.storageChangeM3)} strong />
        <Line label={`Error (${fmtPct1(bb.errorShareOfWithdrawal)} of withdrawal)`} value={m3(bb.errorM3)} strong />
      </dl>
      {balanceGradeNote(bb) && (
        <p className="mt-3" role="status">
          <StatusPill tone="caution" shape="triangle" label={balanceGradeNote(bb)!} />
        </p>
      )}
      <p className="mt-3 rounded-tile bg-blue-50 p-3 text-sm text-ink-700" role="status">
        {bb.reconciles ? "Reconciles: " : "Does not reconcile: "}
        <span className="num">{fmtInt(bb.totalDischargeM3)} + {fmtInt(bb.consumptionM3)} + {fmtInt(bb.storageChangeM3)} + {fmtInt(bb.errorM3)} = {fmtInt(bb.withdrawalM3)} m{"³"}</span>
      </p>

      <div className="mt-4 rounded-tile border border-dashed border-[var(--neutral-line)] p-3">
        <Line label="Internal recirculation (recycled and reclaimed)" value={m3(bb.internalRecirculationM3)} />
        <p className="mt-1 text-sm text-ink-500">An internal flow. It is not added as an external inflow.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-tile border border-line p-3">
          <p className="text-sm font-semibold text-ink-500">Physical consumption</p>
          <p className="num font-display text-numlg text-ink-900">{m3(bb.consumptionM3)}</p>
        </div>
        <div className="rounded-tile border border-line bg-blue-50 p-3">
          <p className="text-sm font-semibold text-ink-500">Replenishment needed (RN)</p>
          <p className="num font-display text-numlg text-ink-900">{m3(bb.replenishmentNeededM3)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-700">
        RN = discharge not counted + consumption + storage change + error ={" "}
        <span className="num">{bb.rnParts.map((p) => fmtInt(p.m3)).join(" + ")} = {fmtInt(bb.replenishmentNeededM3)}</span>
      </p>
      <p className="mt-1 text-sm text-ink-500">Replenishment Needed is a programme definition, not physical consumption.</p>

      <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-ink-500">Condensate origin</dt><dd className="text-ink-700">{bb.condensateOrigin.toLowerCase()}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-500">Transfers</dt><dd className="text-ink-700">{bb.transfers.toLowerCase()}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-500">Discharge destination</dt><dd className="text-right text-ink-700">{bb.dischargeDestination}</dd></div>
      </dl>
    </>
  );
}
