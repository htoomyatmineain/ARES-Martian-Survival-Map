import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { RegionalTileStore } from '../src/regionalTileStore.ts';
const directory = path.resolve('source-data/Western-Jezero-Web-Lossless');
const manifest = JSON.parse(await readFile(path.join(directory, 'package-manifest.json'), 'utf8'));
const coverage = JSON.parse(await readFile('src/data/science-site-coverage.json', 'utf8'));
const fetchLocal = async url => {
  const file = decodeURIComponent(new URL(url).pathname.split('/').pop());
  return new Response(await readFile(path.join(directory, file)));
};
const store = new RegionalTileStore('https://local-package.invalid', manifest, fetchLocal);
const results = [];
for (const site of coverage.sites) {
  const elevation = await store.elevationAt(site.latitude, site.longitude);
  const imagery = store.imageryAt(site.latitude, site.longitude);
  if (!imagery) throw Error(`Missing imagery: ${site.siteId}`);
  const pixel = await sharp(path.join(directory, imagery.tile.file)).extract({ left: imagery.pixel.x, top: imagery.pixel.y, width: 1, height: 1 }).greyscale().raw().toBuffer();
  if (elevation !== site.samples.elevation.value || pixel[0] !== site.samples.imagery.value) throw Error(`Packaged site differs from source: ${site.siteId}`);
  results.push({ siteId: site.siteId, elevation, imageryIntensity: pixel[0], identicalToSourceCheck: true });
}
await writeFile(path.join(directory, 'science-site-package-verification.json'), JSON.stringify({ checkedAt: new Date().toISOString(), coordinateAssumption: coverage.coordinateAssumption, results }, null, 2));
console.log(JSON.stringify(results, null, 2));
