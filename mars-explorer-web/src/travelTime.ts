export type TravelMode = 'rover' | 'walk';
// Editable planning assumptions, not measured Mars vehicle/suit performance.
export const TRAVEL_DEFAULTS: Record<TravelMode, number> = { rover: 5, walk: 2 };
export function estimateTravel(distanceMetres:number,speedKmh:number){
  if(!Number.isFinite(distanceMetres)||distanceMetres<0||!Number.isFinite(speedKmh)||speedKmh<=0)return null;
  const metresPerMinute=speedKmh*1000/60,minutes=distanceMetres/metresPerMinute;
  if(!Number.isFinite(metresPerMinute)||metresPerMinute<=0||!Number.isFinite(minutes))return null;
  return {minutes,metresPerMinute};
}
export function formatTravelMinutes(minutes:number){
  if(!Number.isFinite(minutes)||minutes<0)return '—';
  if(minutes===0)return '0 min';
  const rounded=Math.ceil(minutes),hours=Math.floor(rounded/60),rest=rounded%60;
  return hours?`${hours} h${rest?` ${rest} min`:''}`:`${rounded} min`;
}
