"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles, X } from "lucide-react";
import { useRole } from "@/src/context/RoleContext";
import { isNavActive, navItemsFor, tenantFor } from "@/src/lib/roles";
import { Logo } from "./Logo";
import RoleMenu from "./RoleMenu";

// Floating white pill bar, 64px tall, 16px from the top (DESIGN 3.1). `minimal` is the entry-screen version.
export default function TopNav({ minimal = false }: { minimal?: boolean }) {
  const pathname = usePathname();
  const { role } = useRole();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const items = role && !minimal ? navItemsFor(role) : [];
  const tenant = role ? tenantFor(role) : null;

  return (
    <header className="fixed inset-x-0 top-4 z-40 px-4 sm:px-8">
      <div className="mx-auto max-w-[1240px]">
        <div className={`flex h-16 items-center justify-between gap-4 rounded-full border border-line pl-5 pr-3 backdrop-blur ${scrolled ? "bg-card/90 shadow-raised" : "bg-card shadow-card"}`}>
          <Link href={role && !minimal ? "/portfolio" : "/"} aria-label="Hydris home" className="text-ink-900">
            <Logo />
          </Link>

          {items.length > 0 && (
            <nav aria-label="Main" className="hidden items-center lg:flex">
              {items.map((item) => {
                const active = isNavActive(item, pathname);
                return (
                  <Link
                    key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-semibold xl:px-3.5 ${active ? "bg-blue-100 text-blue-600" : "text-ink-700 hover:bg-blue-50"}`}
                  >
                    {item.sparkle && <Sparkles className="size-4" aria-hidden="true" />}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {tenant && !minimal && (
            <div className="flex items-center gap-3">
              <span className="hidden max-w-40 truncate font-semibold text-ink-900 md:inline">{tenant.name}</span>
              <RoleMenu />
              <span className="hidden size-11 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white sm:grid" aria-hidden="true">{tenant.initials}</span>
              <button
                type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}
                className="grid size-11 place-items-center rounded-full text-ink-900 hover:bg-blue-50 lg:hidden"
              >
                {menuOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>

        {menuOpen && items.length > 0 && (
          <nav aria-label="Main" className="card mt-2 p-2 lg:hidden">
            {items.map((item) => {
              const active = isNavActive(item, pathname);
              return (
                <Link
                  key={item.href} href={item.href} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)}
                  className={`flex min-h-12 items-center gap-2 rounded-tile px-4 font-semibold ${active ? "bg-blue-100 text-blue-600" : "text-ink-700 hover:bg-blue-50"}`}
                >
                  {item.sparkle && <Sparkles className="size-4" aria-hidden="true" />}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
