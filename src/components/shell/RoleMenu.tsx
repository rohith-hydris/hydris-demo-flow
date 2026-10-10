"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { useRole } from "@/src/context/RoleContext";
import { ROLES, tenantFor, type Role } from "@/src/lib/roles";

// Role pill from DESIGN 3.1: shows the current role and opens a small menu to switch (demo convenience).
export default function RoleMenu() {
  const { role, setRole } = useRole();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!role) return null;

  function choose(next: Role) {
    setOpen(false);
    setRole(next);
    router.push("/portfolio");
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((o) => !o)}
        className="tone-info inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--t-line)] bg-[var(--t-bg)] pl-4 pr-3 text-sm font-semibold text-[var(--t-fg)] hover:bg-blue-100"
      >
        {tenantFor(role).roleLabel}
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label="Switch role" className="card absolute right-0 top-full z-50 mt-2 w-72 p-2 shadow-raised">
          <p className="px-3 pb-1 pt-2 text-sm text-ink-500">Demo only: switch who you are looking as.</p>
          {ROLES.map((r) => (
            <button
              key={r} type="button" role="menuitemradio" aria-checked={r === role} onClick={() => choose(r)}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-tile px-3 text-left hover:bg-blue-50"
            >
              <span>
                <span className="block font-semibold text-ink-900">{tenantFor(r).roleLabel}</span>
                <span className="block text-sm text-ink-500">{tenantFor(r).name}</span>
              </span>
              {r === role && <Check className="size-5 text-blue-600" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
