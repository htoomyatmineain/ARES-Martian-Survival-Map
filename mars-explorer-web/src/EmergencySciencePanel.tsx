import {missionProcedure} from './missionProcedure';
import { useEffect, useMemo, useState } from 'react';
import { loadGeology, type GeologyData } from './geology';
import { loadOrbitalRaster, ORBITAL_LAYERS, type OrbitalRaster } from './orbitalLayers';
import { eligibleTasks } from './emergencyTasks';
import { calculateResources, RESOURCE_DEFAULTS, type EmergencyResourcePlan } from './emergencyResources';
import type { LoadPreset } from './mobility';
import type { Point } from './terrain';

export function useEmergencyPlanning(point:Point|null,siteId='custom'){
  const [geology,setGeology]=useState<GeologyData|null>(null),[rasters,setRasters]=useState<OrbitalRaster[]>([]);
  const [evidenceStatus,setEvidenceStatus]=useState('Select a location to load science context.');
  const [taskId,setTaskId]=useState(''),[shortened,setShortened]=useState(false),[equipment,setEquipment]=useState<LoadPreset>('light');
  const [assumptions,setAssumptions]=useState({...RESOURCE_DEFAULTS});
  const enabled=!!point;
  useEffect(()=>{
    if(!enabled)return;const c=new AbortController();setEvidenceStatus('Loading and checking science context…');
    Promise.allSettled([loadGeology(c.signal),...ORBITAL_LAYERS.map(d=>loadOrbitalRaster(d,c.signal))]).then(results=>{
      if(c.signal.aborted)return;
      const g=results[0];setGeology(g.status==='fulfilled'?g.value as GeologyData:null);
      setRasters(results.slice(1).flatMap(r=>r.status==='fulfilled'?[r.value as OrbitalRaster]:[]));
      setEvidenceStatus(results.some(r=>r.status==='rejected')?'Some science layers unavailable; unsupported matches are omitted.':'Science layers integrity-checked; registration uncertainty still applies.');
    });return()=>c.abort();
  },[enabled]);
  const tasks=useMemo(()=>{const base=eligibleTasks(point,geology,rasters),procedure=missionProcedure(siteId);return siteId!=='custom'&&procedure.sources.length?[{id:'site-documentation',title:procedure.title,description:'Proposed crew follow-up using NASA historical site context.',objective:procedure.objective,tasks:procedure.tasks.map(t=>t.label),equipment:'light' as const,minutes:20,workload:1.05,partial:{title:'Context image and uncertainty note',minutes:7,tasks:[procedure.tasks[0].label,'Record uncertainty']},provenance:'Estimated task / observation context' as const,sources:procedure.sources.map(s=>({label:s.title,url:s.url})),evidence:[procedure.historicalContext,'Reported position does not certify precise outcrop access.']},...base]:base;},[point,geology,rasters,siteId]);
  const task=tasks.find(t=>t.id===taskId)??tasks[0];
  const plan:EmergencyResourcePlan=useMemo(()=>({location:point,task,shortened:shortened&&!!task.partial,equipment,activity:'walk',assumptions}),[point,task,shortened,equipment,assumptions]);
  return {tasks,plan,evidenceStatus,chooseTask:(id:string)=>{setTaskId(id);setShortened(false);},setShortened,setEquipment,setAssumptions,
    reset:()=>{setTaskId('');setShortened(false);setEquipment('light');setAssumptions({...RESOURCE_DEFAULTS});}};
}
export function EmergencyScienceInputs({planning,locked,frozenPlan}:{planning:ReturnType<typeof useEmergencyPlanning>;locked:boolean;frozenPlan?:EmergencyResourcePlan}){
  const plan=frozenPlan??planning.plan;
  return <fieldset disabled={locked} className="rm-emergency-science"><legend>Science task</legend>

    <label>Science task<select value={plan.task.id} onChange={e=>planning.chooseTask(e.target.value)}>{(frozenPlan?[frozenPlan.task]:planning.tasks).map(t=><option key={t.id} value={t.id}>{t.title==='Generic field documentation'?'Generic observation task':t.title} · {t.minutes} min</option>)}</select></label>
    <p>{plan.shortened?plan.task.partial!.minutes:plan.task.minutes} min estimated · {plan.task.equipment==='baseline'?'No kit':plan.task.equipment==='light'?'Light kit':'Heavy kit'} required</p>
    <details><summary>Mission details</summary><p>{plan.task.description}</p><p><strong>Science objective/value:</strong> {plan.task.objective}</p>
      <ul>{(plan.shortened?plan.task.partial!.tasks:plan.task.tasks).map(task=><li key={task}>{task}</li>)}</ul>
    </details>
    <label>Carried equipment<select value={plan.equipment} onChange={e=>planning.setEquipment(e.target.value as LoadPreset)}><option value="baseline">None</option><option value="light">Light kit</option><option value="heavy">Heavy kit</option></select></label>

  </fieldset>;
}
export function EmergencyResourceReadings({result}:{result:ReturnType<typeof calculateResources>;arrived:boolean}){
  const display=(value:number|null,unit:string)=>value===null?'Unknown':`${value.toFixed(1)} ${unit}`;
  return <section className="rm-section" aria-label="Resource calculation"><h3>Resource assessment</h3>
    {result.errors.map(error=><p role="status" key={error}>{error}</p>)}
    <dl className="rm-mission-stats">
      {([
        ['Task duration',result.taskMinutes,'min'],
        ['Arrival oxygen',result.available,'%'],
        ['Return ETA',result.returnMinutes,'min'],
        ['Oxygen margin after task + return + reserve',result.oxygenMargin,'percentage points'],
        ['EVA time remaining',result.evaMinutes,'min'],
        ['EVA margin after task + return + reserve',result.evaMargin,'min'],
      ] as [string,number|null,string][]).filter(([,value])=>value!==null&&Number.isFinite(value)).map(([label,value,unit])=><div key={label} style={{display:'contents'}}><dt>{label}</dt><dd>{display(value,unit)}</dd></div>)}
    </dl>
    <details><summary>Calculation breakdown</summary><dl className="rm-mission-stats">
      {([
        ['Walking speed',result.effectiveWalkingKmh,'km/h'],
        ['Task oxygen',result.taskCost,'percentage points'],
        ['Return oxygen',result.returnCost,'percentage points'],
        ['Reserve duration',result.reserveMinutes,'min'],
        ['Reserve oxygen',result.reserveCost,'percentage points'],
      ] as [string,number|null,string][]).filter(([,value])=>value!==null&&Number.isFinite(value)).map(([label,value,unit])=><div key={label} style={{display:'contents'}}><dt>{label}</dt><dd>{display(value,unit)}</dd></div>)}
    </dl></details>
    {result.evaMinutes===null&&<p className="rm-fineprint">EVA time not assessed: no time budget available.</p>}
    <details><summary>Simulation assumptions & limitations</summary><p className="rm-fineprint">Oxygen and EVA time apply at the event; outbound travel is not deducted again. Activity updates both. Missing return data blocks assessment.</p><p className="rm-fineprint">Not assessed: {result.unassessed.join(', ')}.</p></details>
  </section>;
}
