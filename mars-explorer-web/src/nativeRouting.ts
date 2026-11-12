import type { Point, Route, Terrain } from './terrain.ts';

export type HazardGrid = { width: number; height: number; spacing: number; size: number; values: Float32Array };
export type RoutingRules = { alongLimit: number; crossLimit: number; totalLimit: number; slopeWeight: number; warningFraction: number };
// Engineering demonstration choices, NOT NASA astronaut or suit operating limits.
export const DEMO_RULES: RoutingRules = { alongLimit:18, crossLimit:12, totalLimit:28, slopeWeight:4, warningFraction:.8 };
export type SegmentCheck = { allowed:boolean; along:number; cross:number; total:number; warning:boolean; reason?:string };
export type NativeRoute = Route & { maxAlongSlope:number; maxCrossSlope:number; warnings:Point[][]; profileStatus:'pending'|'verified'; profileSamples:number; rules:RoutingRules; expanded:number };
const DEG=180/Math.PI;

export function directionalBounds(bounds: ArrayLike<number>, ux:number, uz:number) {
  const maxProjection=(x:number,z:number)=>Math.max(...[bounds[0]*x+bounds[2]*z,bounds[0]*x+bounds[3]*z,bounds[1]*x+bounds[2]*z,bounds[1]*x+bounds[3]*z].map(Math.abs));
  return {along:Math.atan(maxProjection(ux,uz))*DEG,cross:Math.atan(maxProjection(-uz,ux))*DEG,total:Math.atan(Math.hypot(Math.max(Math.abs(bounds[0]),Math.abs(bounds[1])),Math.max(Math.abs(bounds[2]),Math.abs(bounds[3]))))*DEG};
}
export function touchesBox(a:Point,b:Point,left:number,top:number,right:number,bottom:number) {
  let lo=0,hi=1;
  for (const [origin,delta,min,max] of [[a.x,b.x-a.x,left,right],[a.z,b.z-a.z,top,bottom]]) {
    if (Math.abs(delta)<1e-12) {if(origin<min-1e-9||origin>max+1e-9)return false;}
    else { const t1=(min-origin)/delta,t2=(max-origin)/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi+1e-10)return false; }
  }
  return true;
}
export function checkSegment(grid:HazardGrid,a:Point,b:Point,rules:RoutingRules,blocked=false):SegmentCheck {
  const no=(reason:string):SegmentCheck=>({allowed:false,along:0,cross:0,total:0,warning:false,reason});
  const half=grid.size/2,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
  if (![a.x,a.z,b.x,b.z].every(Number.isFinite)||Math.max(Math.abs(a.x),Math.abs(a.z),Math.abs(b.x),Math.abs(b.z))>=half)return no('Outside map');
  if(blocked){const t=length?Math.max(0,Math.min(1,((100-a.x)*dx+(300-a.z)*dz)/(length*length))):0;if(Math.hypot(a.x+t*dx-100,a.z+t*dz-300)<=800)return no('Simulated exclusion');}
  const ux=length?dx/length:1,uz=length?dz/length:0;
  const startCol=Math.max(0,Math.floor((Math.min(a.x,b.x)+half)/grid.spacing-1e-9)),endCol=Math.min(grid.width-1,Math.floor((Math.max(a.x,b.x)+half)/grid.spacing+1e-9));
  const startRow=Math.max(0,Math.floor((Math.min(a.z,b.z)+half)/grid.spacing-1e-9)),endRow=Math.min(grid.height-1,Math.floor((Math.max(a.z,b.z)+half)/grid.spacing+1e-9));
  let along=0,cross=0,total=0;
  for(let r=startRow;r<=endRow;r++)for(let c=startCol;c<=endCol;c++){
    const x=-half+c*grid.spacing,z=-half+r*grid.spacing;
    if(!touchesBox(a,b,x,z,x+grid.spacing,z+grid.spacing))continue;
    const i=(r*grid.width+c)*5;
    if(!Number.isFinite(grid.values[i+4]))return no('Missing native elevation');
    const v=directionalBounds(grid.values.subarray(i,i+4),ux,uz);
    along=Math.max(along,v.along);cross=Math.max(cross,v.cross);total=Math.max(total,v.total);
  }
  const allowed=along<=rules.alongLimit&&cross<=rules.crossLimit&&total<=rules.totalLimit;
  return {allowed,along,cross,total,warning:along>=rules.alongLimit*rules.warningFraction||cross>=rules.crossLimit*rules.warningFraction||total>=rules.totalLimit*rules.warningFraction,reason:allowed?undefined:'Slope rule exceeded'};
}

