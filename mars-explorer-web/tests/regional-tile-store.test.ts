import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { nativePixel, RegionalTileStore, type RegionalPackage } from '../src/regionalTileStore.ts';
test('native tile projection reproduces the independently checked science-site source pixels', async () => {
  const manifest = JSON.parse(await readFile(new URL('../source-data/Western-Jezero-10km-HiRISE/download-manifest.json', import.meta.url), 'utf8'));
  const coverage = JSON.parse(await readFile(new URL('../src/data/science-site-coverage.json', import.meta.url), 'utf8'));
  for (const site of coverage.sites) for (const kind of ['elevation', 'imagery'] as const) {
    const p = nativePixel(manifest.products[kind], site.latitude, site.longitude, kind);
    assert.deepEqual([p?.col, p?.row], site.samples[kind].sourcePixel);
  }
});
test('tile store fetches only requested elevation, caches within budget, rejects corruption and returns null outside coverage', async () => {
  const raw = new Uint8Array(new Float32Array([-2520.46826171875, -2523.12451171875, 0, -9999]).buffer), shuffled = new Uint8Array(raw.length);
  for (let lane = 0; lane < 4; lane++) for (let i = 0; i < 4; i++) shuffled[lane * 4 + i] = raw[i * 4 + lane];
  const bytes = deflateSync(shuffled), sha256 = createHash('sha256').update(bytes).digest('hex');
  const product = { sourceOrigin: [0, 0], sourceResolution: [1, -1], sourceGeoKeys: { GeogSemiMajorAxisGeoKey: 3396190, ProjCoordTransGeoKey: 17, ProjStdParallel1GeoKey: 0, ProjCenterLongGeoKey: 0 },
    tiles: [{ file: 'a.deflate', sourceWindow: [0, 0, 2, 2], width: 2, height: 2, nodata: -9999, sha256 },
      { file: 'b.deflate', sourceWindow: [2, 0, 4, 2], width: 2, height: 2, nodata: -9999, sha256 }] };
  const manifest: RegionalPackage = { version: 1, status: 'complete', products: { elevation: product, imagery: product } };
  let requests = 0;
  const fetcher = (async function (this: typeof globalThis) { assert.equal(this,globalThis,'fetch must retain its browser global receiver'); requests++; return new Response(bytes); }) as typeof fetch;
  const store = new RegionalTileStore('https://example.test/tiles', manifest, fetcher, 16);
  assert.equal(requests, 0);
  assert.equal(await store.elevationAt(0, 0), -2520.46826171875);
  assert.equal(await store.elevationAt(0, 0), -2520.46826171875);
  assert.equal(requests, 1);
  assert.equal(await store.elevationAt(90, 0), null);
  assert.equal(requests, 1);
  const degreePerMetre = 180 / Math.PI / 3396190;
  assert.equal(await store.elevationAt(-1.1 * degreePerMetre, 1.1 * degreePerMetre), null);
  await store.elevationAt(0, 3 * degreePerMetre);
  await store.elevationAt(0, 0);
  assert.equal(requests, 3, 'evicted tile is fetched again');
  const broken = structuredClone(manifest); broken.products.elevation.tiles[0].sha256 = 'bad';
  await assert.rejects(new RegionalTileStore('https://example.test', broken, fetcher).elevationAt(0, 0), /integrity/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(store.elevationAt(0, 0, controller.signal), { name: 'AbortError' });
});
