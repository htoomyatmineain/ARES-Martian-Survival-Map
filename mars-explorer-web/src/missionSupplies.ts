export type SupplyPlan={oxygenMinutes:number;batteryMinutes:number;reserveMinutes:number};
export type SupplyLoss={oxygen:number;battery:number};
export const SUPPLY_DEFAULTS:SupplyPlan={oxygenMinutes:480,batteryMinutes:420,reserveMinutes:60};
export const validSupplyPlan=(p:SupplyPlan)=>Object.values(p).every(Number.isFinite)&&p.oxygenMinutes>0&&p.batteryMinutes>0&&p.reserveMinutes>=0&&p.reserveMinutes<Math.min(p.oxygenMinutes,p.batteryMinutes);
export function supplyReadings(plan:SupplyPlan,elapsed:number,loss:SupplyLoss={oxygen:0,battery:0}){
 return (['oxygen','battery'] as const).map(id=>{const capacity=id==='oxygen'?plan.oxygenMinutes:plan.batteryMinutes;const remaining=Math.max(0,capacity-elapsed-loss[id]);return {id,capacity,remaining,percent:remaining/capacity*100};});
}
