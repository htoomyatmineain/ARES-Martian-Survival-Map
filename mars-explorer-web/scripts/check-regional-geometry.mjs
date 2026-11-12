// Read-only geometry audit of the released regional grid and current renderer.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { toGeo, fromGeo, elevation, planRoute, sites, MARS_RADIUS } from '../src/terrain.ts';
import { SCIENCE_SITES, sciencePoint } from '../src/scienceSites.ts';
const root='source-data/Western-Jezero-Web-Lossless';
const manifest=JSON.parse(await readFile(`${root}/package-manifest.json`,'utf8'));
for(const file of [manifest.display.terrainMeta,manifest.display.terrainValues]){
  const bytes=await readFile(`${root}/${file}`),entry=manifest.assets.find(a=>a.file===file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
}
const meta=JSON.parse(await readFile(`${root}/${manifest.display.terrainMeta}`,'utf8'));
const bytes=await readFile(`${root}/${manifest.display.terrainValues}`);
const terrain={meta,values:new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength))};
const scene=await readFile('src/Scene.tsx','utf8'),workspace=await readFile('src/RegionalWorkspace.tsx','utf8');
const scale=Number(scene.match(/const SCALE = (\d+);/)[1]);
const routeLift=Number(scene.match(/const routePoints =[^\n]*a\[1\] \+= ([\d.]+);/)[1])*scale;
const scienceLift=Number(scene.match(/sciencePoint\(site, terrain.meta.center\), exaggeration\); at\[1\] \+= ([\d.]+);/)[1])*scale;
assert.match(workspace,/exaggeration=\{1\}/);
const ground=p=>[p.x/scale,(elevation(terrain,p.x,p.z)-meta.min)/scale,p.z/scale];
const geometry=new THREE.PlaneGeometry(meta.size/scale,meta.size/scale,meta.width-1,meta.height-1);
geometry.rotateX(-Math.PI/2);
const positions=geometry.attributes.position,indices=geometry.index.array;
for(let i=0;i<positions.count;i++)positions.setY(i,Number.isFinite(terrain.values[i])?(terrain.values[i]-meta.min)/scale:0);
let omittedTriangles=0,missingCount=0,minCol=meta.width,maxCol=0,minRow=meta.height,maxRow=0;
for(let i=0;i<indices.length;i+=3)if(![indices[i],indices[i+1],indices[i+2]].every(v=>Number.isFinite(terrain.values[v])))omittedTriangles++;
for(let i=0;i<terrain.values.length;i++)if(!Number.isFinite(terrain.values[i])){
  missingCount++;const col=i%meta.width,row=Math.floor(i/meta.width);
  minCol=Math.min(minCol,col);maxCol=Math.max(maxCol,col);minRow=Math.min(minRow,row);maxRow=Math.max(maxRow,row);
}
function surface(x,z){
  const u=Math.max(0,Math.min(meta.width-1.000001,(x/meta.size+.5)*(meta.width-1)));
  const v=Math.max(0,Math.min(meta.height-1.000001,(z/meta.size+.5)*(meta.height-1)));
  const col=Math.floor(u),row=Math.floor(v),fx=u-col,fy=v-row;
  const a=terrain.values[row*meta.width+col],b=terrain.values[row*meta.width+col+1];
  const c=terrain.values[(row+1)*meta.width+col],d=terrain.values[(row+1)*meta.width+col+1];
  if(fx+fy<=1)return a*(1-fx-fy)+b*fx+c*fy;
  return b*(1-fy)+c*(1-fx)+d*(fx+fy-1);
}
const half=meta.size/2,north=toGeo({x:0,z:-half},meta.center),south=toGeo({x:0,z:half},meta.center);
assert.ok(north.lat>meta.center.lat&&south.lat<meta.center.lat);
assert.equal(fromGeo(north.lat,north.lon,meta.center).z.toFixed(6),(-half).toFixed(6));
const nw=toGeo({x:-half,z:-half},meta.center),se=toGeo({x:half,z:half},meta.center);
const meridianLength=(north.lat-south.lat)*Math.PI/180*MARS_RADIUS;
assert.ok(Math.abs(meridianLength-10000)<1e-6);
assert.equal(positions.getZ(0),-5);assert.equal(positions.getX(0),-5);
assert.equal(positions.getX(meta.width-1),5);
assert.equal(positions.getZ(positions.count-1),5);
let maxHeightError=0;
for(let i=0;i<positions.count;i+=197)if(Number.isFinite(terrain.values[i]))maxHeightError=Math.max(maxHeightError,Math.abs(positions.getY(i)*scale+meta.min-terrain.values[i]));
assert.ok(maxHeightError<.001);
const markerChecks=SCIENCE_SITES.map(s=>{
  const p=sciencePoint(s,meta.center),at=ground(p),roundtrip=toGeo({x:at[0]*scale,z:at[2]*scale},meta.center);
  assert.ok(Math.abs(roundtrip.lat-s.latitude)<1e-10&&Math.abs(roundtrip.lon-s.longitude)<1e-10);
  return {name:s.name,x:p.x,z:p.z,groundHeight:elevation(terrain,p.x,p.z),anchorClearanceOverTriangleMetres:elevation(terrain,p.x,p.z)+scienceLift-surface(p.x,p.z)};
});
const route=planRoute(terrain,sites[0],{x:-1850,z:-1100},true,false);
assert.ok(route);
let routeMin=Infinity,routeMax=-Infinity,samples=0,invalidSamples=0;
for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i],ha=elevation(terrain,a.x,a.z)+routeLift,hb=elevation(terrain,b.x,b.z)+routeLift;
  const steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
  for(let j=0;j<=steps;j++){
    const f=j/steps,h=surface(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f),clearance=ha+(hb-ha)*f-h;
    if(!Number.isFinite(clearance))invalidSamples++;else{routeMin=Math.min(routeMin,clearance);routeMax=Math.max(routeMax,clearance);samples++;}
  }
}
let missingPoint;
for(let row=minRow+1;row<maxRow;row++){
  for(let col=minCol+1;col<maxCol;col++){
    const i=row*meta.width+col;
    if([i,i+1,i+meta.width,i+meta.width+1].every(i=>!Number.isFinite(terrain.values[i]))){missingPoint={x:(col+.5)/(meta.width-1)*meta.size-half,z:(row+.5)/(meta.height-1)*meta.size-half};break;}
  }if(missingPoint)break;
}
assert.ok(missingPoint);assert.ok(Number.isNaN(elevation(terrain,missingPoint.x,missingPoint.z)));
assert.equal(planRoute(terrain,sites[0],missingPoint,true,false),null);
console.log(JSON.stringify({
  north:{pass:true,northLatitude:north.lat,southLatitude:south.lat,meshTopRowZMetres:positions.getZ(0)*scale},
  boundary:{pass:true,localWidthMetres:meta.size,localHeightMetres:meta.size,northSouthSurfaceMetres:meridianLength,nw,se,definition:'10 km square in local Mars map coordinates'},
  heightScale:{pass:true,metresPerWorldUnit:scale,verticalExaggeration:1,minHeight:meta.min,maxHeight:meta.max,reliefMetres:meta.max-meta.min,maxSampledMeshRoundingErrorMetres:maxHeightError},
  scienceMarkers:{horizontalMatch:true,configuredLabelLiftMetres:scienceLift,checks:markerChecks},
  route:{configuredLiftMetres:routeLift,minClearanceOverMeshMetres:routeMin,maxClearanceOverMeshMetres:routeMax,samples,invalidSamples,result:'Drawn above ground; not draped directly onto the surface'},
  missing:{missingGridSamples:missingCount,gridSamples:terrain.values.length,percent:missingCount/terrain.values.length*100,omittedTriangles,boundsLocal:{west:minCol/(meta.width-1)*meta.size-half,east:maxCol/(meta.width-1)*meta.size-half,north:minRow/(meta.height-1)*meta.size-half,south:maxRow/(meta.height-1)*meta.size-half},inspectionPoint:{...missingPoint,...toGeo(missingPoint,meta.center)},routeToMissingPointRejected:true},
  limits:['Numerical/source-code audit; not an independent vertical-datum or landmark validation.','No successful WebGL visual inspection was performed by this script.']
},null,2));
geometry.dispose();
