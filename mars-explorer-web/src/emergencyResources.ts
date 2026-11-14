import { mobilityPlan, mobilityRules, type LoadPreset } from './mobility.ts';
import { DEMO_RULES, type NativeRoute } from './nativeRouting.ts';
import { estimateTravel } from './travelTime.ts';
import type { MissionState } from './evaMission.ts';
import { sites, type Point } from './terrain.ts';
import type { ScienceTask } from './emergencyTasks.ts';

/** Normalized capacity is calibrated to a reference activity, never universal Mars endurance. */
export const RESOURCE_DEFAULTS={referenceMinutes:480,walkingKmh:2,reserveMinutes:60,walkRate:1,taskRate:1,reserveRate:1,lightLoad:1.1,heavyLoad:1.25};
export type ResourceAssumptions=typeof RESOURCE_DEFAULTS;
export type EmergencyResourcePlan={location:Point|null;task:ScienceTask;shortened:boolean;equipment:LoadPreset;activity:'walk'|'run';assumptions:ResourceAssumptions};
export function remainingEva(state:MissionState):number|null{
  return state.snapshot&&Number.isFinite(state.snapshot.budgetMinutes)&&Number.isFinite(state.elapsed)&&state.snapshot.budgetMinutes>0&&state.elapsed>=0?Math.max(0,state.snapshot.budgetMinutes-state.elapsed):null;
}
export function resourceRules(plan:EmergencyResourcePlan){return mobilityRules(DEMO_RULES,mobilityPlan(plan.equipment,'walk',plan.assumptions.walkingKmh,DEMO_RULES));}
export function taskDuration(plan:EmergencyResourcePlan){return plan.shortened?(plan.task.partial?.minutes??null):plan.task.minutes;}
export function calculateResources(plan:EmergencyResourcePlan,oxygen:number,route:NativeRoute|null,evaMinutes:number|null){
  const a=plan.assumptions,errors:string[]=[];
  if(!Object.values(a).every(Number.isFinite)||a.referenceMinutes<=0||a.walkingKmh<=0||a.reserveMinutes<0||[a.walkRate,a.taskRate,a.reserveRate,a.lightLoad,a.heavyLoad].some(n=>n<=0))errors.push('Invalid simulation assumptions.');
  if(plan.activity!=='walk')errors.push('Running unavailable: no supported workload/speed model.');
  if(!Number.isFinite(oxygen)||oxygen<0||oxygen>100)errors.push('Oxygen must be between 0 and 100%.');
  const baseErrors=[...errors],taskErrors:string[]=[];
  const rank={baseline:0,light:1,heavy:2};if(rank[plan.equipment]<rank[plan.task.equipment])taskErrors.push('Selected equipment does not meet the simulated task requirement.');
  const minutes=taskDuration(plan);if(minutes===null||!Number.isFinite(minutes)||minutes<0||!Number.isFinite(plan.task.workload)||plan.task.workload<=0)taskErrors.push('Task duration/workload unavailable.');
  const mobility=mobilityPlan(plan.equipment,'walk',a.walkingKmh,DEMO_RULES),limits=resourceRules(plan);
  const verified=!!route&&route.profileStatus==='verified'&&!route.approach&&Number.isFinite(route.distance)&&route.distance>0&&route.points.length>1&&route.profileSamples>1&&!!plan.location&&Math.hypot(route.points[0].x-plan.location.x,route.points[0].z-plan.location.z)<.01&&Math.hypot(route.points.at(-1)!.x-sites[0].x,route.points.at(-1)!.z-sites[0].z)<.01&&route.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z))&&
    [route.maxAlongSlope,route.maxCrossSlope,route.maxSlope].every(n=>Number.isFinite(n)&&n>=0)&&route.maxAlongSlope<=limits.alongLimit&&route.maxCrossSlope<=limits.crossLimit&&route.maxSlope<=limits.totalLimit;
  const returnMinutes=verified&&!baseErrors.length?estimateTravel(route!.distance,mobility.effectiveWalkingKmh)?.minutes??null:null;
  const load=plan.equipment==='heavy'?a.heavyLoad:plan.equipment==='light'?a.lightLoad:1;
  // Units: normalized percentage points. No outbound term: oxygen is measured at arrival.
  const rate=100/a.referenceMinutes;
  const available=errors.length?null:oxygen;
  const taskCost=baseErrors.length||taskErrors.length?null:minutes!*rate*a.taskRate*plan.task.workload*load;
  const returnCost=errors.length||returnMinutes===null?null:returnMinutes*rate*a.walkRate*load;
  const reserveCost=errors.length?null:a.reserveMinutes*rate*a.reserveRate;
  const required=taskCost===null||returnCost===null||reserveCost===null?null:taskCost+returnCost+reserveCost;
  const eva=evaMinutes!==null&&Number.isFinite(evaMinutes)&&evaMinutes>=0?evaMinutes:null;
  const requiredMinutes=minutes===null||returnMinutes===null?null:minutes+returnMinutes+a.reserveMinutes;
  return {errors:[...baseErrors,...taskErrors],reserveMinutes:a.reserveMinutes,taskMinutes:minutes,returnMinutes,available,taskCost,returnCost,reserveCost,required,
    oxygenMargin:available===null||required===null?null:available-required,evaMinutes:eva,
    evaMargin:eva===null||requiredMinutes===null?null:eva-requiredMinutes,effectiveWalkingKmh:mobility.effectiveWalkingKmh,
    unassessed:['CO₂ removal','Cooling','Suit battery','Physiology','Absolute geolocation']};
}
