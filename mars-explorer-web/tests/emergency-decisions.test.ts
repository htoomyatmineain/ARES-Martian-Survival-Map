import test from 'node:test';
import assert from 'node:assert/strict';
import { emergencyAlert, assessEmergency, compareEmergencyRoutes, directionArrows, emergencyActionReducer, initialEmergencyActions, pointOnOutbound, traveledRoute } from '../src/emergency.ts';
import { eligibleTasks } from '../src/emergencyTasks.ts';
import { RESOURCE_DEFAULTS, type EmergencyResourcePlan } from '../src/emergencyResources.ts';
import { DEMO_RULES, type NativeRoute } from '../src/nativeRouting.ts';

const route=():NativeRoute=>({points:[{x:2000,z:1500},{x:1900,z:1500}],distance:1000,ascent:0,maxSlope:2,maxAlongSlope:1,maxCrossSlope:1,warnings:[],minutes:NaN,oxygen:NaN,feasible:false,profileStatus:'verified',profileSamples:1001,rules:{...DEMO_RULES},expanded:2});
const plan=():EmergencyResourcePlan=>({location:{x:2000,z:1500},task:{...eligibleTasks(null,null)[0],minutes:150,partial:{title:'Brief documentation',minutes:30,tasks:['Record notes']}},shortened:false,equipment:'baseline',activity:'walk',assumptions:{...RESOURCE_DEFAULTS}});

