import Link from "next/link";
import { useId, type ReactNode } from "react";
import { ChevronRight, CircleHelp, Droplet, Repeat } from "lucide-react";

export const Container = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-[1280px] px-6 ${className}`}>{children}</div>
);

export function TopBar({ role, brandName, home }: { role: string; brandName: string; home: string }) {
  return (
    <header className="border-b border-line bg-surface">
      <Container className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={home} className="flex items-center gap-2 py-2 font-bold text-brand-dark" aria-label="Hydris home">
            <span className="grid size-8 place-items-center rounded-lg bg-brand text-white"><Droplet className="size-4" aria-hidden="true" /></span>
            Hydris
          </Link>
          <span className="rounded-full bg-[var(--info-bg)] px-2.5 text-sm font-semibold text-[var(--info-fg)]">{role}</span>
          <span className="hidden truncate text-sm text-muted sm:inline">{brandName}</span>
        </div>
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold text-brand hover:bg-page">
          <Repeat className="size-4" aria-hidden="true" /> Switch role
        </Link>
      </Container>
    </header>
  );
}

export const AppMain = ({ children }: { children: ReactNode }) => (
  <main className="flex-1 pb-16 pt-6"><Container>{children}</Container></main>
);

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1 text-sm">
        {items.map((it, i) => (
          <li key={it.label + i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-4 text-muted" aria-hidden="true" />}
            {it.href ? (
              <Link href={it.href} className="inline-flex min-h-11 items-center font-semibold text-brand hover:underline">{it.label}</Link>
            ) : (
              <span aria-current="page" className="font-semibold text-ink">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, subtitle, meta, children }: { title: string; subtitle?: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-[32px] font-bold leading-tight text-brand-dark">{title}</h1>
      {subtitle && <p className="mt-1 max-w-3xl text-base text-muted">{subtitle}</p>}
      {meta && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">{meta}</div>}
      {children}
    </header>
  );
}

export function Section({ title, hint, id, action, children }: { title: string; hint?: ReactNode; id?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-brand-dark">{title}</h2>
          {hint && <p className="mt-1 max-w-3xl text-base text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`card p-5 ${className}`}>
      {title && <h3 className="mb-3 text-xl font-semibold text-brand-dark">{title}</h3>}
      {children}
    </div>
  );
}

export interface KpiItem { label: string; value: string | number; context?: string; extra?: { label: string; value: string }[]; valueLabel?: string }

export function KpiCard({ label, value, context, extra, valueLabel }: KpiItem) {
  return (
    <li className="card flex flex-col p-4">
      <span className="text-sm font-semibold text-muted">{label}</span>
      {extra ? (
        <span className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
          {[{ label: valueLabel ?? "Simple average", value: String(value) }, ...extra].map((e) => (
            <span key={e.label}>
              <span className="num block text-2xl font-bold leading-tight text-brand-dark">{e.value}</span>
              <span className="block text-sm text-muted">{e.label}</span>
            </span>
          ))}
        </span>
      ) : (
        <span className="num mt-1 text-[32px] font-bold leading-tight text-brand-dark">{value}</span>
      )}
      {context && <span className="mt-auto pt-1 text-sm text-muted">{context}</span>}
    </li>
  );
}

export const KpiGrid = ({ items, className = "xl:grid-cols-6" }: { items: KpiItem[]; className?: string }) => (
  <ul className={`grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 ${className}`}>
    {items.map((i) => <KpiCard key={i.label} {...i} />)}
  </ul>
);

export function EmptyState({ title, text, action }: { title: string; text: string; action?: { label: string; href: string } }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 grid size-10 place-items-center rounded-full bg-page text-muted"><Droplet className="size-5" aria-hidden="true" /></span>
      <p className="text-xl font-semibold text-brand-dark">{title}</p>
      <p className="mt-1 max-w-md text-base text-muted">{text}</p>
      {action && (
        <Link href={action.href} scroll={false} className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-brand px-4 font-semibold text-brand hover:bg-[var(--info-bg)]">{action.label}</Link>
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
      <span id={id} role="tooltip" className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-1 w-56 -translate-x-1/2 rounded-lg border border-line bg-surface p-3 text-left text-sm font-normal normal-case text-ink opacity-0 shadow-[var(--shadow-pop)] transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
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
