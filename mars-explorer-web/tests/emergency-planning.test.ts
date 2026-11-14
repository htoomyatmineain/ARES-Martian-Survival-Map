import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibleTasks } from '../src/emergencyTasks.ts';
import { calculateResources, remainingEva, RESOURCE_DEFAULTS, resourceRules, type EmergencyResourcePlan } from '../src/emergencyResources.ts';
import { initialMission, type MissionSnapshot } from '../src/evaMission.ts';
import { DEMO_RULES, type NativeRoute } from '../src/nativeRouting.ts';
import type { GeologyData } from '../src/geology.ts';
import { ORBITAL_LAYERS, type OrbitalRaster } from '../src/orbitalLayers.ts';
import { SCIENCE_SITES, sciencePoint } from '../src/scienceSites.ts';

const geology:GeologyData={version:1,coordinateSpace:'local-mars-metres',size:10000,title:'Fixture',sourceUrl:'https://pubs.usgs.gov/sim/3464/',scale:75000,notice:'100–200 m uncertainty',
  units:[{id:'fan',code:'fan',name:'Jezero fan 2 unit',description:'Context',color:'#ffffff',label:[0,0],areaSquareMetres:4000000}],
  features:[{id:'f',sourceFeatureId:1,unitId:'fan',geometry:{type:'Polygon',coordinates:[[[-1000,-1000],[1000,-1000],[1000,1000],[-1000,1000],[-1000,-1000]]]}}],contacts:[]};
const plan=():EmergencyResourcePlan=>({location:{x:2000,z:1500},task:eligibleTasks(null,null)[0],shortened:false,equipment:'baseline',activity:'walk',assumptions:{...RESOURCE_DEFAULTS}});
const route=():NativeRoute=>({points:[{x:2000,z:1500},{x:1900,z:1500}],distance:1000,ascent:0,maxSlope:2,maxAlongSlope:1,maxCrossSlope:1,warnings:[],minutes:NaN,oxygen:NaN,feasible:false,profileStatus:'verified',profileSamples:1001,rules:{...DEMO_RULES},expanded:2});
test('multiple tasks have full descriptions, estimates, kit requirements and traceable context',()=>{
  const tasks=eligibleTasks({x:0,z:0},geology);assert(tasks.length>=2);
  assert(tasks.some(t=>t.id==='layer-study'));
  for(const t of tasks){assert(t.description&&t.objective&&t.tasks.length&&t.minutes>0&&t.sources.length);assert(t.evidence.some(e=>e.includes('100–200')));}
});
test('contact uncertainty, absent coverage and invalid coordinates use simulated fallback',()=>{
  for(const point of [null,{x:900,z:0},{x:5001,z:0},{x:NaN,z:0}])assert.equal(eligibleTasks(point,geology)[0].provenance,'Simulated');
  assert.equal(eligibleTasks({x:0,z:0},null)[0].id,'generic');
});
test('CRISM valid pixels alone do not create mineral missions; missing pixels are not detections',()=>{
  const raster:OrbitalRaster={meta:ORBITAL_LAYERS[0],values:new Float32Array(62500).fill(.1),rgba:new Uint8ClampedArray(250000)};
  assert.equal(eligibleTasks({x:0,z:0},null,[raster])[0].id,'generic');
  const tasks=eligibleTasks({x:0,z:0},geology,[raster]);assert(tasks[0].evidence.some(e=>e.includes('no mineral detection')));
  raster.values.fill(NaN);assert(!eligibleTasks({x:0,z:0},geology,[raster])[0].sources.some(s=>s.label.includes('CRISM')));
});
test('reported primary science sites supply proximity context, not exact rock claims',()=>{
  const tasks=eligibleTasks(sciencePoint(SCIENCE_SITES[0]),null);assert(tasks.length>=2);
  assert(tasks[0].sources.some(s=>s.url===SCIENCE_SITES[0].reportUrl));assert(tasks[0].evidence.some(e=>e.includes('does not prove exact')));
});
test('oxygen slider values map to independent arrival budgets including zero',()=>{
  for(const oxygen of [0,30,60,77,100])assert.equal(calculateResources(plan(),oxygen,route(),200).available,oxygen);
  assert.equal(calculateResources(plan(),-1,route(),200).available,null);
});
test('task, return and reserve are counted once; outbound is absent',()=>{
  const result=calculateResources(plan(),75,route(),200);
  assert(Math.abs(result.taskCost!-100*10/480)<1e-9);
  assert(Math.abs(result.returnCost!-100*30/480)<1e-9);
  assert.equal(result.reserveCost,12.5);assert(Math.abs(result.oxygenMargin!-(75-100*100/480))<1e-9);
  assert.equal(result.evaMargin,100);
});
test('equipment reuses mobility and can increase cost while tightening slope limits',()=>{
  const none=calculateResources(plan(),75,route(),200);
  const light=calculateResources({...plan(),equipment:'light'},75,route(),200);
  const heavy=calculateResources({...plan(),equipment:'heavy'},75,route(),200);
  assert(heavy.returnMinutes!>light.returnMinutes!&&light.returnMinutes!>none.returnMinutes!);
  assert(heavy.returnCost!>light.returnCost!&&light.returnCost!>none.returnCost!);
  assert(resourceRules({...plan(),equipment:'heavy'}).crossLimit<DEMO_RULES.crossLimit);
  assert.equal(calculateResources({...plan(),activity:'run'},75,route(),200).returnCost,null);
});
test('only predefined partial tasks shorten duration and consumption',()=>{
  const task=eligibleTasks({x:0,z:0},geology)[0],p={...plan(),task,equipment:'light' as const};
  const full=calculateResources(p,75,route(),200),short=calculateResources({...p,shortened:true},75,route(),200);
  assert.equal(short.taskMinutes,task.partial!.minutes);assert(short.taskCost!<full.taskCost!);
  assert.equal(calculateResources({...plan(),shortened:true},75,route(),200).taskCost,null);
});
test('workload assumptions change costs; unsupported equipment and malformed assumptions block',()=>{
  const p=plan(),normal=calculateResources(p,75,route(),200);
  const higher=calculateResources({...p,assumptions:{...p.assumptions,taskRate:2,walkRate:2}},75,route(),200);
  assert.equal(higher.taskCost,normal.taskCost!*2);assert.equal(higher.returnCost,normal.returnCost!*2);
  const task=eligibleTasks({x:0,z:0},geology).find(t=>t.equipment==='heavy')!;
  assert(calculateResources({...p,task},75,route(),200).errors.length);
  assert.equal(calculateResources({...p,assumptions:{...p.assumptions,referenceMinutes:0}},75,route(),200).available,null);
});
test('Mission EVA uses budget minus elapsed without mutating state or adding science twice',()=>{
  const state=initialMission();assert.equal(remainingEva(state),null);
  state.snapshot={budgetMinutes:480,scienceMinutes:50} as MissionSnapshot;state.elapsed=70;
  const before=structuredClone(state);assert.equal(remainingEva(state),410);assert.deepEqual(state,before);
  const result=calculateResources(plan(),75,route(),remainingEva(state));assert.equal(result.evaMargin,310);
  assert.equal(calculateResources(plan(),75,route(),null).evaMargin,null);
});
test('missing/unverified/incorrect endpoints and load-incompatible routes fail closed',()=>{
  for(const r of [null,{...route(),profileStatus:'pending' as const},{...route(),points:[{x:1900,z:1500},{x:2000,z:1500}]},{...route(),maxCrossSlope:50}]){
    const result=calculateResources(plan(),75,r,null);assert.equal(result.returnCost,null);assert.equal(result.oxygenMargin,null);
  }
});
