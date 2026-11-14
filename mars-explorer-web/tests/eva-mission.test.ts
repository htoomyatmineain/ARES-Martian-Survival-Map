import test from 'node:test';
import assert from 'node:assert/strict';
import {initialMission,makeSnapshot,missionReducer,missionReport,pointOnMission,returnMinutes,reviewMission,type MissionSettings} from '../src/evaMission.ts';
import {DEMO_RULES,type NativeRoute} from '../src/nativeRouting.ts';

const route=():NativeRoute=>({points:[{x:-3000,z:0},{x:0,z:0},{x:3000,z:0}],distance:6000,ascent:10,maxSlope:10,maxAlongSlope:8,maxCrossSlope:5,warnings:[],minutes:NaN,oxygen:NaN,feasible:false,profileStatus:'verified',profileSamples:6001,rules:{...DEMO_RULES},expanded:3});
const settings:MissionSettings={mode:'rover',speedKmh:5,scienceMinutes:20,budgetMinutes:480,reservePercent:25,target:'Test target',exclusion:false};
const start=(s=settings)=>missionReducer(initialMission(),{type:'start',snapshot:makeSnapshot(route(),s,'2026-11-13T00:00:00Z')});

test('preflight includes the return journey, science time and time reserve; invalid or unverified inputs cannot start',()=>{
 const r=reviewMission(route(),settings);assert.equal(r.ready,true);assert.equal(r.oneWay,72);assert.equal(r.required,164);assert.equal(r.reserve,120);
 assert.equal(reviewMission({...route(),profileStatus:'pending'},settings).ready,false);
 assert.equal(reviewMission(null,settings).ready,false);
 for(const speedKmh of [0,-1,NaN,Number.MAX_VALUE])assert.equal(reviewMission(route(),{...settings,speedKmh}).ready,false);
 assert.equal(reviewMission(route(),{...settings,mode:'walk',speedKmh:2,budgetMinutes:240}).ready,false);
 for(const reservePercent of [-1,100,NaN])assert.equal(reviewMission(route(),{...settings,reservePercent}).ready,false);
 assert.throws(()=>makeSnapshot(route(),{...settings,budgetMinutes:100}),/budget/);
});
test('normal EVA requires outbound arrival, science and a completed return before debrief',()=>{
 let s=start();assert.equal(s.phase,'outbound');s=missionReducer(s,{type:'tick',minutes:500});assert.equal(s.phase,'arrived');assert.equal(s.elapsed,72);assert.equal(s.paused,true);assert.deepEqual(pointOnMission(s),{x:3000,z:0});
 s=missionReducer(s,{type:'science'});assert.equal(s.phase,'science');s=missionReducer(s,{type:'tick',minutes:100});assert.equal(s.phase,'ready-return');assert.equal(s.scienceCompleted,true);assert.equal(s.elapsed,92);
 s=missionReducer(s,{type:'return'});assert.equal(s.phase,'returning');s=missionReducer(s,{type:'tick',minutes:100});assert.equal(s.phase,'complete');assert.equal(s.elapsed,164);assert.equal(returnMinutes(s),0);assert.deepEqual(pointOnMission(s),{x:-3000,z:0});assert.equal(missionReport(s,'Simulated task').outcome,'completed');
});
test('pause freezes the simulation, snapshot isolates future edits, and abort returns from the current position',()=>{
 const input=route();let s=missionReducer(initialMission(),{type:'start',snapshot:makeSnapshot(input,settings)});input.points[0].x=99;
 assert.equal(s.snapshot!.route.points[0].x,-3000);s=missionReducer(s,{type:'tick',minutes:18});assert.deepEqual(pointOnMission(s),{x:-1500,z:0});s=missionReducer(s,{type:'pause'});const frozen=missionReducer(s,{type:'tick',minutes:30});assert.equal(frozen.elapsed,18);assert.deepEqual(pointOnMission(frozen),{x:-1500,z:0});
 s=missionReducer(frozen,{type:'return',abort:true});assert.equal(returnMinutes(s),18);assert.equal(s.paused,false);s=missionReducer(s,{type:'tick',minutes:100});assert.equal(s.phase,'complete');assert.equal(s.elapsed,36);assert.equal(s.scienceCompleted,false);assert.equal(missionReport(s,'early return').outcome,'aborted-returned');
});
test('a delay consumes time without teleporting; automatic return starts at the exact remaining-reserve threshold',()=>{
 let s=start({...settings,scienceMinutes:0,budgetMinutes:200,reservePercent:20});s=missionReducer(s,{type:'tick',minutes:20});const position=pointOnMission(s);s=missionReducer(s,{type:'delay',minutes:100});assert.deepEqual(pointOnMission(s),position);assert.equal(s.phase,'outbound');
 s=missionReducer(s,{type:'tick',minutes:30});assert.equal(s.phase,'returning');assert.equal(s.aborted,true);assert.equal(s.elapsed,130);assert.equal(returnMinutes(s),30);
 s=missionReducer(s,{type:'tick',minutes:100});assert.equal(s.elapsed,160);assert.equal(s.snapshot!.budgetMinutes-s.elapsed,s.snapshot!.reserveMinutes);assert.equal(s.phase,'complete');
});
test('early return does not claim completed science; reset and invalid state actions do not corrupt the mission',()=>{
 let s=initialMission();assert.equal(missionReducer(s,{type:'science'}),s);assert.equal(missionReducer(s,{type:'rate',rate:99}),s);
 s=start();s=missionReducer(s,{type:'tick',minutes:72});s=missionReducer(s,{type:'science'});s=missionReducer(s,{type:'tick',minutes:5});s=missionReducer(s,{type:'return'});assert.equal(s.scienceCompleted,false);s=missionReducer(s,{type:'tick',minutes:100});assert.equal(s.phase,'complete');assert.equal(s.elapsed,149);
 const report=missionReport(s,'simulation only');assert.equal(report.notes,'simulation only');assert.ok(report.limitations.length);assert.ok(report.events.length>=4);assert.deepEqual(missionReducer(s,{type:'reset'}),initialMission());
});

 test('departure confirmations gate launch and survive in the report',()=>{
 const departureChecks=['equipment','comms','return','conditions','access'];
 assert.equal(reviewMission(route(),{...settings,departureChecks:[]}).ready,false);
 assert.throws(()=>makeSnapshot(route(),{...settings,departureChecks:['equipment']}),/confirmations/);
 const state=start({...settings,departureChecks,targetId:'custom'});
 assert.deepEqual(missionReport(state,'').departureChecks,departureChecks);
 assert.equal(missionReport(state,'').procedure?.tasks.length,3);
 });
 test('elapsed science time does not invent task evidence; confirmations can be recorded before return',()=>{
 let s=start({...settings,targetId:'custom'});s=missionReducer(s,{type:'tick',minutes:72});s=missionReducer(s,{type:'science'});s=missionReducer(s,{type:'tick',minutes:20});
 assert.equal(s.phase,'ready-return');assert.equal(s.scienceCompleted,true);
 assert.ok(missionReport(s,'').taskEvidence.every(t=>!t.crewConfirmed&&t.evidenceNote===null));
 s=missionReducer(s,{type:'confirm-task',id:'document',confirmed:true});
 const report=missionReport(s,'Demo photo reference A; facing north.');
 assert.equal(report.taskEvidence[0].crewConfirmed,true);assert.equal(report.taskEvidence[1].crewConfirmed,false);
 assert.match(report.taskEvidence[0].evidenceNote!,/photo reference/);
 });

