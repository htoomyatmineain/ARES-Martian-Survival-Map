import { directionArrows, type EmergencyOverlay } from './emergency';
import { sites } from './terrain';
export function EmergencyMapIcon({kind}:{kind:'habitat'|'crew'}){
  return <svg className="rm-emergency-icon" viewBox="-12 -12 24 24" role="img" aria-label={kind==='crew'?'Simulated astronaut helmet':'Simulated habitat'}>
    {kind==='crew'?<><circle r="11" fill="#102833" stroke="#38c9ff" strokeWidth="1.3"/><path d="M-8 5V-2a8 8 0 0 1 16 0v7L5 9H-5Z" fill="#15191e" stroke="#f4f3ef" strokeWidth="2"/><path d="M-5-3H5V2H-5Z" fill="#38c9ff"/><path d="M-4 6H4" stroke="#f4f3ef" strokeWidth="2"/></>:<><path d="M-10 0 0-9 10 0M-7-2V9H7V-2" fill="#15191e" stroke="#f4f3ef" strokeWidth="2"/><path d="M-2 9V2H2V9" fill="#38c9ff"/></>}
  </svg>;
}
export default function EmergencyRoute2D({overlay,units}:{overlay:EmergencyOverlay;units:number}){
  const points=(p:typeof overlay.points)=>p.map(p=>`${p.x},${p.z}`).join(' ');
  return <g className="rm-emergency-overlay" pointerEvents="none">
    {(overlay.trail?.length??0)>1&&<polyline data-testid="emergency-completed-trail" points={points(overlay.trail!)} fill="none" stroke="#b98a65" strokeWidth="2" opacity=".5" vectorEffect="non-scaling-stroke"><title>Completed outbound trail</title></polyline>}
    {(overlay.preview?.length??0)>1&&<polyline data-testid="emergency-planned-route" points={points(overlay.preview!)} fill="none" stroke="#f39b58" strokeWidth="2" strokeDasharray="6 6" opacity=".75" vectorEffect="non-scaling-stroke"><title>Verified planned outbound route · not traveled</title></polyline>}
    {overlay.alternative.length>1&&<polyline points={points(overlay.alternative)} fill="none" stroke="#ff736b" strokeWidth="3" strokeDasharray="8 6" vectorEffect="non-scaling-stroke"><title>Distinct verified higher-risk alternative</title></polyline>}
    {overlay.points.length>1&&<polyline data-testid="emergency-route-line" points={points(overlay.points)} fill="none" stroke={overlay.color} strokeWidth="3" vectorEffect="non-scaling-stroke"/>}
    {overlay.warnings.map((p,i)=><polyline key={i} points={points(p)} fill="none" stroke="#ff42dc" strokeWidth="4" strokeDasharray="3 4" vectorEffect="non-scaling-stroke"><title>Verified slope-bound warning segment; not an observed obstacle</title></polyline>)}
    {overlay.directions&&directionArrows(overlay.points).map((a,i)=><path key={i} transform={`translate(${a.point.x} ${a.point.z}) rotate(${a.degrees}) scale(${units})`} d="M-5-4 2 0-5 4" fill="none" stroke={overlay.color} strokeWidth="2"/>)}
    {[{point:sites[0],kind:'habitat' as const},...(overlay.crew?[{point:overlay.crew,kind:'crew' as const}]:[])].map(({point,kind})=><g key={kind} data-testid={kind==='crew'?'eva-crew-marker':'emergency-habitat-marker'} transform={`translate(${point.x} ${point.z})`}><foreignObject x={-12*units} y={-12*units} width={24*units} height={24*units}><EmergencyMapIcon kind={kind}/></foreignObject></g>)}
  </g>;
}
