import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_RULES,checkSegment,planNativeRoute,type HazardGrid} from '../src/nativeRouting.ts';
import {planScienceRoute,APPROACH_RADIUS_METRES} from '../src/scienceRouting.ts';
import {initialMission,makeSnapshot,reviewMission,missionReducer,missionReport} from '../src/evaMission.ts';
function flat():HazardGrid{const width=100,values=new Float32Array(width*width*5);for(let i=4;i<values.length;i+=5)values[i]=-2500;return {width,height:width,size:1000,spacing:10,values};}
function gap(g:HazardGrid,col:number){for(let r=0;r<g.height;r++)g.values.fill(NaN,(r*g.width+col)*5,(r*g.width+col+1)*5);}
const start={x:-350,z:50},end={x:100,z:50};
test('exact routes remain exact; custom destinations never silently become approaches',()=>{
 const g=flat(),direct=planScienceRoute(g,start,end,DEMO_RULES,false,true);assert.ok(direct.route);assert.equal(direct.route.approach,undefined);assert.deepEqual(direct.route.points.at(-1),end);
 gap(g,50);const custom=planScienceRoute(g,start,end,DEMO_RULES,false,false);assert.equal(custom.route,null);assert.equal(custom.diagnosis?.code,'disconnected');
});
test('approach stops before a full missing-data barrier and never draws the final gap',()=>{
 const g=flat();gap(g,50);const result=planScienceRoute(g,start,end,DEMO_RULES,false,true),r=result.route;assert.ok(r?.approach);assert.deepEqual(r.approach.requested,end);assert.deepEqual(r.points.at(-1),r.approach.endpoint);assert.ok(r.approach.gapMetres>0&&r.approach.gapMetres<=APPROACH_RADIUS_METRES);assert.ok(r.points.every(p=>p.x<0));assert.notDeepEqual(r.points.at(-1),end);assert.deepEqual(r.rules,DEMO_RULES);
 for(let i=1;i<r.points.length;i++)assert.ok(checkSegment(g,r.points[i-1],r.points[i],DEMO_RULES).allowed);
});
test('blocked destination gives a measured bound, blocked start prevents fallback, radius remains bounded',()=>{
 const g=flat(),idx=(55*g.width+60)*5;g.values[idx]=g.values[idx+1]=Math.tan(35*Math.PI/180);
 const result=planScienceRoute(g,start,{x:105,z:55},DEMO_RULES,false,true);assert.equal(result.diagnosis?.code,'destination-blocked');assert.match(result.diagnosis!.message,/35\.0°.*28°/);assert.ok(result.route?.approach);
 const bad=flat();bad.values.fill(NaN);assert.equal(planScienceRoute(bad,start,end,DEMO_RULES,false,true).diagnosis?.code,'start-blocked');
 const barrier=flat();gap(barrier,50);assert.equal(planScienceRoute(barrier,start,{x:400,z:50},DEMO_RULES,false,true).route,null);
});
test('approach-only simulation cannot execute or report science at the requested site',()=>{
 const g=flat();gap(g,50);const pending=planScienceRoute(g,start,end,DEMO_RULES,false,true).route!;
 const route={...pending,profileStatus:'verified' as const,profileSamples:100};
 const settings={mode:'rover' as const,speedKmh:5,scienceMinutes:20,budgetMinutes:480,reservePercent:25,target:'Approach to test site',exclusion:false};
 assert.equal(reviewMission(route,settings).ready,false);
 const snapshot=makeSnapshot(route,{...settings,scienceMinutes:0});let state=missionReducer(initialMission(),{type:'start',snapshot});
 state=missionReducer(state,{type:'tick',minutes:snapshot.oneWayMinutes});assert.equal(state.phase,'ready-return');assert.equal(state.scienceCompleted,false);assert.deepEqual(missionReducer(state,{type:'science'}),state);
 state=missionReducer(state,{type:'return'});state=missionReducer(state,{type:'tick',minutes:snapshot.oneWayMinutes});assert.equal(state.phase,'complete');const report=missionReport(state,'');assert.equal(report.outcome,'returned-without-science');assert.equal(report.scienceCompleted,false);assert.deepEqual(report.plan!.route.approach?.requested,end);
});

test('10 m retry finds a valid narrow corridor missed by 20 m without crossing missing cells',()=>{const g=flat();g.values.fill(NaN);const row=50;for(let col=0;col<g.width;col++){const i=(row*g.width+col)*5;g.values.set([0,0,0,0,-2500],i);}const a={x:-350,z:5},b={x:100,z:5};assert.equal(planNativeRoute(g,a,b,DEMO_RULES),null);const result=planScienceRoute(g,a,b,DEMO_RULES,false,false);assert.ok(result.route);assert.equal(result.route.searchSpacingMetres,10);assert.deepEqual(result.route.points.at(-1),b);assert.equal(result.route.approach,undefined);for(let i=1;i<result.route.points.length;i++)assert.equal(checkSegment(g,result.route.points[i-1],result.route.points[i],DEMO_RULES).allowed,true);g.values.fill(NaN,(row*g.width+50)*5,(row*g.width+51)*5);assert.equal(planScienceRoute(g,a,b,DEMO_RULES,false,false).route,null);});
