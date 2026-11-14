import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ORBITAL_LAYERS, decodeOrbitalRaster, orbitalPixels, orbitalSample } from '../src/orbitalLayers.ts';

test('orbital decoder retains raw values, missing coverage and fails closed on corruption', async () => {
  for (const meta of ORBITAL_LAYERS) {
    const file = await readFile(`public${meta.url}`);
    const bytes = file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
    const raster = await decodeOrbitalRaster(meta,bytes);
    let missing=0,valid=0,negative=0;
    for (let i=0;i<raster.values.length;i++) {
      if (Number.isNaN(raster.values[i])) { missing++; assert.equal(raster.rgba[i*4+3],0); }
      else { valid++; assert.equal(raster.rgba[i*4+3],255); if (raster.values[i]<0) negative++; }
    }
    assert.equal(valid,meta.validPixels); assert.ok(missing>0); assert.ok(negative>0);
    const bad = bytes.slice(0); new Uint8Array(bad)[50] ^= 1;
    await assert.rejects(decodeOrbitalRaster(meta,bad),/checksum/);
    await assert.rejects(decodeOrbitalRaster(meta,bytes.slice(0,-4)),/size/);
    const index=raster.values.findIndex(Number.isNaN), row=Math.floor(index/meta.width),col=index%meta.width;
    assert.equal(orbitalSample(raster,{x:-5000+(col+.5)*40,z:-5000+(row+.5)*40}),null);
    assert.equal(orbitalSample(raster,{x:5000,z:0}),null);
    assert.equal(orbitalSample(raster,{x:-5001,z:0}),null);
    const finite=raster.values.findIndex(Number.isFinite),r=Math.floor(finite/meta.width),c=finite%meta.width;
    assert.equal(orbitalSample(raster,{x:-5000+(c+.5)*40,z:-5000+(r+.5)*40}),raster.values[finite]);
  }
});

test('indicator colour stretch clips display only and preserves unavailable pixels', () => {
  const values=new Float32Array([-1,0,.5,1,2,NaN]);
  const colors=orbitalPixels({color:'#c2afe9',displayMin:0,displayMax:1},values);
  assert.deepEqual([...colors.slice(0,4)],[25,31,40,255]);
  assert.deepEqual([...colors.slice(12,16)],[194,175,233,255]);
  assert.deepEqual([...colors.slice(20,24)],[0,0,0,0]);
  assert.equal(values[0],-1); assert.equal(values[4],2);
});
