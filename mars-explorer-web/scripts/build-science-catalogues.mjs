// Read-only use of existing site, coordinate, routing and elevation algorithms.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {decodeHazards} from '../src/loadNativeHazards.ts';
import {DEMO_RULES, checkSegment, densify, profileMetrics} from '../src/nativeRouting.ts';
import {planScienceRoute, APPROACH_RADIUS_METRES} from '../src/scienceRouting.ts';
import {RegionalTileStore} from '../src/regionalTileStore.ts';
import {fromGeo, toGeo} from '../src/terrain.ts';

const out='../docs/science-catalogues';
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const sites=await read('src/data/science-sites.json');
const prior=await read('../docs/science-approach-results.json');
const registration=await read('../docs/science-registration-results.json');
const meta=await read('src/data/routing-catalog.json');
const root='source-data/Western-Jezero-Web-Lossless';
const manifest=await read(root+'/package-manifest.json');
const store=new RegionalTileStore('https://local.test',manifest,async url=>new Response(await readFile(root+'/'+new URL(url).pathname.split('/').at(-1))));
const bytes=await readFile('public/data/routing/native-hazards.bin');
assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.compressedSha256);
const grid=await decodeHazards(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const start={x:1900,z:1500};
const siteRows=[],access=[],hazards=[],objectives=[];
const template={id:'outcrop-comparison-v1',status:'proposed-human-activity',tools:['Camera','Field notebook'],tasks:[
  {id:'context-photos',action:'Document outcrop context and visible layers in proposed photographs.'},
  {id:'field-description',action:'Describe visible texture and layering; record uncertainty and compare with the other outcrop.'},
  {id:'sample-proposal',action:'Record a proposed sample location and scientific rationale; do not claim sample collection or confirmed composition.'}
],conditions:{requiresExactTarget:true,requiresSciencePhase:true,approachOnlyCompletionAllowed:false},durationMinutes:null,equipmentMassKg:null,limitations:'Illustrative tools and activities, not NASA-approved SOP. Parent mission owns durations, supplies and task state. No measurements or successful outcomes are supplied.'};
assert.equal(new Set(sites.map(s=>s.id)).size,sites.length);
for(const site of sites){
  const requested=fromGeo(site.latitude,site.longitude);
  assert.ok(Math.abs(requested.x)<=5000&&Math.abs(requested.z)<=5000,'Site outside zone');
  const reg=registration.sites.find(s=>s.siteId===site.id); assert.ok(reg);
  siteRows.push({siteId:site.id,name:site.name,siteType:'historical-rover-sampling-outcrop',sampleName:site.sample,sampleDesignation:site.designation,coordinates:{latitude:site.latitude,longitude:site.longitude,pdsElevationMetres:site.pdsElevationMetres},localMetres:requested,insideZone:true,sources:[{url:site.nasaUrl,role:'NASA historical outcrop context'},{url:site.reportUrl,role:'NASA PDS coordinates and context',coordinatePdfPage:site.coordinateReportPage,contextPdfPage:site.reportPage}],locationUncertainty:{absoluteHorizontalMetres:null,relativeReportTargetAgreementMetres:reg.markerVsReportTargetMetres,interpretation:'Relative agreement in shared imagery; not independent absolute survey accuracy.',latitudeConvention:'Existing application interpretation; source convention not independently verified.',verticalDatum:site.verticalDatumStatus}});
  objectives.push({missionId:site.id+'-proposed-survey',siteId:site.id,status:'proposed-human-activity',title:site.name+' outcrop comparison',question:'What visible layering and texture differences between these neighbouring delta outcrops merit further investigation?',purpose:'Document visible sedimentary features and formulate follow-up observations about deposition. No mineral or life detection is inferred from appearance.',taskTemplateId:template.id,observedHistory:'NASA describes these as Perseverance sampling outcrops in an ancient river delta.',sourceUrls:[site.nasaUrl],siteScienceCurrentlyAvailable:false});
  const result=planScienceRoute(grid,start,requested,DEMO_RULES,false,true);
  const route=result.route;
  let profile=null;
  let profileStatus='not-available';
  if(route){
    for(let i=1;i<route.points.length;i++) assert.ok(checkSegment(grid,route.points[i-1],route.points[i],DEMO_RULES,false).allowed);
    const path=densify(route.points,1);
    try {
      profile=profileMetrics(path,await store.elevationProfile(path.map(p=>toGeo(p))));
      profileStatus='verified-current-run';
    } catch(error) {
      if(error.code!=='ENOENT')throw error;
      const previous=prior.reports.find(r=>r.site===site.name);
      assert.deepEqual(prior.rules,DEMO_RULES);
      assert.deepEqual(previous?.requested,requested);
      assert.deepEqual(previous?.approach,route.approach);
      assert.equal(previous.edges,route.points.length-1);
      assert.equal(previous.profileSamples,path.length);
      assert.equal(previous.alongBound,route.maxAlongSlope);
      assert.equal(previous.crossBound,route.maxCrossSlope);
      assert.equal(previous.groundBound,route.maxSlope);
      profile={distance:previous.distance,ascent:previous.ascent};
      profileStatus='prior-recorded-evidence-not-rerun';
    }
    assert.ok(Number.isFinite(profile.distance)&&profile.distance>0);
    if(route.approach)assert.ok(route.approach.gapMetres<=APPROACH_RADIUS_METRES);
  }
  const status=!route?'unreachable':route.approach?'approach-only':'exactly-reachable';
  access.push({siteId:site.id,status,reason:result.diagnosis?.message??'Exact target route passes current demo checks.',diagnosisCode:result.diagnosis?.code??null,startLocalMetres:start,rules:DEMO_RULES,strategy:'slope-priority',simulatedExclusion:false,approachSearchRadiusMetres:APPROACH_RADIUS_METRES,endpointLocalMetres:route?.points.at(-1)??null,endpointCoordinates:route?toGeo(route.points.at(-1)):null,remainingHorizontalGapMetres:route?route.approach?.gapMetres??0:null,finalLegPlanned:!!route&&!route.approach,siteReachedByPlannedRoute:!!route&&!route.approach,siteTaskCompletionAllowed:!!route&&!route.approach,profileStatus,profileEvidence:profileStatus==='prior-recorded-evidence-not-rerun'?'docs/science-approach-results.json':null,profileMetrics:profile,routePoints:route?.points??[],limitations:'Scenario-specific routing result, not astronaut access certification. Unreachable means no route under these rules. Gap is horizontal separation, not a traversable distance or timed final leg.'});
  const ground=checkSegment(grid,requested,requested,{...DEMO_RULES,alongLimit:89.999,crossLimit:89.999},false);
  hazards.push({id:site.id+'-ground-assessment',siteId:site.id,evidenceType:'dem-derived-ground-slope-bound',sourceUrl:meta.sourceUrl,sourceCatalogue:'mars-explorer-web/src/data/routing-catalog.json',groundSlopeBoundDegrees:Number.isFinite(ground.total)?ground.total:null,passesConfiguredGroundCheck:ground.allowed,reason:ground.reason??null,scope:'Containing conservative DEM cell, not an individual rock or soil measurement',directGroundHazardObservations:[],availability:'No independently sourced site-specific rock, loose-sand, traction or soil-strength observations verified in this deliverable.',soilStrength:null,traction:null,looseSand:null,individualRockObstacles:null,limitations:'Unknown is not safe. Geological colours do not establish soil strength. DEM slope is derived evidence, not a direct surface hazard observation.'});
}
const envelope=records=>({schemaVersion:1,records});
await mkdir(out,{recursive:true});
const files={
 'sites.json':{schemaVersion:1,zone:{centerLatitude:18.46,centerLongitude:77.42,widthMetres:10000,heightMetres:10000,localX:'east',localZ:'south',marsRadiusMetres:3396190},scope:'Existing two verified catalogue sites only; not an exhaustive zone inventory.',records:siteRows},
 'science-objectives.json':{schemaVersion:1,templates:[template],records:objectives},
 'access-results.json':envelope(access),
 'ground-hazards.json':envelope(hazards)
};
for(const [name,data] of Object.entries(files))await writeFile(out+'/'+name,JSON.stringify(data,null,2)+'\n');
const inputs=['src/data/science-sites.json','src/data/routing-catalog.json','public/data/routing/native-hazards.bin','../docs/science-registration-results.json','../docs/science-approach-results.json','src/scienceRouting.ts','src/nativeRouting.ts','src/terrain.ts'];
const validation={schemaVersion:1,result:'PASS',baseCommit:'e62f499',checks:['Exact existing IDs and coordinates retained','All sites inside 10 km local frame','Registration evidence linked; absolute uncertainty remains unknown','Hazard binary SHA-256 matches existing catalogue','Existing routing called without changed rules','Every accepted edge passes existing checks','Dense profile evidence status explicitly recorded; missing local tiles use matching prior report, not a fresh verification','Approach gap stays within existing radius','No approach route permits site-task completion'],counts:{sites:sites.length,exactlyReachable:access.filter(r=>r.status==='exactly-reachable').length,approachOnly:access.filter(r=>r.status==='approach-only').length,unreachable:access.filter(r=>r.status==='unreachable').length,directHazardObservations:0},inputs:await Promise.all(inputs.map(async path=>({path,sha256:await hash(path)}))),outputs:await Promise.all(Object.keys(files).map(async path=>({path,sha256:await hash(out+'/'+path)}))),limitations:['No independent absolute geolocation validation or vertical datum resolution','No direct site-specific soil/rock hazard observations verified','Results apply only to recorded start, strategy, exclusion and rules; recalculate after plan changes','Native elevation tiles absent locally: profile metrics retained from matching prior evidence when marked, not revalidated','No UI, supplies or emergency simulation integration performed']};
await writeFile(out+'/validation.json',JSON.stringify(validation,null,2)+'\n');
console.log(JSON.stringify(validation.counts));
