// Stacked-wave mark: three offset curved strokes (DESIGN 3.1), drawn inline.
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M4 10c3.2-3.6 6.4 3.6 9.6 0s6.4 3.6 9.6 0 2.4-1.6 4.8-1" />
      <path d="M4 16.5c3.2-3.6 6.4 3.6 9.6 0s6.4 3.6 9.6 0 2.4-1.6 4.8-1" opacity=".75" />
      <path d="M4 23c3.2-3.6 6.4 3.6 9.6 0s6.4 3.6 9.6 0 2.4-1.6 4.8-1" opacity=".5" />
    </svg>
  );
}

// `mark` sets the colour of the wave mark; the wordmark takes the surrounding text colour.
export function Logo({ className = "", mark = "text-blue-600" }: { className?: string; mark?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={`size-9 ${mark}`} />
      <span className="font-display text-[22px] font-bold tracking-[-0.02em]">Hydris</span>
    </span>
  );
}
