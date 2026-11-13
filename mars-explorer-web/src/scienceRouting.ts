import {checkSegment,planNativeRoute,type HazardGrid,type NativeRoute,type RoutingRules} from './nativeRouting.ts';
import type {Point} from './terrain.ts';

// A search neighbourhood for the demo, not a validated operational stand-off distance.
export const APPROACH_RADIUS_METRES=250;
export type RouteDiagnosis={code:'start-blocked'|'destination-blocked'|'disconnected';message:string};
export function diagnoseRoute(grid:HazardGrid,start:Point,end:Point,rules:RoutingRules,blocked:boolean):RouteDiagnosis{
 const pointRules={...rules,alongLimit:89.999,crossLimit:89.999};
 for(const [point,label,code] of [[start,'Habitat','start-blocked'],[end,'Destination','destination-blocked']] as const){
  const check=checkSegment(grid,point,point,pointRules,blocked);
  if(!check.allowed)return {code,message:check.reason==='Slope rule exceeded'?`${label} cell ground-slope bound ${check.total.toFixed(1)}° exceeds the ${rules.totalLimit}° demo limit.`:`${label}: ${check.reason}.`};
 }
 return {code:'disconnected',message:'The destination cell passes the ground-slope check, but no connected 20 m search-grid path meets all along-route, sideways and ground-slope limits. Conservative cells can exclude possible paths; this is not proof the site is physically unreachable.'};
}
export function planScienceRoute(grid:HazardGrid,start:Point,end:Point,rules:RoutingRules,blocked=false,allowApproach=false):{route:NativeRoute|null;diagnosis?:RouteDiagnosis}{
 const exact=planNativeRoute(grid,start,end,rules,blocked);
 if(exact)return {route:exact};
 const diagnosis=diagnoseRoute(grid,start,end,rules,blocked);
 if(!allowApproach||diagnosis.code==='start-blocked'||Math.abs(end.x)>=grid.size/2||Math.abs(end.z)>=grid.size/2)return {route:null,diagnosis};
 const route=planNativeRoute(grid,start,end,rules,blocked,APPROACH_RADIUS_METRES);
 if(!route)return {route:null,diagnosis};
 const endpoint=route.points.at(-1)!;
 return {route:{...route,approach:{requested:{...end},endpoint:{...endpoint},gapMetres:Math.hypot(endpoint.x-end.x,endpoint.z-end.z),searchRadiusMetres:APPROACH_RADIUS_METRES,reason:diagnosis.message}},diagnosis};
}
