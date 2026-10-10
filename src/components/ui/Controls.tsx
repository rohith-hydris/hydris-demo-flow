"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";

// Filter and sort state lives in the URL. These controls only write it; the data layer does the work.
function useUrl() {
  const pathname = usePathname();
  const params = useSearchParams();
  const hrefWith = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) q.set(k, v); else q.delete(k); }
    const s = q.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
  return { params, hrefWith };
}

export function SearchInput({ param = "q", label, placeholder }: { param?: string; label: string; placeholder?: string }) {
  const { params, hrefWith } = useUrl();
  const router = useRouter();
  const id = useId();
  const current = params.get(param) ?? "";
  const [value, setValue] = useState(current);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const push = (v: string) => router.replace(hrefWith({ [param]: v.trim() || undefined }), { scroll: false });
  return (
    <div className="relative w-full sm:w-72">
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id={id} type="search" value={value} placeholder={placeholder ?? label} autoComplete="off"
        onChange={(e) => { setValue(e.target.value); clearTimeout(timer.current); timer.current = setTimeout(() => push(e.target.value), 300); }}
        onKeyDown={(e) => { if (e.key === "Enter") { clearTimeout(timer.current); push(value); } }}
        className="min-h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-10 text-base placeholder:text-muted"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => { setValue(""); push(""); }}
          className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-ink">
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function FilterChips({ param, label, options, allLabel = "All" }: { param: string; label: string; options: { value: string; label: string }[]; allLabel?: string }) {
  const { params, hrefWith } = useUrl();
  const active = params.get(param) ?? "";
  const chip = (text: string, value: string) => {
    const on = active === value;
    return (
      <li key={text}>
        <Link href={hrefWith({ [param]: value || undefined })} scroll={false} aria-current={on ? "true" : undefined}
          className={`inline-flex min-h-11 items-center rounded-full border px-4 text-base font-semibold ${on ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:border-brand"}`}>
          {text}
        </Link>
      </li>
    );
  };
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label={label}>
      {chip(allLabel, "")}
      {options.map((o) => chip(o.label, o.value))}
    </ul>
  );
}

export function SelectControl({ param, label, options, defaultValue }: { param: string; label: string; options: { value: string; label: string }[]; defaultValue: string }) {
  const { params, hrefWith } = useUrl();
  const router = useRouter();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="whitespace-nowrap text-base font-semibold text-muted">{label}</label>
      <select
        id={id} value={params.get(param) ?? defaultValue}
        onChange={(e) => router.replace(hrefWith({ [param]: e.target.value === defaultValue ? undefined : e.target.value }), { scroll: false })}
        className="min-h-11 rounded-lg border border-line bg-surface px-3 text-base"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">{children}</div>
);
