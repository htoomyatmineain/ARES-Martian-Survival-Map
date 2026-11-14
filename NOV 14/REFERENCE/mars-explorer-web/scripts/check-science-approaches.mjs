import {readFile,writeFile} from 'node:fs/promises';
import {decodeHazards} from '../src/loadNativeHazards.ts';
import {DEMO_RULES,checkSegment,densify,profileMetrics} from '../src/nativeRouting.ts';
import {planScienceRoute,APPROACH_RADIUS_METRES} from '../src/scienceRouting.ts';
import {RegionalTileStore} from '../src/regionalTileStore.ts';
import {fromGeo,toGeo} from '../src/terrain.ts';
const root='source-data/Western-Jezero-Web-Lossless',manifest=JSON.parse(await readFile(root+'/package-manifest.json','utf8'));
const store=new RegionalTileStore('https://local.test',manifest,async url=>new Response(await readFile(root+'/'+new URL(url).pathname.split('/').at(-1))));
const bytes=await readFile('public/data/routing/native-hazards.bin'),grid=await decodeHazards(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const sites=JSON.parse(await readFile('src/data/science-sites.json','utf8')),reports=[];
for(const site of sites){
 const requested=fromGeo(site.latitude,site.longitude),result=planScienceRoute(grid,{x:1900,z:1500},requested,DEMO_RULES,false,true),r=result.route;
 if(!r?.approach)throw Error('Expected documented approach fixture for '+site.name);
 if(r.approach.gapMetres>APPROACH_RADIUS_METRES||JSON.stringify(r.points.at(-1))!==JSON.stringify(r.approach.endpoint))throw Error('Invalid approach endpoint');
 for(let i=1;i<r.points.length;i++)if(!checkSegment(grid,r.points[i-1],r.points[i],DEMO_RULES,false).allowed)throw Error('Route edge failed unchanged limits');
 const path=densify(r.points,1),heights=await store.elevationProfile(path.map(p=>toGeo(p))),metrics=profileMetrics(path,heights);
 reports.push({site:site.name,diagnosis:result.diagnosis,requested,approach:r.approach,approachCoordinates:toGeo(r.approach.endpoint),...metrics,profileSamples:path.length,alongBound:r.maxAlongSlope,crossBound:r.maxCrossSlope,groundBound:r.maxSlope,edges:r.points.length-1,allEdgesPass:true,scienceSiteReached:false,finalLegPlanned:false});
}
await writeFile('../docs/science-approach-results.json',JSON.stringify({rules:DEMO_RULES,searchRadiusMetres:APPROACH_RADIUS_METRES,selection:'Lowest graph objective to a reachable search node inside the radius; not the geographically nearest point.',reports,limits:'Native 1 m profile checked to the approach endpoint only. Gap is straight-line horizontal separation, not walking distance. No final-leg or astronaut-safety claim.'},null,2)+'\n');
console.log(JSON.stringify(reports,null,2));
