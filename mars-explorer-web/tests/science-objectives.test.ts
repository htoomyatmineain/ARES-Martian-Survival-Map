import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP_SCIENCE_SITES} from '../src/scienceSites.ts';
import {missionProcedure} from '../src/missionProcedure.ts';
import objectives from '../src/data/science-objectives.json' with {type:'json'};
test('all 16 mapped science targets have an explicit objective and source-backed procedure',()=>{
 assert.equal(objectives.length,16);assert.equal(new Set(objectives.map(row=>row.siteId)).size,16);
 const titles=new Set<string>(),goals=new Set<string>();
 for(const site of MAP_SCIENCE_SITES){const p=missionProcedure(site.id);titles.add(p.title);goals.add(p.objective);assert.equal(p.sources.length,2);assert.deepEqual(p.tasks.map(t=>t.id),['document','observe','record']);assert.equal(p.tasks.length,3);assert.ok(p.sources.some(s=>s.url.startsWith(site.reportUrl)));for(const source of p.sources)assert.match(source.url,/^https:\/\/(www\.nasa\.gov|www\.jpl\.nasa\.gov|science\.nasa\.gov|pds-geosciences\.wustl\.edu)\//);}
 assert.equal(titles.size,16);assert.equal(goals.size,16);
});
test('sample-specific science is not confused with life detection or custom targets',()=>{
 assert.match(missionProcedure('M2020-164-2').historicalContext,/atmosphere/);
 assert.match(missionProcedure('wildcat-ridge-hazeltop').historicalContext,/do not establish life/);
 assert.match(missionProcedure('M2020-749-22').historicalContext,/river-transported/);
 assert.match(missionProcedure('M2020-949-26').historicalContext,/silica/);
 const custom=missionProcedure('custom');assert.equal(custom.sources.length,0);assert.match(custom.historicalContext,/No historical sample/);
});
