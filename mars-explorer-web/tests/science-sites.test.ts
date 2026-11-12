import { test } from 'node:test';
import assert from 'node:assert/strict';
import coverage from '../src/data/science-site-coverage.json' with { type: 'json' };
import { SCIENCE_SITES, sciencePoint, siteSeparationMetres } from '../src/scienceSites.ts';
import { toGeo } from '../src/terrain.ts';
test('science positions preserve reported coordinates and fit the regional zone', () => {
  assert.equal(SCIENCE_SITES.length, 2);
  for (const site of SCIENCE_SITES) {
    const p = sciencePoint(site), geo = toGeo(p);
    assert.ok(Math.abs(p.x) < 5000 && Math.abs(p.z) < 5000);
    assert.ok(Math.abs(geo.lat - site.latitude) < 1e-10);
    assert.ok(Math.abs(geo.lon - site.longitude) < 1e-10);
  }
  const separation = siteSeparationMetres(SCIENCE_SITES[0], SCIENCE_SITES[1]);
  assert.ok(separation > 23.5 && separation < 23.7);
});
test('coverage evidence matches both catalog positions and both native raster layers', () => {
  for (const site of SCIENCE_SITES) {
    const row = coverage.sites.find(row => row.siteId === site.id);
    assert.ok(row);
    assert.equal(row.latitude, site.latitude);
    assert.equal(row.longitude, site.longitude);
    for (const sample of Object.values(row.samples)) {
      assert.equal(sample.inside, true);
      assert.equal(sample.valid, true);
      assert.ok(Number.isFinite(sample.value));
      assert.match(sample.sourceUrl, /^https:\/\/asc-pds-services\.s3\.us-west-2\.amazonaws\.com\//);
    }
    assert.equal(row.samples.elevation.pixelSpacingMetres, 1);
    assert.equal(row.samples.imagery.pixelSpacingMetres, .25);
  }
});
