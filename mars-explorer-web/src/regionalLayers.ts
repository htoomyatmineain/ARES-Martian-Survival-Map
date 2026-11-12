import { fromGeo, slope, toGeo, type Terrain, type TerrainMeta } from './terrain.ts';

export function coordinateGrid(meta: Pick<TerrainMeta, 'size' | 'center'>, step: number) {
  if (!Number.isFinite(step) || step <= 0) throw Error('Invalid coordinate grid interval');
  const half = meta.size / 2;
  const nw = toGeo({ x: -half, z: -half }, meta.center), se = toGeo({ x: half, z: half }, meta.center);
  const longitude: { x: number; degrees: number }[] = [], latitude: { z: number; degrees: number }[] = [];
  if ((se.lon - nw.lon + nw.lat - se.lat) / step > 10000) throw Error('Coordinate grid too dense');
  for (let n = Math.ceil(nw.lon / step - 1e-9); n <= Math.floor(se.lon / step + 1e-9); n++) {
    const degrees = Number((n * step).toFixed(10));
    longitude.push({ x: fromGeo(meta.center.lat, degrees, meta.center).x, degrees });
  }
  for (let n = Math.ceil(se.lat / step - 1e-9); n <= Math.floor(nw.lat / step + 1e-9); n++) {
    const degrees = Number((n * step).toFixed(10));
    latitude.push({ z: fromGeo(degrees, meta.center.lon, meta.center).z, degrees });
  }
  return { longitude, latitude };
}

export type AnalysisLayer = 'none' | 'elevation' | 'slope';
export function mapFrame(size: number, width: number, height: number, zoom: number, framing: 'fill' | 'fit') {
  if (![size, width, height, zoom].every(v => Number.isFinite(v) && v > 0)) throw Error('Invalid map frame');
  const unitsPerPixel = size * (framing === 'fit' ? 1.04 : 1) / (framing === 'fill' ? Math.max(width, height) : Math.min(width, height)) / zoom;
  return { width: width * unitsPerPixel, height: height * unitsPerPixel, unitsPerPixel };
}
export function analysisPixels(t: Terrain, layer: Exclude<AnalysisLayer, 'none'>) {
  const { width, height, size, min, max } = t.meta;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
    const i = row * width + col;
    if (!Number.isFinite(t.values[i])) continue;
    let color: number[];
    if (layer === 'slope') {
      const s = slope(t, col / (width - 1) * size - size / 2, row / (height - 1) * size - size / 2);
      color = s > 18 ? [225, 101, 76] : s > 10 ? [230, 189, 100] : [95, 151, 139];
    } else {
      const f = Math.max(0, Math.min(1, (t.values[i] - min) / Math.max(1, max - min)));
      const low = [63, 83, 105], mid = [172, 143, 107], high = [244, 224, 183];
      const a = f < .5 ? low : mid, b = f < .5 ? mid : high, u = f < .5 ? f * 2 : (f - .5) * 2;
      color = a.map((v, j) => Math.round(v + (b[j] - v) * u));
    }
    pixels.set([...color, 255], i * 4);
  }
  return pixels;
}

// Intersect each triangle with absolute elevation levels. Coordinates are local metres.
export function contourPath(t: Terrain, interval = 20, stride = 2) {
  if (!(interval > 0) || !Number.isInteger(stride) || stride < 1) throw Error('Invalid contour spacing');
  const { width, height, size, min, max } = t.meta;
  const lines: string[] = [];
  const point = (x: number, y: number): [number, number, number] => [x / (width - 1) * size - size / 2, y / (height - 1) * size - size / 2, t.values[y * width + x]];
  for (let level = Math.ceil(min / interval) * interval; level <= max; level += interval) {
    for (let y = 0; y < height - 1; y += stride) for (let x = 0; x < width - 1; x += stride) {
      const a = point(x, y), b = point(Math.min(width - 1, x + stride), y);
      const c = point(x, Math.min(height - 1, y + stride)), e = point(Math.min(width - 1, x + stride), Math.min(height - 1, y + stride));
      for (const tri of [[a, b, c], [b, e, c]]) {
        if (tri.some(p => !Number.isFinite(p[2]))) continue;
        const hits: number[][] = [];
        for (let j = 0; j < 3; j++) {
          const p = tri[j], q = tri[(j + 1) % 3];
          if ((p[2] <= level && q[2] > level) || (q[2] <= level && p[2] > level)) {
            const u = (level - p[2]) / (q[2] - p[2]);
            hits.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]);
          }
        }
        if (hits.length === 2) lines.push(`M${hits[0][0].toFixed(1)},${hits[0][1].toFixed(1)}L${hits[1][0].toFixed(1)},${hits[1][1].toFixed(1)}`);
      }
    }
  }
  return lines.join('');
}