test('selected duration, workload, oxygen and EVA budget produce different justified recommendations',()=>{
  assert.equal(assessEmergency(plan(),75,route(),400).recommendation,'continue');
  assert.equal(assessEmergency(plan(),45,route(),400).recommendation,'shorten');
  assert.equal(assessEmergency(plan(),20,route(),400).recommendation,'return');
  assert.equal(assessEmergency(plan(),10,route(),400).recommendation,'contingency');
  assert.equal(assessEmergency(plan(),75,route(),100).recommendation,'return');
  assert.notEqual(assessEmergency({...plan(),task:{...plan().task,workload:3}},75,route(),400).recommendation,'continue');
  const p={...plan(),task:{...plan().task,minutes:30,partial:undefined}};
  assert.equal(assessEmergency(p,28,route(),400).recommendation,'continue');
  assert.equal(assessEmergency({...p,equipment:'heavy'},28,route(),400).recommendation,'return');
});
test('shorten requires a predefined partial and never invents one',()=>{
  const p=plan();assert.equal(assessEmergency(p,45,route(),400).actions.shorten.state,'allowed');
  assert.equal(assessEmergency({...p,task:{...p.task,partial:undefined}},45,route(),400).actions.shorten.state,'blocked');
  assert.equal(assessEmergency({...p,shortened:true},45,route(),400).actions.shorten.state,'blocked');
});
test('critical policy blocks both science actions despite positive arithmetic',()=>{
  const p={...plan(),task:{...plan().task,minutes:1},assumptions:{...RESOURCE_DEFAULTS,reserveMinutes:0}};
  const r={...route(),distance:100};const result=assessEmergency(p,10,r,400);
  assert(result.full.oxygenMargin!>0);assert.equal(result.actions.continue.state,'blocked');assert.equal(result.actions.shorten.state,'blocked');
  assert.equal(result.recommendation,'return');assert.equal(result.severity,'critical');
});
test('unknown EVA, missing/invalid routes and non-finite oxygen never become model-feasible',()=>{
  assert.equal(assessEmergency(plan(),75,route(),null).recommendation,'unknown');
  for(const r of [null,{...route(),profileStatus:'pending' as const},{...route(),maxCrossSlope:50}])assert.equal(assessEmergency(plan(),75,r,400).actions.return.state,'unknown');
  assert.equal(assessEmergency(plan(),NaN,route(),400).recommendation,'unknown');
  const noRoute=assessEmergency(plan(),75,null,400,10,true);assert.equal(noRoute.recommendation,'contingency');
});
test('a task equipment failure blocks science without fabricating failure of walking home',()=>{
  const p={...plan(),task:{...plan().task,equipment:'heavy' as const}};
  const result=assessEmergency(p,75,route(),400);assert.equal(result.actions.continue.state,'blocked');assert.equal(result.actions.return.state,'allowed');
});
test('comparison deduplicates geometry, excludes failed verification and requires higher-risk evidence',()=>{
  const a=route(),b={...route(),points:[a.points[0],{x:1950,z:1520},a.points[1]],maxSlope:25,warnings:[[a.points[0],a.points[1]]]};
  const result=compareEmergencyRoutes(plan(),75,400,[a,route(),b,{...route(),profileStatus:'pending'}]);
  assert.equal(result.candidates.length,2);assert.equal(result.preferred!.route,a);assert.equal(result.alternative!.route,b);
  assert.equal(compareEmergencyRoutes(plan(),75,400,[a,{...b,warnings:[]}]).alternative,null);
  assert.equal(compareEmergencyRoutes(plan(),75,null,[a]).preferred!.assessment.actions.return.state,'unknown');
  assert.equal(compareEmergencyRoutes(plan(),75,400,[{...a,profileStatus:'pending'},a]).candidates.length,1);
});
test('a distinct route that supports the selected mission is preferred over one that only supports return',()=>{
  const long={...route(),distance:6000},short={...route(),points:[{x:2000,z:1500},{x:1950,z:1520},{x:1900,z:1500}]};
  const result=compareEmergencyRoutes(plan(),55,400,[long,short]);
  assert.equal(result.preferred!.route,short);assert.equal(result.preferred!.assessment.recommendation,'continue');
});
test('traveled trail never leads the astronaut; bends and zero/complete progress are exact',()=>{
  const r={...route(),points:[{x:2000,z:1500},{x:2000,z:1600},{x:1900,z:1600}]};
  assert.deepEqual(traveledRoute(r,0),[]);
  assert.deepEqual(traveledRoute(r,NaN),[]);
  for(const f of [.1,.5,.7,.999])assert.deepEqual(traveledRoute(r,f).at(-1),pointOnOutbound(r,f));
  assert.deepEqual(traveledRoute(r,.5),r.points.slice(0,2));assert.deepEqual(traveledRoute(r,1),r.points);
  assert(directionArrows(route().points).every(a=>Math.abs(a.degrees)===180));
});
test('simulated contact has local-only acknowledgements and reset removes all state',()=>{
  const initial=initialEmergencyActions(),next=emergencyActionReducer(initial,{type:'contact'});
  assert.equal(next.contacts,1);assert.match(next.message,/No base connection or acknowledgement/);assert.equal(initial.contacts,0);
  assert.deepEqual(emergencyActionReducer(next,{type:'reset'}),initial);
});
test('simulated return locks a verified route, moves monotonically and finishes at habitat',()=>{
  const r=route(),assessment=assessEmergency(plan(),75,r,400);
  let s=emergencyActionReducer(initialEmergencyActions(),{type:'return',route:r,assessment});assert.equal(s.mode,'returning');
  r.points[1].x=42;assert.equal(s.returnRoute!.points.at(-1)!.x,1900);
  s=emergencyActionReducer(s,{type:'tick',fraction:.5});const previous=s;
  s=emergencyActionReducer(s,{type:'tick',fraction:.2});assert.equal(s.fraction,.5);
  s=emergencyActionReducer(s,{type:'tick',fraction:1});assert.equal(s.mode,'returned');assert.deepEqual(pointOnOutbound(s.returnRoute!,s.fraction),{x:1900,z:1500});
  assert.equal(emergencyActionReducer(previous,{type:'tick',fraction:NaN}),previous);
});
test('blocked actions and mismatched return geometry cannot start simulated return',()=>{
  const r=route(),initial=initialEmergencyActions();
  assert.equal(emergencyActionReducer(initial,{type:'return',route:r,assessment:assessEmergency(plan(),10,r,400)}),initial);
  assert.equal(emergencyActionReducer(initial,{type:'return',route:route(),assessment:assessEmergency(plan(),75,r,400)}),initial);
  const partial=emergencyActionReducer(initial,{type:'shorten',route:r,assessment:assessEmergency(plan(),45,r,400)});assert.equal(partial.shortened,true);
});

test('alert distinguishes critical oxygen from a return EVA time deficit using actual margins',()=>{
 const oxygen=emergencyAlert(assessEmergency(plan(),5,route(),400));assert.equal(oxygen.title,'Low Oxygen');assert.equal(oxygen.severity,'critical');assert(oxygen.evidence.some(e=>e.includes('5.0 %')));
 const time=emergencyAlert(assessEmergency(plan(),90,route(),60));assert.equal(time.title,'EVA Time Exceeded');assert.equal(time.severity,'critical');assert(time.evidence.some(e=>e.includes('60.0 min')));
});
test('missing evidence is not a confirmed route emergency, while completed failed searches are explicit',()=>{
 const unknown=emergencyAlert(assessEmergency(plan(),90,null,null));assert.equal(unknown.title,'Insufficient Data');assert.equal(unknown.severity,'unknown');
 const missingRoute=emergencyAlert(assessEmergency(plan(),90,null,400,10,true),true);assert.equal(missingRoute.title,'No Verified Return Route');assert.equal(missingRoute.severity,'critical');
});
test('a task oxygen shortfall with feasible return is a warning, not a false critical return failure',()=>{
 const result=emergencyAlert(assessEmergency(plan(),20,route(),400));assert.equal(result.title,'Mission Oxygen Margin');assert.equal(result.severity,'warning');
});
