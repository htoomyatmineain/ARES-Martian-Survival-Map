import {PERSEVERANCE_REFERENCE_MAX_KMH} from './perseverancePlanning';
import type {NativeRoute} from './nativeRouting';
import {estimateTravel,formatTravelMinutes,TRAVEL_LABELS,type TravelMode} from './travelTime';

export default function TravelEstimate({route,mode,speeds,onMode,onSpeed,locked=false,walkingMultiplier=1,presentation='summary'}:{route:NativeRoute|null;mode:TravelMode;speeds:Record<TravelMode,string>;onMode:(mode:TravelMode)=>void;onSpeed:(mode:TravelMode,value:string)=>void;locked?:boolean;walkingMultiplier?:number;presentation?:'summary'|'settings'}){
  const speed=Number(speeds[mode])*(mode==='walk'?walkingMultiplier:1),validSpeed=speeds[mode].trim()!==''&&Number.isFinite(speed)&&speed>0&&(mode!=='perseverance'||speed<=PERSEVERANCE_REFERENCE_MAX_KMH);
  const verified=route?.profileStatus==='verified';
  const estimate=verified&&validSpeed?estimateTravel(route.distance,speed):null;
  return <section className={`rm-travel rm-travel-${presentation}`} aria-label={presentation==='summary'?'Travel time estimate':'Travel settings'}>
    {presentation==='summary'?<>
    <div className="rm-travel-result"><span>EST. ONE-WAY TRAVEL</span><strong data-testid="travel-time" aria-live="polite">{estimate?formatTravelMinutes(estimate.minutes):'—'}</strong></div>
    <p>{TRAVEL_LABELS[mode]} · {validSpeed?`${speed} km/h assumed average`:'Set an average speed in Mission'}</p>
    </>:<>
    <div className="rm-travel-controls"><label>Travel mode<select aria-label="Travel mode" value={mode} disabled={locked} onChange={e=>onMode(e.target.value as TravelMode)}><option value="rover">Crewed rover</option><option value="walk">Suited walking</option><option value="perseverance">Perseverance · robotic</option></select></label><label>Base speed · km/h<input aria-label="Average travel speed (km/h)" aria-describedby="rm-travel-assumption" type="number" min="0.01" max={mode==='perseverance'?PERSEVERANCE_REFERENCE_MAX_KMH:undefined} step="0.01" value={speeds[mode]} disabled={locked} onChange={e=>onSpeed(mode,e.target.value)}/></label></div>
    {!validSpeed&&<p role="alert">{mode==='perseverance'?'Enter a positive rate no higher than the approximately 0.15 km/h wheel-speed reference.':'Enter an average speed greater than zero.'}</p>}
    <p id="rm-travel-assumption">{validSpeed?`${(speed*1000/60).toFixed(1)} m/min · `:''}{mode==='perseverance'?'Robot rate assumption; NASA/JPL default 110 m/hour.':'Planning assumption.'} Moving time only.</p>
    {!verified&&<p>{route?'Waiting for the native route profile.':'No verified route available.'}</p>}
    <details><summary>How this estimate works</summary>{mode==='perseverance'&&<p>Perseverance default: 0.11 km/h (110 m/hour), NASA/JPL autonomous-driving reference. Not a daily average or an arrival forecast. Charging, communications and science operations are excluded. <a href="https://robotics.jpl.nasa.gov/what-we-do/flight-projects/mars-2020-rover/m2020mobility/" target="_blank" rel="noreferrer">NASA/JPL mobility source</a></p>}<p>Constant-rate planning estimate, not a guaranteed operating rate. Moving time only; stops and return trip excluded.</p><p>Time = verified route distance ÷ assumed average speed. Walking equipment can change both speed and route limits. The slope profile is a separate, explicitly selected planning assumption. There is no automatic slowdown for slope, soil, rocks or fatigue.</p><p>The 5 km/h rover default is our illustrative crewed-rover assumption, not Perseverance speed. The 2 km/h walking default uses a lunar planning analogy; neither is validated for Mars.</p><a href="https://ntrs.nasa.gov/citations/20250011301" target="_blank" rel="noreferrer">NASA crewed rover performance context</a><a href="https://www.nasa.gov/wp-content/uploads/2017/02/eva-exp-0042_xeva_system_con_ops_rev_b_final_dtd_10192020_ref_doc.pdf" target="_blank" rel="noreferrer">NASA lunar EVA concept · 2020, walking pace provisional</a></details>
    </>}
  </section>;
}
