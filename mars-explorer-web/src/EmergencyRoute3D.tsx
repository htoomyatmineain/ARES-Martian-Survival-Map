import { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import { drapePoints, meshHeight } from './nativeRouting';
import { sites, type Terrain, type Point } from './terrain';
import { directionArrows, type EmergencyOverlay } from './emergency';
import { EmergencyMapIcon } from './EmergencyRoute2D';
export default function EmergencyRoute3D({overlay,terrain,exaggeration}:{overlay:EmergencyOverlay;terrain:Terrain;exaggeration:number}){
  const at=(p:Point):[number,number,number]=>[p.x/1000,(meshHeight(terrain,p)-terrain.meta.min)/1000*exaggeration+.0005,p.z/1000];
  const lines=useMemo(()=>[...((overlay.trail?.length??0)>1?[{points:overlay.trail!,color:'#b98a65',dashed:false}]:[]),...((overlay.preview?.length??0)>1?[{points:overlay.preview!,color:'#f39b58',dashed:true}]:[]),...(overlay.alternative.length>1?[{points:overlay.alternative,color:'#ff736b',dashed:true}]:[]),...(overlay.points.length>1?[{points:overlay.points,color:overlay.color,dashed:false}]:[]),...overlay.warnings.map(points=>({points,color:'#ff42dc',dashed:true}))]
    .map(line=>({...line,points:drapePoints(terrain,line.points).map(p=>[p.x/1000,(meshHeight(terrain,p)-terrain.meta.min)/1000*exaggeration+.0005,p.z/1000] as [number,number,number])})),[overlay,terrain,exaggeration]);
  return <group>
    {lines.map((line,i)=><Line key={i} points={line.points} color={line.color} lineWidth={line.color==='#b98a65'?1:3} transparent opacity={line.color==='#b98a65'?.5:1} dashed={line.dashed} dashSize={.03} gapSize={.025} depthTest={false} depthWrite={false} renderOrder={9}/>)}
    {overlay.directions&&directionArrows(overlay.points).map((a,i)=>{const center=at(a.point),angle=a.degrees*Math.PI/180,ux=Math.cos(angle),uz=Math.sin(angle);const points=([[-.04,-.03],[.02,0],[-.04,.03]] as [number,number][]).map(([along,cross])=>[center[0]+ux*along-uz*cross,center[1],center[2]+uz*along+ux*cross] as [number,number,number]);return <Line key={i} points={points} color={overlay.color} lineWidth={2} depthTest={false} renderOrder={10}/>;})}
    <Html style={{pointerEvents:'none'}} position={at(sites[0])} center zIndexRange={[10,0]}><EmergencyMapIcon kind="habitat"/></Html>
    {overlay.crew&&<Html style={{pointerEvents:'none'}} position={at(overlay.crew)} center zIndexRange={[11,0]}><span data-testid="eva-crew-marker-3d"><EmergencyMapIcon kind="crew"/></span></Html>}
  </group>;
}