const withReturn=()=>({...route(),returnRoute:{...route(),points:[{x:3000,z:0},{x:3000,z:2000},{x:-3000,z:2000},{x:-3000,z:0}],distance:10000}});
test('separate return must connect endpoints, pass verification and fit the full budget',()=>{
 assert.equal(reviewMission(route(),{...settings,requireReturn:true}).ready,false);
 const r=withReturn();const checked=reviewMission(r,{...settings,requireReturn:true});
 assert.equal(checked.returnTravel,120);assert.equal(checked.required,212);
 assert.equal(reviewMission({...r,returnRoute:{...r.returnRoute,profileStatus:'pending'}},settings).ready,false);
 assert.equal(reviewMission({...r,returnRoute:{...r.returnRoute,points:[{x:0,z:0},{x:-3000,z:0}]}},settings).ready,false);
 assert.equal(reviewMission(r,{...settings,budgetMinutes:250}).ready,false);
});
test('endpoint return follows its own geometry and duration; early abort retraces only travelled ground',()=>{
 let s=missionReducer(initialMission(),{type:'start',snapshot:makeSnapshot(withReturn(),{...settings,requireReturn:true})});
 s=missionReducer(s,{type:'tick',minutes:72});s=missionReducer(s,{type:'return'});
 assert.equal(returnMinutes(s),120);assert.deepEqual(pointOnMission(s),{x:3000,z:0});
 s=missionReducer(s,{type:'tick',minutes:60});assert.deepEqual(pointOnMission(s),{x:0,z:2000});assert.equal(returnMinutes(s),60);
 s=missionReducer(s,{type:'tick',minutes:60});assert.equal(s.phase,'complete');assert.deepEqual(pointOnMission(s),{x:-3000,z:0});assert.equal(s.elapsed,192);
 let early=missionReducer(initialMission(),{type:'start',snapshot:makeSnapshot(withReturn(),settings)});
 early=missionReducer(early,{type:'tick',minutes:18});const position=pointOnMission(early);
 early=missionReducer(early,{type:'return',abort:true});assert.deepEqual(pointOnMission(early),position);assert.equal(returnMinutes(early),18);
 early=missionReducer(early,{type:'tick',minutes:18});assert.equal(early.phase,'complete');assert.equal(early.elapsed,36);
});
