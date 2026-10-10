import Link from "next/link";
import { FileText } from "lucide-react";

const chip = "inline-flex min-h-6 items-center gap-1 whitespace-nowrap rounded-full border border-panel-line bg-card px-2 text-xs font-medium text-blue-600";

/** Where a figure came from (DESIGN 4.4): outlined, blue text, tiny document icon. */
export function CitationChip({ label, href }: { label: string; href?: string }) {
  const inner = (<><FileText className="size-3.5" aria-hidden="true" />{label}</>);
  return href ? <Link href={href} className={`${chip} hover:bg-blue-50`}>{inner}</Link> : <span className={chip}>{inner}</span>;
}
