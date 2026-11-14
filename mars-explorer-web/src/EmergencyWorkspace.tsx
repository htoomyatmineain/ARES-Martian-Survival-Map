import { MAP_SCIENCE_SITES, sciencePoint, isProvisionalSite } from './scienceSites';
import { useEmergencyPlanning, EmergencyScienceInputs, EmergencyResourceReadings } from './EmergencySciencePanel';
import { remainingEva, resourceRules } from './emergencyResources';
import { useEmergencyReturns } from './useEmergencyReturns';
import { lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import RegionalMap2D from './RegionalMap2D';
import { useNativeRoute } from './useNativeRoute';
import type { MissionState } from './evaMission';
import type { SharedRegionalMap } from './sharedRegionalData';
import { sites, toGeo, type Point, type Terrain } from './terrain';
import { estimateTravel, formatTravelMinutes } from './travelTime';
import { assessEmergency, emergencyAlert, compareEmergencyRoutes, emergencyActionReducer, initialEmergencyActions, oxygenLevel, remainingScience, validOutbound, pointOnOutbound, traveledRoute, PLAYBACK_SECONDS, type EmergencyContext, type EmergencyOverlay } from './emergency';
import './emergency.css';

const Scene = lazy(() => import('./Scene'));
const labels={continue:'Continue Mission',shorten:'Shorten Mission',return:'Return to Habitat',contingency:'Emergency Contingency',unknown:'Insufficient Data'};
type Props = { shared: SharedRegionalMap; terrain: Terrain; mission: MissionState };
export default function EmergencyWorkspace({ shared, terrain, mission }: Props) {
  const panelRef=useRef<HTMLElement>(null),latestMission=useRef(mission);
  useEffect(()=>{latestMission.current=mission;},[mission]);
  const [view,setView]=useState<'2D'|'3D'>('2D'),[location,setLocation]=useState<Point|null>(null),[oxygen,setOxygen]=useState(75),[picking,setPicking]=useState(false);
  const [targetId,setTargetId]=useState('custom');
  const [phase,setPhase]=useState<'configuring'|'traveling'|'arrived'>('configuring'),[context,setContext]=useState<EmergencyContext|null>(null),[progress,setProgress]=useState(0);
  const [simulation,dispatch]=useReducer(emergencyActionReducer,undefined,initialEmergencyActions);
  const planning=useEmergencyPlanning(location);
  const routingRules=useMemo(()=>resourceRules(planning.plan),[planning.plan.equipment,planning.plan.assumptions.walkingKmh]);
  const routing=useNativeRoute(location?shared:null,location??sites[0],true,false,routingRules,0);
  const outbound=context?.outboundRoute??routing.route,selected=context?.location??location,arrivalOxygen=context?.arrivalOxygen??oxygen;
  const frozenPlan=context?.resourcePlan??planning.plan;
  const plan=useMemo(()=>({...frozenPlan,shortened:frozenPlan.shortened||simulation.shortened}),[frozenPlan,simulation.shortened]);
  const eva=context?context.remainingEvaMinutes??null:remainingEva(mission);
  // Only location/routing changes trigger a planning return search; sliders do not restart workers.
  const previewContext=useMemo<EmergencyContext|null>(()=>location&&validOutbound(routing.route,location)?{location,arrivalOxygen:0,outboundRoute:routing.route,missionSnapshot:null,remainingScienceMinutes:null}:null,[location,routing.route]);
  const returns=useEmergencyReturns(phase==='arrived'?context:phase==='configuring'?previewContext:null,routing.grid,shared);
  const comparison=useMemo(()=>compareEmergencyRoutes(plan,arrivalOxygen,eva,returns.candidates.flatMap(c=>c.route?[c.route]:[])),[plan,arrivalOxygen,eva,returns.candidates]);
  const preferred=comparison.preferred,returnRoute=preferred?.route??null;
  const noRoute=returns.candidates.length===2&&returns.candidates.every(c=>c.status==='no-route');
  const assessment=preferred?.assessment??assessEmergency(plan,arrivalOxygen,null,eva,10,noRoute);
  const resourceResult=assessment.full;
  const feasible=assessment.actions.return.state==='allowed';
  const position=useMemo(()=>simulation.returnRoute?pointOnOutbound(simulation.returnRoute,simulation.fraction):context?pointOnOutbound(context.outboundRoute,progress):sites[0],[simulation.returnRoute,simulation.fraction,context,progress]);
  const mapTerrain=useMemo(()=>({...terrain,nativeSlope:routing.grid??undefined}),[terrain,routing.grid]);
  const geo=selected?toGeo(selected,terrain.meta.center):null;
  const walking=resourceResult.effectiveWalkingKmh;
  const outboundTravel=outbound?.profileStatus==='verified'?estimateTravel(outbound.distance,walking):null;
  const overlay:EmergencyOverlay=useMemo(()=>({
    trail:phase==='arrived'&&context?context.outboundRoute.points:[],
    preview:phase==='configuring'&&outbound?.profileStatus==='verified'?outbound.points:[],destination:selected,
    points:phase==='arrived'?(returnRoute?.points??(outbound?traveledRoute(outbound,1):[])):phase==='traveling'&&outbound?traveledRoute(outbound,progress):[],
    color:phase==='arrived'&&feasible?'#38c9ff':'#f39b58',alternative:phase==='arrived'?(comparison.alternative?.route.points??[]):[],
    warnings:phase==='arrived'?(returnRoute?.warnings??[]):[],crew:context?position:null,directions:phase==='arrived'&&!!returnRoute
  }),[phase,returnRoute,outbound,progress,feasible,comparison.alternative,position,selected]);
  useEffect(()=>{
    if(phase!=='traveling')return;const start=performance.now();
    const timer=window.setInterval(()=>{const fraction=Math.min(1,(performance.now()-start)/(PLAYBACK_SECONDS*1000));setProgress(fraction);
      if(fraction===1){window.clearInterval(timer);const current=latestMission.current;
        setContext(previous=>previous?{...previous,missionSnapshot:structuredClone(current.snapshot),remainingScienceMinutes:remainingScience(current),remainingEvaMinutes:remainingEva(current)}:previous);setPhase('arrived');}
    },50);return()=>window.clearInterval(timer);
  },[phase]);
  useEffect(()=>{
    if(simulation.mode!=='returning')return;const start=performance.now();
    const timer=window.setInterval(()=>dispatch({type:'tick',fraction:Math.min(1,(performance.now()-start)/(PLAYBACK_SECONDS*1000))}),50);
    return()=>window.clearInterval(timer);
  },[simulation.mode]);
  useEffect(()=>{panelRef.current?.scrollTo(0,0);},[phase]);
  const reset=()=>{panelRef.current?.scrollTo(0,0);setView('2D');setPhase('configuring');setContext(null);setLocation(null);setTargetId('custom');setOxygen(75);setProgress(0);setPicking(false);planning.reset();dispatch({type:'reset'});};
  const start=()=>{
    if(phase!=='configuring'||resourceResult.errors.length||!location||!validOutbound(routing.route,location))return;
    setContext(structuredClone({location,arrivalOxygen:oxygen,outboundRoute:routing.route,missionSnapshot:mission.snapshot,remainingScienceMinutes:remainingScience(mission),remainingEvaMinutes:remainingEva(mission),resourcePlan:planning.plan} satisfies EmergencyContext));setProgress(0);setPicking(false);setPhase('traveling');
  };
  const pickLocation=(at:Point)=>{if(phase==='configuring'&&Number.isFinite(at.x)&&Number.isFinite(at.z)){setLocation(at);setTargetId('custom');}};
  const chooseTarget=(id:string)=>{if(phase!=='configuring')return;const site=MAP_SCIENCE_SITES.find(s=>s.id===id);setTargetId(site?id:'custom');if(site)setLocation(sciencePoint(site,terrain.meta.center));else setPicking(true);};
  const actionBusy=simulation.mode==='returning'||simulation.mode==='returned';
  const hazardCase=noRoute||(returnRoute?.warnings.length??0)>0;
  const alert=emergencyAlert(assessment,noRoute);
  const metric=(n:number|null,unit:string)=>n===null?'Unknown':`${n.toFixed(1)} ${unit}`;
  const routeMetrics=(c:NonNullable<typeof preferred>)=><p>{(c.route.distance/1000).toFixed(2)} km · {metric(c.assessment.full.returnMinutes,'min')} · oxygen {metric(c.assessment.full.returnCost,'percentage points')}<br/>Slope bounds: {c.route.maxAlongSlope.toFixed(1)}° along / {c.route.maxCrossSlope.toFixed(1)}° cross / {c.route.maxSlope.toFixed(1)}° total · {c.route.warnings.length} verified slope-warning segments.<br/>{c.assessment.actions.return.state==='allowed'?'Model-Feasible':c.assessment.actions.return.state==='unknown'?'Not assessed — missing evidence':'Blocked by configured constraints'}</p>;
  return <div className="rm-emergency">
    <aside ref={panelRef} className="rm-emergency-panel" aria-label="Emergency simulation">
      {phase!=='arrived'&&<section className="rm-section"><h2>Emergency Configuration</h2><p>Low Oxygen / Oxygen Resource Assessment</p>
        <fieldset disabled={phase!=='configuring'}><legend>Emergency location &amp; arrival oxygen</legend><label>Emergency destination<select aria-label="Emergency destination" value={targetId} onChange={e=>chooseTarget(e.target.value)}><option value="custom">Custom map point</option>{MAP_SCIENCE_SITES.map(site=><option key={site.id} value={site.id}>{site.name}{isProvisionalSite(site.id)?' · provisional':''}</option>)}</select></label><label>Arrival oxygen: {oxygen}%<input aria-label="Oxygen at emergency arrival" type="range" min="0" max="100" step="1" value={oxygen} onChange={e=>setOxygen(Number(e.target.value))}/></label>
          <button className="rm-pick-button" aria-pressed={picking} onClick={()=>setPicking(v=>!v)}>{picking?'Finish selecting location':'Select emergency location on map'}</button></fieldset>
        {location&&<p role="status" className="rm-fineprint">{phase!=='configuring'?'Plan locked. The astronaut follows the verified route; the solid line shows completed travel.':picking?'Selection mode: click repeatedly to move the destination, then Start or finish selecting.':'Location selected. Choose another science site or enable map selection to move it.'} {phase==='configuring'?(routing.route?.profileStatus==='verified'?'Dashed line: verified planned route; solid trail appears only after Start.':routing.status):''}</p>}
        <EmergencyScienceInputs planning={planning} frozenPlan={context?.resourcePlan} locked={phase!=='configuring'}/>
        <dl className="rm-mission-stats"><dt>Arrival oxygen</dt><dd>{arrivalOxygen}% · {oxygenLevel(arrivalOxygen)}</dd><dt>Emergency location</dt><dd>{geo?`${geo.lat.toFixed(5)}° N, ${geo.lon.toFixed(5)}° E`:'Not selected'}</dd>
          <dt>Local coordinates</dt><dd>{selected?`E ${selected.x.toFixed(1)}, S ${selected.z.toFixed(1)} m`:'—'}</dd><dt>Mission context</dt><dd>{mission.snapshot?.target??'No active Mission plan'}</dd>
          <dt>Outbound route</dt><dd>{outbound?.profileStatus==='verified'?`${(outbound.distance/1000).toFixed(2)} km · terrain profile checked`:location?routing.status:'Select a location'}</dd><dt>Estimated walking time</dt><dd>{outboundTravel?formatTravelMinutes(outboundTravel.minutes):'Unknown'}</dd></dl>
        {routing.error&&<p role="status">{routing.error}</p>}
        <p className="rm-fineprint">All rates, loads and critical policy (oxygen ≤10%) are simulation assumptions, not NASA astronaut limits. Oxygen is measured at arrival; outbound is not deducted again. Playback: {PLAYBACK_SECONDS} seconds per leg, independent of calculated EVA time.</p>
        <button className="rm-pick-button rm-primary-action" disabled={phase!=='configuring'||!validOutbound(routing.route,location)||resourceResult.errors.length>0} onClick={start}>Start Simulation</button>
        <button className="rm-pick-button" onClick={reset}>Reset</button><p className="rm-fineprint">Leaving Emergency ends this isolated simulation; Mission is unchanged.</p>
      </section>}
      {phase==='configuring'&&location&&(alert.severity==='critical'||alert.severity==='warning')&&<section className={`rm-section rm-emergency-case is-${alert.severity}`} role={alert.severity==='critical'?'alert':'status'} aria-label="Planning assessment"><small>PLANNING PREVIEW · SIMULATION</small><h2>{alert.title.toUpperCase()}</h2><p>{alert.reason}</p>{alert.evidence.map(text=><p className="rm-fineprint" key={text}>{text}</p>)}</section>}
      {phase==='traveling'&&<section className="rm-section"><h3>Simulated outbound travel</h3><progress aria-label="Outbound travel progress" max={1} value={progress}/><p>{Math.floor(progress*100)}% · accelerated playback</p></section>}
      {phase==='arrived'&&<>
        <section className={`rm-section rm-emergency-case is-${assessment.severity}`} role={assessment.severity==='critical'?'alert':'status'} aria-label="Emergency case">
          <small>EMERGENCY CASE · {assessment.severity.toUpperCase()}</small><h2>{alert.title.toUpperCase()}</h2><p>Arrival oxygen: {arrivalOxygen}% · {oxygenLevel(arrivalOxygen)}</p>
          <p>{returns.loading?'Verifying independent return routes…':alert.reason}</p>
          {alert.evidence.map(text=><p className="rm-fineprint" key={text}>{text}</p>)}
          {hazardCase&&<p className="rm-fineprint">Terrain evidence is limited to checked slope bounds/coverage. No loose soil or obstacle hazards are invented.</p>}
        </section>
        <section className="rm-section rm-emergency-result" aria-label="Decision Support"><h2>Decision Support</h2><h3>{returns.loading?'Verifying return routes…':labels[assessment.recommendation]}</h3>
          <p>{plan.task.title}{plan.shortened?` · ${plan.task.partial?.title}`:''} · selected simulated science task</p><details><summary>Task provenance and assumptions</summary><p>{plan.task.provenance}. Task times, equipment and workload are simulation estimates; observation context does not certify exact access or rock chemistry.</p>{plan.task.sources.map(source=><p key={source.label}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></p>)}</details>
          <p>Location: {geo?`${geo.lat.toFixed(5)}° N, ${geo.lon.toFixed(5)}° E`:'Unknown'} · Mission context: {context?.missionSnapshot?.target??'Unknown'}</p>
          <dl className="rm-mission-stats"><dt>Return oxygen margin, including reserve</dt><dd>{metric(assessment.returnOxygenMargin,'percentage points')}</dd><dt>Return EVA margin, including reserve</dt><dd>{metric(assessment.returnEvaMargin,'min')}</dd></dl>
          {(Object.keys(assessment.actions) as (keyof typeof assessment.actions)[]).map(key=><div className="rm-emergency-action" key={key}><button className="rm-pick-button" disabled={returns.loading||actionBusy||assessment.actions[key].state!=='allowed'} onClick={()=>dispatch({type:key,assessment,route:returnRoute})}>{key==='return'?'Initiate Return to Base · SIMULATED':labels[key]}</button><p className="rm-fineprint">{assessment.actions[key].state.toUpperCase()}: {assessment.actions[key].reason}</p></div>)}
          <button className="rm-pick-button" onClick={()=>dispatch({type:'contact'})}>Contact Base · SIMULATED</button><p role="status">{simulation.message}</p><p>Local simulated requests: {simulation.contacts}</p>
          {actionBusy&&<><progress aria-label="Simulated return progress" max={1} value={simulation.fraction}/><p>{simulation.mode==='returned'?'Returned to simulated habitat':`${Math.floor(simulation.fraction*100)}% · accelerated return playback`}. Modeled travel: {(simulation.returnMinutes*simulation.fraction).toFixed(1)} min; modeled oxygen remaining: {Math.max(0,arrivalOxygen-simulation.returnCost*simulation.fraction).toFixed(1)}%. Reserve is protected, not consumed by the travel counter.</p></>}
          {returns.candidates.filter(c=>!c.route).map(c=><p role="status" key={c.name}>{c.name}: {c.reason}</p>)}
          <p className="rm-fineprint">Only the two evaluated routing strategies are compared. Missing candidates do not establish that all possible routes are infeasible. Model feasibility does not assess CO₂ removal, cooling, battery, physiology, absolute geolocation or rescue.</p>
          <button className="rm-pick-button" onClick={reset}>Reset</button>
        </section>
      </>}
      <EmergencyResourceReadings result={resourceResult} arrived={phase==='arrived'}/>
    </aside>
    <section className={phase==='arrived'?'rm-emergency-map has-comparison':picking?'rm-emergency-map is-picking':'rm-emergency-map'} aria-label="Emergency navigation map">
      <div className="rm-emergency-map-title"><div className="rm-view-switch" role="group" aria-label="Emergency map view"><button aria-pressed={view==='2D'} onClick={()=>setView('2D')}>2D Map</button><button aria-pressed={view==='3D'} onClick={()=>setView('3D')}>3D Tactical</button></div>{view} MAP · {picking?'Choose emergency location':phase==='traveling'?'Traveled path behind astronaut':phase==='arrived'?'Verified return preview · cyan only if Model-Feasible':'Dashed: planned route preview · solid: traveled path'}</div>
      <RegionalMap2D emergencyOverlay={overlay} mapHelpId="rm-emergency-map-help" shared={shared} terrain={mapTerrain} analysis="none" opacity={.65} imagery contours={false} route={null} routeVisible={false} destination={selected??sites[0]} picking={picking&&phase==='configuring'} onPick={pickLocation} hidden={view!=='2D'} blocked={false} grid scienceVisible={phase==='configuring'} selectedScienceId={targetId==='custom'?null:targetId} scienceFocus={null} onScienceSelect={chooseTarget} observations={[]} observationFocus={null} onObservationSelect={()=>{}} orbital={null} onOrbitalInspect={()=>{}}/>
      {view==='3D'&&<div className="rm-emergency-scene"><Suspense fallback={<p role="status">Loading tactical map…</p>}><Scene emergencyOverlay={overlay} imageryUrl={shared.imageryUrl} terrain={mapTerrain} layer="surface" contours={false} exaggeration={1} mode="3D" cameraAction={{kind:'reset',tick:0}} route={null} selected="custom" onSelect={()=>{}} onPick={pickLocation} planning={picking&&phase==='configuring'} progress={0} storm={false} markers={false} running={false} destination={selected??sites[0]} blocked={false} scienceSitesVisible={phase==='configuring'} selectedScienceId={targetId==='custom'?null:targetId} onScienceSelect={chooseTarget}/></Suspense></div>}
      {phase==='arrived'&&<section className="rm-emergency-route-summary" aria-label="Route Comparison"><h3>Route Comparison</h3>
        {preferred?<><strong style={{color:feasible?'#38c9ff':'#f39b58'}}>{feasible?'Recommended (Model-Feasible)':'Verified candidate · feasibility not established'}</strong>{routeMetrics(preferred)}</>:<p>{returns.loading?'Verifying return routes…':'No verified complete return route available.'}</p>}
        {comparison.alternative&&<div style={{color:'#ff736b'}}><strong>Distinct verified higher-risk alternative</strong>{routeMetrics(comparison.alternative)}<p>Evidence: {preferred?.assessment.actions.return.state==='allowed'&&comparison.alternative.assessment.actions.return.state==='blocked'?'resource/EVA constraint violation relative to the feasible primary':'higher terrain slope bounds with actual warning segments'}.</p></div>}
        <p className="rm-fineprint">Dashed gaps are transparent. Magenta marks actual slope-bound warnings. No route is guaranteed safe. Metrics are shared unchanged by 2D and 3D.</p>
      </section>}
    </section>
  </div>;
}
