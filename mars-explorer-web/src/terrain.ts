export type Point = { x: number; z: number };
export type TerrainMeta = { width: number; height: number; size: number; center: { lat: number; lon: number }; min: number; max: number; source: string; sourceUrl: string; resolution: number; bounds: number[]; projection: string };
export type Terrain = { meta: TerrainMeta; values: Float32Array };
export const MARS_RADIUS = 3396190;
export function toGeo(p: Point, center = { lat: 18.46, lon: 77.42 }) {
  return { lat: center.lat - p.z / MARS_RADIUS * 180 / Math.PI, lon: center.lon + p.x / (MARS_RADIUS * Math.cos(center.lat * Math.PI / 180)) * 180 / Math.PI };
}
export function fromGeo(lat: number, lon: number, center = { lat: 18.46, lon: 77.42 }): Point {
  return { x: (lon - center.lon) * Math.PI / 180 * MARS_RADIUS * Math.cos(center.lat * Math.PI / 180), z: -(lat - center.lat) * Math.PI / 180 * MARS_RADIUS };
}
export function elevation(t: Terrain, x: number, z: number) {
  const { width, height, size } = t.meta;
  const u = Math.max(0, Math.min(width - 1.001, (x / size + .5) * (width - 1)));
  const v = Math.max(0, Math.min(height - 1.001, (z / size + .5) * (height - 1)));
  const a = Math.floor(u), b = Math.floor(v), fx = u - a, fy = v - b;
  return (t.values[b * width + a] * (1 - fx) + t.values[b * width + a + 1] * fx) * (1 - fy) + (t.values[(b + 1) * width + a] * (1 - fx) + t.values[(b + 1) * width + a + 1] * fx) * fy;
}
export function slope(t: Terrain, x: number, z: number) {
  const s = t.meta.size / (t.meta.width - 1);
  return Math.atan(Math.hypot((elevation(t, x + s, z) - elevation(t, x - s, z)) / (2 * s), (elevation(t, x, z + s) - elevation(t, x, z - s)) / (2 * s))) * 180 / Math.PI;
}
export const sites = [
  { id: 'habitat', name: 'Ares Basecamp', kind: 'HABITAT · SIMULATED', x: 1900, z: 1500, description: 'Your home away from Earth. A proposed habitat location on the crater floor, and the origin for all simulated traverses.' },
  { id: 'delta', name: 'Western Delta', kind: 'SCIENCE TARGET · PROPOSED', x: -1850, z: -1100, description: 'Explore the ancient river delta. This proposed sample destination sits among sedimentary formations visible in the CTX elevation mosaic.' },
  { id: 'landing', name: 'Octavia E. Butler', kind: 'PERSEVERANCE LANDING SITE', ...fromGeo(18.4446, 77.4509), description: 'Perseverance touched down here on 18 February 2021. Published location: 18.4446° N, 77.4509° E.' },
  { id: 'ridge', name: 'Delta Overlook', kind: 'SCIENCE TARGET · PROPOSED', x: -2900, z: -2400, description: 'A proposed elevated viewpoint for observing the western delta. Evaluate the terrain slope before committing to a traverse.' },
];
export type Route = { points: Point[]; distance: number; ascent: number; maxSlope: number; minutes: number; oxygen: number; feasible: boolean };
// A* on a 100 m navigation grid. Edge slopes use original, unexaggerated elevations.
export function planRoute(t: Terrain, start: Point, end: Point, safe = true, blocked = false): Route | null {
  const n = 101, step = 100, half = 5000;
  const index = (p: Point) => Math.max(0, Math.min(n - 1, Math.round((p.z + half) / step))) * n + Math.max(0, Math.min(n - 1, Math.round((p.x + half) / step)));
  const point = (i: number): Point => ({ x: (i % n) * step - half, z: Math.floor(i / n) * step - half });
  const s = index(start), goal = index(end), cost = new Float64Array(n * n).fill(Infinity), prev = new Int32Array(n * n).fill(-1), closed = new Uint8Array(n * n);
  const open: { i: number; f: number }[] = [];
  const push = (item: { i: number; f: number }) => { open.push(item); let k = open.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (open[p].f <= item.f) break; open[k] = open[p]; k = p; } open[k] = item; };
  const pop = () => { const first = open[0], last = open.pop()!; if (open.length) { let k = 0; while (k * 2 + 1 < open.length) { let child = k * 2 + 1; if (child + 1 < open.length && open[child + 1].f < open[child].f) child++; if (last.f <= open[child].f) break; open[k] = open[child]; k = child; } open[k] = last; } return first.i; };
  cost[s] = 0; push({ i: s, f: 0 });
  while (open.length) {
    const current = pop(); if (closed[current]) continue; closed[current] = 1;
    if (current === goal) break;
    const p = point(current), h = elevation(t, p.x, p.z);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const xx = current % n + dx, zz = Math.floor(current / n) + dz;
      if (xx < 0 || xx >= n || zz < 0 || zz >= n) continue;
      const next = zz * n + xx, q = point(next), dist = step * Math.hypot(dx, dz);
      const angle = Math.atan(Math.abs(elevation(t, q.x, q.z) - h) / dist) * 180 / Math.PI;
      const hazard = (r: Point) => blocked && Math.hypot(r.x - 100, r.z - 300) < 800;
      // Check edge midpoint as well, so diagonals cannot cut across the simulated exclusion zone.
      if (angle > (safe ? 18 : 28) || hazard(q) || hazard({ x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 })) continue;
      const candidate = cost[current] + dist * (1 + angle * (safe ? .2 : .015));
      if (candidate < cost[next]) { cost[next] = candidate; prev[next] = current; push({ i: next, f: candidate + Math.hypot(q.x - end.x, q.z - end.z) }); }
    }
  }
  if (!Number.isFinite(cost[goal])) return null;
  const points: Point[] = []; for (let i = goal; i !== -1; i = prev[i]) points.push(point(i)); points.reverse(); points[0] = start; points[points.length - 1] = end;
  let distance = 0, ascent = 0, maxSlope = 0;
  for (let i = 1; i < points.length; i++) { const a = points[i - 1], b = points[i], d = Math.hypot(b.x - a.x, b.z - a.z), dh = elevation(t, b.x, b.z) - elevation(t, a.x, a.z); distance += Math.hypot(d, dh); ascent += Math.max(0, dh); maxSlope = Math.max(maxSlope, Math.atan2(Math.abs(dh), d) * 180 / Math.PI); }
  const minutes = distance / 45 + ascent / 12, oxygen = minutes * .25;
  return { points, distance, ascent, maxSlope, minutes, oxygen, feasible: oxygen * 2 + 5 <= 75 };
}
export async function loadTerrain(signal: AbortSignal): Promise<Terrain> {
  const [metaRes, binRes] = await Promise.all([fetch('/data/terrain.json', { signal }), fetch('/data/terrain.bin', { signal })]);
  if (!metaRes.ok || !binRes.ok) throw new Error('The local USGS terrain could not be loaded. Retry or run npm run prepare:terrain.');
  const [meta, buffer] = await Promise.all([metaRes.json(), binRes.arrayBuffer()]);
  const values = new Float32Array(buffer);
  if (values.length !== meta.width * meta.height || values.some(v => !Number.isFinite(v))) throw new Error('Elevation dataset failed validation.');
  return { meta, values };
}
