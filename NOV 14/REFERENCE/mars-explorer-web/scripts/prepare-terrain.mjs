import { fromFile } from 'geotiff';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const sourceUrl = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif';
const input = process.argv[2] || path.join(tmpdir(), 'M20_JezeroCrater_CTXDEM_20m.tif');
if (!existsSync(input)) throw new Error(`Download ${sourceUrl} to ${input}, then run this script again.`);
const tif = await fromFile(input);
const image = await tif.getImage();
const origin = image.getOrigin(), resolution = image.getResolution(), keys = image.getGeoKeys();
console.log(JSON.stringify({ width: image.getWidth(), height: image.getHeight(), origin, resolution, keys }, null, 2));
const radius = 3396190;
// Read the source standard parallel rather than assuming equatorial equirectangular.
// Sampling a local east/north tangent grid keeps the primary 10 km zone square.
const center = { lat: 18.46, lon: 77.42 }, size = 10000, width = 501, height = 501;
const standardParallel = keys.ProjStdParallel1GeoKey * Math.PI / 180;
const centralMeridian = keys.ProjCenterLongGeoKey || 0;
const projected = (x, z) => [((center.lon - centralMeridian) * Math.PI / 180 * radius + x / Math.cos(center.lat * Math.PI / 180)) * Math.cos(standardParallel), center.lat * Math.PI / 180 * radius - z];
const pixel = (x, z) => { const p = projected(x, z); return [(p[0] - origin[0]) / resolution[0] - .5, (p[1] - origin[1]) / resolution[1] - .5]; };
const nw = pixel(-size / 2, -size / 2), se = pixel(size / 2, size / 2);
const window = [Math.floor(nw[0]), Math.floor(nw[1]), Math.ceil(se[0]) + 1, Math.ceil(se[1]) + 1];
if (window[0] < 0 || window[1] < 0 || window[2] > image.getWidth() || window[3] > image.getHeight()) throw new Error('Requested bounds outside source DEM');
const raster = await image.readRasters({ window, interleave: true });
const rw = window[2] - window[0], rh = window[3] - window[1], values = new Float32Array(width * height);
const nodata = image.getGDALNoData();
let min = Infinity, max = -Infinity;
for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
  const p = pixel(col / (width - 1) * size - size / 2, row / (height - 1) * size - size / 2);
  const u = p[0] - window[0], v = p[1] - window[1], a = Math.floor(u), b = Math.floor(v), fx = u - a, fy = v - b;
  const samples = [raster[b * rw + a], raster[b * rw + a + 1], raster[(b + 1) * rw + a], raster[(b + 1) * rw + a + 1]];
  if (a < 0 || b < 0 || a + 1 >= rw || b + 1 >= rh || samples.some(s => !Number.isFinite(s) || s === nodata || s < -15000 || s > 20000)) throw new Error(`Invalid DEM sample at ${col}, ${row}. Refusing to fabricate terrain.`);
  const h = (samples[0] * (1 - fx) + samples[1] * fx) * (1 - fy) + (samples[2] * (1 - fx) + samples[3] * fx) * fy;
  values[row * width + col] = h; min = Math.min(min, h); max = Math.max(max, h);
}
await mkdir('public/data', { recursive: true });
await writeFile('public/data/terrain.bin', Buffer.from(values.buffer));
await writeFile('public/data/terrain.json', JSON.stringify({ width, height, size, center, min, max, source: 'USGS / JPL · Mars 2020 CTX DEM', sourceUrl, resolution: 20, bounds: [center.lon - size / 2 / (radius * Math.cos(center.lat * Math.PI / 180)) * 180 / Math.PI, center.lat - size / 2 / radius * 180 / Math.PI, center.lon + size / 2 / (radius * Math.cos(center.lat * Math.PI / 180)) * 180 / Math.PI, center.lat + size / 2 / radius * 180 / Math.PI], projection: 'Mars 2000 sphere (R=3396190 m); equirectangular source, local east/north render coordinates', processing: 'Bilinear sampled from source elevation at 20 m grid spacing; no synthetic elevation; renderer exaggeration is display-only', retrieved: '2026-11-08', sourceGeoKeys: keys }, null, 2));
await tif.close();
console.log(`Prepared ${width} × ${height} scientific elevation samples. Range: ${min.toFixed(2)} to ${max.toFixed(2)} m.`);
