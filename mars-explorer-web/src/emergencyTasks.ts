import { geologyAt, type GeologyData } from './geology.ts';
import { SCIENCE_SITES, sciencePoint } from './scienceSites.ts';
import { orbitalSample, type OrbitalRaster } from './orbitalLayers.ts';
import type { Point } from './terrain.ts';
import type { LoadPreset } from './mobility.ts';

export type ScienceTask = { id:string; title:string; description:string; objective:string; tasks:string[];
  equipment:LoadPreset; minutes:number; workload:number; partial?:{title:string;minutes:number;tasks:string[]};
  provenance:'Simulated'|'Estimated task / observation context'; sources:{label:string;url:string}[]; evidence:string[] };
const generic:ScienceTask = {id:'generic',title:'Generic field documentation',description:'Simulated documentation without a location-specific geological claim.',
  objective:'Practice recording field context; no scientific finding is asserted.',tasks:['Record location','Write observation notes'],equipment:'baseline',minutes:10,workload:1,
  provenance:'Simulated',sources:[],evidence:['No sufficiently supported location-specific task is available.']};
function boundaryDistance(p:Point,a:number[],b:number[]){const dx=b[0]-a[0],dz=b[1]-a[1],n=dx*dx+dz*dz;
  const f=n?Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[1])*dz)/n)):0;return Math.hypot(p.x-a[0]-f*dx,p.z-a[1]-f*dz);}
export function eligibleTasks(point:Point|null,geology:GeologyData|null,rasters:OrbitalRaster[]=[]):ScienceTask[]{
  if(!point||![point.x,point.z].every(Number.isFinite)||Math.max(Math.abs(point.x),Math.abs(point.z))>=5000)return [generic];
  const unit=geology?geologyAt(geology,point):null;
  // A conservative 200 m boundary exclusion avoids treating a map contact as an exact field classification.
  const interior=!!unit&&!!geology&&Math.max(Math.abs(point.x),Math.abs(point.z))<4800&&geology.features.every(f=>f.geometry.coordinates.every(r=>r.every((a,i)=>boundaryDistance(point,a,r[(i+1)%r.length])>200)));
  const site=SCIENCE_SITES.find(s=>{const p=sciencePoint(s);return Math.hypot(p.x-point.x,p.z-point.z)<=200;});
  if(!interior&&!site)return [generic];
  const sources=[...(interior?[{label:'USGS SIM 3464 · approximate geological context',url:geology!.sourceUrl}]:[]),...(site?[{label:`NASA/PDS · ${site.name} reported site`,url:site.reportUrl}]:[])];
  const evidence=[...(interior?[`Approximate mapped context: ${unit!.name}; 100–200 m registration uncertainty, not an exact verified unit.`]:[]),...(site?[`Within 200 m of reported ${site.name}; proximity does not prove exact outcrop access or absolute position.`]:[])];
  for(const raster of rasters){if(orbitalSample(raster,point)!==null){sources.push({label:`CRISM ${raster.meta.productId} · ${raster.meta.parameter}`,url:raster.meta.sourceUrl});evidence.push(`${raster.meta.parameter}: valid regional spectral sample only; no mineral detection, abundance or rock chemistry is asserted.`);}}
  const common={provenance:'Estimated task / observation context' as const,sources,evidence};
  const tasks:ScienceTask[]=[{...common,id:'context-imaging',title:'Geological context imaging',description:'Proposed human documentation informed by approximate map/site context.',objective:'Record surface structures for later interpretation.',tasks:['Record viewpoints','Capture context images','Write uncertainty notes'],equipment:'light',minutes:15,workload:1.05,
    partial:{title:'Single-view documentation',minutes:7,tasks:['Record one viewpoint','Write uncertainty notes']}}];
  if((interior&&/fan|etched/i.test(unit!.name))||site)tasks.push({...common,id:'layer-study',title:'Sedimentary-context investigation',description:'Proposed observation task; field observations must establish whether layers are present.',objective:'Document possible layering and past-environment context without asserting a new finding.',tasks:['Identify an observation viewpoint','Describe visible structures','Record alternate interpretations'],equipment:'light',minutes:30,workload:1.2,
    partial:{title:'Brief context observation',minutes:12,tasks:['Describe visible structures','Record uncertainties']}});
  else tasks.push({...common,id:'surface-context',title:'Surface context description',description:'Document mapped-region context without claiming exact mineralogy.',objective:'Compare visible structures with approximate map context.',tasks:['Describe surface appearance','Record map uncertainty'],equipment:'baseline',minutes:20,workload:1.1});
  tasks.push({...common,id:'target-assessment',title:'Potential target assessment',description:'Simulated non-invasive assessment; no collection or confirmed target accessibility.',objective:'Record observations to inform a later reviewed science plan.',tasks:['Review visible targets','Record access limitations','Document observations'],equipment:'heavy',minutes:40,workload:1.3});
  return tasks;
}
