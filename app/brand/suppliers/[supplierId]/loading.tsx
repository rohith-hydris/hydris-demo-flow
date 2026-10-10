import { Skeleton } from "@/src/components/ui";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading supplier">
      <Skeleton className="h-5 w-72" />
      <Skeleton className="mt-4 h-10 w-80" />
      <Skeleton className="mt-3 h-8 w-2/3" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="mt-8 grid gap-4 md:grid-cols-2"><Skeleton className="h-52" /><Skeleton className="h-52" /></div>
      <div className="mt-8 grid gap-4 md:grid-cols-3"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      <Skeleton className="mt-8 h-96" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
