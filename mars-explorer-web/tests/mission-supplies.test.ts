import test from 'node:test';
import assert from 'node:assert/strict';
import {SUPPLY_DEFAULTS,supplyReadings,validSupplyPlan} from '../src/missionSupplies.ts';
import {initialMission,makeSnapshot,missionReducer,missionReport,supplyRemaining,reviewMission,type MissionSettings} from '../src/evaMission.ts';
import {DEMO_RULES,type NativeRoute} from '../src/nativeRouting.ts';
const route:NativeRoute={points:[{x:0,z:0},{x:6000,z:0}],distance:6000,ascent:0,maxSlope:0,maxAlongSlope:0,maxCrossSlope:0,warnings:[],minutes:NaN,oxygen:NaN,feasible:false,profileStatus:'verified',profileSamples:6001,rules:{...DEMO_RULES},expanded:1};
const plan:MissionSettings={mode:'rover',speedKmh:5,scienceMinutes:20,budgetMinutes:480,reservePercent:25,target:'Test',exclusion:false,supplies:{oxygenMinutes:200,batteryMinutes:200,reserveMinutes:20}};
const start=()=>missionReducer(initialMission(),{type:'start',snapshot:makeSnapshot(route,plan)});
test('endurance analogue uses separate capacities, units and clamps depletion',()=>{
 const r=supplyReadings(SUPPLY_DEFAULTS,60);assert.equal(r[0].remaining,420);assert.equal(r[1].remaining,360);assert.equal(supplyReadings(SUPPLY_DEFAULTS,1000)[0].percent,0);
 assert.equal(validSupplyPlan({...SUPPLY_DEFAULTS,reserveMinutes:500}),false);
 assert.equal(reviewMission(route,{...plan,supplies:{oxygenMinutes:180,batteryMinutes:200,reserveMinutes:20}}).ready,false);
});
test('pause freezes resource use, plan snapshot is isolated and reset clears losses',()=>{
 let s=start();s=missionReducer(s,{type:'tick',minutes:36});s=missionReducer(s,{type:'pause'});const before=supplyRemaining(s);s=missionReducer(s,{type:'tick',minutes:10});assert.deepEqual(supplyRemaining(s),before);
 const snap=makeSnapshot(route,plan);snap.supplies!.oxygenMinutes=1;assert.equal(s.snapshot!.supplies!.oxygenMinutes,200);
 s=missionReducer(s,{type:'reset'});assert.deepEqual(s.supplyLoss,{oxygen:0,battery:0});assert.equal(s.snapshot,null);
});
test('loss triggers return from actual progress; exhaustion blocks motion and resume',()=>{
 let s=missionReducer(start(),{type:'tick',minutes:36});const progress=s.outboundFraction;
 s=missionReducer(s,{type:'supply-loss',supply:'oxygen',minutes:110});assert.equal(s.phase,'returning');assert.equal(s.outboundFraction,progress);
 s=missionReducer(s,{type:'supply-loss',supply:'battery',minutes:400});assert.equal(s.paused,true);assert.equal(supplyRemaining(s)[1].remaining,0);
 const blocked=s;assert.deepEqual(missionReducer(s,{type:'tick',minutes:50}),blocked);assert.deepEqual(missionReducer(s,{type:'resume'}),blocked);assert.equal(s.phase,'returning');
});
test('delay consumes endurance without moving and task confirmations require science',()=>{
 let s=start();s=missionReducer(s,{type:'confirm-task',id:'record',confirmed:true});assert.deepEqual(s.confirmedTasks,[]);
 s=missionReducer(s,{type:'tick',minutes:72});assert.equal(s.phase,'arrived');s=missionReducer(s,{type:'science'});
 s=missionReducer(s,{type:'confirm-task',id:'record',confirmed:true});s=missionReducer(s,{type:'confirm-task',id:'record',confirmed:true});assert.deepEqual(s.confirmedTasks,['record']);
 s=missionReducer(s,{type:'delay',minutes:5});assert.equal(s.outboundFraction,1);assert.equal(supplyRemaining(s)[0].remaining,123);
 const report=missionReport(s,'');assert.deepEqual(report.crewConfirmedTasks,['record']);assert.equal(report.scienceDurationCompleted,false);
});
test('resource reserve limits large ticks at the boundary and preserves feasible return',()=>{
 let s=start();s=missionReducer(s,{type:'tick',minutes:36});s=missionReducer(s,{type:'supply-loss',supply:'battery',minutes:100});
 s=missionReducer(s,{type:'tick',minutes:1000});assert.equal(s.phase,'returning');assert.equal(s.elapsed,40);assert.equal(s.outboundFraction,40/72);
 s=missionReducer(s,{type:'tick',minutes:1000});assert.equal(s.phase,'complete');assert.equal(s.elapsed,80);assert.equal(supplyRemaining(s)[1].remaining,20);
});
