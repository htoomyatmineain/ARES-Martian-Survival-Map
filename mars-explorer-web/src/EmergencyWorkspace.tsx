import { Check, TriangleAlert } from 'lucide-react';
import {SCENARIO_DEFAULTS,SCENARIO_OXYGEN,advancePlayback,SCENARIO_NAMES,validScenario,eventJourney,scenarioPlan,assessScenario,type EmergencyScenario} from './emergencyScenario';
import { MAP_SCIENCE_SITES, sciencePoint, isProvisionalSite } from './scienceSites';
import { useEmergencyPlanning, EmergencyScienceInputs } from './EmergencySciencePanel';
import { DEMO_RULES } from './nativeRouting';
import { useEmergencyReturns } from './useEmergencyReturns';
import { lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import RegionalMap2D from './RegionalMap2D';
import { useNativeRoute } from './useNativeRoute';
import type { MissionState } from './evaMission';
import type { SharedRegionalMap } from './sharedRegionalData';
import { sites, toGeo, type Point, type Terrain } from './terrain';
import { estimateTravel, formatTravelMinutes } from './travelTime';
import { emergencyAlert, compareEmergencyRoutes, emergencyActionReducer, initialEmergencyActions, oxygenLevel, validOutbound, pointOnOutbound, traveledRoute, type EmergencyContext, type EmergencyOverlay } from './emergency';
import './emergency.css';

const Scene = lazy(() => import('./Scene'));
const labels={continue:'Continue Mission',shorten:'Shorten Mission',return:'Return to Habitat',contingency:'Hold Position',unknown:'Insufficient Data'};
type Props = { shared: SharedRegionalMap; terrain: Terrain; mission: MissionState };
export default function EmergencyWorkspace({ shared, terrain, mission }: Props) {
  const [scenario,setScenario]=useState<EmergencyScenario>({...SCENARIO_DEFAULTS}),[crewEvidence,setCrewEvidence]=useState(false);
  const panelRef=useRef<HTMLElement>(null);
  const [view,setView]=useState<'2D'|'3D'>('2D'),[location,setLocation]=useState<Point|null>(null),[picking,setPicking]=useState(false);
  const oxygen=SCENARIO_OXYGEN[scenario.kind];
  const [playbackSpeed,setPlaybackSpeed]=useState<1|2>(1);
  const speedRef=useRef<1|2>(1);speedRef.current=playbackSpeed;
  const [targetId,setTargetId]=useState('custom');
  const [phase,setPhase]=useState<'configuring'|'traveling'|'arrived'>('configuring'),[context,setContext]=useState<EmergencyContext|null>(null),[progress,setProgress]=useState(0);
  const [simulation,dispatch]=useReducer(emergencyActionReducer,undefined,initialEmergencyActions);
  const planning=useEmergencyPlanning(location,targetId);
  // Planned outbound uses the same default terrain rules as Map/Mission.
  // Emergency walking-return limits are assessed separately for the selected kit.
  const routing=useNativeRoute(location?shared:null,location??sites[0],true,false,DEMO_RULES,0);
  const journey=useMemo(()=>eventJourney(routing.route,scenario),[routing.route,scenario.timing,scenario.fraction,scenario.scienceAcknowledged,validScenario(scenario)]);
  const eventScenario=context?.scenario??scenario;
  const scienceUsed=simulation.scienceCost*simulation.scienceFraction;
  const outbound=context?.outboundRoute??journey?.outboundRoute??routing.route,selected=context?.location??journey?.location??location,arrivalOxygen=Math.max(0,(context?.arrivalOxygen??oxygen)-scienceUsed);
  const frozenPlan=context?.resourcePlan??planning.plan;
  const plan=useMemo(()=>{const base=scenarioPlan(frozenPlan,eventScenario,selected);const working=simulation.mode==='science-selected'||simulation.scienceFraction>0;return {...base,shortened:working?false:base.shortened||simulation.shortened,task:working?{...base.task,minutes:Math.max(0,simulation.scienceMinutes*(1-simulation.scienceFraction)),partial:undefined}:base.task};},[frozenPlan,eventScenario,selected,simulation.shortened,simulation.mode,simulation.scienceFraction,simulation.scienceMinutes]);
  const eva=Math.max(0,(context?.remainingEvaMinutes??scenario.evaMinutes)-simulation.scienceMinutes*simulation.scienceFraction);
  // Only location/routing changes trigger a planning return search; sliders do not restart workers.
  const previewContext=useMemo<EmergencyContext|null>(()=>journey&&validOutbound(routing.route,location)?{location:journey.location,arrivalOxygen:0,outboundRoute:journey.outboundRoute,missionSnapshot:null,remainingScienceMinutes:null,resourcePlan:planning.plan}:null,[journey,location,routing.route,planning.plan]);
  const returns=useEmergencyReturns(phase==='arrived'?context:phase==='configuring'?previewContext:null,routing.grid,shared);
  const comparison=useMemo(()=>(()=>{const base=compareEmergencyRoutes(plan,arrivalOxygen,eva,returns.candidates.flatMap(c=>c.route?[c.route]:[]));const candidates=base.candidates.map(c=>({...c,assessment:assessScenario(plan,arrivalOxygen,c.route,eva,eventScenario,false,simulation.scienceDone)}));const preferred=candidates.find(c=>c.assessment.actions.continue.state==='allowed')??candidates.find(c=>c.assessment.actions.shorten.state==='allowed')??candidates.find(c=>c.assessment.actions.return.state==='allowed')??candidates[0]??null;return {...base,candidates,preferred,alternative:base.alternative?candidates.find(c=>c.route===base.alternative!.route)??null:null};})(),[plan,arrivalOxygen,eva,returns.candidates,eventScenario,simulation.scienceDone]);
  const preferred=comparison.preferred,returnRoute=preferred?.route??null;
  const noRoute=returns.candidates.length===2&&returns.candidates.every(c=>c.status==='no-route');
  const assessment=preferred?.assessment??assessScenario(plan,arrivalOxygen,null,eva,eventScenario,noRoute,simulation.scienceDone);
  const resourceResult=assessment.full;
  const feasible=assessment.actions.return.state==='allowed';
  const position=useMemo(()=>simulation.returnRoute?pointOnOutbound(simulation.returnRoute,simulation.fraction):context?pointOnOutbound(context.outboundRoute,progress):sites[0],[simulation.returnRoute,simulation.fraction,context,progress]);
  const mapTerrain=useMemo(()=>({...terrain,nativeSlope:routing.grid??undefined}),[terrain,routing.grid]);
  const geo=selected?toGeo(selected,terrain.meta.center):null;
  const walking=resourceResult.effectiveWalkingKmh;
  const outboundTravel=routing.route?.profileStatus==='verified'?estimateTravel(routing.route.distance,walking):null;
  const overlay:EmergencyOverlay=useMemo(()=>({
    trail:phase==='arrived'&&context?context.outboundRoute.points:[],
    preview:[],destination:selected,
    points:phase==='arrived'?(returnRoute?.points??(outbound?traveledRoute(outbound,1):[])):phase==='traveling'&&outbound?traveledRoute(outbound,progress):[],
    color:phase==='arrived'&&feasible?'#38c9ff':'#f39b58',alternative:phase==='arrived'?(comparison.alternative?.route.points??[]):[],
    warnings:phase==='arrived'?(returnRoute?.warnings??[]):[],crew:context?position:null,directions:phase==='arrived'&&!!returnRoute
  }),[phase,returnRoute,outbound,progress,feasible,comparison.alternative,position,selected]);
  useEffect(()=>{
    if(phase!=='traveling')return;let previous=performance.now(),fraction=0;
    const timer=window.setInterval(()=>{const now=performance.now();fraction=advancePlayback(fraction,now-previous,speedRef.current);previous=now;setProgress(fraction);
      if(fraction===1){window.clearInterval(timer);setPhase('arrived');}
    },50);return()=>window.clearInterval(timer);
  },[phase]);
  useEffect(()=>{
    if(simulation.mode!=='science-selected'||simulation.scienceDone)return;let previous=performance.now(),fraction=0;
    const timer=window.setInterval(()=>{const now=performance.now();fraction=advancePlayback(fraction,now-previous,speedRef.current);previous=now;dispatch({type:'tick-science',fraction});},50);
    return()=>window.clearInterval(timer);
  },[simulation.mode,simulation.scienceDone]);
  useEffect(()=>{
    if(simulation.mode!=='returning')return;let previous=performance.now(),fraction=0;
    const timer=window.setInterval(()=>{const now=performance.now();fraction=advancePlayback(fraction,now-previous,speedRef.current);previous=now;dispatch({type:'tick',fraction});},50);
    return()=>window.clearInterval(timer);
  },[simulation.mode]);
  useEffect(()=>{panelRef.current?.scrollTo(0,0);},[phase]);
  const reset=()=>{panelRef.current?.scrollTo(0,0);setScenario({...SCENARIO_DEFAULTS});setCrewEvidence(false);setView('2D');setPhase('configuring');setContext(null);setLocation(null);setTargetId('custom');setPlaybackSpeed(1);setProgress(0);setPicking(false);planning.reset();dispatch({type:'reset'});};
  const start=()=>{
    if(phase!=='configuring'||resourceResult.baseErrors.length||!location||!journey||!validScenario(scenario)||!validOutbound(routing.route,location))return;
    setContext(structuredClone({location:journey.location,arrivalOxygen:oxygen,outboundRoute:journey.outboundRoute,missionSnapshot:mission.snapshot,remainingScienceMinutes:scenario.timing==='returning'?0:planning.plan.task.minutes,remainingEvaMinutes:scenario.evaMinutes,resourcePlan:planning.plan,scenario} satisfies EmergencyContext));setProgress(0);setPicking(false);setPhase('traveling');
  };
  const pickLocation=(at:Point)=>{if(phase==='configuring'&&Number.isFinite(at.x)&&Number.isFinite(at.z)){setLocation(at);setTargetId('custom');}};
  const chooseTarget=(id:string)=>{if(phase!=='configuring')return;const site=MAP_SCIENCE_SITES.find(s=>s.id===id);setTargetId(site?id:'custom');if(site)setLocation(sciencePoint(site,terrain.meta.center));else setPicking(true);};
  const actionBusy=simulation.mode==='returning'||simulation.mode==='returned';
  const alert=emergencyAlert(assessment,noRoute);
  const metric=(n:number|null,unit:string)=>n===null?'Unknown':`${n.toFixed(1)} ${unit}`;
  const routeMetrics=(c:NonNullable<typeof preferred>)=><p>{(c.route.distance/1000).toFixed(2)} km · {metric(c.assessment.full.returnMinutes,'min')}</p>;
  const activeScience=simulation.mode==='science-selected';
  const actionKeys=(Object.keys(assessment.actions) as (keyof typeof assessment.actions)[]).filter(key=>!(eventScenario.timing==='returning'&&(key==='continue'||key==='shorten')));
  const reason=(key:keyof typeof assessment.actions)=>{
    const action=assessment.actions[key];
    if((key==='continue'||key==='shorten')&&activeScience)return simulation.scienceDone?'Task complete. Review return.':'Task in progress.';
    if(action.state==='allowed')return key==='return'?'Enough oxygen and time for return and reserve.':key==='contingency'?'Hold position. Contact Base.':'Enough oxygen and time for task, return and reserve.';
    if(action.state==='unknown')return 'Route or resource data missing.';
    if(key==='continue'||key==='shorten'){
      if(assessment.critical)return 'Critical oxygen: science blocked.';
      if(eventScenario.timing==='outbound')return 'Destination not reached. Science unavailable here.';
      if(simulation.scienceDone)return 'Task complete.';
      if(eventScenario.kind!=='oxygen')return 'Science suspended for this emergency.';
      if(key==='shorten'&&!plan.task.partial)return 'No shortened task defined.';
    }
    if(key==='contingency')return 'An assessed return option is available.';
    if(eventScenario.kind==='visibility'&&eventScenario.visibilityMetres<20)return 'Visibility too low. Hold position.';
    const result=key==='shorten'?assessment.partial:assessment.full;
    const oxygenMargin=key==='return'?assessment.returnOxygenMargin:result?.oxygenMargin;
    const timeMargin=key==='return'?assessment.returnEvaMargin:result?.evaMargin;
    if(oxygenMargin!==null&&oxygenMargin!==undefined&&oxygenMargin<0)return 'Insufficient oxygen including reserve.';
    if(timeMargin!==null&&timeMargin!==undefined&&timeMargin<0)return 'Insufficient EVA time including reserve.';
    return action.reason;
  };
  const bannerText=returns.loading?'Checking return route.':assessment.recommendation==='continue'?`Enough oxygen and time for task, return and reserve.${returnRoute?.warnings.length?' Return route has slope warnings.':''}`:assessment.recommendation==='shorten'?'Shorten the task to keep enough oxygen and time to return.':assessment.recommendation==='return'?reason('return'):assessment.recommendation==='unknown'?'Missing data. Contact Base.':reason('return');
  const bannerSeverity=simulation.mode==='returned'?'normal':returns.loading?'unknown':alert.severity;
  const bannerTitle=simulation.mode==='returned'?'At habitat':simulation.mode==='returning'?'Returning to habitat':activeScience?(simulation.scienceDone?'Task complete':'Science in progress'):simulation.mode==='contingency'?'Hold position':returns.loading?'Checking return route':eventScenario.kind==='visibility'?'Reduced visibility':eventScenario.kind==='rover-failure'?'Rover unavailable':alert.title;
  const bannerMessage=simulation.mode==='returned'?'Return complete.':simulation.mode==='returning'?'Following the selected route.':activeScience?(simulation.scienceDone?'Task complete. Review return options.':'Task underway. Oxygen and time are updating.'):bannerText;
  const currentOxygen=Math.max(0,arrivalOxygen-simulation.returnCost*simulation.fraction);
  const currentEva=Math.max(0,eva-simulation.returnMinutes*simulation.fraction);
  return <div className={phase==='arrived'?'rm-emergency has-arrival-alert':'rm-emergency'}>
    {phase==='arrived'&&<section className={`rm-emergency-arrival-alert is-${bannerSeverity}`} role={bannerSeverity==='critical'?'alert':'status'} aria-atomic="true" aria-label="Emergency case">
      {bannerSeverity!=='normal'?<TriangleAlert size={46} aria-hidden="true"/>:<Check size={46} aria-hidden="true"/>}
      <div><small>Emergency simulation</small><h2>{bannerTitle}</h2><p>{bannerMessage}</p></div>
    </section>}
    <aside ref={panelRef} className="rm-emergency-panel" aria-label="Emergency simulation">
      {phase==='configuring'&&<section className="rm-section rm-emergency-setup">
        <h2 className="rm-emergency-setup-title">Emergency setup</h2>
        <fieldset className="rm-emergency-scenario"><label>Emergency type<select aria-label="Emergency type" value={scenario.kind} onChange={e=>setScenario(v=>({...v,kind:e.target.value as EmergencyScenario['kind']}))}>{Object.entries(SCENARIO_NAMES).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
          <p className="rm-fineprint">{scenario.kind==='oxygen'?'20% oxygen':scenario.kind==='visibility'?'50 m visibility · 50% walking speed · 75% oxygen':'Walking return · 75% oxygen'} · simulated</p>
        </fieldset>
        <fieldset><label>Destination<select aria-label="Emergency destination" value={targetId} onChange={e=>chooseTarget(e.target.value)}><option value="custom">Custom map point</option>{MAP_SCIENCE_SITES.map(site=><option key={site.id} value={site.id}>{site.name}{isProvisionalSite(site.id)?' · provisional':''}</option>)}</select></label>
          <button className="rm-pick-button" aria-pressed={picking} onClick={()=>setPicking(v=>!v)}>{picking?'Finish selecting':'Select on map'}</button>
          {picking&&<p className="rm-fineprint">Click anywhere to move the mission destination.</p>}
        </fieldset>
        <fieldset><label>When<select aria-label="Emergency timing" value={scenario.timing} onChange={e=>setScenario(v=>({...v,timing:e.target.value as EmergencyScenario['timing'],scienceAcknowledged:false}))}><option value="outbound">On the way</option><option value="onsite">At destination</option><option value="returning">On return</option></select></label>
          {scenario.timing!=='onsite'&&<label>Emergency point · {scenario.fraction}% along {scenario.timing==='outbound'?'outbound':'return'} route<input aria-label="Emergency point along route" type="range" min="5" max="95" value={scenario.fraction} onChange={e=>setScenario(v=>({...v,fraction:Number(e.target.value)}))}/></label>}
          {scenario.timing==='returning'&&<label className="rm-check"><span>Science completed before this event</span><input aria-label="Acknowledge pre-event science" type="checkbox" checked={scenario.scienceAcknowledged} onChange={e=>setScenario(v=>({...v,scienceAcknowledged:e.target.checked}))}/></label>}
        </fieldset>
        <EmergencyScienceInputs planning={planning} locked={false}/>
        {location&&<div className="rm-emergency-route-check" role="status">{outboundTravel&&validOutbound(routing.route,location)?`${(routing.route.distance/1000).toFixed(2)} km · ${formatTravelMinutes(outboundTravel.minutes)} to destination`:routing.status||'Checking route…'}</div>}
        {location&&<p className="rm-fineprint">Planned route uses Map defaults. Walking return is checked for the selected equipment.</p>}
        {!location&&<p role="status">Select a destination to calculate the route.</p>}
        {routing.error&&<p role="status">{routing.error}</p>}
        <p className="rm-fineprint">EVA at event: {scenario.evaMinutes} min · reserve: {plan.assumptions.reserveMinutes} min · simulated</p>
        <button className="rm-pick-button rm-primary-action" disabled={!validOutbound(routing.route,location)||!journey||!validScenario(scenario)||resourceResult.baseErrors.length>0} onClick={start}>Start Simulation</button>
        <button className="rm-pick-button rm-speed-toggle" aria-pressed={playbackSpeed===2} onClick={()=>setPlaybackSpeed(speed=>speed===1?2:1)}>Speed up 2×</button>
        <button className="rm-pick-button" onClick={reset}>Reset</button>
      </section>}
      {phase==='traveling'&&<section className="rm-section"><h2>Traveling to emergency point</h2><progress aria-label="Outbound travel progress" max={1} value={progress}/><p>{Math.floor(progress*100)}% · {playbackSpeed}× playback</p><p className="rm-fineprint">Playback speed does not change EVA time.</p><button className="rm-pick-button" onClick={reset}>Reset</button></section>}
      {phase==='arrived'&&<section className="rm-section rm-emergency-result" aria-label="Decision Support">
        <h2>Next action</h2><h3>{simulation.mode==='returned'?'At habitat':simulation.mode==='returning'?'Returning to habitat':returns.loading?'Checking return…':activeScience&&!simulation.scienceDone?'Science in progress':labels[assessment.recommendation]}</h3>
        <div className="rm-emergency-key-values"><div><small>Oxygen</small><strong>{currentOxygen.toFixed(1)}%</strong><span>{oxygenLevel(currentOxygen)}</span></div><div><small>EVA remaining</small><strong>{currentEva.toFixed(0)} min</strong><span>Simulated budget</span></div></div>
        <p>{plan.task.title==='Generic field documentation'?'Generic observation task':plan.task.title}</p>
        {[...actionKeys].sort((a,b)=>Number(b===assessment.recommendation)-Number(a===assessment.recommendation)).filter(key=>!actionBusy&&!(key==='contingency'&&assessment.actions[key].state==='blocked')).map(key=><div className="rm-emergency-action" key={key}><button className={key===assessment.recommendation?'rm-pick-button rm-primary-action':'rm-pick-button'} disabled={returns.loading||((key==='continue'||key==='shorten')&&activeScience)||assessment.actions[key].state!=='allowed'} onClick={()=>dispatch({type:key,assessment,route:returnRoute})}>{key==='return'?'Return to Habitat':labels[key]}</button>{assessment.actions[key].state!=='allowed'&&<p className="rm-fineprint">{reason(key)}</p>}</div>)}
        {activeScience&&<section aria-label="Emergency science activity"><progress aria-label="Emergency science progress" max={1} value={simulation.scienceFraction}/><p>{simulation.scienceDone?'Task complete':'Science in progress'} · {(simulation.scienceMinutes*simulation.scienceFraction).toFixed(1)} min used</p>{simulation.scienceDone&&<label className="rm-check"><span>Observations recorded · simulated</span><input type="checkbox" checked={crewEvidence} onChange={e=>setCrewEvidence(e.target.checked)}/></label>}</section>}
        {actionBusy&&<><progress aria-label="Simulated return progress" max={1} value={simulation.fraction}/><p>{simulation.mode==='returned'?'Returned to habitat':`${Math.floor(simulation.fraction*100)}% · returning`}</p></>}
        <button className="rm-pick-button" onClick={()=>dispatch({type:'contact'})}>Contact Base · simulated</button>{simulation.contacts>0&&<p role="status">Request recorded locally · no real connection.</p>}
        <details className="rm-emergency-evidence"><summary>Decision evidence</summary><p>{assessment.actions[assessment.recommendation==='unknown'?'return':assessment.recommendation].reason}</p><dl className="rm-mission-stats"><dt>Return ETA</dt><dd>{metric(assessment.full.returnMinutes,'min')}</dd><dt>Reserve</dt><dd>{plan.assumptions.reserveMinutes} min</dd><dt>Oxygen margin after task + return + reserve</dt><dd>{metric(assessment.full.oxygenMargin,'% points')}</dd><dt>EVA margin after task + return + reserve</dt><dd>{metric(assessment.full.evaMargin,'min')}</dd></dl><p>Emergency point: {geo?`${geo.lat.toFixed(5)}° N, ${geo.lon.toFixed(5)}° E`:'Unavailable'}</p></details>
      {phase==='arrived'&&<button className="rm-pick-button" onClick={()=>{const report={type:'isolated-emergency-simulation',scenario:eventScenario,eventLocation:context?.location,eventOxygen:context?.arrivalOxygen,eventEvaMinutes:context?.remainingEvaMinutes,selectedTask:frozenPlan.task,resourceAssumptions:plan.assumptions,assessment,simulation,crewEvidence,oxygenRemaining:Math.max(0,arrivalOxygen-simulation.returnCost*simulation.fraction),evaMinutesRemaining:Math.max(0,eva-simulation.returnMinutes*simulation.fraction),limitations:['All event factors and policies are simulation assumptions.','No Mars weather, suit telemetry, repair or rescue capability is asserted.']};const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ares-emergency-simulation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Download emergency report</button>}
        <button className="rm-pick-button" onClick={reset}>Reset</button>
      </section>}
      <p className="rm-emergency-disclaimer">Simulation estimates · not operational guidance</p>
    </aside>
    <section className={phase==='arrived'?'rm-emergency-map has-comparison':picking?'rm-emergency-map is-picking':'rm-emergency-map'} aria-label="Emergency navigation map">
      <div className="rm-emergency-map-title"><div className="rm-view-switch" role="group" aria-label="Emergency map view"><button aria-pressed={view==='2D'} onClick={()=>setView('2D')}>2D Map</button><button aria-pressed={view==='3D'} onClick={()=>setView('3D')}>3D Tactical</button></div><span>{phase==='arrived'?'Return preview':phase==='traveling'?'Traveling':picking?'Select mission destination':''}</span></div>
      <RegionalMap2D emergencyOverlay={overlay} mapHelpId="rm-emergency-map-help" shared={shared} terrain={mapTerrain} analysis="none" opacity={.65} imagery contours={false} route={phase==='configuring'?routing.route:null} routeVisible={phase==='configuring'} destinationLabel="MISSION DESTINATION" destinationVisible={!!location} destination={location??sites[0]} picking={picking&&phase==='configuring'} onPick={pickLocation} hidden={view!=='2D'} blocked={false} grid scienceVisible={phase==='configuring'} selectedScienceId={targetId==='custom'?null:targetId} scienceFocus={null} onScienceSelect={chooseTarget} observations={[]} observationFocus={null} onObservationSelect={()=>{}} orbital={null} onOrbitalInspect={()=>{}}/>
      {view==='3D'&&<div className="rm-emergency-scene"><Suspense fallback={<p role="status">Loading tactical map…</p>}><Scene emergencyOverlay={overlay} imageryUrl={shared.imageryUrl} terrain={mapTerrain} layer="surface" contours={false} exaggeration={1} mode="3D" cameraAction={{kind:'reset',tick:0}} route={phase==='configuring'?routing.route:null} selected="custom" onSelect={()=>{}} onPick={pickLocation} planning={picking&&phase==='configuring'} progress={0} storm={false} markers={false} running={false} destination={location??sites[0]} blocked={false} scienceSitesVisible={phase==='configuring'} selectedScienceId={targetId==='custom'?null:targetId} onScienceSelect={chooseTarget}/></Suspense></div>}
      {phase==='arrived'&&<section className="rm-emergency-route-summary" aria-label="Route Comparison"><h3>Route Comparison</h3>
        {preferred?<div className="rm-route-option" style={{color:feasible?'#38c9ff':'#f39b58'}}>{feasible?<Check size={24}/>:<TriangleAlert size={24}/>}<div><strong>{feasible?'Recommended return':assessment.actions.return.state==='unknown'?'Return not assessed':'Return blocked'}</strong>{routeMetrics(preferred)}</div></div>:<p>{returns.loading?'Checking routes…':'No verified return route.'}</p>}
        {comparison.alternative?<div className="rm-route-option" style={{color:'#ff736b'}}><TriangleAlert size={24}/><div><strong>Higher-risk alternative</strong>{routeMetrics(comparison.alternative)}<small>{comparison.alternative.route.warnings.length} slope-warning segments</small></div></div>:!returns.loading&&<p className="rm-fineprint">No distinct higher-risk route verified.</p>}
        <p className="rm-route-guidance">{simulation.mode==='returned'?'At habitat.':simulation.mode==='returning'?'Following route to habitat.':feasible?'Choose Return to Habitat to start.':'Return not cleared. Review next action.'}</p>
        {preferred&&<details><summary>Route evidence</summary><p>Oxygen: {metric(preferred.assessment.full.returnCost,'% points')} · max slope: {preferred.route.maxSlope.toFixed(1)}° · {preferred.route.warnings.length} warnings</p>{comparison.alternative&&<p>Alternative: {metric(comparison.alternative.assessment.full.returnCost,'% points')} · max slope: {comparison.alternative.route.maxSlope.toFixed(1)}°</p>}</details>}
      </section>}
    </section>
  </div>;
}
