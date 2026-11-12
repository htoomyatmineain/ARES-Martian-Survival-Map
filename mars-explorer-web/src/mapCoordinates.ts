// These are the same Mars-2000 local tangent coordinates used by playerGeo.
// Kept independent of rendering so 2D markers never depend on route percentage.
export const MARS_RADIUS = 3396190;
export type GeoPoint = { lat: number; lon: number };
export type SceneFrame = { center: GeoPoint; heading: number };
const radians = Math.PI / 180;

export function sceneToGeo(frame: SceneFrame, x: number, z: number): GeoPoint {
  const angle = frame.heading * radians;
  const east = x * Math.cos(angle) - z * Math.sin(angle);
  const south = x * Math.sin(angle) + z * Math.cos(angle);
  return {
    lat: frame.center.lat - south / MARS_RADIUS / radians,
    lon: frame.center.lon + east / (MARS_RADIUS * Math.cos(frame.center.lat * radians)) / radians,
  };
}

export function geoToMap(point: GeoPoint, center: GeoPoint, spanMeters: number) {
  const east = (point.lon - center.lon) * radians * MARS_RADIUS * Math.cos(center.lat * radians);
  const south = (center.lat - point.lat) * radians * MARS_RADIUS;
  return { x: 500 + east / spanMeters * 1000, y: 500 + south / spanMeters * 1000 };
}

export function isOnMap(point: { x: number; y: number }) {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 1000 && point.y >= 0 && point.y <= 1000;
}

export function mapToGeo(point: { x: number; y: number }, center: GeoPoint, spanMeters: number): GeoPoint {
  return {
    lat: center.lat - (point.y-500)/1000*spanMeters/MARS_RADIUS/radians,
    lon: center.lon + (point.x-500)/1000*spanMeters/(MARS_RADIUS*Math.cos(center.lat*radians))/radians,
  };
}

export type TrackPoint = { x: number; z: number };
export function appendTrack(track: TrackPoint[], point: TrackPoint): TrackPoint[] {
  const last = track[track.length-1];
  if (last && Math.hypot(point.x-last.x,point.z-last.z)<1) return track;
  return [...track.slice(-1999), {x:point.x,z:point.z}];
}

// Raster generation uses floor/ceil source pixels; regional registration has
// source-pixel rounding, not survey-grade precision. See prepare-overview.mjs.
export const CRATER_MAP = {
  center: { lat: 18.38, lon: 77.58 },
  spanMeters: 55000,
  image: '/data/overview.jpg',
  source: 'USGS / JPL · CTX elevation relief',
};
