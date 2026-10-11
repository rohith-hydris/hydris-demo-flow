import Link from "next/link";
import type { ReactNode } from "react";
import { ClickableRow } from "./RowLink";

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Extra content next to the header, such as a Tooltip. */
  headerExtra?: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "right";
  /** Sort state for this column (from the URL). Adds aria-sort. */
  sort?: "ascending" | "none";
  /** Makes the header a link that sorts by this column. */
  sortHref?: string;
  className?: string;
}

export const RowLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="inline-flex min-h-11 items-center text-base font-bold text-brand hover:underline">{children}</Link>
);

// Dense table. Scrolls sideways inside its own container (first column stays put); the page handles vertical scroll.
// With `renderCard`, phones get a stacked list instead of the table.
export default function DataTable<T>({
  columns, rows, rowKey, rowHref, caption, minWidth = "1100px", renderCard, rowClassName,
}: {
  columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; rowHref?: (r: T) => string | undefined; caption: string;
  minWidth?: string; renderCard?: (r: T) => ReactNode; rowClassName?: (r: T) => string;
}) {
  const table = (
    <div className={`card overflow-x-auto ${renderCard ? "hidden md:block" : ""}`}>
      <table className="w-full border-separate border-spacing-0 text-left text-[15px]" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.key} scope="col" aria-sort={c.sort === "ascending" ? "ascending" : c.sort === "none" ? "none" : undefined}
                className={`sticky top-0 border-b border-line bg-blue-50 px-3 py-3 text-sm font-semibold text-muted ${i === 0 ? "left-0 z-[3]" : "z-[2]"} ${c.align === "right" ? "text-right" : ""}`}
              >
                {c.sortHref ? (
                  <Link href={c.sortHref} scroll={false} className={`inline-flex min-h-11 items-center hover:text-brand ${c.sort === "ascending" ? "text-brand-dark" : ""}`}>
                    {c.header}{c.sort === "ascending" && <span aria-hidden="true" className="ml-1">↑</span>}
                  </Link>
                ) : c.header}
                {c.headerExtra}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const href = rowHref?.(r);
            const cells = columns.map((c, i) => (
              <td
                key={c.key}
                className={`border-b border-line px-3 py-2 align-middle ${i === 0 ? "sticky left-0 z-[1] bg-surface shadow-[1px_0_0_var(--border)] group-hover:bg-[var(--row-hover)] group-focus-within:bg-[var(--row-hover)]" : ""} ${c.align === "right" ? "num text-right" : ""} ${c.className ?? ""}`}
              >
                {c.cell(r)}
              </td>
            ));
            const cls = `group h-14 ${href ? "cursor-pointer" : ""} hover:bg-[var(--row-hover)] focus-within:bg-[var(--row-hover)] ${rowClassName?.(r) ?? ""}`;
            return href ? <ClickableRow key={rowKey(r)} href={href} className={cls}>{cells}</ClickableRow> : <tr key={rowKey(r)} className={cls}>{cells}</tr>;
          })}
        </tbody>
      </table>
    </div>
  );
  if (!renderCard) return table;
  return (
    <>
      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {rows.map((r) => <li key={rowKey(r)} className="card p-4">{renderCard(r)}</li>)}
      </ul>
      {table}
    </>
  );
}
