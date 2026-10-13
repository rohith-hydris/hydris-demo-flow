"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Upload } from "lucide-react";
import type { ProjectRecord } from "@/src/data/types";
import { attributionNote, displayNote, projectBenefit, projectsFor } from "@/src/lib/claims";
import { fmtClaim, claimNote } from "@/src/lib/measure";
import type { Site } from "@/src/lib/selectors";
import { traceProject } from "@/src/lib/trace";
import { summaryStatus } from "@/src/lib/states";
import { validationBy } from "@/src/lib/roleFlow";
import { tenantFor } from "@/src/lib/roles";
import { EmptyState, ProjectStatusPill, StateStrip, StatusPill } from "@/src/components/ui";
import ProjectDrawerButton from "./ProjectDrawer";
import { InfoButton } from "./Trace";

function ProjectCard({ project: p, siteName, canValidate }: { project: ProjectRecord; siteName: string; canValidate: boolean }) {
  const [uploaded, setUploaded] = useState(false);
  const b = projectBenefit(p);
  // The single badge is a summary computed from the five review states.
  const status = summaryStatus(p.states);
  const flagged = status === "Flagged";
  const notCounted = status === "Not counted";
  const cardClass = flagged
    ? "border-l-4 border-l-[var(--negative-fill)]"
    : notCounted ? "border-dashed border-[var(--neutral-line)] bg-[var(--neutral-bg)] shadow-none" : "";

  return (
    <li className={`card flex flex-col p-5 ${cardClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="min-w-0 flex-1">{p.name}</h4>
        <ProjectStatusPill status={status} />
      </div>
      <StateStrip states={p.states} className="mt-2" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {p.method !== "n/a" && <StatusPill tone="neutral" shape="square" label={p.method} />}
        <StatusPill tone="info" shape="ring" label={`Feeds ${p.pillar} ${p.dimension}`} />
        {notCounted && p.gateReason && <StatusPill tone="neutral" shape="ring" label={`Excluded: ${p.gateReason}`} />}
        <span className="inline-flex min-h-7 items-center rounded-full border border-panel-line bg-card px-2.5 text-sm font-semibold text-blue-600">
          {p.grade === "none" ? "No evidence grade" : `Evidence grade ${p.grade}`}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-ink-500">Claimed</dt>
          <dd className="num font-display text-[22px] font-semibold leading-7 text-ink-900">{fmtClaim(p.claim)}</dd>
          {claimNote(p.claim) && <dd className="text-sm text-ink-500">{claimNote(p.claim)}</dd>}
          {attributionNote(p) && <dd className="text-sm text-ink-500">{attributionNote(p)}</dd>}
        </div>
        <div>
          <dt className="flex items-center gap-1 text-sm text-ink-500">Counted <InfoButton trace={traceProject(p)} /></dt>
          {status === "Validated" || flagged ? (
            <>
              <dd className="num font-display text-[22px] font-semibold leading-7 text-ink-900">{fmtClaim(b.counted)}</dd>
              <dd className="text-sm text-ink-500">Low value {fmtClaim(b.low)}</dd>
            </>
          ) : status === "Pending validation" ? (
            <>
              <dd className="font-display text-[22px] font-semibold leading-7 text-ink-500">Awaiting validation</dd>
              <dd className="text-sm text-ink-500">Counts {fmtClaim(b.attributed)} once validated</dd>
            </>
          ) : (
            <dd className="font-display text-[22px] font-semibold leading-7 text-ink-500">Not counted</dd>
          )}
        </div>
      </dl>

      {displayNote(p, canValidate) && <p className={`mt-4 text-ink-700 ${flagged ? "rounded-tile bg-[var(--negative-bg)] p-3" : ""}`}>{displayNote(p, canValidate)}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <ProjectDrawerButton project={p} siteName={siteName} />
          {notCounted ? null : canValidate ? (
            <Link href={`/copilot?agent=validation&claim=${p.id}`} className="btn btn-primary">
              <Sparkles className="size-4" aria-hidden="true" /> Validate with agent
            </Link>
          ) : (
            <span className="flex flex-col items-start gap-1">
              {uploaded
                ? <StatusPill tone="positive" shape="circle" label="Evidence uploaded, awaiting review" />
                : <button type="button" onClick={() => setUploaded(true)} className="btn btn-secondary"><Upload className="size-4" aria-hidden="true" /> Upload evidence</button>}
              <span className="text-sm text-ink-500">{validationBy(tenantFor("brand").name)}</span>
            </span>
          )}
          <span className="sr-only" role="status">{uploaded && !canValidate ? "Evidence uploaded" : ""}</span>
        </div>
    </li>
  );
}

export default function ProjectsTab({ site, canValidate }: { site: Site; canValidate: boolean }) {
  const all = projectsFor(site.id);
  const group = (pillar: string) => all.filter((p) => p.pillar === pillar);

  if (all.length === 0) {
    return (
      <EmptyState
        title="No projects registered"
        text="No sub-basin or basin projects registered. Without a baseline and project, P2 and P3 cannot score."
      />
    );
  }

  const sections = [
    { key: "P2", title: "Sub-basin projects (P2)" },
    { key: "P3", title: "Basin projects (P3)" },
    { key: "P1", title: "On-site measures (P1)" },
  ];
  return (
    <div className="space-y-8">
      {site.id !== "F12" && (
        <p className="rounded-tile border border-line bg-card p-4 text-ink-700">
          Project values shown are claimed benefits. Cell scores on the Impact tab are computed from the full evidence set.
        </p>
      )}
      {sections.map(({ key, title }) => {
        const list = group(key);
        if (list.length === 0) return null;
        return (
          <section key={key} aria-labelledby={`proj-${key}`}>
            <h2 id={`proj-${key}`} className="mb-4 text-[22px] leading-[30px]">{title}</h2>
            <ul className="grid gap-5 lg:grid-cols-2">{list.map((p) => <ProjectCard key={p.id} project={p} siteName={site.name} canValidate={canValidate} />)}</ul>
          </section>
        );
      })}
    </div>
  );
}
