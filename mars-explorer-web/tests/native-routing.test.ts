import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEMO_RULES,checkSegment,planNativeRoute,directionalBounds,profileMetrics,densify,meshHeight,drapePoints,type HazardGrid} from '../src/nativeRouting.ts';
import {decodeHazards} from '../src/loadNativeHazards.ts';
import type {Terrain} from '../src/terrain.ts';

function flat(n=20,spacing=10):HazardGrid{const values=new Float32Array(n*n*5);for(let i=4;i<values.length;i+=5)values[i]=-2500;return {width:n,height:n,spacing,size:n*spacing,values};}
test('known planes give directional slope; travel perpendicular to a hillside still sees sideways slope',()=>{
 const angle=15,s=Math.tan(angle*Math.PI/180),b=[s,s,0,0];
 assert.ok(Math.abs(directionalBounds(b,1,0).along-angle)<1e-10);
 assert.ok(Math.abs(directionalBounds(b,0,1).cross-angle)<1e-10);
 const g=flat();for(let i=0;i<g.values.length;i+=5){g.values[i]=s;g.values[i+1]=s;}
 assert.equal(checkSegment(g,{x:0,z:-50},{x:0,z:50},DEMO_RULES).allowed,false);
 assert.equal(checkSegment(g,{x:-50,z:0},{x:50,z:0},DEMO_RULES).allowed,true);
});
test('narrow steep obstacle between equal-height endpoints cannot be crossed',()=>{
 const g=flat();for(let r=0;r<g.height;r++){const i=(r*g.width+10)*5;g.values[i]=-1;g.values[i+1]=1;}
 assert.equal(checkSegment(g,{x:-70,z:0},{x:70,z:0},DEMO_RULES).allowed,false);
 assert.equal(planNativeRoute(g,{x:-70,z:0},{x:70,z:0}),null);
});
test('entire missing strip and diagonal corner touches block edges, including exact endpoint connectors',()=>{
 const g=flat();for(let r=0;r<g.height;r++)g.values.fill(NaN,(r*g.width+10)*5,(r*g.width+11)*5);
 assert.equal(planNativeRoute(g,{x:-71,z:-3},{x:71,z:4}),null);
 assert.equal(checkSegment(g,{x:-5,z:-5},{x:5,z:5},DEMO_RULES).allowed,false);
 assert.equal(checkSegment(g,{x:0,z:-80},{x:0,z:80},DEMO_RULES).allowed,false);
 assert.equal(planNativeRoute(g,{x:1,z:1},{x:1,z:1}),null);
 assert.equal(planNativeRoute(g,{x:-101,z:0},{x:-40,z:0}),null);
});
test('exact endpoints are retained and every returned segment is checked under identical hard limits',()=>{
 const g=flat();const a={x:-73,z:-52},b={x:64,z:27};
 for(const weight of [0,4]){const rules={...DEMO_RULES,slopeWeight:weight},r=planNativeRoute(g,a,b,rules);assert.ok(r);assert.deepEqual(r.points[0],a);assert.deepEqual(r.points.at(-1),b);for(let i=1;i<r.points.length;i++)assert.ok(checkSegment(g,r.points[i-1],r.points[i],rules).allowed);}
 assert.ok(planNativeRoute(g,a,a));
});
test('exclusion uses the entire segment and rejects a start or finish inside it',()=>{
 const g=flat(200);assert.equal(checkSegment(g,{x:-900,z:300},{x:950,z:300},DEMO_RULES,true).allowed,false);
 assert.equal(planNativeRoute(g,{x:100,z:300},{x:950,z:300},DEMO_RULES,true),null);
});
test('profile measures ascent and surface distance; missing data fails closed',()=>{
 const p=densify([{x:0,z:0},{x:3,z:0}],1);assert.equal(p.length,4);
 const m=profileMetrics(p,[0,1,0,2]);assert.equal(m.ascent,3);assert.ok(Math.abs(m.distance-(2*Math.sqrt(2)+Math.sqrt(5)))<1e-10);
 assert.throws(()=>profileMetrics(p,[0,null,0,2]),/missing/);
});
test('draped polyline follows both triangles exactly, even on a twisted display quad',()=>{
 const t:Terrain={meta:{width:3,height:3,size:20,min:0,max:20,center:{lat:18.46,lon:77.42},resolution:10,source:'test',sourceUrl:'',bounds:[],projection:'local'},values:new Float32Array([0,10,1,15,0,18,4,20,2])};
 const path=drapePoints(t,[{x:-9,z:-8},{x:9,z:7}]);assert.ok(path.length>3);
 for(let i=1;i<path.length;i++)for(const f of [.1,.5,.9]){const a=path[i-1],b=path[i],p={x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};assert.ok(Math.abs(meshHeight(t,p)-(meshHeight(t,a)*(1-f)+meshHeight(t,b)*f))<1e-9);}
});
test('released native slope package rejects corruption and real routes obey both directional rules',async()=>{
 const file=await readFile('public/data/routing/native-hazards.bin'),bytes=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
 const g=await decodeHazards(bytes);const corrupt=bytes.slice(0);new Uint8Array(corrupt)[80]^=1;await assert.rejects(decodeHazards(corrupt),/integrity/);
 const start={x:1900,z:1500},end={x:-1850,z:-1100};const distance=planNativeRoute(g,start,end,{...DEMO_RULES,slopeWeight:0}),gentle=planNativeRoute(g,start,end,DEMO_RULES);
 assert.ok(distance&&gentle);assert.ok(gentle.distance>=distance.distance);assert.notDeepEqual(gentle.points,distance.points);
 for(const r of [distance,gentle]){assert.ok(r.maxAlongSlope<=DEMO_RULES.alongLimit);assert.ok(r.maxCrossSlope<=DEMO_RULES.crossLimit);for(let i=1;i<r.points.length;i++)assert.ok(checkSegment(g,r.points[i-1],r.points[i],r.rules).allowed);}
});
