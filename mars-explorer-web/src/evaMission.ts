import {validRoverEnergy,roverEnergyReview,energyWh,ROVER_ENERGY_NOTICE,type RoverEnergyPlan} from './roverEnergy.ts';
import {DEPARTURE_CHECKS,missionProcedure} from './missionProcedure.ts';
import {LOAD_LABEL} from './mobility.ts';
import {walkBackCheck,MOBILITY_POLICY,WALK_BACK_LABEL,type WalkBackResult} from './walkBack.ts';
import type {MobilityPlan} from './mobility.ts';
import {missionConditions,RADIATION_LABEL,SITE_LABEL} from './missionConditions.ts';
import {supplyReadings,validSupplyPlan,type SupplyPlan,type SupplyLoss} from './missionSupplies.ts';
import {estimateTravel,TRAVEL_DEFAULTS,type TravelMode} from './travelTime.ts';
import type {NativeRoute} from './nativeRouting.ts';
import {MARS_RADIUS,type Point} from './terrain.ts';

export type MissionPhase='planning'|'outbound'|'arrived'|'science'|'ready-return'|'returning'|'complete';
export type MissionSettings={roverEnergy?:RoverEnergyPlan;recoveryMinutes?:number;requireReturn?:boolean;departureChecks?:string[];mode:TravelMode;speedKmh:number;scienceMinutes:number;budgetMinutes:number;reservePercent:number;target:string;walkBackWalkingKmh?:number;load?:MobilityPlan;targetId?:string;exclusion:boolean;supplies?:SupplyPlan};
export type MissionSnapshot=MissionSettings&{route:NativeRoute;oneWayMinutes:number;returnTravelMinutes?:number;reserveMinutes:number;createdAt:string;walkBack?:WalkBackResult|null};
export type MissionEvent={atMinutes:number;message:string};
export type MissionState={roverUsedWh?:number;phase:MissionPhase;paused:boolean;rate:number;snapshot:MissionSnapshot|null;elapsed:number;phaseElapsed:number;outboundFraction:number;returnOriginFraction:number;aborted:boolean;scienceCompleted:boolean;events:MissionEvent[];supplyLoss:SupplyLoss;confirmedTasks:string[]};
export type MissionAction={type:'supply-loss';supply:'oxygen'|'battery';minutes:number}|{type:'confirm-task';id:string;confirmed:boolean}|{type:'start';snapshot:MissionSnapshot}|{type:'tick';minutes:number}|{type:'pause'}|{type:'resume'}|{type:'science'}|{type:'return';abort?:boolean}|{type:'delay';minutes:number}|{type:'rate';rate:number}|{type:'reset'};
export function initialMission():MissionState{return {phase:'planning',paused:false,rate:600,snapshot:null,elapsed:0,phaseElapsed:0,outboundFraction:0,returnOriginFraction:0,aborted:false,scienceCompleted:false,events:[],supplyLoss:{oxygen:0,battery:0},confirmedTasks:[]};}
export function reviewMission(route:NativeRoute|null,s:MissionSettings){
 const errors:string[]=[];
 const back=route?.returnRoute;
 if(s.requireReturn&&!back)errors.push('No assessed return route. Wait for both native route profiles to be verified.');
 if(back){
 const first=back.points[0],last=back.points.at(-1),outStart=route!.points[0],outEnd=route!.points.at(-1);
 if(back.profileStatus!=='verified'||!Number.isFinite(back.distance)||back.distance<=0||!first||!last||!outStart||!outEnd||Math.hypot(first.x-outEnd.x,first.z-outEnd.z)>0.01||Math.hypot(last.x-outStart.x,last.z-outStart.z)>0.01||!Number.isFinite(back.maxAlongSlope)||!Number.isFinite(back.maxCrossSlope)||!Number.isFinite(back.maxSlope)||back.maxAlongSlope>route!.rules.alongLimit||back.maxCrossSlope>route!.rules.crossLimit||back.maxSlope>route!.rules.totalLimit)errors.push('Return route is unverified, disconnected or outside the configured slope rules.');
 }

 if(s.recoveryMinutes!==undefined&&(!Number.isFinite(s.recoveryMinutes)||s.recoveryMinutes<0))errors.push('Enter a non-negative recovery duration.');
 if(route?.approach&&(s.recoveryMinutes??0)!==0)errors.push('Approach-only plans exclude destination recovery stops.');
 if(s.departureChecks&&DEPARTURE_CHECKS.some(check=>!s.departureChecks!.includes(check.id)))errors.push('Complete all simulated departure confirmations.');
 if(s.load&&s.mode==='walk'&&route){const l=s.load.effectiveSlopeLimitsDeg;if(route.rules.alongLimit!==l.alongTrack||route.rules.crossLimit!==l.crossTrack||route.rules.totalLimit!==l.total||s.speedKmh!==s.load.effectiveWalkingKmh)errors.push('Route must be recalculated under the selected equipment assumptions.');}
 if(route?.approach&&s.scienceMinutes!==0)errors.push('Approach-only routes cannot include a science task at the unreached site.');
 if(!route||route.profileStatus!=='verified'||!Number.isFinite(route.distance)||route.distance<=0)errors.push('A verified route with a destination away from base is required.');
 if(!['rover','walk'].includes(s.mode)||!Number.isFinite(s.speedKmh)||s.speedKmh<=0)errors.push('Choose a positive average travel speed.');
 if(!Number.isFinite(s.scienceMinutes)||s.scienceMinutes<0||!Number.isFinite(s.budgetMinutes)||s.budgetMinutes<=0||!Number.isFinite(s.reservePercent)||s.reservePercent<0||s.reservePercent>=100)errors.push('Enter a valid science duration, time budget and reserve.');
 if(route&&(!Number.isFinite(route.maxAlongSlope)||!Number.isFinite(route.maxCrossSlope)||!Number.isFinite(route.maxSlope)||route.maxAlongSlope>route.rules.alongLimit||route.maxCrossSlope>route.rules.crossLimit||route.maxSlope>route.rules.totalLimit))errors.push('The route does not pass the configured demo slope rules.');
 const oneWay=route?estimateTravel(route.distance,s.speedKmh)?.minutes??NaN:NaN;
 if(!Number.isFinite(oneWay)||oneWay<=0)errors.push('A finite positive travel-time estimate is required.');
 const returnTravel=back?estimateTravel(back.distance,s.speedKmh)?.minutes??NaN:oneWay;
 if(!Number.isFinite(returnTravel)||returnTravel<=0)errors.push('A valid return travel estimate is required.');
 const roverEnergy=s.mode==='rover'&&s.roverEnergy?roverEnergyReview(s.roverEnergy,oneWay,returnTravel,s.scienceMinutes+(s.recoveryMinutes??0)):null;
 if(roverEnergy&&!roverEnergy.ready)errors.push('Rover energy settings are invalid or the round trip exceeds available energy after reserve.');
 const reserve=s.budgetMinutes*s.reservePercent/100,required=oneWay+returnTravel+s.scienceMinutes+(s.recoveryMinutes??0),usable=s.budgetMinutes-reserve;
 if(Number.isFinite(required)&&Number.isFinite(usable)&&required>usable+1e-9)errors.push('Round-trip travel and science exceed the time budget after reserving contingency time.');
 if(s.supplies&&(!validSupplyPlan(s.supplies)||required+s.supplies.reserveMinutes>Math.min(s.supplies.oxygenMinutes,s.supplies.batteryMinutes)))errors.push('Round trip and science exceed a modelled supply budget after reserve, or supply settings are invalid.');
 const walkBack=s.mode==='rover'&&route?.profileStatus==='verified'?walkBackCheck(route.distance,s.speedKmh,s.walkBackWalkingKmh??TRAVEL_DEFAULTS.walk,s.scienceMinutes+(s.recoveryMinutes??0),s.budgetMinutes,s.reservePercent):null;
 if(MOBILITY_POLICY.walkBackBlocksReview&&walkBack&&(walkBack.status==='FAIL'||walkBack.status==='UNAVAILABLE'))errors.push('The time-only walk-back check does not pass.');
 return {ready:errors.length===0,errors,oneWay,returnTravel,roverEnergy,reserve,required,usable,buffer:usable-required,walkBack};
}
export function makeSnapshot(route:NativeRoute,s:MissionSettings,createdAt=new Date().toISOString()):MissionSnapshot{
 const review=reviewMission(route,s);if(!review.ready)throw Error(review.errors.join(' '));
 return {...structuredClone(s),route:structuredClone(route),oneWayMinutes:review.oneWay,returnTravelMinutes:review.returnTravel,reserveMinutes:review.reserve,walkBack:review.walkBack,createdAt};
}
const add=(s:MissionState,message:string):MissionState=>({...s,events:[...s.events,{atMinutes:s.elapsed,message}]});
const plannedReturn=(s:MissionState)=>s.snapshot?.returnTravelMinutes??s.snapshot?.oneWayMinutes??0;
const activeReturnDuration=(s:MissionState)=>s.returnOriginFraction===1?plannedReturn(s):(s.snapshot?.oneWayMinutes??0)*s.returnOriginFraction;
export function returnMinutes(s:MissionState){const p=s.snapshot;if(!p)return 0;return s.phase==='returning'?Math.max(0,activeReturnDuration(s)-s.phaseElapsed):s.phase==='complete'?0:Math.max(p.oneWayMinutes,plannedReturn(s))*s.outboundFraction;}

