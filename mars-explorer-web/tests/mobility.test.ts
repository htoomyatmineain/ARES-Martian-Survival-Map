import {test} from 'node:test';import assert from 'node:assert/strict';
import {mobilityPlan,mobilityRules} from '../src/mobility.ts';import {DEMO_RULES} from '../src/nativeRouting.ts';import {estimateTravel} from '../src/travelTime.ts';
test('baseline preserves rules, heavy and light use explicit assumption multipliers',()=>{assert.deepEqual(mobilityRules(DEMO_RULES,mobilityPlan('baseline','walk',2,DEMO_RULES)),DEMO_RULES);const light=mobilityPlan('light','walk',2,DEMO_RULES),heavy=mobilityPlan('heavy','walk',2,DEMO_RULES);assert.equal(light.effectiveWalkingKmh,1.8);assert.equal(heavy.effectiveWalkingKmh,1.5);assert.ok(Math.abs(light.effectiveSlopeLimitsDeg.alongTrack-16.2)<1e-10);assert.ok(Math.abs(heavy.effectiveSlopeLimitsDeg.crossTrack-9.6)<1e-10);assert.equal(mobilityPlan('heavy','rover',2,DEMO_RULES).slopeMultiplier,1);});
test('load increases walking duration and can exceed usable budget',()=>{for(const [preset,expected] of [['baseline',140],['light',153.333333333],['heavy',180]] as const){const plan=mobilityPlan(preset,'walk',2,DEMO_RULES);assert.ok(Math.abs(estimateTravel(2000,plan.effectiveWalkingKmh)!.minutes*2+20-expected)<1e-6);}assert.equal(estimateTravel(5000,1.5)!.minutes*2+20,420);});

import {reviewMission} from '../src/evaMission.ts';import {planNativeRoute,type HazardGrid,type NativeRoute} from '../src/nativeRouting.ts';
test('tighter load rules reject a hillside allowed at baseline and stale profiles cannot depart',()=>{
 const slope=Math.tan(16*Math.PI/180),values=new Float32Array(20*20*5);for(let i=0;i<values.length;i+=5){values[i]=slope;values[i+1]=slope;values[i+2]=0;values[i+3]=0;}
 const grid:HazardGrid={width:20,height:20,spacing:10,size:200,values},heavy=mobilityPlan('heavy','walk',2,DEMO_RULES);
 assert.ok(planNativeRoute(grid,{x:-70,z:0},{x:70,z:0},DEMO_RULES));assert.equal(planNativeRoute(grid,{x:-70,z:0},{x:70,z:0},mobilityRules(DEMO_RULES,heavy)),null);
 const route={distance:2000,profileStatus:'verified',rules:DEMO_RULES,maxAlongSlope:1,maxCrossSlope:1,maxSlope:1} as NativeRoute;
 assert.equal(reviewMission(route,{mode:'walk',speedKmh:1.5,scienceMinutes:20,budgetMinutes:480,reservePercent:25,target:'test',exclusion:false,load:heavy}).ready,false);
});
