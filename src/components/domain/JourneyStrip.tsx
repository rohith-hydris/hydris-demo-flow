import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JOURNEY_STEPS } from "@/src/lib/journey";

/** Risk > Assessment > Opportunity > Project comparison > Business case > Evidence review > Impact > Reporting. Links only. */
export default function JourneyStrip({ current }: { current?: string }) {
  return (
    <nav aria-label="Demo journey for Ambattur Denim Unit" className="rounded-tile border border-line bg-card/80 px-3 py-2">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {JOURNEY_STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-4 text-ink-500" aria-hidden="true" />}
            <Link
              href={s.href} aria-current={s.id === current ? "step" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold ${s.id === current ? "bg-blue-100 text-blue-600" : "text-ink-700 hover:bg-blue-50"}`}
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