function beginReturn(s:MissionState,abort=false){if(!s.snapshot||s.phase==='planning'||s.phase==='complete')return s;if(s.phase==='returning')return s;const fraction=s.outboundFraction;const next={...s,phase:(fraction===0?'complete':'returning') as MissionPhase,paused:false,phaseElapsed:0,returnOriginFraction:fraction,aborted:s.aborted||abort};return add(next,abort?fraction===1&&s.snapshot.route.returnRoute?'EVA aborted; using the verified return corridor.':'EVA aborted; retracing the traversed outbound corridor.':fraction===1&&s.snapshot.route.returnRoute?'Return started along the separately verified return corridor.':'Return started by retracing the traversed outbound corridor.');}
export const supplyRemaining=(s:MissionState)=>s.snapshot?.supplies?supplyReadings(s.snapshot.supplies,s.elapsed,s.supplyLoss):[];
export function roverBattery(s:MissionState){const p=s.snapshot?.mode==='rover'?s.snapshot.roverEnergy:undefined;if(!p||!validRoverEnergy(p))return null;const usedWh=s.roverUsedWh??0,remainingWh=Math.max(0,p.capacityWh*p.initialPercent/100-usedWh),returnWh=energyWh(p.drivingWatts,returnMinutes(s)),reserveWh=p.capacityWh*p.reservePercent/100;return {usedWh,remainingWh,percent:remainingWh/p.capacityWh*100,returnWh,reserveWh};}
export const suppliesDepleted=(s:MissionState)=>supplyRemaining(s).some(r=>r.remaining<=1e-9)||(roverBattery(s)?.remainingWh??Infinity)<=1e-9;

