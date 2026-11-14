import {estimateTravel} from './travelTime.ts';
// Team policy: diagnostic warning by default; never a rescue or safety clearance.
export const MOBILITY_POLICY={walkBackBlocksReview:false};
export const WALK_BACK_LABEL='Time-only check. Assumes the outbound corridor stays usable. This check does not model oxygen, power, fatigue, load or walking-specific terrain safety.';
export const WALK_BACK_SOURCE='https://www.nasa.gov/wp-content/uploads/static/history/alsj/19790073512_1979073512.pdf';
export function walkBackCheck(metres:number,roverKmh:number,walkingKmh:number,scienceMinutes:number,budgetMinutes:number,reservePercent:number){
 const outbound=estimateTravel(metres,roverKmh),walking=estimateTravel(metres,walkingKmh);
 if(!outbound||!walking||![scienceMinutes,budgetMinutes,reservePercent].every(Number.isFinite)||scienceMinutes<0||budgetMinutes<=0||reservePercent<0||reservePercent>=100)return {status:'UNAVAILABLE' as const,label:WALK_BACK_LABEL};
 const worstCaseMinutes=outbound.minutes+scienceMinutes+walking.minutes,usableMinutes=budgetMinutes*(1-reservePercent/100);
 return {status:(worstCaseMinutes<=usableMinutes+1e-9?'OK':worstCaseMinutes<=budgetMinutes+1e-9?'USES RESERVE':'FAIL') as 'OK'|'USES RESERVE'|'FAIL',distanceMetres:metres,walkingKmh,outboundMinutes:outbound.minutes,walkBackMinutes:walking.minutes,worstCaseMinutes,usableMinutes,marginMinutes:budgetMinutes-worstCaseMinutes,label:WALK_BACK_LABEL,source:WALK_BACK_SOURCE};
}
export type WalkBackResult=ReturnType<typeof walkBackCheck>;
