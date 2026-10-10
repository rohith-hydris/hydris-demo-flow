import { Skeleton } from "@/src/components/ui";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading your dashboard">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="mt-2 h-5 w-96 max-w-full" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="mt-10 h-[460px]" />
      <Skeleton className="mt-10 h-72" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
