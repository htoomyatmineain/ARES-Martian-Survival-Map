import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {surfaceAt,clampPosition,JZ01_NAVIGATION,type NavigationConfig} from '../src/jz01/navigation.ts';

async function data(){const b=await readFile(new URL('../public/assets/mars/jz01/navigation-heights.bin',import.meta.url));return new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));}
test('JZ-01 visual collision sampler matches all original OBJ sample vertices',async()=>{
  const values=await data(),obj=await readFile(new URL('../source-data/JZ01_Codex_Handoff/terrain.obj',import.meta.url),'utf8');
  let count=0;
  for(const line of obj.split(/\r?\n/))if(line.startsWith('v ')){
    const [x,y,z]=line.split(/\s+/).slice(1).map(Number);const s=surfaceAt(values,x,-y)!;
    assert.ok(Math.abs(s.mesh-z)<.000001);assert.ok(s.eye-s.mesh>=1.7-1e-9);count++;
  }
  assert.equal(count,63001);
});
test('JZ-01 triangle interiors and final short edge cells preserve source collision geometry',async()=>{
  const values=await data(),obj=await readFile(new URL('../source-data/JZ01_Codex_Handoff/terrain.obj',import.meta.url),'utf8');
  const vertices:number[][]=[],faces:number[][]=[];
  for(const line of obj.split(/\r?\n/)){if(line.startsWith('v '))vertices.push(line.split(/\s+/).slice(1).map(Number));
    if(line.startsWith('f '))faces.push(line.split(/\s+/).slice(1).map(s=>Number(s.split('/')[0])-1));}
  for(let k=0;k<faces.length;k+=197){const vs=faces[k].map(i=>vertices[i]);const x=vs.reduce((s,v)=>s+v[0],0)/3,y=vs.reduce((s,v)=>s+v[1],0)/3,z=vs.reduce((s,v)=>s+v[2],0)/3;
    const sample=surfaceAt(values,x,-y)!;assert.ok(Math.abs(sample.mesh-z)<.000002);assert.ok(sample.eye>=Math.max(sample.mesh,sample.dtm)+1.7-1e-9);}
  assert.equal(surfaceAt(values,250,0),null);assert.equal(surfaceAt(values,0,-250),null);
});
test('Navigation contract supports other mission grids and clamps all four edges',()=>{
  const c:NavigationConfig={...JZ01_NAVIGATION,width:3,height:3,xmin:10,zmin:20,spacing:5,meshStep:1,elevationOffset:0,eyeHeight:1.8,boundaryMargin:1};
  const values=new Float32Array([0,5,10,5,10,15,10,15,20]);
  assert.equal(surfaceAt(values,15,25,c)?.dtm,10);assert.equal(surfaceAt(values,15,25,c)?.eye,11.8);
  assert.deepEqual(clampPosition(-100,500,c),{x:11,z:29});assert.deepEqual(clampPosition(500,-100,c),{x:19,z:21});
});
