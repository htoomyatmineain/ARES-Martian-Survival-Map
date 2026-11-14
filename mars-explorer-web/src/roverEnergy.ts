export type RoverEnergyPlan={capacityWh:number;initialPercent:number;drivingWatts:number;idleWatts:number;reservePercent:number};
export const ROVER_ENERGY_SOURCE='https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A17_PressKit.pdf#page=116';
export const ROVER_ENERGY_DEFAULTS:RoverEnergyPlan={capacityWh:2*36*121,initialPercent:100,drivingWatts:1000,idleWatts:100,reservePercent:20};
export const ROVER_ENERGY_NOTICE='Apollo 17 nominal battery-capacity analogue; driving/idle power and reserve are team assumptions, not measured Mars rover performance. No charging, thermal ageing, slope or soil power model.';
export function validRoverEnergy(p:RoverEnergyPlan){return Object.values(p).every(Number.isFinite)&&p.capacityWh>0&&p.initialPercent>0&&p.initialPercent<=100&&p.drivingWatts>0&&p.idleWatts>=0&&p.reservePercent>=0&&p.reservePercent<p.initialPercent;}
export const energyWh=(watts:number,minutes:number)=>watts*minutes/60;
export function roverEnergyReview(p:RoverEnergyPlan,outboundMinutes:number,returnMinutes:number,stopMinutes:number){
 const initialWh=p.capacityWh*p.initialPercent/100,reserveWh=p.capacityWh*p.reservePercent/100,requiredWh=energyWh(p.drivingWatts,outboundMinutes+returnMinutes)+energyWh(p.idleWatts,stopMinutes);
 return {initialWh,reserveWh,requiredWh,remainingWh:initialWh-requiredWh,ready:validRoverEnergy(p)&&[outboundMinutes,returnMinutes,stopMinutes].every(v=>Number.isFinite(v)&&v>=0)&&requiredWh+reserveWh<=initialWh+1e-9};
}
