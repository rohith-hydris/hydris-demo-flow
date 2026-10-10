import type { ReactNode } from "react";

/** **bold** in a script's text. Nothing else is interpreted, so the text can never inject markup. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <p className={className}>
      {parts.map((p, i): ReactNode => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold text-ink-900">{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>))}
    </p>
  );
}

/** A draft sentence: [[a figure]] is highlighted with a pale blue underline (DESIGN 5.7). */
export function DraftText({ text }: { text: string }) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[[") ? (
          <mark key={i} className="rounded-sm bg-transparent font-semibold text-ink-900 underline decoration-blue-500/60 decoration-2 underline-offset-4">{p.slice(2, -2)}</mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
