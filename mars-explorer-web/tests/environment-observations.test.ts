import test from 'node:test';
import assert from 'node:assert/strict';
import { celsius, observationMarkers, THERMAL, MINERALS } from '../src/environmentObservations.ts';
import { toGeo } from '../src/terrain.ts';
import { SCIENCE_SITES } from '../src/scienceSites.ts';

test('thermal subset preserves missing flags, valid measured values and separate historical times', () => {
  const keys = new Set<string>(), hours = new Set<string>();
  assert.ok(THERMAL.observations.length > 0);
  let unknown = 0;
  for (const record of THERMAL.observations) {
    assert.ok(!keys.has(record.id)); keys.add(record.id);
    const hour = `${record.sol}/${record.lmst.slice(0, 2)}`;
    assert.ok(!hours.has(hour)); hours.add(hour);
    assert.ok(record.kelvin > 0 && Number.isFinite(record.kelvin));
    assert.ok(Number.isFinite(record.uncertaintyKelvin) && record.uncertaintyKelvin >= 0);
    assert.equal(record.flags.ROVER_STILL, 1);
    assert.equal(record.flags.ROVER_LOW_TILT, 1);
    assert.equal(record.flags.TIRS_GROUND_FOOTPRINT_NOT_IN_SHADOW, 1);
    assert.notEqual(record.flags.WHEEL_OUTSIDE_TIRS_DOWNWARD_LOOKING_FOV, 0);
    if (Object.values(record.flags).includes(null)) { unknown++; assert.equal(record.quality, 'Review required'); }
    assert.ok(Math.abs(record.sclk - record.positionSclk) <= 2);
    assert.ok(record.sourceLine >= 2);
    assert.ok(THERMAL.sources.some(source => source.file === record.sourceFile));
    const markers = observationMarkers('thermal', record);
    assert.equal(markers.length, 1); // One selected time, no whole-zone interpolation.
    const marker = markers[0];
    assert.ok(Math.abs(marker.point.x) <= 5000 && Math.abs(marker.point.z) <= 5000);
    const geo = toGeo(marker.point);
    assert.ok(Math.abs(geo.lat - record.latitude) < 1e-10);
    assert.ok(Math.abs(geo.lon - record.longitude) < 1e-10);
  }
  assert.ok(unknown > 0, 'Missing source flags must not become a pass');
  assert.ok(Math.abs(celsius(273.15)) < 1e-10);
  assert.ok(Math.abs(celsius(199.62) + 73.53) < 1e-10);
  for (const day of THERMAL.days) assert.equal(THERMAL.observations.filter(record => record.sol === day.sol).length, day.selectedReadings);
});

test('mineral layer uses existing outcrop positions without inventing deposit coverage', () => {
  const markers = observationMarkers('minerals', THERMAL.observations[0]);
  assert.equal(markers.length, MINERALS.length);
  for (const record of MINERALS) {
    const site = SCIENCE_SITES.find(site => site.id === record.siteId)!;
    assert.ok(site);
    const marker = markers.find(marker => marker.id === record.id)!;
    const geo = toGeo(marker.point);
    assert.ok(Math.abs(geo.lat - site.latitude) < 1e-10);
    assert.ok(Math.abs(geo.lon - site.longitude) < 1e-10);
    assert.match(record.positionStatus, /Provisional/);
    assert.match(record.confidence, /not supplied/);
    assert.equal(new URL(record.sourceUrl).hostname, 'www.nasa.gov');
  }
  assert.deepEqual(observationMarkers('none', THERMAL.observations[0]), []);
});
