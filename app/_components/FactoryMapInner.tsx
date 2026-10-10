"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { Factory } from "@/src/lib/data";
import { layers, type LayerId } from "./mapLayers";
import { pct } from "@/src/components/ui";

function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 9 });
  }, [map, points]);
  return null;
}

export default function FactoryMapInner({ factories, hrefBase, layer }: { factories: Factory[]; hrefBase: string; layer: LayerId }) {
  const points = useMemo(() => factories.map((f) => [f.lat, f.lng] as [number, number]), [factories]);
  const L = layers[layer];
  return (
    <MapContainer center={[13, 77.5]} zoom={7} scrollWheelZoom={false} className="h-[420px] w-full rounded-xl">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Fit points={points} />
      {factories.map((f) => {
        const st = L.styles[L.keyOf(f)];
        return (
          <CircleMarker
            key={f.id}
            center={[f.lat, f.lng]}
            radius={st.radius}
            pathOptions={{ color: "#0B1A7A", weight: st.weight, dashArray: st.dash, fillColor: st.color, fillOpacity: 0.9 }}
          >
            <Popup>
              <p className="!my-0 text-base font-extrabold">{f.name}</p>
              <p className="!my-1">{f.supplierName}</p>
              <ul className="!m-0 !list-none !p-0">
                <li>Risk band: {layers.band.styles[f.band].shape} {layers.band.styles[f.band].label}</li>
                <li>ETP health: {f.healthScore} ({f.health})</li>
                <li>ZDHC tier: {f.zdhcTier}</li>
                <li>Highest open alert: {f.highestSeverity ?? "None"}</li>
                <li>Site PWI: {f.sitePwi === null ? "Baseline pending" : pct(f.sitePwi)}</li>
              </ul>
              <Link href={`${hrefBase}/${f.id}`} className="inline-block py-2">Open factory →</Link>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
