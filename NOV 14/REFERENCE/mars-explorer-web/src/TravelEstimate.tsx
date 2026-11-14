import type {NativeRoute} from './nativeRouting';
import {estimateTravel,formatTravelMinutes,type TravelMode} from './travelTime';

export default function TravelEstimate({route,mode,speeds,onMode,onSpeed,locked=false,presentation='summary'}:{route:NativeRoute|null;mode:TravelMode;speeds:Record<TravelMode,string>;onMode:(mode:TravelMode)=>void;onSpeed:(mode:TravelMode,value:string)=>void;locked?:boolean;presentation?:'summary'|'settings'}){
  const speed=Number(speeds[mode]),validSpeed=speeds[mode].trim()!==''&&Number.isFinite(speed)&&speed>0;
  const verified=route?.profileStatus==='verified';
  const estimate=verified&&validSpeed?estimateTravel(route.distance,speed):null;
  return <section className={`rm-travel rm-travel-${presentation}`} aria-label={presentation==='summary'?'Travel time estimate':'Travel settings'}>
    {presentation==='summary'?<>
    <div className="rm-travel-result"><span>EST. ONE-WAY TRAVEL</span><strong data-testid="travel-time" aria-live="polite">{estimate?formatTravelMinutes(estimate.minutes):'—'}</strong></div>
    <p>{mode==='rover'?'Crewed rover':'Suited walking'} · {validSpeed?`${speed} km/h assumed average`:'Set an average speed in Mission'}</p>
    </>:<>
    <div className="rm-travel-controls"><label>Travel mode<select aria-label="Travel mode" value={mode} disabled={locked} onChange={e=>onMode(e.target.value as TravelMode)}><option value="rover">Crewed rover</option><option value="walk">Suited walking</option></select></label><label>Average speed · km/h<input aria-label="Average travel speed (km/h)" aria-describedby="rm-travel-assumption" type="number" min="0.1" step="0.1" value={speeds[mode]} disabled={locked} onChange={e=>onSpeed(mode,e.target.value)}/></label></div>
    {!validSpeed&&<p role="alert">Enter an average speed greater than zero.</p>}
    <p id="rm-travel-assumption">{validSpeed?`${(speed*1000/60).toFixed(1)} m/min · `:''}Demo average. Moving time only.</p>
    {!verified&&<p>{route?'Waiting for the native route profile.':'No verified route available.'}</p>}
    <details><summary>How this estimate works</summary><p>Assumed average, not measured Mars performance. Moving time only; stops and return trip excluded.</p><p>Time = verified route distance ÷ assumed average speed. Mode changes the estimate only; route limits are shared demo rules. There is no automatic slowdown for slope, soil, rocks or fatigue.</p><p>The 5 km/h rover default is our illustrative crewed-rover assumption, not Perseverance speed. The 2 km/h walking default uses a lunar planning analogy; neither is validated for Mars.</p><a href="https://ntrs.nasa.gov/citations/20250011301" target="_blank" rel="noreferrer">NASA crewed rover performance context</a><a href="https://www.nasa.gov/wp-content/uploads/2017/02/eva-exp-0042_xeva_system_con_ops_rev_b_final_dtd_10192020_ref_doc.pdf" target="_blank" rel="noreferrer">NASA lunar EVA concept · 2020, walking pace provisional</a></details>
    </>}
  </section>;
}
