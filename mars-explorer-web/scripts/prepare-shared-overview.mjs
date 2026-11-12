import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { fromFile } from 'geotiff';
import { nativePixel } from '../src/regionalTileStore.ts';
const source = path.resolve('source-data/Western-Jezero-10km-HiRISE');
const output = path.resolve('source-data/Western-Jezero-Web-Lossless');
const original = JSON.parse(await readFile(path.join(source, 'download-manifest.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(output, 'package-manifest.json'), 'utf8'));
const R = 3396190, d = Math.PI / 180, zone = original.zone, size = zone.size_m;
const geo = (x, z) => ({ lat: zone.center.lat - z / R / d, lon: zone.center.lon + x / (R * Math.cos(zone.center.lat * d)) / d });
async function raster(tile) {
  const t = await fromFile(path.join(source, tile.file));
  try { return await (await t.getImage()).readRasters({ samples: [0], interleave: true }); } finally { await t.close(); }
}
const cache = new Map();
async function sample(product, latitude, longitude, kind) {
  const pixel = nativePixel(product, latitude, longitude, kind);
  const tile = product.tiles.find(t => pixel.col >= t.sourceWindow[0] && pixel.col < t.sourceWindow[2] && pixel.row >= t.sourceWindow[1] && pixel.row < t.sourceWindow[3]);
  if (!tile) return NaN;
  let values = cache.get(tile.file);
  if (!values) { values = await raster(tile); if (cache.size >= 2) cache.delete(cache.keys().next().value); cache.set(tile.file, values); }
  const value = values[(pixel.row - tile.sourceWindow[1]) * tile.width + pixel.col - tile.sourceWindow[0]];
  return value === product.nodata ? NaN : value;
}
const n = 1001, values = new Float32Array(n * n);
let min = Infinity, max = -Infinity, missing = 0;
for (let row = 0; row < n; row++) {
  for (let col = 0; col < n; col++) {
    const p = geo((col / (n - 1) - .5) * size, (row / (n - 1) - .5) * size);
    const h = await sample(original.products.elevation, p.lat, p.lon, 'elevation');
    values[row * n + col] = h;
    if (Number.isFinite(h)) { min = Math.min(min, h); max = Math.max(max, h); } else missing++;
  }
  if (row % 200 === 0) console.log(`Elevation overview row ${row}/${n}`);
}
cache.clear();
const meta = { width: n, height: n, size, center: zone.center, min, max,
  source: 'NASA MRO HiRISE 1 m DTM · 10 m display grid', sourceUrl: original.products.elevation.sourceUrl,
  resolution: 10, sourceResolution: 1, bounds: zone.bounds_lon_lat,
  projection: 'Local Mars sphere east/south metres; source equirectangular; nearest containing native pixel', missing, nodata: 'NaN' };
await writeFile(path.join(output, 'overview-terrain.bin'), Buffer.from(values.buffer));
await writeFile(path.join(output, 'overview-terrain.json'), JSON.stringify(meta));
// Reproject a display overview only. Original full-resolution tiles remain unchanged.
const width = 4096, image = Buffer.alloc(width * width), p = original.products.imagery;
const k = p.sourceGeoKeys, lat0 = Number(k.ProjCenterLatGeoKey) * d, lon0 = Number(k.ProjCenterLongGeoKey) * d;
function world(col, row) {
  const x = p.sourceOrigin[0] + col * p.sourceResolution[0], y = p.sourceOrigin[1] + row * p.sourceResolution[1];
  const rho = Math.hypot(x, y), c = Math.asin(rho / R), sc = Math.sin(c), cc = Math.cos(c);
  const lat = rho ? Math.asin(cc * Math.sin(lat0) + y * sc * Math.cos(lat0) / rho) : lat0;
  const lon = lon0 + (rho ? Math.atan2(x * sc, rho * Math.cos(lat0) * cc - y * Math.sin(lat0) * sc) : 0);
  return { x: (lon - zone.center.lon * d) * R * Math.cos(zone.center.lat * d), z: -(lat - zone.center.lat * d) * R };
}
for (const tile of p.tiles) {
  const v = await raster(tile), [a,b,c,e] = tile.sourceWindow;
  const corners = [world(a,b),world(c,b),world(a,e),world(c,e)];
  const xs = corners.map(p => (p.x / size + .5) * width), ys = corners.map(p => (p.z / size + .5) * width);
  const left = Math.max(0, Math.floor(Math.min(...xs)) - 2), right = Math.min(width, Math.ceil(Math.max(...xs)) + 2);
  const top = Math.max(0, Math.floor(Math.min(...ys)) - 2), bottom = Math.min(width, Math.ceil(Math.max(...ys)) + 2);
  for (let row = top; row < bottom; row++) for (let col = left; col < right; col++) {
    const g = geo(((col + .5) / width - .5) * size, ((row + .5) / width - .5) * size);
    const q = nativePixel(p, g.lat, g.lon, 'imagery');
    if (q.col >= a && q.col < c && q.row >= b && q.row < e) image[row * width + col] = v[(q.row - b) * tile.width + q.col - a];
  }
  console.log(`Imagery overview: ${tile.file}`);
}
await sharp(image, { raw: { width, height: width, channels: 1 } }).webp({ lossless: true, effort: 4 }).toFile(path.join(output, 'overview-imagery.webp'));
const files = ['overview-terrain.json', 'overview-terrain.bin', 'overview-imagery.webp'];
manifest.display = { terrainMeta: files[0], terrainValues: files[1], imagery: files[2], gridSpacingMetres: 10, imageryPixelSpacingMetres: size / width };
manifest.assets = [];
for (const file of files) { const bytes = await readFile(path.join(output, file)); manifest.assets.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }); }
await writeFile(path.join(output, 'package-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ missing, min, max, assets: manifest.assets }));
