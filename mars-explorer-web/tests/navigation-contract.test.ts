import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceAt,clampPosition,JZ01_NAVIGATION,type NavigationConfig} from '../src/jz01/navigation.ts';

test('Navigation contract supports other mission grids and clamps all four edges',()=>{
  const c:NavigationConfig={...JZ01_NAVIGATION,width:3,height:3,xmin:10,zmin:20,spacing:5,meshStep:1,elevationOffset:0,eyeHeight:1.8,boundaryMargin:1};
  const values=new Float32Array([0,5,10,5,10,15,10,15,20]);
  assert.equal(surfaceAt(values,15,25,c)?.dtm,10);assert.equal(surfaceAt(values,15,25,c)?.eye,11.8);
  assert.deepEqual(clampPosition(-100,500,c),{x:11,z:29});assert.deepEqual(clampPosition(500,-100,c),{x:19,z:21});
});
