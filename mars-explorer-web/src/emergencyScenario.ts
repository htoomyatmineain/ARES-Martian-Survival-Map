import {assessEmergency,traveledRoute,type EmergencyContext} from './emergency.ts';
import type {EmergencyResourcePlan} from './emergencyResources.ts';
import type {NativeRoute} from './nativeRouting.ts';
export type EmergencyScenario={kind:'oxygen'|'rover-failure'|'visibility';timing:'outbound'|'onsite'|'returning';fraction:number;evaMinutes:number;visibilityMetres:number;speedPercent:number;scienceAcknowledged:boolean};
export const SCENARIO_DEFAULTS:EmergencyScenario={kind:'oxygen',timing:'onsite',fraction:50,evaMinutes:240,visibilityMetres:50,speedPercent:50,scienceAcknowledged:false};
/** Scenario values at the emergency point, not measurements or outbound consumption. */
export const SCENARIO_OXYGEN={oxygen:20,'rover-failure':75,visibility:75} as const;
// Playback duration per travel, science or return stage; resource budgets stay unchanged.
export const PLAYBACK_STAGE_MS=12000;
export function advancePlayback(fraction:number,elapsedMs:number,speed:1|2){
 return Math.min(1,Math.max(0,fraction)+Math.max(0,elapsedMs)*speed/PLAYBACK_STAGE_MS);
}
export const SCENARIO_NAMES={oxygen:'Low oxygen','rover-failure':'Rover failure',visibility:'Reduced visibility'};
export function validScenario(s:EmergencyScenario){return ['oxygen','rover-failure','visibility'].includes(s.kind)&&['outbound','onsite','returning'].includes(s.timing)&&[s.fraction,s.evaMinutes,s.visibilityMetres,s.speedPercent].every(Number.isFinite)&&s.fraction>=5&&s.fraction<=95&&s.evaMinutes>0&&s.visibilityMetres>=0&&s.speedPercent>0&&s.speedPercent<=100&&(s.timing!=='returning'||s.scienceAcknowledged);}
/** Assemble only already verified corridor geometry. No straight-line shortcuts. */
export function eventJourney(route:NativeRoute|null,scenario:EmergencyScenario){
 if(!route||route.profileStatus!=='verified'||!validScenario(scenario))return null;
 const fraction=scenario.fraction/100,back=route.returnRoute;
 if(scenario.timing==='returning'&&(!back||back.profileStatus!=='verified'))return null;
 const points=scenario.timing==='outbound'?traveledRoute(route,fraction):scenario.timing==='returning'?[...route.points,...traveledRoute(back!,fraction).slice(1)]:route.points;
 if(points.length<2)return null;
 const location=points.at(-1)!;let distance=0;for(let i=1;i<points.length;i++)distance+=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);
 const outboundRoute:NativeRoute={...route,returnRoute:undefined,points,distance,maxAlongSlope:Math.max(route.maxAlongSlope,scenario.timing==='returning'?back!.maxAlongSlope:0),maxCrossSlope:Math.max(route.maxCrossSlope,scenario.timing==='returning'?back!.maxCrossSlope:0),maxSlope:Math.max(route.maxSlope,scenario.timing==='returning'?back!.maxSlope:0)};
 return {location,outboundRoute};
}
export function scenarioPlan(plan:EmergencyResourcePlan,s:EmergencyScenario,location:EmergencyContext['location']|null):EmergencyResourcePlan{return {...plan,location,assumptions:{...plan.assumptions,walkingKmh:plan.assumptions.walkingKmh*(s.kind==='visibility'?s.speedPercent/100:1)}};}
export function assessScenario(plan:EmergencyResourcePlan,oxygen:number,route:NativeRoute|null,eva:number|null,s:EmergencyScenario,noRoute=false,scienceDone=false){
 const a=assessEmergency(plan,oxygen,route,eva,10,noRoute);
 const unableToObserve=scienceDone||s.timing!=='onsite'||s.kind==='rover-failure'||s.kind==='visibility';
 if(unableToObserve){const reason=scienceDone?'Selected activity time is complete; review return guidance. Crew evidence remains separate.':s.timing==='outbound'?'Science target not reached; no on-site activity is permitted here.':s.timing==='returning'?'Science was already acknowledged before this return-leg event.':'This scenario suspends science and prioritizes return or assistance.';a.actions.continue={state:'blocked',reason};a.actions.shorten={state:'blocked',reason};}
 if(s.kind==='visibility'&&s.visibilityMetres<20)a.actions.return={state:'blocked',reason:'Visibility below the 20 m demonstration threshold: guidance is held; seek shelter/contact base. No safe movement or shelter location is established.'};
 if(!validScenario(s)){for(const key of ['continue','shorten','return'] as const)a.actions[key]={state:'blocked',reason:'Invalid scenario factors or missing pre-event science acknowledgement.'};}
 a.recommendation=a.actions.continue.state==='allowed'?'continue':a.actions.shorten.state==='allowed'?'shorten':a.actions.return.state==='allowed'?'return':a.actions.return.state==='unknown'?'unknown':'contingency';
 a.severity=a.critical||a.recommendation==='contingency'?'critical':a.recommendation==='unknown'?'unknown':a.recommendation==='continue'&&(a.route?.warnings.length??0)===0?'normal':'warning';
 a.actions.contingency={state:a.recommendation==='contingency'?'allowed':a.recommendation==='unknown'?'unknown':'blocked',reason:a.recommendation==='contingency'?'Movement is not cleared under these assumptions. Simulate contacting base; rescue is not evaluated.':'No contingency action is selected by the current assessment.'};
 return a;
}