export function validateRules(r:RoutingRules){if(![r.alongLimit,r.crossLimit,r.totalLimit].every(v=>Number.isFinite(v)&&v>0&&v<90)||!Number.isFinite(r.slopeWeight)||r.slopeWeight<0||!(r.warningFraction>0&&r.warningFraction<=1))throw Error('Invalid routing rules');}
export function planNativeRoute(grid:HazardGrid,start:Point,end:Point,rules:RoutingRules=DEMO_RULES,blocked=false):NativeRoute|null {
  validateRules(rules);
  const pointRules={...rules,alongLimit:89.999,crossLimit:89.999};
  if(!checkSegment(grid,start,start,pointRules,blocked).allowed||!checkSegment(grid,end,end,pointRules,blocked).allowed)return null;
  // Cell centres every 20 m. Start/end remain exact virtual nodes, with checked connectors.
  const n=Math.floor(grid.width/2),step=grid.spacing*2,count=n*n,source=count,goal=count+1;
  const point=(i:number):Point=>i===source?start:i===goal?end:{x:-grid.size/2+(i%n*2+1)*grid.spacing,z:-grid.size/2+(Math.floor(i/n)*2+1)*grid.spacing};
  const near=(p:Point)=>{const c=Math.round((p.x+grid.size/2-grid.spacing)/step),r=Math.round((p.z+grid.size/2-grid.spacing)/step),out:number[]=[];for(let y=r-1;y<=r+1;y++)for(let x=c-1;x<=c+1;x++)if(x>=0&&x<n&&y>=0&&y<n)out.push(y*n+x);return out;};
  const goals=new Set(near(end));const cost=new Float64Array(count+2).fill(Infinity),prev=new Int32Array(count+2).fill(-1),closed=new Uint8Array(count+2);
  const heap:{i:number;f:number}[]=[];
  const push=(item:{i:number;f:number})=>{heap.push(item);let k=heap.length-1;while(k){const p=(k-1)>>1;if(heap[p].f<=item.f)break;heap[k]=heap[p];k=p;}heap[k]=item;};
  const pop=()=>{const first=heap[0],last=heap.pop()!;if(heap.length){let k=0;while(k*2+1<heap.length){let c=k*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(last.f<=heap[c].f)break;heap[k]=heap[c];k=c;}heap[k]=last;}return first.i;};
  cost[source]=0;push({i:source,f:Math.hypot(end.x-start.x,end.z-start.z)});let expanded=0;
  while(heap.length){const current=pop();if(closed[current])continue;closed[current]=1;expanded++;if(current===goal)break;
    const a=point(current);const neighbors:number[]=[];
    if(current===source){neighbors.push(...near(start));if(Math.hypot(end.x-start.x,end.z-start.z)<=step*2)neighbors.push(goal);}
    else {const c=current%n,r=Math.floor(current/n);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&c+dx>=0&&c+dx<n&&r+dy>=0&&r+dy<n)neighbors.push((r+dy)*n+c+dx);if(goals.has(current))neighbors.push(goal);}
    for(const next of neighbors){if(closed[next])continue;const b=point(next),check=checkSegment(grid,a,b,rules,blocked);if(!check.allowed)continue;
      const distance=Math.hypot(b.x-a.x,b.z-a.z);const penalty=rules.slopeWeight*((check.along/rules.alongLimit)**2+(check.cross/rules.crossLimit)**2);
      const candidate=cost[current]+distance*(1+penalty);
      if(candidate<cost[next]){cost[next]=candidate;prev[next]=current;push({i:next,f:candidate+Math.hypot(b.x-end.x,b.z-end.z)});}
    }
  }
  if(!Number.isFinite(cost[goal]))return null;
  const points:Point[]=[];for(let i=goal;i!==-1;i=prev[i])points.push(point(i));points.reverse();
  // No smoothing: every displayed segment has passed the same complete coverage check.
  let maxAlongSlope=0,maxCrossSlope=0,maxSlope=0,distance=0,ascent=0;const warnings:Point[][]=[];
  const height=(p:Point)=>grid.values[(Math.floor((p.z+grid.size/2)/grid.spacing)*grid.width+Math.floor((p.x+grid.size/2)/grid.spacing))*5+4];
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],check=checkSegment(grid,a,b,rules,blocked);if(!check.allowed)throw Error('Final route failed validation');maxAlongSlope=Math.max(maxAlongSlope,check.along);maxCrossSlope=Math.max(maxCrossSlope,check.cross);maxSlope=Math.max(maxSlope,check.total);const dh=height(b)-height(a);distance+=Math.hypot(b.x-a.x,b.z-a.z,dh);ascent+=Math.max(0,dh);if(check.warning)warnings.push([a,b]);}
  return {points,distance,ascent,maxSlope,maxAlongSlope,maxCrossSlope,warnings,minutes:NaN,oxygen:NaN,feasible:false,profileStatus:'pending',profileSamples:0,rules:{...rules},expanded};
}

