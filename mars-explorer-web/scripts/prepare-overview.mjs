import { fromFile } from 'geotiff';
import sharp from 'sharp';
import { tmpdir } from 'node:os';
const t = await fromFile(process.argv[2] || `${tmpdir()}/M20_JezeroCrater_CTXDEM_20m.tif`), im = await t.getImage();
const o = im.getOrigin(), r = im.getResolution(), k = im.getGeoKeys(), radius = 3396190, center = { lat: 18.38, lon: 77.58 }, span = 55000, n = 768;
const proj = (x, z) => [(center.lon * Math.PI / 180 * radius + x / Math.cos(center.lat * Math.PI / 180)) * Math.cos(k.ProjStdParallel1GeoKey * Math.PI / 180), center.lat * Math.PI / 180 * radius - z];
const a = proj(-span / 2, -span / 2), b = proj(span / 2, span / 2);
const data = await im.readRasters({ window: [Math.floor((a[0] - o[0]) / r[0]), Math.floor((a[1] - o[1]) / r[1]), Math.ceil((b[0] - o[0]) / r[0]), Math.ceil((b[1] - o[1]) / r[1])], width: n, height: n, resampleMethod: 'bilinear', samples: [0], interleave: true });
const buf = Buffer.alloc(n * n * 3), valid = h => Number.isFinite(h) && h > -10000 && h < 20000;
for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
  const i = y * n + x, h = data[i], sx = data[y * n + Math.max(0, x - 1)] - data[y * n + Math.min(n - 1, x + 1)], sy = data[Math.max(0, y - 1) * n + x] - data[Math.min(n - 1, y + 1) * n + x];
  const shade = valid(h) ? Math.max(.1, Math.min(1, .55 + (sx + sy) / (span / n * 3))) : .13;
  buf[i * 3] = Math.round(155 * shade); buf[i * 3 + 1] = Math.round(126 * shade); buf[i * 3 + 2] = Math.round(92 * shade);
}
await sharp(buf, { raw: { width: n, height: n, channels: 3 } }).jpeg({ quality: 92 }).toFile('public/data/overview.jpg');
await t.close(); console.log('Prepared 55 × 55 km crater context map from scientific elevation.');
