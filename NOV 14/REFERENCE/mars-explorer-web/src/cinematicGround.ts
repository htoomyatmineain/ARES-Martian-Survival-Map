export type Ground = { width: number; height: number; xmin: number; xmax: number; ymin: number; ymax: number; values: Float32Array; elevationOrigin: number; center: { lat: number; lon: number }; heading: number; detail?: { width: number; height: number; size: number; values: Float32Array } };
export async function loadGround(signal: AbortSignal): Promise<Ground> {
  const [meta, bin] = await Promise.all([fetch('/assets/mars/ground.json', { signal }), fetch('/assets/mars/ground.bin', { signal })]);
  if (!meta.ok || !bin.ok) throw new Error('Blender terrain assets are unavailable.');
  const [data, buffer] = await Promise.all([meta.json(), bin.arrayBuffer()]);
  let detail;
  if (data.detail) { const response = await fetch('/assets/mars/' + data.detail.file, { signal }); if (!response.ok) throw new Error('HiRISE collision surface could not be loaded.'); detail = { ...data.detail, values: new Float32Array(await response.arrayBuffer()) }; }
  return { ...data, values: new Float32Array(buffer), detail };
}
export function groundHeight(g: Ground, x: number, z: number) {
  const u = Math.max(0, Math.min(g.width - 1.001, (x - g.xmin) / (g.xmax - g.xmin) * (g.width - 1)));
  const v = Math.max(0, Math.min(g.height - 1.001, (-z - g.ymin) / (g.ymax - g.ymin) * (g.height - 1)));
  const a = Math.floor(u), b = Math.floor(v), fx = u - a, fy = v - b;
  const base = (g.values[b * g.width + a] * (1 - fx) + g.values[b * g.width + a + 1] * fx) * (1 - fy) + (g.values[(b + 1) * g.width + a] * (1 - fx) + g.values[(b + 1) * g.width + a + 1] * fx) * fy;
  const d = g.detail;
  if (!d || Math.abs(x) >= d.size / 2 || Math.abs(z) >= d.size / 2) return base;
  const uu = Math.max(0, Math.min(d.width - 1.0001, (x / d.size + .5) * (d.width - 1))), vv = Math.max(0, Math.min(d.height - 1.0001, (z / d.size + .5) * (d.height - 1)));
  const xx = Math.floor(uu), yy = Math.floor(vv), fxx = uu - xx, fyy = vv - yy;
  const h = (d.values[yy * d.width + xx] * (1 - fxx) + d.values[yy * d.width + xx + 1] * fxx) * (1 - fyy) + (d.values[(yy + 1) * d.width + xx] * (1 - fxx) + d.values[(yy + 1) * d.width + xx + 1] * fxx) * fyy - g.elevationOrigin;
  let weight = Math.max(0, Math.min(1, (d.size / 2 - Math.max(Math.abs(x), Math.abs(z))) / 20)); weight = weight * weight * (3 - 2 * weight);
  return base * (1 - weight) + h * weight;
}
export function playerGeo(g: Ground, x: number, z: number) {
  const t = g.heading * Math.PI / 180, east = x * Math.cos(t) - z * Math.sin(t), south = x * Math.sin(t) + z * Math.cos(t);
  return { lat: g.center.lat - south / 3396190 * 180 / Math.PI, lon: g.center.lon + east / (3396190 * Math.cos(g.center.lat * Math.PI / 180)) * 180 / Math.PI };
}
