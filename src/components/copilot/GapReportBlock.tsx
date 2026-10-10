"use client";

import Link from "next/link";
import { Upload } from "lucide-react";
import { READINESS_STATES } from "@/src/lib/claims";
import type { ResolvedBlock } from "@/src/lib/copilot";
import { ReadinessPill, StatusPill } from "@/src/components/ui";
import MockAction from "@/src/components/domain/MockAction";
import type { LocalDone } from "./blocks";

type B = Extract<ResolvedBlock, { kind: "gapReport" }>;

const th = "px-3 py-2 text-left text-sm font-semibold text-ink-700";

/** Evidence gap report (PRODUCT 9, E2): readiness counts by factory, then each gap with its owner and the action. */
export function GapReportBlock({ block, role, onLocal }: { block: B; role: "brand" | "supplier"; onLocal: (d: LocalDone) => void }) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-tile border border-line">
        <table className="w-full min-w-[560px]">
          <caption className="sr-only">Document readiness by factory</caption>
          <thead className="bg-blue-50">
            <tr><th className={th}>Factory</th>{READINESS_STATES.map((s) => <th key={s} className={`${th} text-right`}>{s}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {block.factories.map((f) => (
              <tr key={f.id}>
                <td className="px-3 py-2.5 text-sm font-semibold text-ink-900"><Link href={`/factories/${f.id}?tab=evidence`} className="hover:underline">{f.name}</Link></td>
                {READINESS_STATES.map((s) => <td key={s} className="num px-3 py-2.5 text-right text-sm text-ink-900">{f.counts[s]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h4 className="mb-2">Top gaps</h4>
        {block.gaps.length === 0 ? (
          <p className="text-ink-700">No gaps. Every document is ready.</p>
        ) : (
          <ul className="space-y-3">
            {block.gaps.map((g) => (
              <li key={`${g.factoryId}-${g.docName}`} className="rounded-tile border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {g.state === "Needs a look" ? <StatusPill tone="caution" shape="diamond" label="Needs a look" /> : <ReadinessPill state={g.state} />}
                  <span className="font-semibold text-ink-900">{g.docName}</span>
                  <span className="text-ink-500">· {g.factoryName}</span>
                </div>
                {g.detail && <p className="mt-1 text-ink-500">{g.detail}</p>}
                <p className="mt-2 text-ink-700"><span className="font-semibold text-ink-900">Owner:</span> {g.owner}. <span className="font-semibold text-ink-900">Action:</span> {g.action}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        {role === "brand" ? (
          <MockAction
            label="Request uploads from supplier" icon={Upload} done={`Upload request sent to ${block.supplierName} (demo)`}
            onDone={(done) => onLocal({ id: "request-uploads", label: "Request uploads from supplier", done })}
          />
        ) : (
          <MockAction label="Upload documents" icon={Upload} done="Upload started (demo)" onDone={(done) => onLocal({ id: "request-uploads", label: "Upload documents", done })} />
        )}
      </div>
    </div>
  );
}
