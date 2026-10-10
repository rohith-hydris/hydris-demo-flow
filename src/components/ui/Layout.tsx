import Link from "next/link";
import { useId, type ReactNode } from "react";
import { ChevronRight, CircleHelp, Droplet, type LucideIcon } from "lucide-react";

// Content column: 1240px max, 32px side padding (16px on small screens), DESIGN 2.3.
export const Container = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-[1240px] px-4 sm:px-8 ${className}`}>{children}</div>
);

// Content area under a PageHeader. Its cards overlap the bottom edge of the band by 40px (DESIGN 3.2).
export const AppMain = ({ children }: { children: ReactNode }) => (
  <main className="relative flex-1 pb-8"><Container className="-mt-10">{children}</Container></main>
);

export interface Crumb { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1 text-sm">
        {items.map((it, i) => (
          <li key={it.label + i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-4 text-ink-500" aria-hidden="true" />}
            {it.href ? (
              <Link href={it.href} className="inline-flex min-h-11 items-center font-semibold text-blue-600 hover:underline">{it.label}</Link>
            ) : (
              <span aria-current="page" className="font-semibold text-ink-900">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Gradient hero band with the faint grid: breadcrumbs, H1, one-line description and page actions (DESIGN 3.2).
// The floating nav sits over its top 112px; the band is bottom-padded so content can overlap it.
export function PageHeader({ title, subtitle, meta, crumbs, actions, children }: {
  title: string; subtitle?: ReactNode; meta?: ReactNode; crumbs?: Crumb[]; actions?: ReactNode; children?: ReactNode;
}) {
  return (
    <header className="bg-hero pb-20 pt-28">
      <Container>
        {crumbs && crumbs.length > 0 && <div className="-ml-1 mb-1"><Breadcrumbs items={crumbs} /></div>}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h1>{title}</h1>
            {subtitle && <p className="mt-2 max-w-3xl text-base text-ink-500">{subtitle}</p>}
            {meta && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">{meta}</div>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
        {children}
      </Container>
    </header>
  );
}

export function Section({ title, hint, id, action, children }: { title: string; hint?: ReactNode; id?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-28">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2>{title}</h2>
          {hint && <p className="mt-1 max-w-3xl text-base text-ink-500">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`card p-6 ${className}`}>
      {title && <h3 className="mb-4">{title}</h3>}
      {children}
    </div>
  );
}

export interface KpiItem {
  label: string; value: string | number; context?: string; extra?: { label: string; value: string }[]; valueLabel?: string;
  /** Spans two columns of a six-column strip (used for the two-number PWI card). */
  wide?: boolean;
}

export function KpiCard({ label, value, context, extra, valueLabel, wide }: KpiItem) {
  return (
    <li className={`card flex flex-col p-6 ${wide ? "lg:col-span-2" : ""}`}>
      <span className="text-sm font-semibold text-ink-500">{label}</span>
      {extra ? (
        <span className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
          {[{ label: valueLabel ?? "Simple average", value: String(value) }, ...extra].map((e) => (
            <span key={e.label}>
              <span className="kpi num block font-display text-numlg text-ink-900">{e.value}</span>
              <span className="block text-sm text-ink-500">{e.label}</span>
            </span>
          ))}
        </span>
      ) : (
        // Long values (for example "280,000") drop to the large-number size so they stay inside a narrow card.
        <span className={`kpi num mt-1 font-display ${String(value).length >= 5 ? "text-numlg" : "text-kpi"} text-ink-900`}>{value}</span>
      )}
      {context && <span className="mt-auto pt-1 text-sm text-ink-500">{context}</span>}
    </li>
  );
}

export const KpiGrid = ({ items, className = "lg:grid-cols-6" }: { items: KpiItem[]; className?: string }) => (
  <ul className={`grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 ${className}`}>
    {items.map((i) => <KpiCard key={i.label} {...i} />)}
  </ul>
);

export function EmptyState({ title, text, action, icon: Icon = Droplet }: { title: string; text: string; action?: { label: string; href: string }; icon?: LucideIcon }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 grid size-12 place-items-center rounded-full bg-blue-100 text-blue-600"><Icon className="size-6" aria-hidden="true" /></span>
      <h3>{title}</h3>
      <p className="mt-1 max-w-md text-base text-ink-500">{text}</p>
      {action && (
        <Link href={action.href} scroll={false} className="btn btn-secondary mt-4">{action.label}</Link>
      )}
    </div>
  );
}

// CSS-only tooltip. It opens on hover and on keyboard focus, and the text is linked with aria-describedby.
export function Tooltip({ text, children, label = "More information" }: { text: string; children?: ReactNode; label?: string }) {
  const id = useId();
  return (
    <span className="group relative inline-flex items-center">
      {children ?? (
        <button type="button" aria-describedby={id} aria-label={label} className="grid size-6 place-items-center rounded-full text-muted hover:text-brand">
          <CircleHelp className="size-4" aria-hidden="true" />
        </button>
      )}
      <span id={id} role="tooltip" className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-1 w-56 -translate-x-1/2 rounded-tile border border-line bg-card p-3 text-left text-sm font-normal text-ink-700 opacity-0 shadow-raised transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

export const Skeleton = ({ className = "" }: { className?: string }) => <div className={`skeleton ${className}`} aria-hidden="true" />;

export const PageSkeleton = () => (
  <div role="status" aria-label="Loading">
    <Skeleton className="h-5 w-64" />
    <Skeleton className="mt-4 h-10 w-2/3" />
    <Skeleton className="mt-2 h-5 w-1/2" />
    <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
    <Skeleton className="mt-8 h-80" />
    <span className="sr-only">Loading…</span>
  </div>
);
