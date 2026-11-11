import {useCallback,useEffect,useMemo,useRef,type RefObject} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import POVCamera,{type POVInput} from './jz01/POVCamera';
import {sites,type Terrain} from './terrain';
import type {NavigationConfig} from './jz01/navigation';

/** Adapt the existing CTX scene's kilometer render units to the shared walking controller. */
export default function ScienceWalking({terrain,active,input,action}:{terrain:Terrain;active:boolean;input:RefObject<POVInput>;action:{kind:string;tick:number}}){
  const {camera,gl,invalidate}=useThree();
  const lastAction=useRef(action.tick);
  const values=useMemo(()=>terrain.values.map(h=>(h-terrain.meta.min)/1000),[terrain]);
  const navigation=useMemo<NavigationConfig>(()=>({
    width:terrain.meta.width,height:terrain.meta.height,spacing:terrain.meta.size/(terrain.meta.width-1)/1000,
    meshStep:1,xmin:-terrain.meta.size/2000,zmin:-terrain.meta.size/2000,elevationOffset:0,eyeHeight:.0017,boundaryMargin:.01,
    spawn:{x:(sites[0].x+120)/1000,z:sites[0].z/1000,yaw:Math.atan2(sites[0].x+120-sites[1].x,sites[0].z-sites[1].z),pitch:-.08},
    walkSpeed:.0014,fastSpeed:.0028,
  }),[terrain]);
  useEffect(()=>{
    if(!active){lastAction.current=action.tick;return;}
    if(lastAction.current===action.tick)return;lastAction.current=action.tick;
    if(action.kind==='reset')gl.domElement.dispatchEvent(new Event('mars-pov-reset'));
    else if(camera instanceof THREE.PerspectiveCamera){camera.fov=THREE.MathUtils.clamp(camera.fov+(action.kind==='zoomIn'?-5:5),45,80);camera.updateProjectionMatrix();invalidate();}
  },[active,action,camera,gl,invalidate]);
  useEffect(()=>()=>{delete document.documentElement.dataset.sciencePlayer;},[]);
  const position=useCallback((p:{x:number;y:number;z:number;yaw:number;mesh:number;dtm:number})=>{
    document.documentElement.dataset.sciencePlayer=JSON.stringify({x:p.x*1000,z:p.z*1000,y:p.y*1000,
      ground:Math.max(p.mesh,p.dtm)*1000,yaw:p.yaw,elevation:p.dtm*1000+terrain.meta.min});
  },[terrain.meta.min]);
  return <POVCamera active={active} values={values} input={input} navigation={navigation} focusScope=".app-shell" onPosition={position}/>;
}
