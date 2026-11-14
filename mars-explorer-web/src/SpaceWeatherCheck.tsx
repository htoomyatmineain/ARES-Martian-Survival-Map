import {useEffect,useRef,useState} from 'react';
import {SOLAR_KINDS,SOLAR_WINDOW_DAYS,latestSolarEvents,nasaApiKey,parseSolarBody,solarUrl,solarWindow,type SolarEvent,type SolarKind} from './spaceWeather';
// null events = that catalogue could not be read; it stays unknown and is never shown as zero.
type KindResult={kind:SolarKind;label:string;events:SolarEvent[]|null};
type LookupState={status:'idle'|'loading'|'done'|'error';results:KindResult[];start?:string;end?:string;checked?:string};
const API_KEY=nasaApiKey(import.meta.env.VITE_NASA_API_KEY);
const SHORT:Record<SolarKind,string>={FLR:'Flare',CME:'CME',SEP:'Particle event'};
export default function SpaceWeatherCheck(){
 const [state,setState]=useState<LookupState>({status:'idle',results:[]});
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function check(){
  request.current?.abort();const c=new AbortController();request.current=c;
  const {start,end}=solarWindow();setState({status:'loading',results:[],start,end});
  const signal=AbortSignal.any([c.signal,AbortSignal.timeout(15000)]);
  const results=await Promise.all(SOLAR_KINDS.map(async({kind,label}):Promise<KindResult>=>{
   try{const response=await fetch(solarUrl(kind,start,end,API_KEY),{signal});if(!response.ok)throw Error('NASA request failed');return {kind,label,events:parseSolarBody(await response.text(),kind)};}
   catch{return {kind,label,events:null};}
  }));
  if(c.signal.aborted)return;
  setState(results.every(r=>r.events===null)?{status:'error',results:[],start,end}:{status:'done',results,start,end,checked:new Date().toISOString()});
 }
 const all=state.results.flatMap(r=>r.events??[]),particles=state.results.find(r=>r.kind==='SEP')?.events;
 return <section className="rm-conditions" aria-label="Earth-side solar event lookup"><h3>Space weather · DONKI</h3>
  <p>Earth-side solar observations — Mars conditions unknown. Counts NASA catalogue records for coronal mass ejections (solar eruptions) and solar energetic particle (SEP) events over the last {SOLAR_WINDOW_DAYS} days (UTC); other event types are not queried.</p>
  <button className="rm-pick-button" disabled={state.status==='loading'} onClick={check}>{state.status==='loading'?'Checking NASA…':'Check NASA solar events'}</button>
  <div role="status">
   {state.status==='idle'&&<p>Not checked. No environmental clearance is available.</p>}
   {state.status==='error'&&<p>Lookup unavailable: NASA rate limit, network or response error. Conditions remain unknown. Retry later or use the NASA catalogue.</p>}
   {state.status==='done'&&<>
    <ul>{state.results.map(r=><li key={r.kind}><b>{r.label}:</b> {r.events===null?'unavailable — unknown':`${r.events.length} catalogue record(s)`}</li>)}</ul>
    <p>{particles?.length?'Particle event(s) reported. Review with mission specialists; Mars exposure is not assessed.':'Catalogue counts describe activity observed from Earth’s side. They do not establish safe or unsafe conditions at Mars.'}</p>
    <p>{state.start} to {state.end} UTC · checked {state.checked}</p>
    {all.length>0&&<><p>Most recent records:</p><ul>{latestSolarEvents(all).map(e=><li key={`${e.kind}-${e.id}`}>{SHORT[e.kind]}{e.detail?` ${e.detail}`:''} · {e.url?<a href={e.url} target="_blank" rel="noreferrer">{e.id}</a>:e.id} · {e.time} UTC</li>)}</ul></>}
   </>}
  </div>
  <p>Information only. No automatic launch clearance or return action. {API_KEY==='DEMO_KEY'?'Using NASA’s shared DEMO_KEY, which is rate-limited.':'Using a team NASA API key.'} This lookup is not saved in the mission report.</p>
  <a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noreferrer">NASA DONKI catalogue</a>
 </section>;
}
