import { useMemo, useState } from 'react';
import { imageryTriangle, imageryPixelToWorld } from './imageryProjection';
import type { SharedRegionalMap } from './sharedRegionalData';
export default function SharedImageryTiles({shared,bounds}:{shared:SharedRegionalMap;bounds:number[]}) {
  const [failed,setFailed]=useState(false);
  const patches=useMemo(()=>{
    const p=shared.manifest.products.imagery;
    return p.tiles.flatMap((tile,index)=>{
      const w=tile.width,h=tile.height,window=tile.sourceWindow;
      const corners=[[0,0],[w,0],[w,h],[0,h]].map(([u,v])=>imageryPixelToWorld(p,window[0]+u,window[1]+v));
      if(Math.max(...corners.map(v=>v.x))<bounds[0]||Math.min(...corners.map(v=>v.x))>bounds[2]||Math.max(...corners.map(v=>v.z))<bounds[1]||Math.min(...corners.map(v=>v.z))>bounds[3])return [];
      const result=[];
      for(let y=0;y<2;y++)for(let x=0;x<2;x++){
        const a:[number,number]=[x*w/2,y*h/2],b:[number,number]=[(x+1)*w/2,y*h/2],c:[number,number]=[(x+1)*w/2,(y+1)*h/2],d:[number,number]=[x*w/2,(y+1)*h/2];
        for(const [i,uv]of [[a,b,c],[a,c,d]].entries())result.push({id:`rm-detail-${index}-${x}-${y}-${i}`,tile,...imageryTriangle(p,window,uv)});
      }
      return result;
    });
  },[shared,bounds[0],bounds[1],bounds[2],bounds[3]]);
  return <g data-testid="hirise-detail-tiles" clipPath="url(#rm-footprint)">
    <defs>{patches.map(p=><clipPath key={p.id} id={p.id}><polygon points={p.points.map(v=>`${v.x},${v.z}`).join(' ')}/></clipPath>)}</defs>
    {patches.map(p=><g key={p.id} clipPath={`url(#${p.id})`}><image href={`${shared.baseUrl}/${p.tile.file}`} width={p.tile.width} height={p.tile.height} transform={`matrix(${p.matrix.join(' ')})`} onError={()=>setFailed(true)}/></g>)}
    {failed&&<title>Some detailed imagery could not load; overview remains visible.</title>}
  </g>;
}
