import data from '../assets/terrain.json';

export const terrain = data;
export const {size, count, heights} = terrain;
export const half = size / 2;
export const spacing = size / (count - 1);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distance = (a, b) => Math.hypot(a.x-b.x, a.z-b.z);

export function heightAt(x, z) {
  const gx = clamp((x + half) / spacing, 0, count - 1.00001);
  const gz = clamp((z + half) / spacing, 0, count - 1.00001);
  const ix = Math.floor(gx), iz = Math.floor(gz);
  const u = gx-ix, v = gz-iz, a = iz*count+ix;
  if (u+v <= 1) return heights[a] + u*(heights[a+1]-heights[a]) + v*(heights[a+count]-heights[a]);
  const d = a+count+1;
  return heights[d] + (1-u)*(heights[d-1]-heights[d]) + (1-v)*(heights[d-count]-heights[d]);
}

export function slopeAt(x, z) {
  const dx = (heightAt(x+2,z)-heightAt(x-2,z))/4;
  const dz = (heightAt(x,z+2)-heightAt(x,z-2))/4;
  return Math.atan(Math.hypot(dx,dz))*180/Math.PI;
}

let seed = 48211;
function rand() {
  seed = (Math.imul(seed,1664525)+1013904223)>>>0;
  return seed/4294967296;
}

export const base = {id:'base', name:'Base camp', x:160,z:70};
const desired = [
  {id:'delta',name:'Delta outlook',x:24,z:20,label:'Survey station',note:'Observe the delta surface and surrounding relief. This station is part of the training scenario.'},
  {id:'ridge',name:'Layered outcrop',x:-133,z:-95,label:'Training sample A',sample:true,note:'Scan the rock proxy to log a training sample. Its composition has not been measured at this point.'},
  {id:'basalt',name:'Boulder field',x:106,z:-117,label:'Training sample B',sample:true,note:'Compare the textures of the simulated surface rocks and collect a second training sample.'},
];
function locate(point) {
  if (slopeAt(point.x,point.z) < 15) return point;
  for(let radius=5;radius<85;radius+=5) for(let angle=0;angle<8;angle++){
    const x=point.x+radius*Math.cos(angle*Math.PI/4),z=point.z+radius*Math.sin(angle*Math.PI/4);
    if(Math.abs(x)<half-12 && Math.abs(z)<half-12 && slopeAt(x,z)<15) return {...point,x,z};
  }
  return point;
}
Object.assign(base,locate(base));
export const sites = desired.map(locate);
const points = [base,...sites];
const scattered = Array.from({length:2700},()=>{
  const x=(rand()-.5)*(size-5), z=(rand()-.5)*(size-5);
  const r=.11+2.4*Math.pow(rand(),10);
  return {x,z,r,h:r*(.44+rand()*.66),angle:rand()*Math.PI*2,tint:rand()};
}).filter(rock=>points.every(p=>distance(p,rock)>8));

// Illustrative regolith scatter around the start of the survey corridor.
const corridorYaw=-1.22;
const nearRocks=[];
function scatterRock(along, side, radius, height) {
  const x=base.x+Math.sin(corridorYaw)*along+Math.cos(corridorYaw)*side;
  const z=base.z-Math.cos(corridorYaw)*along+Math.sin(corridorYaw)*side;
  return {x,z,r:radius,h:height,angle:rand()*Math.PI*2,tint:rand()};
}
for (const [along,side,r,h] of [[5,-3.6,1.48,1.07],[9,4.7,1.37,.96],
    [17,-7.5,2.4,1.73],[29,9,2.65,1.8],[48,-12,2.23,1.42],[65,20,2.2,1.55]]) {
  nearRocks.push(scatterRock(along,side,r,h));
  for(let i=0;i<17;i++){
    const radius=.07+rand()*.32;
    nearRocks.push(scatterRock(along+(rand()-.5)*10,side+(rand()-.5)*5,radius,radius*(.4+rand()*.55)));
  }
}
for(let i=0;i<620;i++){
  const along=1+rand()*119,side=(rand()-.5)*78,r=.024+Math.pow(rand(),3)*.22;
  nearRocks.push(scatterRock(along,side,r,r*(.42+rand()*.65)));
}
export const rocks=[...scattered,...nearRocks];
export const obstacles=rocks.filter(r=>r.r>.91);
const bins=new Map();
const bin=(x,z)=>Math.floor(x/8)+':'+Math.floor(z/8);
for(const rock of obstacles) {
  const key=bin(rock.x,rock.z);
  if(!bins.has(key)) bins.set(key,[]);
  bins.get(key).push(rock);
}
export function blocked(x,z) {
  if(Math.abs(x)>half-3||Math.abs(z)>half-3)return true;
  for(const dx of [-8,0,8])for(const dz of [-8,0,8]){
    if(bins.get(bin(x+dx,z+dz))?.some(r=>Math.hypot(x-r.x,z-r.z)<r.r+.38))return true;
  }
  return false;
}

