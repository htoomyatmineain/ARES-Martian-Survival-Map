import { calculateResources, type EmergencyResourcePlan } from './emergencyResources.ts';
import type { MissionSnapshot, MissionState } from './evaMission.ts';
import type { NativeRoute } from './nativeRouting.ts';
import { sites, type Point } from './terrain.ts';

/** Route locks at departure; Mission context refreshes at arrival. Oxygen is the selected ARRIVAL value. */
export interface EmergencyContext {
  scenario?:import('./emergencyScenario.ts').EmergencyScenario;
  location: Point;
  arrivalOxygen: number;
  outboundRoute: NativeRoute;
  missionSnapshot: MissionSnapshot | null;
  remainingScienceMinutes: number | null;
  remainingEvaMinutes?: number | null;
  resourcePlan?: EmergencyResourcePlan;
}
export const PLAYBACK_SECONDS = 20;
export function validReturn(route: NativeRoute | null, arrival: Point): route is NativeRoute {
  return !!route && validOutbound({ ...route, points: [...route.points].reverse() }, arrival);
}
export type ActionAvailability={state:'allowed'|'blocked'|'unknown';reason:string};
export function assessEmergency(plan:EmergencyResourcePlan,oxygen:number,route:NativeRoute|null,eva:number|null,criticalAt=10,noTerrainRoute=false){
  const full=calculateResources(plan,oxygen,route,eva);
  const partial=plan.task.partial&&!plan.shortened?calculateResources({...plan,shortened:true},oxygen,route,eva):null;
  const returnOxygenMargin=full.available===null||full.returnCost===null||full.reserveCost===null?null:full.available-full.returnCost-full.reserveCost;
  const returnEvaMargin=full.evaMinutes===null||full.returnMinutes===null?null:full.evaMinutes-full.returnMinutes-plan.assumptions.reserveMinutes;
  const critical=Number.isFinite(oxygen)&&oxygen>=0&&oxygen<=criticalAt;
  function availability(oxygenMargin:number|null,evaMargin:number|null):ActionAvailability{
    if(oxygenMargin!==null&&oxygenMargin< -1e-9)return {state:'blocked',reason:'Required oxygen plus reserve exceeds the arrival budget.'};
    if(evaMargin!==null&&evaMargin< -1e-9)return {state:'blocked',reason:'Required time plus reserve exceeds the remaining EVA budget.'};
    if(oxygenMargin===null||evaMargin===null)return {state:'unknown',reason:'Verified return evidence, oxygen or remaining EVA time is unavailable.'};
    return {state:'allowed',reason:'Oxygen and EVA time margins preserve the configured reserve under this model; unassessed constraints still apply.'};
  }
  const science=(r:typeof full):ActionAvailability=>critical?{state:'blocked',reason:'Critical oxygen policy prohibits science, even if arithmetic fits.'}:r.errors.length?{state:'blocked',reason:r.errors.join(' ')}:availability(r.oxygenMargin,r.evaMargin);
  const returning:ActionAvailability=noTerrainRoute?{state:'blocked',reason:'Neither independent search found a complete route under the configured terrain rules.'}:availability(returnOxygenMargin,returnEvaMargin);
  const actions={continue:science(full),shorten:partial?science(partial):{state:'blocked',reason:plan.shortened?'The selected plan already uses its predefined partial task.':'No predefined shortened task exists.'} as ActionAvailability,return:returning};
  const recommendation:'continue'|'shorten'|'return'|'contingency'|'unknown'=actions.continue.state==='allowed'?'continue':actions.shorten.state==='allowed'?'shorten':returning.state==='allowed'?'return':returning.state==='blocked'?'contingency':'unknown';
  const severity=critical||returning.state==='blocked'?'critical':recommendation==='unknown'?'unknown':recommendation==='return'||recommendation==='shorten'||(route?.warnings.length??0)>0?'warning':'normal';
  const contingency:ActionAvailability={state:recommendation==='contingency'?'allowed':recommendation==='unknown'?'unknown':'blocked',reason:recommendation==='contingency'?'No evaluated return satisfies the configured constraints. Simulate requesting assistance; rescue feasibility is not assessed.':recommendation==='unknown'?'Resolve missing route/resource/EVA evidence and simulate contacting base.':'An assessed option is available; no emergency contingency is required by this model.'};
  return {route,full,partial,returnOxygenMargin,returnEvaMargin,critical,severity,recommendation,actions:{...actions,contingency}};
}
/** Presentation follows calculated constraints; missing evidence is never a critical route claim. */
export function emergencyAlert(assessment:ReturnType<typeof assessEmergency>,noTerrainRoute=false){
  const a=assessment,r=a.full;
  const oxygenFailure=a.returnOxygenMargin!==null&&a.returnOxygenMargin< -1e-9;
  const timeFailure=a.returnEvaMargin!==null&&a.returnEvaMargin< -1e-9;
  const title=a.critical||oxygenFailure?'Low Oxygen':noTerrainRoute?'No Verified Return Route':timeFailure?'EVA Time Exceeded':a.recommendation==='unknown'?'Insufficient Data':r.oxygenMargin!==null&&r.oxygenMargin< -1e-9?'Mission Oxygen Margin':r.evaMargin!==null&&r.evaMargin< -1e-9?'Mission Time Margin':(a.route?.warnings.length??0)>0?'Terrain Slope Warnings':'Resource Assessment';
  const reason=a.critical?'Critical oxygen policy blocks science. '+a.actions.return.reason:noTerrainRoute?a.actions.return.reason:timeFailure?'Return travel plus contingency reserve exceeds the remaining EVA time.':oxygenFailure?'Return oxygen plus contingency reserve exceeds the arrival oxygen budget.':a.actions[a.recommendation==='unknown'?'return':a.recommendation].reason;
  const amount=(n:number|null,unit:string)=>n===null?'Unknown':`${n.toFixed(1)} ${unit}`;
  const returnOxygen=r.returnCost===null||r.reserveCost===null?null:r.returnCost+r.reserveCost;
  const returnTime=r.returnMinutes===null?null:r.returnMinutes+r.reserveMinutes;
  return {title,severity:a.severity,reason,evidence:[`Arrival oxygen: ${amount(r.available,'%')}; return + reserve: ${amount(returnOxygen,'percentage points')}.`,`EVA time remaining: ${amount(r.evaMinutes,'min')}; return + reserve: ${amount(returnTime,'min')}.`,`Selected science task: ${amount(r.taskMinutes,'min')}; task oxygen: ${amount(r.taskCost,'percentage points')}.`]};
}
export function compareEmergencyRoutes(plan:EmergencyResourcePlan,oxygen:number,eva:number|null,routes:NativeRoute[]){
  const candidates=routes.filter(r=>!!plan.location&&validReturn(r,plan.location)).filter((r,i,valid)=>!valid.slice(0,i).some(p=>!distinctRoute(p,r)))
    .map(route=>({route,assessment:assessEmergency(plan,oxygen,route,eva)}));
  const preferred=candidates.find(c=>c.assessment.actions.continue.state==='allowed')??candidates.find(c=>c.assessment.actions.shorten.state==='allowed')??candidates.find(c=>c.assessment.actions.return.state==='allowed')??candidates[0]??null;
  const alternative=preferred?candidates.find(c=>c!==preferred&&(terrainRiskier(c.route,preferred.route)||(preferred.assessment.actions.return.state==='allowed'&&c.assessment.actions.return.state==='blocked')))??null:null;
  return {candidates,preferred,alternative};
}
export function traveledRoute(route:NativeRoute,fraction:number):Point[]{
  if(!Number.isFinite(fraction)||fraction<=0)return [];if(fraction>=1)return route.points;
  const lengths=route.points.slice(1).map((p,i)=>Math.hypot(p.x-route.points[i].x,p.z-route.points[i].z));
  let remaining=lengths.reduce((a,b)=>a+b,0)*fraction;const result=[route.points[0]];
  for(let i=0;i<lengths.length;i++){if(remaining<lengths[i]){result.push(pointOnOutbound(route,fraction));break;}result.push(route.points[i+1]);remaining-=lengths[i];if(remaining===0)break;}
  return result;
}
export function directionArrows(points:Point[]){return points.slice(1).flatMap((p,i)=>{const a=points[i];return Math.hypot(p.x-a.x,p.z-a.z)>0&&i%Math.max(1,Math.floor((points.length-1)/4))===0?[{point:{x:(a.x+p.x)/2,z:(a.z+p.z)/2},degrees:Math.atan2(p.z-a.z,p.x-a.x)*180/Math.PI}]:[];}).slice(0,5);}
export type EmergencyOverlay={trail?:Point[];preview?:Point[];destination?:Point|null;points:Point[];color:string;alternative:Point[];warnings:Point[][];crew:Point|null;directions:boolean};
export type SimulatedEmergencyState={scienceFraction:number;scienceCost:number;scienceMinutes:number;scienceDone:boolean;mode:'idle'|'science-selected'|'returning'|'returned'|'contingency';fraction:number;shortened:boolean;contacts:number;message:string;returnRoute:NativeRoute|null;returnCost:number;returnMinutes:number};
export const initialEmergencyActions=():SimulatedEmergencyState=>({scienceFraction:0,scienceCost:0,scienceMinutes:0,scienceDone:false,mode:'idle',fraction:0,shortened:false,contacts:0,message:'All actions are simulated. No real communication or physical actuation.',returnRoute:null,returnCost:0,returnMinutes:0});
export type SimulatedEmergencyAction={type:'tick-science';fraction:number}|{type:'reset'}|{type:'contact'}|{type:'tick';fraction:number}|{type:'continue'|'shorten'|'return'|'contingency';assessment:ReturnType<typeof assessEmergency>;route:NativeRoute|null};
export function emergencyActionReducer(s:SimulatedEmergencyState,a:SimulatedEmergencyAction):SimulatedEmergencyState{
  if(a.type==='reset')return initialEmergencyActions();
  if(a.type==='contact')return {...s,contacts:s.contacts+1,message:'SIMULATED communication request recorded locally. No base connection or acknowledgement.'};
  if(a.type==='tick'){if(s.mode!=='returning'||!Number.isFinite(a.fraction))return s;const fraction=Math.max(s.fraction,Math.min(1,a.fraction));return {...s,fraction,mode:fraction===1?'returned':'returning',message:fraction===1?'Simulated return reached habitat. No real movement occurred.':s.message};}
  if(a.type==='tick-science'){if(s.mode!=='science-selected'||s.scienceDone||!Number.isFinite(a.fraction))return s;const scienceFraction=Math.max(s.scienceFraction,Math.min(1,a.fraction));return {...s,scienceFraction,scienceDone:scienceFraction===1,message:scienceFraction===1?'Simulated activity time complete. Crew evidence must be confirmed separately.':'Simulated science time and oxygen are advancing.'};}
  if(s.mode==='returning'||s.mode==='returned'||a.assessment.actions[a.type].state!=='allowed'||((a.type==='continue'||a.type==='shorten')&&s.mode==='science-selected'))return s;
  if(a.type==='return'){
    if(!a.route||a.assessment.route!==a.route||a.assessment.full.returnCost===null||a.assessment.full.returnMinutes===null)return s;
    return {...s,mode:'returning',fraction:0,returnRoute:structuredClone(a.route),returnCost:a.assessment.full.returnCost,returnMinutes:a.assessment.full.returnMinutes,message:'SIMULATED return guidance started along the verified return route.'};
  }
  return {...s,...(a.type==='continue'||a.type==='shorten'?{scienceMinutes:(a.type==='shorten'?a.assessment.partial:a.assessment.full)?.taskMinutes??0,scienceCost:(a.type==='shorten'?a.assessment.partial:a.assessment.full)?.taskCost??0,scienceFraction:0,scienceDone:false}:{}),mode:a.type==='contingency'?'contingency':'science-selected',shortened:s.shortened||a.type==='shorten',message:a.type==='contingency'?'Simulated emergency contingency selected. Assistance and rescue are not evaluated.':`Simulated ${a.type==='shorten'?'predefined partial':'full'} science plan selected; activity playback started; completion evidence remains crew-confirmed.`};
}
export function distinctRoute(a: NativeRoute, b: NativeRoute) {
  return a.points.length !== b.points.length || a.points.some((p, i) => Math.hypot(p.x - b.points[i].x, p.z - b.points[i].z) > .01);
}
export function terrainRiskier(candidate: NativeRoute, preferred: NativeRoute) {
  return candidate.warnings.length > 0 && (candidate.maxAlongSlope > preferred.maxAlongSlope + .01 ||
    candidate.maxCrossSlope > preferred.maxCrossSlope + .01 || candidate.maxSlope > preferred.maxSlope + .01);
}
export function oxygenLevel(value: number) {
  return value <= 10 ? 'Critical' : value < 30 ? 'Low' : value < 60 ? 'Caution' : 'Normal';
}
export function remainingScience(state: MissionState): number | null {
  if (!state.snapshot) return null;
  if (state.scienceCompleted) return 0;
  if (state.phase === 'science') return Math.max(0, state.snapshot.scienceMinutes - state.phaseElapsed);
  // An aborted task may have partial science progress that Mission does not retain.
  if (['returning', 'complete'].includes(state.phase)) return null;
  return state.snapshot.scienceMinutes;
}
export function validOutbound(route: NativeRoute | null, destination: Point | null): route is NativeRoute {
  if (!destination || !route || route.profileStatus !== 'verified' || route.approach ||
      !Number.isFinite(route.distance) || route.distance <= 0 || route.points.length < 2 ||
      route.profileSamples < 2 || !route.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.z))) return false;
  const first = route.points[0], last = route.points.at(-1)!;
  return Math.hypot(first.x - sites[0].x, first.z - sites[0].z) < .01 &&
    Math.hypot(last.x - destination.x, last.z - destination.z) < .01 &&
    Number.isFinite(route.maxAlongSlope + route.maxCrossSlope + route.maxSlope) &&
    route.maxAlongSlope <= route.rules.alongLimit && route.maxCrossSlope <= route.rules.crossLimit &&
    route.maxSlope <= route.rules.totalLimit;
}
export function pointOnOutbound(route: NativeRoute, fraction: number): Point {
  const points = route.points;
  if (fraction >= 1) return points.at(-1)!;
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.z - points[i].z));
  let remaining = Math.max(0, fraction) * lengths.reduce((sum, n) => sum + n, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] > 0 && remaining <= lengths[i]) {
      const f = remaining / lengths[i];
      return { x: points[i].x + (points[i + 1].x - points[i].x) * f, z: points[i].z + (points[i + 1].z - points[i].z) * f };
    }
    remaining -= lengths[i];
  }
  return points.at(-1)!;
}
