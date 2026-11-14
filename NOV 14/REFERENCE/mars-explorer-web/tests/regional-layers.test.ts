import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analysisPixels, contourPath, coordinateGrid, mapFrame } from '../src/regionalLayers.ts';
import { toGeo } from '../src/terrain.ts';
import type { Terrain } from '../src/terrain.ts';
const plane: Terrain = { meta: { width: 3, height: 3, size: 40, center: { lat: 18.46, lon: 77.42 }, min: -15, max: 25, source: 'test fixture', sourceUrl: '', resolution: 20, bounds: [], projection: 'test local metres' }, values: new Float32Array([-15, 5, 25, -15, 5, 25, -15, 5, 25]) };
test('absolute-height contours on a tilted plane have the correct local positions', () => {
  const lines = contourPath(plane, 20, 1);
  const matches = [...lines.matchAll(/M(-?[\d.]+),(-?[\d.]+)L(-?[\d.]+),(-?[\d.]+)/g)];
  assert.ok(matches.length > 0);
  for (const [, x0, , x1] of matches) { assert.equal(Number(x0), Number(x1)); assert.ok([-5, 15].includes(Number(x0))); }
  assert.throws(() => contourPath(plane, 0));
});
test('slope overlay identifies a 45-degree plane and elevation preserves increasing heights', () => {
  const slope = analysisPixels(plane, 'slope');
  assert.deepEqual([...slope.slice(16, 20)], [225, 101, 76, 255]);
  const colors = analysisPixels(plane, 'elevation');
  assert.ok(colors[0] < colors[4] && colors[4] < colors[8]);
  const missing = { ...plane, values: plane.values.slice() }; missing.values[4] = NaN;
  assert.equal(analysisPixels(missing, 'elevation')[19], 0);
});
test('coordinate lines coincide with their Mars lat/lon labels and stay inside the map', () => {
  for (const center of [{ lat: 18.46, lon: 77.42 }, { lat: -15, lon: -75 }]) {
    const grid = coordinateGrid({ size: 10000, center }, .02);
    assert.ok(grid.longitude.length > 0 && grid.latitude.length > 0);
    for (const line of grid.longitude) { assert.ok(Math.abs(line.x) <= 5000); assert.ok(Math.abs(toGeo({ x: line.x, z: 0 }, center).lon - line.degrees) < 1e-10); }
    for (const line of grid.latitude) { assert.ok(Math.abs(line.z) <= 5000); assert.ok(Math.abs(toGeo({ x: 0, z: line.z }, center).lat - line.degrees) < 1e-10); }
    assert.ok(Math.abs(grid.longitude.find(l => l.degrees === center.lon)!.x) < 1e-8);
    assert.ok(Math.abs(grid.latitude.find(l => l.degrees === center.lat)!.z) < 1e-8);
  }
  assert.throws(() => coordinateGrid({ size: 10000, center: plane.meta.center }, 0));
});
test('fill and fit views retain equal metre scales on both axes across aspect ratios', () => {
  for (const [width, height] of [[1200, 700], [390, 460], [600, 600]]) {
    const fill = mapFrame(10000, width, height, 1, 'fill'), fit = mapFrame(10000, width, height, 1, 'fit');
    assert.ok(Math.abs(fill.width / width - fill.height / height) < 1e-10);
    assert.ok(fill.width <= 10000 + 1e-8 && fill.height <= 10000 + 1e-8);
    assert.ok(fit.width >= 10000 && fit.height >= 10000);
    assert.ok(Math.abs(fit.width / width - fit.height / height) < 1e-10);
    assert.equal(mapFrame(10000, width, height, 2, 'fill').unitsPerPixel, fill.unitsPerPixel / 2);
  }
});
