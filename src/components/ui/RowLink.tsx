"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

// A table row that opens `href` when clicked anywhere. The link inside the first cell stays the keyboard and screen-reader target.
export function ClickableRow({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <tr
      className={className}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button,summary,select,input")) return;
        router.push(href);
      }}
    >
      {children}
    </tr>
  );
}
