// Linear projection of latitude and longitude into the network map's SVG space (DESIGN 4.14). No tile services.

export interface MapView { minLon: number; maxLon: number; minLat: number; maxLat: number; unitsPerDegree: number }

/** The window around the factory belt, with a margin. The state outline extends past its edges and is clipped. */
export const TN_VIEW: MapView = { minLon: 76.6, maxLon: 80.6, minLat: 10.3, maxLat: 13.7, unitsPerDegree: 100 };

export const viewSize = (v: MapView = TN_VIEW) => ({
  width: (v.maxLon - v.minLon) * v.unitsPerDegree,
  height: (v.maxLat - v.minLat) * v.unitsPerDegree,
});

/** North is up: a higher latitude gives a smaller y. */
export const project = (lat: number, lon: number, v: MapView = TN_VIEW) => ({
  x: (lon - v.minLon) * v.unitsPerDegree,
  y: (v.maxLat - lat) * v.unitsPerDegree,
});

export const inView = (lat: number, lon: number, v: MapView = TN_VIEW) =>
  lat >= v.minLat && lat <= v.maxLat && lon >= v.minLon && lon <= v.maxLon;

/** Pin size follows the footprint I. A site without I is drawn at the smallest size. */
export const pinRadius = (footprintI: number | null) => 6 + (footprintI ?? 0) * 7;

export function outlinePath(points: [number, number][], v: MapView = TN_VIEW): string {
  return points
    .map(([lon, lat], i) => {
      const { x, y } = project(lat, lon, v);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ") + " Z";
}