function reserveCheck(s:MissionState){const battery=roverBattery(s);if(battery&&!suppliesDepleted(s)&&battery.remainingWh>1e-9&&!['planning','returning','complete'].includes(s.phase)&&battery.remainingWh<=battery.returnWh+battery.reserveWh+1e-9)return add(beginReturn(s,true),'Automatic return: simulated rover energy reserve reached.');if(suppliesDepleted(s)&&s.phase!=='complete')return add({...s,paused:true},'Modelled supply exhausted. Movement stopped; no assessed self-return. Assistance required in this simulation.');if(s.snapshot?.supplies&&!['planning','returning','complete'].includes(s.phase)&&supplyRemaining(s).some(r=>r.remaining<=returnMinutes(s)+s.snapshot!.supplies!.reserveMinutes+1e-9))return add(beginReturn(s,true),'Automatic return: modelled supply return reserve reached (demo policy).');const p=s.snapshot;if(!p||['planning','returning','complete'].includes(s.phase))return s;if(p.budgetMinutes-s.elapsed<=returnMinutes(s)+p.reserveMinutes+1e-9)return add(beginReturn(s,true),'Return triggered because the demo time reserve would be reached.');return s;}
export function missionReducer(s:MissionState,a:MissionAction):MissionState{
 if(a.type==='reset')return initialMission();
 if(a.type==='rate')return [1,60,600].includes(a.rate)?{...s,rate:a.rate}:s;
 if(a.type==='start'){if(s.snapshot||s.phase!=='planning'||!reviewMission(a.snapshot.route,a.snapshot).ready)return s;const snapshot=makeSnapshot(a.snapshot.route,a.snapshot,a.snapshot.createdAt);return add({...initialMission(),rate:s.rate,phase:'outbound',snapshot},'EVA simulation departed the simulated habitat. Plan and travel assumptions locked.');}
 if(!s.snapshot)return s;
 if(a.type==='supply-loss'){if(s.phase==='complete'||!s.snapshot.supplies||!Number.isFinite(a.minutes)||a.minutes<=0)return s;return reserveCheck(add({...s,supplyLoss:{...s.supplyLoss,[a.supply]:s.supplyLoss[a.supply]+a.minutes}},`Simulated ${a.supply} loss: ${a.minutes} equivalent minutes removed.`));}
 if(a.type==='confirm-task'){if(!['science','ready-return'].includes(s.phase)||s.snapshot.route.approach||!['document','observe','record'].includes(a.id))return s;return add({...s,confirmedTasks:a.confirmed?[...new Set([...s.confirmedTasks,a.id])]:s.confirmedTasks.filter(id=>id!==a.id)},`Simulated crew task ${a.id}: ${a.confirmed?'confirmed':'unconfirmed'}.`);}
 if(a.type==='pause'&&['outbound','science','returning'].includes(s.phase))return add({...s,paused:true},'Simulation paused; mission clock is frozen.');
 if(a.type==='resume'&&!suppliesDepleted(s)&&s.paused&&['outbound','science','returning'].includes(s.phase))return add({...s,paused:false},'Simulation resumed.');
 if(a.type==='return'&&suppliesDepleted(s))return s;
 if(a.type==='return')return beginReturn(s,!!a.abort);
 if(a.type==='science'&&s.phase==='arrived'&&!s.snapshot.route.approach)return (s.snapshot.scienceMinutes+(s.snapshot.recoveryMinutes??0))===0?add({...s,phase:'ready-return',scienceCompleted:true},'No science stop planned; ready to return.'):add({...s,phase:'science',phaseElapsed:0,paused:false},'Simulated destination stop started: planned documentation and recovery time. No task completion is inferred.');
 if(a.type==='delay'){if(['planning','complete'].includes(s.phase)||!Number.isFinite(a.minutes)||a.minutes<=0)return s;return reserveCheck(add({...s,elapsed:s.elapsed+a.minutes,roverUsedWh:(s.roverUsedWh??0)+(s.snapshot.mode==='rover'&&s.snapshot.roverEnergy?energyWh(s.snapshot.roverEnergy.idleWatts,a.minutes):0)},`${a.minutes} min operational delay injected; position unchanged.`));}
 if(a.type!=='tick'||suppliesDepleted(s)||s.paused||!['outbound','science','returning'].includes(s.phase)||!Number.isFinite(a.minutes)||a.minutes<=0)return s;
 const duration=s.phase==='outbound'?s.snapshot.oneWayMinutes:s.phase==='science'?s.snapshot.scienceMinutes+(s.snapshot.recoveryMinutes??0):activeReturnDuration(s);
 const margin=s.snapshot.budgetMinutes-s.elapsed-s.snapshot.reserveMinutes-returnMinutes(s);
 const resourceMargin=s.snapshot.supplies?Math.min(...supplyRemaining(s).map(r=>r.remaining-returnMinutes(s)-s.snapshot!.supplies!.reserveMinutes)):Infinity;
 const resourceStep=s.phase==='returning'?Math.min(Infinity,...supplyRemaining(s).map(r=>r.remaining)):Math.max(0,resourceMargin/(s.phase==='outbound'?1+Math.max(s.snapshot.oneWayMinutes,plannedReturn(s))/s.snapshot.oneWayMinutes:1));
 const reserveStep=s.phase==='returning'?Infinity:Math.max(0,margin/(s.phase==='outbound'?1+Math.max(s.snapshot.oneWayMinutes,plannedReturn(s))/s.snapshot.oneWayMinutes:1));
 const battery=roverBattery(s),power=s.snapshot.mode==='rover'&&s.snapshot.roverEnergy?(['outbound','returning'].includes(s.phase)?s.snapshot.roverEnergy.drivingWatts:s.snapshot.roverEnergy.idleWatts):0;
 const energyRate=power/60,returnRate=s.phase==='outbound'&&s.snapshot.roverEnergy?energyWh(s.snapshot.roverEnergy.drivingWatts,Math.max(s.snapshot.oneWayMinutes,plannedReturn(s))/s.snapshot.oneWayMinutes):0;
 const energyStep=!battery?Infinity:s.phase==='returning'?(energyRate>0?battery.remainingWh/energyRate:Infinity):energyRate+returnRate>0?Math.max(0,(battery.remainingWh-battery.returnWh-battery.reserveWh)/(energyRate+returnRate)):Infinity;
 const used=Math.min(a.minutes,energyStep,resourceStep,Math.max(0,duration-s.phaseElapsed),reserveStep);let next={...s,elapsed:s.elapsed+used,phaseElapsed:s.phaseElapsed+used,...(s.snapshot.roverEnergy?{roverUsedWh:(s.roverUsedWh??0)+energyWh(power,used)}:{})};
 if(s.phase==='outbound')next.outboundFraction=Math.min(1,next.phaseElapsed/duration);
 if(s.phase==='returning')next.outboundFraction=Math.max(0,s.returnOriginFraction*(1-next.phaseElapsed/duration));
 if(next.phaseElapsed>=duration-1e-9){
  if(s.phase==='outbound')next=s.snapshot.route.approach?add({...next,phase:'ready-return',paused:true,phaseElapsed:0,outboundFraction:1},'Approach point reached. Science site not reached; final leg unplanned. Clock paused for return review.'):add({...next,phase:'arrived',paused:true,phaseElapsed:0,outboundFraction:1},'Target reached. Simulation clock paused for task review.');
  else if(s.phase==='science')next=add({...next,phase:'ready-return',paused:true,phaseElapsed:0,scienceCompleted:true},'Planned destination activity and recovery time completed. Crew confirmations remain separate. Clock paused for return review.');
  else next=add({...next,phase:'complete',phaseElapsed:0,outboundFraction:0,paused:false},s.aborted?'Aborted EVA simulation returned to habitat.':'EVA simulation returned to habitat.');
 }
 return reserveCheck(next);
}
export function pointOnMission(s:MissionState):Point|null{const separate=s.phase==='returning'&&s.returnOriginFraction===1&&s.snapshot?.route.returnRoute;const points=separate?separate.points:s.snapshot?.route.points;if(!points?.length)return null;let total=0;const lengths=points.slice(1).map((p,i)=>{const d=Math.hypot(p.x-points[i].x,p.z-points[i].z);total+=d;return d;});let remaining=Math.max(0,Math.min(1,separate?s.phaseElapsed/activeReturnDuration(s):s.outboundFraction))*total;for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]&&lengths[i]>0){const f=remaining/lengths[i];return {x:points[i].x+(points[i+1].x-points[i].x)*f,z:points[i].z+(points[i+1].z-points[i].z)*f};}remaining-=lengths[i];}return points.at(-1)!;}
export function missionReport(s:MissionState,notes:string){let plan=null;if(s.snapshot){const {minutes:_minutes,oxygen:_oxygen,feasible:_feasible,...route}=s.snapshot.route;plan={...s.snapshot,route};}return {schemaVersion:1,type:'astronaut-eva-simulation',generatedAt:new Date().toISOString(),coordinateFrame:{centerLatitude:18.46,centerLongitude:77.42,radiusMetres:MARS_RADIUS,x:'east metres',z:'south metres'},timeUnit:'Earth minutes',phase:s.phase,outcome:s.phase==='complete'?(s.aborted?'aborted-returned':s.scienceCompleted?'completed':'returned-without-science'):'in-progress',elapsedMinutes:s.elapsed,scienceCompleted:s.scienceCompleted,scienceDurationCompleted:s.scienceCompleted,crewConfirmedTasks:s.confirmedTasks,procedure:s.snapshot?missionProcedure(s.snapshot.targetId??'custom'):null,taskEvidence:s.snapshot?missionProcedure(s.snapshot.targetId??'custom').tasks.map(task=>({...task,crewConfirmed:s.confirmedTasks.includes(task.id),evidenceNote:notes.trim()||null,evidenceType:'self-reported simulation; not independently verified'})):[],departureChecks:s.snapshot?.departureChecks??[],supplyReadings:supplyRemaining(s),roverBattery:roverBattery(s),supplyLoss:s.supplyLoss,notes,plan,events:s.events,walkBack:s.snapshot?.walkBack??null,load:s.snapshot?.load??null,conditions:s.snapshot?missionConditions(s.snapshot.targetId??'custom',s.snapshot.oneWayMinutes+plannedReturn(s)+s.snapshot.scienceMinutes+(s.snapshot.recoveryMinutes??0),s.snapshot.budgetMinutes):null,limitations:['Simulated movement and time budget; no live astronaut tracking.',RADIATION_LABEL,SITE_LABEL,LOAD_LABEL,WALK_BACK_LABEL,ROVER_ENERGY_NOTICE,'Travel speeds, time budget and reserve are demo assumptions.','Endpoint returns use the separately verified return corridor when available; early aborts retrace the traversed outbound corridor. Static terrain, assumed equal directional speeds; new hazards require a new plan.','Oxygen and suit power are constant-rate endurance analogues, not validated Mars hardware or physiology. Rover energy uses optional constant-power assumptions; soil, weather and rescue not modelled; not operational EVA clearance.']};}
