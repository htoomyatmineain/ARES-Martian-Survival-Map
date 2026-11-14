import type {RoutingRules} from './nativeRouting.ts';
import type {TravelMode} from './travelTime.ts';
// Team assumptions only; no NASA certification or measured Mars suit performance.
export const LOAD_PRESETS={baseline:{label:'Baseline · no extra load',speed:1,slope:1},light:{label:'Light kit',speed:.9,slope:.9},heavy:{label:'Heavy science kit',speed:.75,slope:.8}} as const;
export type LoadPreset=keyof typeof LOAD_PRESETS;
export const LOAD_LABEL='Load effects are planning assumptions, not certified suit limits.';
export function mobilityPlan(preset:LoadPreset,mode:TravelMode,baseWalkingKmh:number,rules:RoutingRules){
 const choice=LOAD_PRESETS[preset],active=mode==='walk',speedMultiplier=active?choice.speed:1,slopeMultiplier=active?choice.slope:1;
 return {preset,speedMultiplier,slopeMultiplier,baseWalkingKmh,effectiveWalkingKmh:baseWalkingKmh*speedMultiplier,effectiveSlopeLimitsDeg:{alongTrack:rules.alongLimit*slopeMultiplier,crossTrack:rules.crossLimit*slopeMultiplier,total:rules.totalLimit*slopeMultiplier},label:LOAD_LABEL};
}
export type MobilityPlan=ReturnType<typeof mobilityPlan>;
export function mobilityRules(base:RoutingRules,plan:MobilityPlan):RoutingRules{return {...base,alongLimit:plan.effectiveSlopeLimitsDeg.alongTrack,crossLimit:plan.effectiveSlopeLimitsDeg.crossTrack,totalLimit:plan.effectiveSlopeLimitsDeg.total};}
