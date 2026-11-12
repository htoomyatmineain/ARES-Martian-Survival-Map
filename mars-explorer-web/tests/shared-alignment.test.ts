import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { imageryPixelToWorld, imageryTriangle } from '../src/imageryProjection.ts';
import { nativePixel } from '../src/regionalTileStore.ts';
import { toGeo, planRoute, type Terrain } from '../src/terrain.ts';
const source=JSON.parse(await readFile(new URL('../source-data/Western-Jezero-10km-HiRISE/download-manifest.json',import.meta.url),'utf8'));
test('orthographic inversion and SVG warping align within half a native imagery pixel',()=>{
  const p=source.products.imagery;let maximum=0;
  for(const tile of p.tiles){
    const [x,y,x1,y1]=tile.sourceWindow,w=x1-x,h=y1-y;
    for(let cy=0;cy<2;cy++)for(let cx=0;cx<2;cx++){
      const a:[number,number]=[cx*w/2,cy*h/2],b:[number,number]=[(cx+1)*w/2,cy*h/2],c:[number,number]=[(cx+1)*w/2,(cy+1)*h/2],d:[number,number]=[cx*w/2,(cy+1)*h/2];
      for(const uv of [[a,b,c],[a,c,d]]){
        const patch=imageryTriangle(p,tile.sourceWindow,uv),m=patch.matrix;
        for(const weights of [[1/3,1/3,1/3],[.6,.2,.2],[.2,.6,.2],[.2,.2,.6]]){
          const u=uv.reduce((sum,v,i)=>sum+v[0]*weights[i],0),v=uv.reduce((sum,t,i)=>sum+t[1]*weights[i],0);
          const exact=imageryPixelToWorld(p,x+u,y+v),approx={x:m[0]*u+m[2]*v+m[4],z:m[1]*u+m[3]*v+m[5]};
          maximum=Math.max(maximum,Math.hypot(exact.x-approx.x,exact.z-approx.z));
        }
      }
    }
    const world=imageryPixelToWorld(p,x+.5,y+.5),geo=toGeo(world),pixel=nativePixel(p,geo.lat,geo.lon,'imagery');
    assert.deepEqual(pixel,{col:x,row:y});
  }
  assert.ok(maximum<.125,`Projection approximation error: ${maximum} metres`);
  console.log(`Maximum tested SVG projection error: ${maximum} m; not absolute geolocation accuracy`);
});
test('routing rejects missing-data destinations and cannot cross a full nodata barrier',()=>{
  const values=new Float32Array(101*101);for(let row=0;row<101;row++)values[row*101+50]=NaN;
  const terrain:Terrain={meta:{width:101,height:101,size:10000,min:0,max:1,center:{lat:18.46,lon:77.42},resolution:100,source:'fixture',sourceUrl:'',bounds:[],projection:'local'},values};
  assert.equal(planRoute(terrain,{x:-1000,z:0},{x:0,z:0},true,false),null);
  assert.equal(planRoute(terrain,{x:-1000,z:0},{x:1000,z:0},true,false),null);
});
