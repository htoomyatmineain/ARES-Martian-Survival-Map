// Verify downloaded tiles and make one QGIS/GDAL virtual mosaic per product.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fromFile } from 'geotiff';
const dir = path.resolve('source-data/Western-Jezero-10km-HiRISE');
const manifest = JSON.parse(await readFile(path.join(dir, 'download-manifest.json'), 'utf8'));
const completedOnly = process.argv.includes('--completed-products-only');
if (manifest.status !== 'complete' && !completedOnly) throw Error('The download is not complete yet');
const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const geographic = 'GEOGCS["Mars 2000 Sphere",DATUM["Mars_2000_Sphere",SPHEROID["Mars_2000_Sphere",3396190,0]],PRIMEM["Reference_Meridian",0],UNIT["degree",0.0174532925199433]]';
const results = [];
for (const [kind, product] of Object.entries(manifest.products)) {
  if (product.status !== 'complete') { if (completedOnly) continue; throw Error(`Incomplete product: ${kind}`); }
  const [x0, y0, x1, y1] = product.cropWindow;
  let pixels = 0, valid = 0, missing = 0;
  const occupied = new Set();
  for (const tile of product.tiles) {
    const bytes = await readFile(path.join(dir, tile.file));
    if (createHash('sha256').update(bytes).digest('hex') !== tile.sha256) throw Error(`Checksum mismatch: ${tile.file}`);
    const tif = await fromFile(path.join(dir, tile.file));
    try {
      const im = await tif.getImage(), keys = im.getGeoKeys();
      if (im.getWidth() !== tile.width || im.getHeight() !== tile.height) throw Error(`Dimensions: ${tile.file}`);
      for (const [key, value] of Object.entries(product.sourceGeoKeys)) if (keys[key] !== value) throw Error(`Projection: ${tile.file} / ${key}`);
      if (im.getGDALNoData() !== product.nodata) throw Error(`No-data metadata: ${tile.file}`);
      const o = im.getOrigin(), r = im.getResolution();
      if (o[0] !== product.sourceOrigin[0] + tile.sourceWindow[0] * product.sourceResolution[0] || o[1] !== product.sourceOrigin[1] + tile.sourceWindow[1] * product.sourceResolution[1] || r[0] !== product.sourceResolution[0] || r[1] !== product.sourceResolution[1]) throw Error(`Grid alignment: ${tile.file}`);
    } finally { await tif.close(); }
    const key = tile.sourceWindow.join(',');
    if (occupied.has(key)) throw Error(`Duplicate tile: ${tile.file}`); occupied.add(key);
    if (tile.sourceWindow[0] < x0 || tile.sourceWindow[1] < y0 || tile.sourceWindow[2] > x1 || tile.sourceWindow[3] > y1) throw Error('Tile outside crop');
    pixels += tile.width * tile.height; valid += tile.validPixels; missing += tile.missingPixels;
  }
  for (let i = 0; i < product.tiles.length; i++) for (let j = i + 1; j < product.tiles.length; j++) {
    const a = product.tiles[i].sourceWindow, b = product.tiles[j].sourceWindow;
    if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) throw Error('Overlapping crop tiles');
  }
  if (pixels !== (x1 - x0) * (y1 - y0) || valid + missing !== pixels || valid !== product.validPixels || missing !== product.missingPixels) throw Error(`Coverage mismatch: ${kind}`);
  const k = product.sourceGeoKeys;
  const projection = kind === 'elevation' ? 'PROJECTION["Equirectangular"],PARAMETER["standard_parallel_1",0],PARAMETER["central_meridian",0]' : `PROJECTION["Orthographic"],PARAMETER["latitude_of_origin",${k.ProjCenterLatGeoKey}],PARAMETER["central_meridian",${k.ProjCenterLongGeoKey}]`;
  const wkt = `PROJCS["${kind === 'elevation' ? 'Equirectangular' : 'Orthographic'}_Mars_2000",${geographic},${projection},PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1]]`;
  const transform = [product.sourceOrigin[0] + x0 * product.sourceResolution[0], product.sourceResolution[0], 0, product.sourceOrigin[1] + y0 * product.sourceResolution[1], 0, product.sourceResolution[1]];
  const sources = product.tiles.map(t => `<SimpleSource><SourceFilename relativeToVRT="1">${escape(t.file)}</SourceFilename><SourceBand>1</SourceBand><SrcRect xOff="0" yOff="0" xSize="${t.width}" ySize="${t.height}"/><DstRect xOff="${t.sourceWindow[0] - x0}" yOff="${t.sourceWindow[1] - y0}" xSize="${t.width}" ySize="${t.height}"/></SimpleSource>`).join('\n');
  await writeFile(path.join(dir, `${kind}.vrt`), `<VRTDataset rasterXSize="${x1 - x0}" rasterYSize="${y1 - y0}">\n<SRS>${escape(wkt)}</SRS>\n<GeoTransform>${transform.join(',')}</GeoTransform>\n<VRTRasterBand dataType="${kind === 'elevation' ? 'Float32' : 'Byte'}" band="1"><NoDataValue>${product.nodata}</NoDataValue>\n${sources}\n</VRTRasterBand></VRTDataset>\n`);
  const result = { kind, tiles: product.tiles.length, pixels, validPixels: valid, missingPixels: missing, validPercent: valid / pixels * 100, bytes: product.totalBytes, checksums: 'PASS', projectionAndGrid: 'PASS', completeCrop: 'PASS', virtualMosaic: `${kind}.vrt` };
  results.push(result); console.log(JSON.stringify(result));
}
await writeFile(path.join(dir, 'verification-results.json'), JSON.stringify({ verified: new Date().toISOString(), scope: 'Downloaded native-grid bounding rectangles, including small margins outside the exact requested boundary', sourceAccuracy: 'Not independently validated against ground measurements', products: results }, null, 2));
