import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Site } from "@/src/lib/selectors";
import { QuadrantPill, RankBadge } from "@/src/components/ui";

/** The first sites to act on, with a link to the full ranking. `sites` must already be sorted by rank. */
export default function TopPriorities({ sites, count = 3 }: { sites: Site[]; count?: number }) {
  const top = sites.slice(0, count);
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3>Top priorities</h3>
          <p className="text-ink-500">Rank shows priority for action, not performance.</p>
        </div>
        <Link href="/ranking" className="btn btn-secondary">
          View full ranking <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <ol className="mt-5 grid gap-4 lg:grid-cols-3">
        {top.map((s) => (
          <li key={s.id}>
            <Link href={`/factories/${s.id}`} className="flex h-full items-center gap-4 rounded-tile border border-line bg-blue-50 p-4 hover:bg-blue-100">
              <RankBadge rank={s.rank} tier={s.tier} />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink-900">{s.name}</span>
                <span className="block truncate text-sm text-ink-500">{s.supplierName}</span>
                <span className="mt-1.5 block"><QuadrantPill quadrant={s.quadrant} /></span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
