"use client";

/** Two or three exclusive choices as a pill group (for example PWI-M 1.0 | Guide-compatible). */
export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-blue-50 p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${on ? "bg-blue-600 text-white" : "text-ink-700 hover:bg-blue-100"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
