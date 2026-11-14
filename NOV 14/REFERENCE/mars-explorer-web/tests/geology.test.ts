import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inRing,geologyAt,type GeologyData} from '../src/geology.ts';
test('geology inspection respects polygon holes and outside/unknown locations',()=>{
 const ring=[[-10,-10],[10,-10],[10,10],[-10,10],[-10,-10]],hole=[[-2,-2],[2,-2],[2,2],[-2,2],[-2,-2]];
 assert.equal(inRing(5,5,ring),true);assert.equal(inRing(20,5,ring),false);
 const data={size:10000,units:[{id:'a'}],features:[{unitId:'a',geometry:{type:'Polygon',coordinates:[ring,hole]}}]} as GeologyData;
 assert.equal(geologyAt(data,{x:5,z:5})?.id,'a');assert.equal(geologyAt(data,{x:0,z:0}),null);assert.equal(geologyAt(data,{x:Infinity,z:0}),null);assert.equal(geologyAt(data,{x:6000,z:0}),null);
});
test('released geology geometry stays in the declared Mars frame and keeps source identifiers and contact classes',async()=>{
 const bytes=await readFile('public/data/geology/jezero-sim3464.json');const meta=JSON.parse(await readFile('src/data/geology-catalog.json','utf8'));const data=JSON.parse(bytes.toString()) as GeologyData;
 assert.equal(bytes.length,meta.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.sha256);assert.equal(data.coordinateSpace,'local-mars-metres');assert.equal(data.size,10000);assert.equal(data.features.length,43);assert.equal(data.units.length,7);
 for(const f of data.features){assert.ok(data.units.some(u=>u.id===f.unitId));assert.ok(Number.isInteger(f.sourceFeatureId));assert.equal(f.geometry.type,'Polygon');for(const r of f.geometry.coordinates){assert.ok(r.length>=4);assert.deepEqual(r[0],r.at(-1));for(const p of r)assert.ok(p.every(Number.isFinite)&&Math.abs(p[0])<=5000.00001&&Math.abs(p[1])<=5000.00001);}}
 assert.deepEqual([...new Set(data.contacts.map(c=>c.type))].sort(),['approximate','certain']);assert.match(data.notice,/Not a soil-strength/);
});