// Dense path is used for native-height measurement and terrain-following display.
export function densify(points:Point[],spacing=1):Point[]{const out:Point[]=[];if(!points.length)return out;out.push(points[0]);for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/spacing));for(let j=1;j<=n;j++)out.push({x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n});}return out;}
export function drapePoints(t:Terrain,points:Point[]){const out:Point[]=[];if(!points.length)return out;out.push(points[0]);const step=t.meta.size/(t.meta.width-1),half=t.meta.size/2;
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],cuts=[0,1];for(const [v,w,offset] of [[a.x,b.x,half],[a.z,b.z,half],[a.x+a.z,b.x+b.z,half*2]]){if(Math.abs(w-v)<1e-12)continue;for(let k=Math.ceil((Math.min(v,w)+offset)/step);k<=Math.floor((Math.max(v,w)+offset)/step);k++){const fraction=(k*step-offset-v)/(w-v);if(fraction>1e-10&&fraction<1-1e-10)cuts.push(fraction);}}cuts.sort((x,y)=>x-y);for(let j=1;j<cuts.length;j++)if(cuts[j]-cuts[j-1]>1e-10)out.push({x:a.x+(b.x-a.x)*cuts[j],z:a.z+(b.z-a.z)*cuts[j]});}return out;}
export function profileMetrics(points:Point[],heights:(number|null)[]){if(points.length!==heights.length||heights.some(h=>h===null||!Number.isFinite(h)))throw Error('Native route profile has missing elevation');let distance=0,ascent=0;for(let i=1;i<points.length;i++){const dh=heights[i]!-heights[i-1]!;distance+=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z,dh);ascent+=Math.max(0,dh);}return {distance,ascent};}

// Matches PlaneGeometry's diagonal, unlike bilinear display interpolation.
export function meshHeight(t:Terrain,p:Point){const {width,height,size}=t.meta;const x=(p.x/size+.5)*(width-1),z=(p.z/size+.5)*(height-1);if(x<0||z<0||x>width-1||z>height-1)return NaN;const c=Math.min(width-2,Math.floor(x)),r=Math.min(height-2,Math.floor(z)),u=x-c,v=z-r;const a=t.values[r*width+c],b=t.values[r*width+c+1],d=t.values[(r+1)*width+c],e=t.values[(r+1)*width+c+1];return u+v<=1?a+(b-a)*u+(d-a)*v:e+(d-e)*(1-u)+(b-e)*(1-v);}
