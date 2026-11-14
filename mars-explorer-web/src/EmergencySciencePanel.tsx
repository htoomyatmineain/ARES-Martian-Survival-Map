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
  return <fieldset disabled={locked} className="rm-emergency-science"><legend>Location-based science · proposed simulation</legend>
    <p className="rm-fineprint">{planning.evidenceStatus}</p>
    <label>Science task<select value={plan.task.id} onChange={e=>planning.chooseTask(e.target.value)}>{(frozenPlan?[frozenPlan.task]:planning.tasks).map(t=><option key={t.id} value={t.id}>{t.title} · {t.minutes} min estimated</option>)}</select></label>
    <p>{plan.task.description}</p><p>{plan.shortened?plan.task.partial!.minutes:plan.task.minutes} min estimated · {plan.task.equipment==='baseline'?'No kit':plan.task.equipment==='light'?'Light kit':'Heavy kit'} required</p>
    <details><summary>Mission details</summary><p><strong>Science objective/value:</strong> {plan.task.objective}</p>
      <ul>{(plan.shortened?plan.task.partial!.tasks:plan.task.tasks).map(task=><li key={task}>{task}</li>)}</ul>
    </details>
    <details><summary>Sources &amp; assumptions</summary>
      <p className="rm-fineprint">Contextual evidence only; absolute position and field access remain unverified. {plan.task.provenance}. Durations, workload and equipment are simulation assumptions, not NASA-assigned EVA tasks.</p>
      {plan.task.evidence.map(text=><p className="rm-fineprint" key={text}>{text}</p>)}
      {plan.task.sources.map(source=><p key={source.url+source.label}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></p>)}
      <p>Task workload multiplier: {plan.task.workload} (simulated).</p>
    </details>
    {plan.task.partial&&<label><input type="checkbox" checked={plan.shortened} onChange={e=>planning.setShortened(e.target.checked)}/> Shortened task: {plan.task.partial.title} · {plan.task.partial.minutes} min estimated</label>}
    <label>Activity<select value="walk" onChange={()=>{}}><option value="walk">Walking · simulated</option><option value="run" disabled>Running unavailable · no supported model</option></select></label>
    <label>Carried equipment<select value={plan.equipment} onChange={e=>planning.setEquipment(e.target.value as LoadPreset)}><option value="baseline">None</option><option value="light">Light kit</option><option value="heavy">Heavy kit</option></select></label>
    <details><summary>Configurable simulation assumptions</summary><p className="rm-fineprint">Normalized oxygen budget, not a specified suit capacity. Reference minutes apply only to the reference rate; activity and load change endurance. No NASA-calibrated Mars consumption rates are available.</p>
      {(Object.keys(plan.assumptions) as (keyof typeof plan.assumptions)[]).map(key=><label key={key}>{({referenceMinutes:'Minutes at full oxygen at reference rate',walkingKmh:'Base walking speed (km/h)',reserveMinutes:'Reserve duration (min)',walkRate:'Walking consumption multiplier',taskRate:'Task consumption multiplier',reserveRate:'Reserve consumption multiplier',lightLoad:'Light load consumption multiplier',heavyLoad:'Heavy load consumption multiplier'})[key]}
        <input type="number" min={key==='reserveMinutes'?0:.01} step="0.01" value={Number.isFinite(plan.assumptions[key])?plan.assumptions[key]:''} onChange={e=>planning.setAssumptions(a=>({...a,[key]:e.target.value===''?NaN:Number(e.target.value)}))}/></label>)}
    </details>
  </fieldset>;
}
export function EmergencyResourceReadings({result,arrived}:{result:ReturnType<typeof calculateResources>;arrived:boolean}){
  const display=(value:number|null,unit:string)=>value===null?'Unknown':`${value.toFixed(1)} ${unit}`;
  return <section className="rm-section" aria-label="Resource calculation"><h3>Task and workload resource calculation</h3>
    {result.errors.map(error=><p role="status" key={error}>{error}</p>)}
    <dl className="rm-mission-stats"><dt>Task duration</dt><dd>{display(result.taskMinutes,'min')}</dd><dt>Effective walking</dt><dd>{display(result.effectiveWalkingKmh,'km/h')}</dd>
      <dt>Arrival oxygen budget</dt><dd>{display(result.available,'%')}</dd><dt>Task consumption</dt><dd>{display(result.taskCost,'percentage points')}</dd>
      <dt>Verified return time</dt><dd>{display(result.returnMinutes,'min')}</dd><dt>Return consumption</dt><dd>{display(result.returnCost,'percentage points')}</dd>
      <dt>Reserve duration</dt><dd>{display(result.reserveMinutes,'min')}</dd><dt>Reserve consumption</dt><dd>{display(result.reserveCost,'percentage points')}</dd><dt>Oxygen margin after task + return + reserve</dt><dd>{display(result.oxygenMargin,'percentage points')}</dd>
      <dt>{arrived?'EVA remaining at event / after activity':'Configured EVA remaining at event'}</dt><dd>{display(result.evaMinutes,'min')}</dd><dt>EVA margin after selected task + return + reserve</dt><dd>{display(result.evaMargin,'min')}</dd></dl>
    <p className="rm-fineprint">Oxygen and EVA time are scenario inputs at the trigger point; pre-event travel and any acknowledged earlier science are not deducted again. Activity playback deducts its own task oxygen and time. The separate Mission workspace is not mutated. Terrain changes route geometry and permitted slopes; no calibrated slope/metabolism law is claimed. Return values remain Unknown until an independent return route is verified.</p>
    <p className="rm-fineprint">Not assessed: {result.unassessed.join(', ')}. Decision Support and Route Comparison use this same selected-task and workload model. Negative margins block the corresponding action; missing margins remain Unknown.</p>
  </section>;
}
