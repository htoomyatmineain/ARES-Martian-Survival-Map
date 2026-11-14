import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { elevation, fromGeo, planRoute, slope, toGeo, type Terrain } from '../src/terrain.ts';
function flat(): Terrain { return { meta: { width: 101, height: 101, size: 10000, center: { lat: 18.46, lon: 77.42 }, min: -2600, max: -2600, source: 'Test fixture only', sourceUrl: '', resolution: 100, bounds: [], projection: 'local' }, values: new Float32Array(10201).fill(-2600) }; }
test('geographic coordinates round trip, with north mapped to negative Z', () => {
  const p = fromGeo(18.4446, 77.4509), g = toGeo(p);
  assert.ok(Math.abs(g.lat - 18.4446) < 1e-10); assert.ok(Math.abs(g.lon - 77.4509) < 1e-10);
  assert.ok(fromGeo(18.5, 77.42).z < 0);
});
test('flat terrain route has metric distance and includes science time in feasibility', () => {
  const r = planRoute(flat(), { x: 0, z: 0 }, { x: 1000, z: 0 });
  assert.ok(r); assert.equal(r.distance, 1000); assert.equal(r.ascent, 0); assert.equal(r.maxSlope, 0); assert.ok(r.feasible);
  const long = planRoute(flat(), { x: -4900, z: -4900 }, { x: 4900, z: 4900 });
  assert.ok(long); assert.equal(long.feasible, false);
});
test('blocked terrain causes detour without crossing the exclusion zone', () => {
  const a = { x: -2000, z: 300 }, b = { x: 2000, z: 300 };
  const direct = planRoute(flat(), a, b), detour = planRoute(flat(), a, b, true, true);
  assert.ok(direct && detour); assert.ok(detour.distance > direct.distance);
  for (const p of detour.points) assert.ok(Math.hypot(p.x - 100, p.z - 300) >= 800);
});
test('untraversable steep terrain reports no route', () => {
  const t = flat(); for (let row = 0; row < 101; row++) for (let col = 51; col < 101; col++) t.values[row * 101 + col] += 3000;
  assert.equal(planRoute(t, { x: -1000, z: 0 }, { x: 1000, z: 0 }), null);
});
test('bilinear elevation and slope use original physical meters', () => {
  const t = flat(); for (let row = 0; row < 101; row++) for (let col = 0; col < 101; col++) t.values[row * 101 + col] = -2600 + col * 10;
  assert.equal(elevation(t, 50, 0), -2095); assert.ok(Math.abs(slope(t, 0, 0) - Math.atan(.1) * 180 / Math.PI) < 1e-8);
});
test('bundled scientific terrain is complete, finite, and geographically plausible', async () => {
  const meta = JSON.parse(await readFile(new URL('../public/data/terrain.json', import.meta.url), 'utf8'));
  const bytes = await readFile(new URL('../public/data/terrain.bin', import.meta.url));
  const values = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.equal(values.length, 501 * 501); assert.ok(values.every(Number.isFinite)); assert.ok(meta.min > -2800 && meta.max < -2000);
  const t = { meta, values }, r = planRoute(t, { x: 1900, z: 1500 }, { x: -1850, z: -1100 });
  assert.ok(r && r.feasible); assert.ok(r.distance > 4000 && r.distance < 6000); assert.ok(r.maxSlope <= 18.01);
});
