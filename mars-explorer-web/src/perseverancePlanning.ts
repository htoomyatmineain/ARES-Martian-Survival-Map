import {estimateTravel} from './travelTime.ts';
import type {NativeRoute,RoutingRules} from './nativeRouting.ts';
export const PERSEVERANCE_REFERENCE_MAX_KMH=0.15; // approximately 150 m/hour wheel-speed reference, not a terrain guarantee.
export const PERSEVERANCE_SPEED_SOURCE='https://robotics.jpl.nasa.gov/what-we-do/flight-projects/mars-2020-rover/m2020mobility/';
export const PERSEVERANCE_TILT_SOURCE='https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/';
// Project ground-slope screening proxy. NASA guidance concerns rover body tilt, NOT these DEM bounds.
export const PERSEVERANCE_RULES:RoutingRules={alongLimit:30,crossLimit:30,totalLimit:30,slopeWeight:4,warningFraction:.8,profileId:'perseverance-screen',profileName:'Perseverance robotic terrain screen',profileSource:PERSEVERANCE_TILT_SOURCE,profileNote:'NASA drivers avoid rover body tilts over 30°. ARES uses 30° ground-slope bounds only as a project screening proxy, not a body-pose calculation or a validated drive limit. The 45° design tilt is not used. Rocks, clearance, slip and soil are unassessed.'};
export function roboticPlan(route:NativeRoute|null,speedKmh:number,target:string){
 const checked=route?.profileStatus==='verified'&&route.rules.profileId==='perseverance-screen'&&Number.isFinite(route.distance)&&route.distance>0;
 const validSpeed=Number.isFinite(speedKmh)&&speedKmh>0&&speedKmh<=PERSEVERANCE_REFERENCE_MAX_KMH;
 const estimate=checked&&validSpeed?estimateTravel(route.distance,speedKmh):null;
 let exportedRoute=null;if(checked&&route){const {minutes:_minutes,oxygen:_oxygen,feasible:_feasible,...terrainRoute}=route;exportedRoute=terrainRoute;}
 return {type:'perseverance-robotic-route-study',target,profileChecked:!!checked,movingMinutes:estimate?.minutes??null,speedKmh,speedBasis:speedKmh===.11?'NASA/JPL 110 m/hour reference used as constant':'User-selected rate; not measured performance',speedSource:PERSEVERANCE_SPEED_SOURCE,route:exportedRoute,limitations:['Hypothetical route from the scenario start; not the actual or current rover position.','Constant-speed moving-time estimate, not a drive-day schedule or arrival forecast.','No power, communications, thermal, science activity duration or rover command execution model.','Ground-slope screen is not a vehicle body-tilt, traction or obstacle assessment.','No astronauts, suit oxygen, EVA tasks or crew walk-back model.']};
}
