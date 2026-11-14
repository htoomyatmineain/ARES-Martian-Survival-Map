import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sceneToGeo, geoToMap, mapToGeo, appendTrack, isOnMap, CRATER_MAP } from '../src/mapCoordinates.ts';
import { playerGeo, type Ground } from '../src/cinematicGround.ts';

const ground = JSON.parse(readFileSync(new URL('../public/assets/mars/ground.json', import.meta.url), 'utf8')) as Ground;
const site = JSON.parse(readFileSync(new URL('../public/assets/mars/field-site.json', import.meta.url), 'utf8'));

test('2D position uses the same Mars transform as the untouched 3D explorer', () => {
  for (const [x,z] of [[0,200],[0,-142],[250,-250],[-200,300]]) {
    const actual = sceneToGeo(site,x,z), expected = playerGeo(ground,x,z);
    assert.ok(Math.abs(actual.lat-expected.lat)<1e-12);
    assert.ok(Math.abs(actual.lon-expected.lon)<1e-12);
  }
});

test('north-up local map aligns markers with the rotated HiRISE raster', () => {
  const angle = site.heading*Math.PI/180;
  for (const [x,z] of [[-512,-512],[512,512],[0,200],[0,-142]]) {
    const p=geoToMap(sceneToGeo(site,x,z),site.center,1500);
    assert.ok(Math.abs(p.x-(500+(x*Math.cos(angle)-z*Math.sin(angle))/1500*1000))<1e-8);
    assert.ok(Math.abs(p.y-(500+(x*Math.sin(angle)+z*Math.cos(angle))/1500*1000))<1e-8);
  }
});

test('whole-crater projection preserves center, north orientation, and site coverage', () => {
  assert.deepEqual(geoToMap(CRATER_MAP.center,CRATER_MAP.center,55000),{x:500,y:500});
  assert.ok(geoToMap({lat:18.48,lon:77.58},CRATER_MAP.center,55000).y<500);
  assert.ok(isOnMap(geoToMap(site.center,CRATER_MAP.center,55000)));
  assert.equal(isOnMap({x:-5,y:400}),false);
  assert.equal(isOnMap({x:NaN,y:400}),false);
});

test('map inspection round trips across the full crater and local imagery',()=>{
  for(const span of [1500,55000])for(const point of [{x:0,y:0},{x:1000,y:1000},{x:320,y:650}]){
    const restored=geoToMap(mapToGeo(point,site.center,span),site.center,span);
    assert.ok(Math.abs(restored.x-point.x)<1e-8);
    assert.ok(Math.abs(restored.y-point.y)<1e-8);
  }
});

test('live track ignores stationary heading reports and retains actual movement',()=>{
  const start=[{x:0,z:200}];
  assert.equal(appendTrack(start,{x:0,z:200}),start);
  const moved=appendTrack(start,{x:3,z:195});
  assert.deepEqual(moved,[{x:0,z:200},{x:3,z:195}]);
  const full=Array.from({length:2000},(_,i)=>({x:i,z:0}));
  const bounded=appendTrack(full,{x:2001,z:0});
  assert.equal(bounded.length,2000);
  assert.deepEqual(bounded[1999],{x:2001,z:0});
});
