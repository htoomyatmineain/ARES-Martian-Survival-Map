import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const read=(name:string)=>JSON.parse(readFileSync(new URL('../../docs/science-catalogues/'+name,import.meta.url),'utf8'));
const existing=JSON.parse(readFileSync(new URL('../src/data/science-sites.json',import.meta.url),'utf8'));

test('science catalogues preserve source IDs, positions and uncertainty without invented sites',()=>{
  const sites=read('sites.json').records;
  assert.deepEqual(sites.map((s:any)=>s.siteId),existing.map((s:any)=>s.id));
  for(const [i,s] of sites.entries()){
    assert.equal(s.coordinates.latitude,existing[i].latitude);
    assert.equal(s.coordinates.longitude,existing[i].longitude);
    assert.equal(s.locationUncertainty.absoluteHorizontalMetres,null);
    assert.ok(Math.abs(s.localMetres.x)<=5000&&Math.abs(s.localMetres.z)<=5000);
    assert.ok(s.sources.every((source:any)=>source.url.startsWith('https://')));
  }
});

test('approach access never authorizes site tasks; templates are proposed and hazards remain unknown',()=>{
  const science=read('science-objectives.json');
  const access=read('access-results.json').records;
  const hazards=read('ground-hazards.json').records;
  for(const row of access){
    assert.equal(row.status,'approach-only');
    assert.ok(row.remainingHorizontalGapMetres>0&&row.remainingHorizontalGapMetres<=250);
    assert.equal(row.siteTaskCompletionAllowed,false);
    assert.equal(row.siteReachedByPlannedRoute,false);
    assert.equal(row.finalLegPlanned,false);
    assert.ok(['prior-recorded-evidence-not-rerun','verified-current-run'].includes(row.profileStatus));
    const mission=science.records.find((m:any)=>m.siteId===row.siteId);
    assert.equal(mission.status,'proposed-human-activity');
    assert.ok(science.templates.some((t:any)=>t.id===mission.taskTemplateId&&t.conditions.requiresExactTarget));
    const hazard=hazards.find((h:any)=>h.siteId===row.siteId);
    assert.deepEqual(hazard.directGroundHazardObservations,[]);
    for(const field of ['soilStrength','traction','looseSand','individualRockObstacles'])assert.equal(hazard[field],null);
  }
});

test('catalogue artifact hashes match validation manifest',()=>{
  for(const file of read('validation.json').outputs){
    const bytes=readFileSync(new URL('../../docs/science-catalogues/'+file.path,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);
  }
});

test('Drive candidates preserve original sample coordinates and never grant science clearance',()=>{
  const source=read('drive-provisional-source.json');
  const candidates=read('drive-candidates.json');
  assert.equal(candidates.records.length,source.samples.length);
  assert.equal(candidates.counts.groups,15);
  assert.equal(candidates.records.length,23);
  for(const row of candidates.records){
    const sample=source.samples.find((s:any)=>s.id===row.candidateId);
    assert.deepEqual(row.coordinates,sample.coordinates);
    assert.ok(Math.abs(row.localMetres.x)<5000&&Math.abs(row.localMetres.z)<5000);
    assert.equal(row.access.siteTaskCompletionAuthorized,false);
    assert.equal(row.access.operationalClearance,false);
    assert.equal(row.proposedMission.status,'proposed-human-activity');
    assert.deepEqual(row.groundHazards.directVerifiedObservations,[]);
    if(row.access.status==='approach-only')assert.ok(row.access.remainingHorizontalGapMetres>0&&row.access.remainingHorizontalGapMetres<=250);
    if(row.access.status==='unreachable')assert.equal(row.access.remainingHorizontalGapMetres,null);
    if(row.access.status==='exactly-reachable')assert.equal(row.access.remainingHorizontalGapMetres,0);
  }
});
