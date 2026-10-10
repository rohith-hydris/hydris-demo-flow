"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Factory } from "@/src/lib/data";
import { layers, type LayerId } from "./mapLayers";
import { EmptyState, Skeleton } from "@/src/components/ui";

const Inner = dynamic(() => import("./FactoryMapInner"), { ssr: false, loading: () => <Skeleton className="h-[420px]" /> });

export default function FactoryMap({ factories, hrefBase, emptyText }: { factories: Factory[]; hrefBase: string; emptyText?: string }) {
  // Mount Leaflet only while visible: cached (hidden) pages re-run effects, which breaks a live map.
  const [live, setLive] = useState(false);
  const [layer, setLayer] = useState<LayerId>("band");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- remount the map each time the page is shown
    setLive(true);
    return () => setLive(false);
  }, []);
  if (factories.length === 0) return <EmptyState title="No factories to show" text={emptyText ?? "There are no factories on the map yet."} />;
  const L = layers[layer];
  return (
    <div className="card p-3">
      <div role="group" aria-label="Colour the map by" className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(layers) as LayerId[]).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={layer === id}
            onClick={() => setLayer(id)}
            className={`min-h-11 rounded-lg border px-4 font-bold ${layer === id ? "border-brand bg-brand text-white" : "border-line bg-white text-navy hover:border-brand"}`}
          >
            {layers[id].label}
          </button>
        ))}
      </div>
      {live ? <Inner factories={factories} hrefBase={hrefBase} layer={layer} /> : <Skeleton className="h-[420px]" />}
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2" aria-label={`Map key: ${L.label}`}>
        {Object.values(L.styles).map((s) => (
          <li key={s.label} className="flex min-h-8 items-center gap-2 font-semibold">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <circle cx="14" cy="14" r={s.radius} fill={s.color} stroke="#0B1A7A" strokeWidth={s.weight} strokeDasharray={s.dash} />
            </svg>
            {s.shape} {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
