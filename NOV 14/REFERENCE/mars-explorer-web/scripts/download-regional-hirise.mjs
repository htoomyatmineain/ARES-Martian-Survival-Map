// Lossless, resumable native-grid crops. Does not change the running application's data.
import { fromCustomClient, fromFile, BaseClient, BaseResponse, writeArrayBuffer } from 'geotiff';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const output = path.resolve('source-data/Western-Jezero-10km-HiRISE');
const base = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/';
const sources = {
  elevation: base + 'JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif',
  imagery: base + 'JEZ_hirise_soc_007_orthoMosaic_25cm_Ortho_blend120.tif',
};
const R = 3396190, d = Math.PI / 180;
const zone = JSON.parse(await readFile('public/data/terrain.json', 'utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
let activeRequests = 0;
const waitingRequests = [];
async function request(url, options = {}) {
  const range = options.headers?.Range?.match(/^bytes=(\d+)-(\d+)$/);
  if (range && Number(range[2]) - Number(range[1]) + 1 > 2 * 1024 * 1024) {
    const start = Number(range[1]), end = Number(range[2]), merged = new Uint8Array(end - start + 1);
    let next = start, first;
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (next <= end) {
        const a = next, b = Math.min(end, a + 512 * 1024 - 1); next = b + 1;
        const part = await request(url, { ...options, headers: { ...options.headers, Range: `bytes=${a}-${b}` } });
        if (part.data.byteLength !== b - a + 1) throw Error('Incomplete byte range');
        first ??= part.response; merged.set(new Uint8Array(part.data), a - start);
      }
    }));
    return { response: first, data: merged.buffer };
  }
  for (let attempt = 0; ; attempt++) {
    const limit = url.includes('orthoMosaic') ? 16 : 4;
    if (activeRequests >= limit) await new Promise(resolve => waitingRequests.push(resolve));
    activeRequests++;
    try {
      const downloadUrl = attempt % 2 ? url.replace('https://asc-pds-services.s3.us-west-2.amazonaws.com/', 'https://planetarymaps.usgs.gov/') : url;
      const timeout = url.includes('orthoMosaic') && range && Number(range[2]) - Number(range[1]) < 262144 ? 20000 : 60000;
      const response = await fetch(downloadUrl, { ...options, signal: AbortSignal.timeout(timeout) });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const data = await response.arrayBuffer();
      if (options.headers?.Range && response.status !== 206) throw Error('Server ignored byte range');
      return { response, data };
    } catch (e) { if (attempt >= 4) throw e; console.log(`Retry ${attempt + 1}: ${e.message}`); }
    finally { activeRequests--; waitingRequests.shift()?.(); }
  }
}
class Response extends BaseResponse {
  constructor(r, b) { super(); this.r = r; this.b = b; }
  get status() { return this.r.status; }
  getHeader(n) { return this.r.headers.get(n) ?? undefined; }
  async getData() { return this.b; }
}
class Client extends BaseClient {
  constructor(url) { super(url); this.active = 0; this.queue = []; this.cached = []; }
  async request(options) {
    const range = options.headers?.Range?.match(/^bytes=(\d+)-(\d+)$/);
    if (range) {
      const a = Number(range[1]), b = Number(range[2]);
      const c = this.cached.find(c => a >= c.start && b <= c.end);
      if (c) {
        const data = c.data.slice(a - c.start, b - c.start + 1);
        const headers = new Headers({ 'content-type': 'image/tiff', 'content-range': `bytes ${a}-${b}/${c.total}`, 'content-length': String(data.byteLength) });
        return new Response({ status: 206, headers }, data);
      }
    }
    if (this.active >= 16) await new Promise(resolve => this.queue.push(resolve));
    this.active++;
    try { const { response, data } = await request(this.url, options); return new Response(response, data); }
    finally { this.active--; this.queue.shift()?.(); }
  }
}
await mkdir(output, { recursive: true });
await writeFile(path.join(output, '.gitignore'), '*.tif\n*.partial\n');
const manifestPath = path.join(output, 'download-manifest.json');
let manifest;
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); }
catch { manifest = { status: 'downloading', started: new Date().toISOString(), mission: 'NASA Mars Reconnaissance Orbiter', instrument: 'HiRISE', processorAndDistributor: 'USGS Astrogeology', zone: { center: zone.center, size_m: zone.size, bounds_lon_lat: zone.bounds }, products: {}, notes: ['Native source pixels retained without interpolation, invented filling, color changes, or elevation exaggeration.', 'Rectangular native-grid crops enclose the requested region; small margins outside its exact boundary are retained.', 'No-data values are preserved. Pixel spacing is not a statement of absolute positional or vertical accuracy.', 'Original application data is unchanged. GeoTIFF chunks share the source projection and can be loaded together in QGIS.'] }; }
let saving = Promise.resolve();
function save() { saving = saving.then(async () => { await writeFile(manifestPath + '.partial', JSON.stringify(manifest, null, 2)); await rename(manifestPath + '.partial', manifestPath); }); return saving; }
const geo = (x, z) => ({ lat: zone.center.lat * d - z / R, lon: zone.center.lon * d + x / (R * Math.cos(zone.center.lat * d)) });
for (const kind of ['elevation', 'imagery']) {
  const client = new Client(sources[kind]);
  const tif = await fromCustomClient(client, { allowFullFile: false, cacheSize: 32 });
  const im = await tif.getImage(), origin = im.getOrigin(), res = im.getResolution(), keys = im.getGeoKeys();
  const rawGeo = {};
  for (const tag of ['GeoKeyDirectory', 'GeoDoubleParams', 'GeoAsciiParams']) {
    const value = await im.fileDirectory.loadValue(tag);
    if (value !== undefined) rawGeo[tag] = ArrayBuffer.isView(value) ? Array.from(value) : value;
  }
  const lat0 = (keys.ProjCenterLatGeoKey ?? 0) * d, lon0 = (keys.ProjCenterLongGeoKey ?? 0) * d;
  function pixel(x, z) {
    const g = geo(x, z);
    const xy = kind === 'elevation' ? [R * g.lon, R * g.lat] : [R * Math.cos(g.lat) * Math.sin(g.lon - lon0), R * (Math.cos(lat0) * Math.sin(g.lat) - Math.sin(lat0) * Math.cos(g.lat) * Math.cos(g.lon - lon0))];
    return [(xy[0] - origin[0]) / res[0], (xy[1] - origin[1]) / res[1]];
  }
  const boundary = [];
  for (let j = 0; j <= 100; j++) { const a = -5000 + j * 100; boundary.push(pixel(a, -5000), pixel(a, 5000), pixel(-5000, a), pixel(5000, a)); }
  const crop = [Math.floor(Math.min(...boundary.map(p => p[0]))), Math.floor(Math.min(...boundary.map(p => p[1]))), Math.ceil(Math.max(...boundary.map(p => p[0]))), Math.ceil(Math.max(...boundary.map(p => p[1])))];
  if (crop[0] < 0 || crop[1] < 0 || crop[2] > im.getWidth() || crop[3] > im.getHeight()) throw Error(`${kind} crop outside source`);
  const product = manifest.products[kind] ??= { sourceUrl: sources[kind], sourceDimensions: [im.getWidth(), im.getHeight()], sourceOrigin: origin, sourceResolution: res, sourceGeoKeys: keys, cropWindow: crop, nodata: im.getGDALNoData(), tiles: [] };
  if (JSON.stringify(product.cropWindow) !== JSON.stringify(crop)) throw Error('Resume crop mismatch');
  console.log(`${kind}: native crop ${crop[2] - crop[0]} x ${crop[3] - crop[1]}, ${Math.abs(res[0])} m pixels`);
  const stepX = kind === 'elevation' ? crop[2] - crop[0] : 4096;
  const stepY = kind === 'elevation' ? 512 : 4096;
  const offsets = kind === 'elevation' ? await im.fileDirectory.loadValue('StripOffsets') : null;
  const tileOffsets = kind === 'imagery' ? await im.fileDirectory.loadValue('TileOffsets') : null;
  const tileCounts = kind === 'imagery' ? await im.fileDirectory.loadValue('TileByteCounts') : null;
  if (kind === 'elevation' && (im.getTileHeight() !== 1 || im.fileDirectory.getValue('Compression') !== 1)) throw Error('Unexpected DTM layout');
  const jobs = [];
  for (let y = crop[1]; y < crop[3]; y += stepY) for (let x = crop[0]; x < crop[2]; x += stepX) jobs.push({ x, y });
  let nextJob = 0;
  await Promise.all(Array.from({ length: kind === 'imagery' ? 8 : 3 }, async () => { while (nextJob < jobs.length) {
    const { x, y } = jobs[nextJob++];
    const w = Math.min(stepX, crop[2] - x), h = Math.min(stepY, crop[3] - y);
    const name = `${kind}-${x}-${y}.tif`, dest = path.join(output, name);
    const metadata = { ...keys, ...rawGeo, width: w, height: h, ModelPixelScale: [res[0], Math.abs(res[1]), 0], ModelTiepoint: [0, 0, 0, origin[0] + x * res[0], origin[1] + y * res[1], 0], GDAL_NODATA: String(product.nodata) };
    const previous = product.tiles.find(p => p.file === name);
    if (previous) {
      const b = await readFile(dest); if (sha(b) !== previous.sha256) throw Error(`Checksum mismatch: ${name}`);
      const existing = await fromFile(dest);
      let repairValues;
      try { const ei = await existing.getImage(), ek = ei.getGeoKeys(); if (Object.entries(keys).some(([k, v]) => ek[k] !== v)) repairValues = await ei.readRasters({ samples: [0], interleave: true }); }
      finally { await existing.close(); }
      if (repairValues) {
        const corrected = Buffer.from(writeArrayBuffer(repairValues, { ...metadata }));
        await writeFile(dest + '.partial', corrected);
        const verify = await fromFile(dest + '.partial');
        try { const vi = await verify.getImage(), vk = vi.getGeoKeys(), vv = await vi.readRasters({ samples: [0], interleave: true });
          if (Object.entries(keys).some(([k, v]) => vk[k] !== v) || sha(Buffer.from(vv.buffer, vv.byteOffset, vv.byteLength)) !== sha(Buffer.from(repairValues.buffer, repairValues.byteOffset, repairValues.byteLength))) throw Error('Resume projection repair verification failed');
        } finally { await verify.close(); }
        await rename(dest + '.partial', dest); previous.sha256 = sha(corrected); previous.bytes = corrected.length; await save();
      }
      console.log(`Verified existing ${name}`); continue;
    }
    let values;
    if (kind === 'elevation') {
      const start = Number(offsets[y]), end = Number(offsets[y + h - 1]) + im.getWidth() * 4 - 1;
      const { data } = await request(sources[kind], { headers: { Range: `bytes=${start}-${end}` } });
      const view = new DataView(data); values = new Float32Array(w * h);
      for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) values[row * w + col] = view.getFloat32(Number(offsets[y + row]) - start + (x + col) * 4, im.littleEndian);
    } else {
      // Native TIFF tiles are consecutive within each tile row. Fetch each row-span
      // once rather than making hundreds of tiny HTTP requests per output tile.
      const tw = im.getTileWidth(), th = im.getTileHeight(), across = Math.ceil(im.getWidth() / tw);
      const firstCol = Math.floor(x / tw), lastCol = Math.ceil((x + w) / tw) - 1;
      const spans = [];
      for (let row = Math.floor(y / th); row < Math.ceil((y + h) / th); row++) {
        const first = row * across + firstCol, last = row * across + lastCol;
        const start = Number(tileOffsets[first]), end = Number(tileOffsets[last]) + Number(tileCounts[last]) - 1;
        if (end < start || end - start > 4 * 1024 * 1024) throw Error('Unexpected imagery tile ordering');
        for (let i = first; i <= last; i++) if (Number(tileOffsets[i]) < start || Number(tileOffsets[i]) + Number(tileCounts[i]) - 1 > end) throw Error('Nonconsecutive imagery tiles');
        spans.push({ start, end });
      }
      try {
        await Promise.all(spans.map(async ({ start, end }) => {
          const { response, data } = await request(sources[kind], { headers: { Range: `bytes=${start}-${end}` } });
          if (data.byteLength !== end - start + 1) throw Error('Incomplete imagery tile row');
          client.cached.push({ owner: name, start, end, data, total: response.headers.get('content-range').split('/')[1] });
        }));
        values = await im.readRasters({ window: [x, y, x + w, y + h], samples: [0], interleave: true });
      } finally { client.cached = client.cached.filter(c => c.owner !== name); }
    }
    let valid = 0, missing = 0, min = Infinity, max = -Infinity;
    for (const v of values) { if (!Number.isFinite(v) || v === product.nodata) missing++; else { valid++; min = Math.min(min, v); max = Math.max(max, v); } }
    const bytes = Buffer.from(writeArrayBuffer(values, metadata));
    await writeFile(dest + '.partial', bytes);
    const check = await fromFile(dest + '.partial');
    try {
      const ci = await check.getImage(), cv = await ci.readRasters({ samples: [0], interleave: true });
      const raw = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
      if (sha(raw(cv)) !== sha(raw(values))) throw Error(`Pixel round-trip mismatch: ${name}`);
      const co = ci.getOrigin();
      if (co[0] !== metadata.ModelTiepoint[3] || co[1] !== metadata.ModelTiepoint[4]) throw Error('Georeference round-trip mismatch');
      const ck = ci.getGeoKeys();
      for (const [key, value] of Object.entries(keys)) if (ck[key] !== value) throw Error(`Projection mismatch: ${key}`);
    } finally { await check.close(); }
    await rename(dest + '.partial', dest);
    product.tiles.push({ file: name, sourceWindow: [x, y, x + w, y + h], width: w, height: h, bytes: bytes.length, sha256: sha(bytes), validPixels: valid, missingPixels: missing, min: valid ? min : null, max: valid ? max : null, pixelRoundTripVerified: true });
    await save();
    console.log(`${kind} ${product.tiles.length}: ${name}, ${(bytes.length / 1e6).toFixed(1)} MB, missing ${missing}`);
  } }));
  product.validPixels = product.tiles.reduce((n, t) => n + t.validPixels, 0);
  product.missingPixels = product.tiles.reduce((n, t) => n + t.missingPixels, 0);
  product.totalBytes = product.tiles.reduce((n, t) => n + t.bytes, 0);
  product.status = 'complete'; await save();
}
manifest.status = 'complete'; manifest.completed = new Date().toISOString(); await save();
await writeFile(path.join(output, 'README.md'), `# Western Jezero 10 km HiRISE download\n\nNASA MRO HiRISE data, processed and distributed by USGS Astrogeology.\n\nCenter: 18.46 N, 77.42 E. Requested region: 10,000 x 10,000 m in the existing app's local coordinate convention.\n\nElevation: 1 m source-grid spacing. Imagery: 0.25 m source pixels. Files are lossless GeoTIFF chunks with original projection metadata, not resampled app assets. Native-grid bounding rectangles include a small margin around the requested region. Missing source pixels are retained, not filled. Load the chunks together in QGIS; consult download-manifest.json for source URLs, per-file SHA-256 checksums, crop windows and full pixel coverage counts. Coverage counts describe the downloaded bounding rectangles, not an exact geographic polygon.\n\nEvery output pixel was decoded again and checked against the source crop. This verifies transfer/encoding, not the physical accuracy of the source measurements. Existing 20 m app terrain and teammate's JZ-01 files were not modified. App integration is a separate step.\n`);
console.log(`COMPLETE: ${output}`);
