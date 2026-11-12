// Read local source pixels only. No teammate scripts are executed or rasters modified.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fromFile } from 'geotiff';
const folder = path.resolve('source-data/Western-Jezero-10km-HiRISE');
const manifest = JSON.parse(await readFile(path.join(folder, 'download-manifest.json'), 'utf8'));
const sites = JSON.parse(await readFile('src/data/science-sites.json', 'utf8'));
if (manifest.status !== 'complete') throw Error('Source download incomplete');
const results = [];
for (const site of sites) {
  const samples = {};
  for (const kind of ['elevation', 'imagery']) {
    const p = manifest.products[kind], k = p.sourceGeoKeys, R = k.GeogSemiMajorAxisGeoKey, d = Math.PI / 180;
    const lat = site.latitude * d, lon = site.longitude * d;
    let x, y;
    if (kind === 'elevation') { x = R * lon; y = R * lat; }
    else {
      const lat0 = k.ProjCenterLatGeoKey * d, dl = lon - k.ProjCenterLongGeoKey * d;
      x = R * Math.cos(lat) * Math.sin(dl);
      y = R * (Math.cos(lat0) * Math.sin(lat) - Math.sin(lat0) * Math.cos(lat) * Math.cos(dl));
    }
    const col = Math.floor((x - p.sourceOrigin[0]) / p.sourceResolution[0]), row = Math.floor((y - p.sourceOrigin[1]) / p.sourceResolution[1]);
    const tile = p.tiles.find(t => col >= t.sourceWindow[0] && col < t.sourceWindow[2] && row >= t.sourceWindow[1] && row < t.sourceWindow[3]);
    if (!tile) throw Error(`${site.id}: outside ${kind} crop`);
    const tif = await fromFile(path.join(folder, tile.file));
    try {
      const im = await tif.getImage(), tx = col - tile.sourceWindow[0], ty = row - tile.sourceWindow[1];
      const value = (await im.readRasters({ window: [tx, ty, tx + 1, ty + 1], samples: [0], interleave: true }))[0];
      if (!Number.isFinite(value) || value === im.getGDALNoData()) throw Error(`${site.id}: invalid ${kind} pixel`);
      samples[kind] = { inside: true, valid: true, value, pixelSpacingMetres: Math.abs(p.sourceResolution[0]), sourcePixel: [col, row], sourceFile: path.basename(p.sourceUrl), sourceUrl: p.sourceUrl, tile: tile.file };
    } finally { await tif.close(); }
  }
  results.push({ siteId: site.id, latitude: site.latitude, longitude: site.longitude, samples });
}
const report = { checkedAt: new Date().toISOString(), method: 'Nearest containing pixel in each native raster CRS; local downloaded GeoTIFF chunks.', coordinateAssumption: 'Reported PDS latitude provisionally treated as planetocentric on a Mars sphere of radius 3396190 m. Source latitude convention is not independently confirmed.', limitations: ['Point validity is not absolute geolocation accuracy.', 'Vertical datums and quantitative CTX–HiRISE registration remain pending.', 'These are historical rover sampling sites, not certified astronaut EVA destinations.', 'HiRISE coverage checks do not imply that the app currently displays HiRISE rasters.'], sites: results };
await writeFile('src/data/science-site-coverage.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