const routeStep=5, routeWidth=Math.floor(size/routeStep)-1;
const toWorld=i=>({x:(i%routeWidth+1)*routeStep-half,z:(Math.floor(i/routeWidth)+1)*routeStep-half});
const toIndex=p=>clamp(Math.round((p.z+half)/routeStep)-1,0,routeWidth-1)*routeWidth+
  clamp(Math.round((p.x+half)/routeStep)-1,0,routeWidth-1);
const grid=Array.from({length:routeWidth*routeWidth},(_,i)=>toWorld(i));
const valid=grid.map(p=>!blocked(p.x,p.z));
const elevation=grid.map(p=>heightAt(p.x,p.z));
const neighbors=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function push(heap, entry) {
  let i=heap.length; heap.push(entry);
  while(i>0) {const p=(i-1)>>1;if(heap[p][0]<=entry[0])break;heap[i]=heap[p];i=p;}
  heap[i]=entry;
}
function pop(heap) {
  const top=heap[0], last=heap.pop();
  if(heap.length){let i=0;while(i*2+1<heap.length){let k=i*2+1;if(k+1<heap.length&&heap[k+1][0]<heap[k][0])k++;if(heap[k][0]>=last[0])break;heap[i]=heap[k];i=k;}heap[i]=last;}
  return top;
}
function plan(from,to,grade,penalties) {
  const start=toIndex(from), goal=toIndex(to);
  const heap=[], costs=new Float32Array(grid.length).fill(Infinity), parent=new Int32Array(grid.length).fill(-1), seen=new Uint8Array(grid.length);
  costs[start]=0; push(heap,[0,start]);
  while(heap.length) {
    const [,i]=pop(heap); if(seen[i])continue; seen[i]=1;
    if(i===goal){
      const cells=[];for(let k=i;k>=0;k=parent[k])cells.push(k);cells.reverse();
      const path=[from,...cells.map(k=>grid[k]),to];
      return {cells,path,length:path.slice(1).reduce((n,p,j)=>n+distance(p,path[j]),0),
        ascent:cells.slice(1).reduce((n,k,j)=>n+Math.max(0,elevation[k]-elevation[cells[j]]),0)};
    }
    const x=i%routeWidth,z=Math.floor(i/routeWidth);
    for(const [dx,dz] of neighbors) {
      const a=x+dx,b=z+dz;if(a<0||b<0||a>=routeWidth||b>=routeWidth)continue;
      const j=b*routeWidth+a;if(seen[j]||(!valid[j]&&j!==goal))continue;
      const len=routeStep*Math.hypot(dx,dz),rise=elevation[j]-elevation[i];
      if(Math.abs(rise)/len>.46||blocked((grid[i].x+grid[j].x)/2,(grid[i].z+grid[j].z)/2))continue;
      const cost=costs[i]+len+Math.abs(rise)*grade+(penalties?.has(j)?routeStep*.55:0);
      if(cost<costs[j]){costs[j]=cost;parent[j]=i;push(heap,[cost+distance(grid[j],grid[goal]),j]);}
    }
  }
  return null;
}
export function routes(from,to) {
  const seen=new Set(), found=[];
  for(const [name,grade] of [['Direct',.7],['Gentle',7],['Alternate',2.4]]) {
    const result=plan(from,to,grade,name==='Alternate'?seen:null);
    if(result&&!found.some(p=>p.cells.join(',')===result.cells.join(','))){
      found.push({...result,name});
      result.cells.forEach(i=>seen.add(i));
    }
  }
  return found;
}
export const suit = {oxygenPerMinute:1.25,batteryPerMinute:.68,batteryPerScan:4,walkMetresPerSecond:2,oxygenReserve:18,batteryReserve:12,timeScale:2.5};
