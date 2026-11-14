import release from './data/geology-catalog.json' with {type:'json'};
import type {Point} from './terrain.ts';
export type GeologyUnit={id:string;code:string;name:string;description:string;color:string;label:[number,number];areaSquareMetres:number};
export type GeologyFeature={id:string;sourceFeatureId:number;unitId:string;geometry:{type:'Polygon';coordinates:number[][][]}};
export type GeologyData={version:number;coordinateSpace:string;size:number;title:string;sourceUrl:string;scale:number;notice:string;units:GeologyUnit[];features:GeologyFeature[];contacts:{id:string;type:string;coordinates:number[][]}[]};
export const GEOLOGY_RELEASE=release;
export function inRing(x:number,z:number,ring:number[][]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function geologyAt(data:GeologyData,point:Point){
 if(!Number.isFinite(point.x)||!Number.isFinite(point.z)||Math.abs(point.x)>data.size/2||Math.abs(point.z)>data.size/2)return null;
 const f=data.features.find(f=>inRing(point.x,point.z,f.geometry.coordinates[0])&&!f.geometry.coordinates.slice(1).some(r=>inRing(point.x,point.z,r)));
 return data.units.find(u=>u.id===f?.unitId)??null;
}
export function geologyPath(rings:number[][][]){return rings.map(r=>r.map((p,i)=>(i?'L':'M')+p[0]+','+p[1]).join('')+'Z').join('');}
export async function loadGeology(signal:AbortSignal):Promise<GeologyData>{
 const r=await fetch(release.url,{signal});if(!r.ok)throw Error(`Geology unavailable (HTTP ${r.status}).`);
 const bytes=await r.arrayBuffer();if(bytes.byteLength!==release.bytes)throw Error('Geology size mismatch.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');if(hash!==release.sha256)throw Error('Geology integrity check failed.');
 const data=JSON.parse(new TextDecoder().decode(bytes)) as GeologyData;
 if(data.coordinateSpace!=='local-mars-metres'||data.size!==10000||data.features.length!==release.features)throw Error('Geology coordinate contract mismatch.');
 return data;
}
export function geologyCanvas(data:GeologyData){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Geology canvas unavailable.');
 const position=(p:number[])=>[(p[0]/data.size+.5)*1024,(p[1]/data.size+.5)*1024];
 for(const f of data.features){ctx.beginPath();for(const ring of f.geometry.coordinates){ring.forEach((p,i)=>{const [x,y]=position(p);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();}ctx.fillStyle=data.units.find(u=>u.id===f.unitId)?.color??'#666666';ctx.fill('evenodd');}
 for(const c of data.contacts){ctx.beginPath();c.coordinates.forEach((p,i)=>{const [x,y]=position(p);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.strokeStyle='#17202b';ctx.lineWidth=1;ctx.setLineDash(c.type==='certain'?[]:[4,3]);ctx.stroke();}
 return canvas;
}
