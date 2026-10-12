"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, Building2, Factory } from "lucide-react";
import { useRole } from "@/src/context/RoleContext";
import { tenantFor, type Role } from "@/src/lib/roles";

const cards: { role: Role; tag: string; text: string; icon: typeof Building2 }[] = [
  { role: "brand", tag: "Brand", text: "See all suppliers", icon: Building2 },
  { role: "supplier", tag: "Supplier", text: "See your factories", icon: Factory },
];

// One click sets the role and opens /portfolio (PRODUCT 4.1).
export default function RoleCards() {
  const { setRole } = useRole();
  const router = useRouter();

  function choose(role: Role) {
    setRole(role);
    router.push("/portfolio");
  }

  return (
    <div className="mx-auto mt-10 grid w-full max-w-3xl gap-5 sm:grid-cols-2">
      {cards.map(({ role, tag, text, icon: Icon }) => (
        <button
          key={role} type="button" onClick={() => choose(role)}
          className="card card-link flex flex-col items-center rounded-panel p-8 text-center"
        >
          <span className="tone-info inline-flex min-h-8 items-center gap-2 rounded-full bg-[var(--t-bg)] px-3 text-sm font-semibold text-[var(--t-fg)]">
            <Icon className="size-4" aria-hidden="true" />{tag}
          </span>
          <span className="mt-4 font-display text-[22px] font-semibold leading-[30px] tracking-[-0.02em] text-ink-900">{tenantFor(role).name}</span>
          <span className="mt-1 text-ink-500">{text}</span>
          <span className="btn btn-primary mt-6" aria-hidden="true">
            Continue
            <span className="grid size-6 place-items-center rounded-full bg-white/20"><ArrowUpRight className="size-4" /></span>
          </span>
        </button>
      ))}
    </div>
  );
}
