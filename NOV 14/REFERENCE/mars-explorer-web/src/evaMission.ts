import {estimateTravel,type TravelMode} from './travelTime.ts';
import type {NativeRoute} from './nativeRouting.ts';
import {MARS_RADIUS,type Point} from './terrain.ts';

export type MissionPhase='planning'|'outbound'|'arrived'|'science'|'ready-return'|'returning'|'complete';
export type MissionSettings={mode:TravelMode;speedKmh:number;scienceMinutes:number;budgetMinutes:number;reservePercent:number;target:string;exclusion:boolean};
export type MissionSnapshot=MissionSettings&{route:NativeRoute;oneWayMinutes:number;reserveMinutes:number;createdAt:string};
export type MissionEvent={atMinutes:number;message:string};
export type MissionState={phase:MissionPhase;paused:boolean;rate:number;snapshot:MissionSnapshot|null;elapsed:number;phaseElapsed:number;outboundFraction:number;returnOriginFraction:number;aborted:boolean;scienceCompleted:boolean;events:MissionEvent[]};
export type MissionAction={type:'start';snapshot:MissionSnapshot}|{type:'tick';minutes:number}|{type:'pause'}|{type:'resume'}|{type:'science'}|{type:'return';abort?:boolean}|{type:'delay';minutes:number}|{type:'rate';rate:number}|{type:'reset'};
export function initialMission():MissionState{return {phase:'planning',paused:false,rate:600,snapshot:null,elapsed:0,phaseElapsed:0,outboundFraction:0,returnOriginFraction:0,aborted:false,scienceCompleted:false,events:[]};}
export function reviewMission(route:NativeRoute|null,s:MissionSettings){
 const errors:string[]=[];
 if(route?.approach&&s.scienceMinutes!==0)errors.push('Approach-only routes cannot include a science task at the unreached site.');
 if(!route||route.profileStatus!=='verified'||!Number.isFinite(route.distance)||route.distance<=0)errors.push('A verified route with a destination away from base is required.');
 if(!['rover','walk'].includes(s.mode)||!Number.isFinite(s.speedKmh)||s.speedKmh<=0)errors.push('Choose a positive average travel speed.');
 if(!Number.isFinite(s.scienceMinutes)||s.scienceMinutes<0||!Number.isFinite(s.budgetMinutes)||s.budgetMinutes<=0||!Number.isFinite(s.reservePercent)||s.reservePercent<0||s.reservePercent>=100)errors.push('Enter a valid science duration, time budget and reserve.');
 if(route&&(!Number.isFinite(route.maxAlongSlope)||!Number.isFinite(route.maxCrossSlope)||!Number.isFinite(route.maxSlope)||route.maxAlongSlope>route.rules.alongLimit||route.maxCrossSlope>route.rules.crossLimit||route.maxSlope>route.rules.totalLimit))errors.push('The route does not pass the configured demo slope rules.');
 const oneWay=route?estimateTravel(route.distance,s.speedKmh)?.minutes??NaN:NaN;
 if(!Number.isFinite(oneWay)||oneWay<=0)errors.push('A finite positive travel-time estimate is required.');
 const reserve=s.budgetMinutes*s.reservePercent/100,required=oneWay*2+s.scienceMinutes,usable=s.budgetMinutes-reserve;
 if(Number.isFinite(required)&&Number.isFinite(usable)&&required>usable+1e-9)errors.push('Round-trip travel and science exceed the time budget after reserving contingency time.');
 return {ready:errors.length===0,errors,oneWay,reserve,required,usable,buffer:usable-required};
}
export function makeSnapshot(route:NativeRoute,s:MissionSettings,createdAt=new Date().toISOString()):MissionSnapshot{
 const review=reviewMission(route,s);if(!review.ready)throw Error(review.errors.join(' '));
 return {...s,route:structuredClone(route),oneWayMinutes:review.oneWay,reserveMinutes:review.reserve,createdAt};
}
const add=(s:MissionState,message:string):MissionState=>({...s,events:[...s.events,{atMinutes:s.elapsed,message}]});
export function returnMinutes(s:MissionState){const p=s.snapshot;if(!p)return 0;return s.phase==='returning'?Math.max(0,p.oneWayMinutes*s.returnOriginFraction-s.phaseElapsed):s.phase==='complete'?0:p.oneWayMinutes*s.outboundFraction;}
function beginReturn(s:MissionState,abort=false){if(!s.snapshot||s.phase==='planning'||s.phase==='complete')return s;if(s.phase==='returning')return s;const fraction=s.outboundFraction;const next={...s,phase:(fraction===0?'complete':'returning') as MissionPhase,paused:false,phaseElapsed:0,returnOriginFraction:fraction,aborted:s.aborted||abort};return add(next,abort?'EVA aborted; returning along the verified outbound corridor.':'Return to habitat started along the verified outbound corridor.');}
function reserveCheck(s:MissionState){const p=s.snapshot;if(!p||['planning','returning','complete'].includes(s.phase))return s;if(p.budgetMinutes-s.elapsed<=returnMinutes(s)+p.reserveMinutes+1e-9)return add(beginReturn(s,true),'Return triggered because the demo time reserve would be reached.');return s;}
export function missionReducer(s:MissionState,a:MissionAction):MissionState{
 if(a.type==='reset')return initialMission();
 if(a.type==='rate')return [1,60,600].includes(a.rate)?{...s,rate:a.rate}:s;
 if(a.type==='start'){if(s.snapshot||s.phase!=='planning'||!reviewMission(a.snapshot.route,a.snapshot).ready)return s;const snapshot=makeSnapshot(a.snapshot.route,a.snapshot,a.snapshot.createdAt);return add({...initialMission(),rate:s.rate,phase:'outbound',snapshot},'EVA simulation departed the simulated habitat. Plan and travel assumptions locked.');}
 if(!s.snapshot)return s;
 if(a.type==='pause'&&['outbound','science','returning'].includes(s.phase))return add({...s,paused:true},'Simulation paused; mission clock is frozen.');
 if(a.type==='resume'&&s.paused&&['outbound','science','returning'].includes(s.phase))return add({...s,paused:false},'Simulation resumed.');
 if(a.type==='return')return beginReturn(s,!!a.abort);
 if(a.type==='science'&&s.phase==='arrived'&&!s.snapshot.route.approach)return s.snapshot.scienceMinutes===0?add({...s,phase:'ready-return',scienceCompleted:true},'No science stop planned; ready to return.'):add({...s,phase:'science',phaseElapsed:0,paused:false},'Simulated science task started.');
 if(a.type==='delay'){if(['planning','complete'].includes(s.phase)||!Number.isFinite(a.minutes)||a.minutes<=0)return s;return reserveCheck(add({...s,elapsed:s.elapsed+a.minutes},`${a.minutes} min operational delay injected; position unchanged.`));}
 if(a.type!=='tick'||s.paused||!['outbound','science','returning'].includes(s.phase)||!Number.isFinite(a.minutes)||a.minutes<=0)return s;
 const duration=s.phase==='outbound'?s.snapshot.oneWayMinutes:s.phase==='science'?s.snapshot.scienceMinutes:s.snapshot.oneWayMinutes*s.returnOriginFraction;
 const margin=s.snapshot.budgetMinutes-s.elapsed-s.snapshot.reserveMinutes-returnMinutes(s);
 const reserveStep=s.phase==='returning'?Infinity:Math.max(0,margin/(s.phase==='outbound'?2:1));
 const used=Math.min(a.minutes,Math.max(0,duration-s.phaseElapsed),reserveStep);let next={...s,elapsed:s.elapsed+used,phaseElapsed:s.phaseElapsed+used};
 if(s.phase==='outbound')next.outboundFraction=Math.min(1,next.phaseElapsed/duration);
 if(s.phase==='returning')next.outboundFraction=Math.max(0,s.returnOriginFraction*(1-next.phaseElapsed/duration));
 if(next.phaseElapsed>=duration-1e-9){
  if(s.phase==='outbound')next=s.snapshot.route.approach?add({...next,phase:'ready-return',paused:true,phaseElapsed:0,outboundFraction:1},'Approach point reached. Science site not reached; final leg unplanned. Clock paused for return review.'):add({...next,phase:'arrived',paused:true,phaseElapsed:0,outboundFraction:1},'Target reached. Simulation clock paused for task review.');
  else if(s.phase==='science')next=add({...next,phase:'ready-return',paused:true,phaseElapsed:0,scienceCompleted:true},'Planned science time completed in simulation. Clock paused for return review.');
  else next=add({...next,phase:'complete',phaseElapsed:0,outboundFraction:0,paused:false},s.aborted?'Aborted EVA simulation returned to habitat.':'EVA simulation returned to habitat.');
 }
 return reserveCheck(next);
}
export function pointOnMission(s:MissionState):Point|null{const points=s.snapshot?.route.points;if(!points?.length)return null;let total=0;const lengths=points.slice(1).map((p,i)=>{const d=Math.hypot(p.x-points[i].x,p.z-points[i].z);total+=d;return d;});let remaining=Math.max(0,Math.min(1,s.outboundFraction))*total;for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]&&lengths[i]>0){const f=remaining/lengths[i];return {x:points[i].x+(points[i+1].x-points[i].x)*f,z:points[i].z+(points[i+1].z-points[i].z)*f};}remaining-=lengths[i];}return points.at(-1)!;}
export function missionReport(s:MissionState,notes:string){let plan=null;if(s.snapshot){const {minutes:_minutes,oxygen:_oxygen,feasible:_feasible,...route}=s.snapshot.route;plan={...s.snapshot,route};}return {schemaVersion:1,type:'astronaut-eva-simulation',generatedAt:new Date().toISOString(),coordinateFrame:{centerLatitude:18.46,centerLongitude:77.42,radiusMetres:MARS_RADIUS,x:'east metres',z:'south metres'},timeUnit:'Earth minutes',phase:s.phase,outcome:s.phase==='complete'?(s.aborted?'aborted-returned':s.scienceCompleted?'completed':'returned-without-science'):'in-progress',elapsedMinutes:s.elapsed,scienceCompleted:s.scienceCompleted,notes,plan,events:s.events,limitations:['Simulated movement and time budget; no live astronaut tracking.','Travel speeds, time budget and reserve are demo assumptions.','Return retraces the verified outbound corridor under unchanged map conditions.','No validated oxygen, battery, soil-slip, weather, communications or suit model; not operational EVA clearance.']};}
