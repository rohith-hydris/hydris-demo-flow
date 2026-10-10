import Link from "next/link";
import { FileText } from "lucide-react";

const chip = "inline-flex min-h-6 items-center gap-1 whitespace-nowrap rounded-full border border-panel-line bg-card px-2 text-xs font-medium text-blue-600";

/**
 * Where a figure came from (DESIGN 4.4): outlined, blue text, tiny document icon. With `href` it opens that page; with
 * `onClick` it opens something in place (the "Where this number comes from" drawer); with neither it is a plain label.
 */
export function CitationChip({ label, href, onClick }: { label: string; href?: string; onClick?: () => void }) {
  const inner = (<><FileText className="size-3.5 shrink-0" aria-hidden="true" />{label}</>);
  if (href) return <Link href={href} className={`${chip} hover:bg-blue-50`}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`${chip} hover:bg-blue-50`}>{inner}</button>;
  return <span className={chip}>{inner}</span>;
}
