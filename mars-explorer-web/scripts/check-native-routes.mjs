import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {decodeHazards} from '../src/loadNativeHazards.ts';
import {planNativeRoute,DEMO_RULES,densify,profileMetrics,drapePoints,meshHeight} from '../src/nativeRouting.ts';
import {RegionalTileStore} from '../src/regionalTileStore.ts';
import {toGeo} from '../src/terrain.ts';

const root='source-data/Western-Jezero-Web-Lossless';
const manifest=JSON.parse(await readFile(`${root}/package-manifest.json`,'utf8'));
const fetcher=async url=>new Response(await readFile(`${root}/${new URL(url).pathname.split('/').at(-1)}`));
const store=new RegionalTileStore('https://local.test',manifest,fetcher);
const bytes=await readFile('public/data/routing/native-hazards.bin');
const grid=await decodeHazards(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const meta=JSON.parse(await readFile(`${root}/${manifest.display.terrainMeta}`,'utf8'));
const terrainBytes=await readFile(`${root}/${manifest.display.terrainValues}`);
const terrain={meta,values:new Float32Array(terrainBytes.buffer.slice(terrainBytes.byteOffset,terrainBytes.byteOffset+terrainBytes.byteLength))};
const controls=[],reports=[];
for(const [strategy,weight,blocked] of [['distance',0,false],['slope',4,false],['exclusion',0,true]]){
 const start=performance.now();const route=planNativeRoute(grid,{x:1900,z:1500},{x:-1850,z:-1100},{...DEMO_RULES,slopeWeight:weight},blocked);
 if(!route)throw Error(`No ${strategy} fixture route`);
 const path=densify(route.points,1);const heights=await store.elevationProfile(path.map(p=>toGeo(p,meta.center)));const metrics=profileMetrics(path,heights);
 const rendered=drapePoints(terrain,route.points);let maxGroundingError=0;
 for(let i=1;i<rendered.length;i++){const a=rendered[i-1],b=rendered[i];for(const f of [.25,.5,.75]){const p={x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};const error=Math.abs(meshHeight(terrain,a)*(1-f)+meshHeight(terrain,b)*f-meshHeight(terrain,p));if(!Number.isFinite(error))throw Error('Route crosses unavailable display mesh');maxGroundingError=Math.max(maxGroundingError,error);}}
 reports.push({strategy,...metrics,sourceSamples:path.length,alongBound:route.maxAlongSlope,crossBound:route.maxCrossSlope,groundBound:route.maxSlope,flaggedSegments:route.warnings.length,expandedNodes:route.expanded,elapsedMilliseconds:performance.now()-start,maxDisplayPolylineGroundingErrorMetres:maxGroundingError});
 controls.push({strategy,path,heights,vertices:route.points,alongBound:route.maxAlongSlope,crossBound:route.maxCrossSlope,groundBound:route.maxSlope});
}
await mkdir('scripts/.cache/routing',{recursive:true});await writeFile('scripts/.cache/routing/route-controls.json',JSON.stringify(controls));
await writeFile('../docs/native-route-results.json',JSON.stringify({rules:DEMO_RULES,reports,limits:'Local package test. Browser cloud loading is checked separately. Distances use sampled 1 m bilinear source profiles; limits remain demo choices.'},null,2)+'\n');
console.log(JSON.stringify(reports,null,2));
