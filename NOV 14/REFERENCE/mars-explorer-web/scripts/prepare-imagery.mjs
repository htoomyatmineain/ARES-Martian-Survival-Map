import { fromFile } from 'geotiff';
import sharp from 'sharp';
import { tmpdir } from 'node:os';
import { writeFile } from 'node:fs/promises';
const sourceUrl = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif';
const tif = await fromFile(process.argv[2] || `${tmpdir()}/jezero-ortho.tif`);
const image = await tif.getImage(), origin = image.getOrigin(), res = image.getResolution(), keys = image.getGeoKeys();
const radius = 3396190, center = { lat: 18.46, lon: 77.42 }, n = 2048;
const xy = (x, z) => [(center.lon * Math.PI / 180 * radius + x / Math.cos(center.lat * Math.PI / 180)) * Math.cos(keys.ProjStdParallel1GeoKey * Math.PI / 180), center.lat * Math.PI / 180 * radius - z];
const pixel = (x, z) => { const p = xy(x, z); return [(p[0] - origin[0]) / res[0] - .5, (p[1] - origin[1]) / res[1] - .5]; };
const a = pixel(-5000, -5000), b = pixel(5000, 5000), window = [Math.floor(a[0]), Math.floor(a[1]), Math.ceil(b[0]) + 1, Math.ceil(b[1]) + 1];
if (window[0] < 0 || window[1] < 0 || window[2] > image.getWidth() || window[3] > image.getHeight()) throw new Error('Imagery does not cover the mission zone');
const data = await image.readRasters({ window, interleave: true, samples: [0] });
const w = window[2] - window[0], values = new Float32Array(n * n), histogram = Array(256).fill(0);
for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
  const p = pixel(col / (n - 1) * 10000 - 5000, row / (n - 1) * 10000 - 5000), u = p[0] - window[0], v = p[1] - window[1], x = Math.floor(u), y = Math.floor(v), fx = u - x, fy = v - y;
  const h = (data[y * w + x] * (1 - fx) + data[y * w + x + 1] * fx) * (1 - fy) + (data[(y + 1) * w + x] * (1 - fx) + data[(y + 1) * w + x + 1] * fx) * fy;
  if (!Number.isFinite(h) || h === image.getGDALNoData()) throw new Error('Invalid orbital imagery sample');
  values[row * n + col] = h; histogram[Math.max(0, Math.min(255, Math.round(h)))]++;
}
let total = 0, low = 0, high = 255;
for (let i = 0; i < 256; i++) { total += histogram[i]; if (total < n * n * .02) low = i; if (total < n * n * .98) high = i; }
const buffer = Buffer.alloc(n * n);
for (let i = 0; i < values.length; i++) buffer[i] = Math.round(95 + Math.max(0, Math.min(1, (values[i] - low) / Math.max(1, high - low))) * 160);
await sharp(buffer, { raw: { width: n, height: n, channels: 1 } }).jpeg({ quality: 91 }).toFile('public/data/ortho.jpg');
await writeFile('public/data/imagery.json', JSON.stringify({ source: 'USGS Mars 2020 Terrain Relative Navigation CTX orthoimage mosaic', sourceUrl, resolution: 6, output: [n, n], center, size: 10000, processing: 'Bilinear resampled, 2–98 percentile grayscale contrast stretch; artistic Mars color applied by renderer', retrieved: '2026-11-08' }, null, 2));
await tif.close();
console.log(`Prepared georeferenced CTX orbital texture ${n} × ${n}, source stretch ${low}–${high}.`);
