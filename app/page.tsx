import Footer from "@/src/components/shell/Footer";
import RoleCards from "@/src/components/shell/RoleCards";
import TopNav from "@/src/components/shell/TopNav";

// Decorative mini-cards (DESIGN 5.1): bars only, no figures, hidden from assistive tech.
function MiniChart({ heights, className }: { heights: number[]; className: string }) {
  return (
    <div aria-hidden="true" className={`card absolute hidden w-48 p-4 lg:block ${className}`}>
      <p className="text-sm font-semibold text-ink-900">PWI trend</p>
      <p className="text-xs text-ink-500">Illustrative</p>
      <div className="mt-3 flex h-16 items-end gap-1.5">
        {heights.map((h, i) => (
          <span key={i} className="flex-1 rounded-t-md bg-blue-600" style={{ height: `${h}%`, opacity: 0.35 + i * 0.13 }} />
        ))}
      </div>
    </div>
  );
}

export default function EntryPage() {
  return (
    <>
      <TopNav minimal />
      <main className="bg-hero relative flex-1 overflow-hidden px-4 pb-32 pt-36 text-center sm:px-8">
        <span className="tone-info inline-flex min-h-8 items-center rounded-full border border-[var(--t-line)] bg-[var(--t-bg)] px-4 text-sm font-semibold text-[var(--t-fg)]">
          Stewardship Command Centre
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-[3.5rem] leading-[1.08] sm:text-[4.5rem]">
          Water stewardship <span className="text-blue-600">you can prove</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-500">
          Rank where to act, show the benefit, and trace every number to its evidence.
        </p>
        <RoleCards />
        <p className="mt-8 text-sm text-ink-500">Demo with illustrative data.</p>
        <MiniChart heights={[30, 42, 38, 55, 62, 78]} className="-bottom-6 left-8 -rotate-6" />
        <MiniChart heights={[25, 35, 50, 48, 66, 82]} className="-bottom-6 right-8 rotate-6" />
      </main>
      <Footer />
    </>
  );
}
