import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import * as THREE from 'three';
import { groundHeight } from './cinematicGround';
import type { CinemaProps } from './CinematicScene';
import { DEPARTURE_Z, TARGET_Z } from './missionSite';
const EYE = 1.75;
export default function FreeCameraRig({ ground, moving, guided, progress, returning, returnOrigin, returnProgress, overhead, action, input, interactive, onPosition, onManualInput }: CinemaProps) {
  const orbit = useRef<OrbitImpl>(null), { camera, gl, invalidate } = useThree();
  const view = useRef({ yaw: 0, pitch: -.095 }), keys = useRef(new Set<string>()), pointers = useRef(new Map<number,{x:number;y:number}>());
  const lastReported = useRef({ x: NaN, z: NaN, time: 0 });
  const groundPose=useRef<THREE.Vector3|null>(null);
  const lastSurfacePose=useRef(new THREE.Vector3(0,0,DEPARTURE_Z));
  const applyView = () => { camera.rotation.set(view.current.pitch, view.current.yaw, 0, 'YXZ'); invalidate(); };
  useEffect(() => { if (moving) invalidate(); }, [moving, invalidate]);
  useEffect(()=>{if(!moving){keys.current.clear();input.current.moveX=0;input.current.moveY=0;}},[moving,input]);
  useEffect(() => {
    if (!interactive) { keys.current.clear(); input.current.moveX=0;input.current.moveY=0;pointers.current.clear(); if(document.pointerLockElement===gl.domElement)document.exitPointerLock(); }
  }, [interactive, input, gl]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!interactive || overhead || (e.repeat&&!moving) || (e.target as HTMLElement).matches('input,select,textarea')) return;
      if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)) { keys.current.add(e.code);onManualInput();invalidate();e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const clear = () => { keys.current.clear();input.current.moveX=0;input.current.moveY=0; };
    const wake = () => { if (input.current.moveX || input.current.moveY) onManualInput(); invalidate(); };
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);window.addEventListener('mars-exploration-input',wake);
    return () => {window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);window.removeEventListener('mars-exploration-input',wake);};
  }, [interactive, overhead, input, onManualInput, invalidate,moving]);
  useLayoutEffect(() => {
    if (action.kind==='zoomIn'||action.kind==='zoomOut') { if(camera instanceof THREE.PerspectiveCamera){camera.fov=THREE.MathUtils.clamp(camera.fov+(action.kind==='zoomIn'?-6:6),28,82);camera.updateProjectionMatrix();} }
    else {
      if(overhead&&!groundPose.current)groundPose.current=lastSurfacePose.current.clone();
      const z=action.kind==='home'?DEPARTURE_Z:guided?DEPARTURE_Z-progress*3.42:groundPose.current?.z??camera.position.z;
      const x=action.kind==='home'?0:guided?0:groundPose.current?.x??camera.position.x;
      camera.position.set(overhead?110:x,overhead?550:groundHeight(ground,x,z)+EYE,overhead?TARGET_Z:z);
      if(overhead&&orbit.current){orbit.current.target.set(x,groundHeight(ground,x,z),z-120);orbit.current.update();}
      else {view.current={yaw:returning&&guided?Math.PI:0,pitch:-.095};camera.rotation.set(view.current.pitch,view.current.yaw,0,'YXZ');groundPose.current=null;lastSurfacePose.current.copy(camera.position);}
    }
    invalidate();
  }, [action, overhead, camera, ground, invalidate]);
  useEffect(() => { if(returning&&guided&&!overhead&&returnOrigin){view.current.yaw=Math.atan2(returnOrigin.x,returnOrigin.z-DEPARTURE_Z);applyView();} }, [returning,guided,overhead,returnOrigin]);
  useEffect(() => {
    if(overhead||!interactive)return;
    const canvas=gl.domElement;
    const down=(e:PointerEvent)=>{if(e.button!==0)return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);};
    const move=(e:PointerEvent)=>{
      if(document.pointerLockElement===canvas)return;
      const old=pointers.current.get(e.pointerId);if(!old)return;
      if(pointers.current.size===2){const other=[...pointers.current.entries()].find(([id])=>id!==e.pointerId)?.[1];if(other&&camera instanceof THREE.PerspectiveCamera){const prev=Math.hypot(old.x-other.x,old.y-other.y),next=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(prev>10&&next>10){camera.fov=THREE.MathUtils.clamp(camera.fov*prev/next,28,82);camera.updateProjectionMatrix();invalidate();}}}
      else {view.current.yaw-=(e.clientX-old.x)*.0026;view.current.pitch=THREE.MathUtils.clamp(view.current.pitch-(e.clientY-old.y)*.0026,-1.25,1.25);applyView();}
      pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    };
    const up=(e:PointerEvent)=>{pointers.current.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
    const locked=(e:MouseEvent)=>{if(document.pointerLockElement!==canvas)return;view.current.yaw-=e.movementX*.0022;view.current.pitch=THREE.MathUtils.clamp(view.current.pitch-e.movementY*.0022,-1.25,1.25);applyView();};
    const wheel=(e:WheelEvent)=>{if(!(camera instanceof THREE.PerspectiveCamera))return;e.preventDefault();camera.fov=THREE.MathUtils.clamp(camera.fov+e.deltaY*.025,28,82);camera.updateProjectionMatrix();invalidate();};
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});document.addEventListener('mousemove',locked);
    return()=>{pointers.current.clear();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);document.removeEventListener('mousemove',locked);};
  },[overhead,interactive,gl,camera,invalidate]);
  useFrame(({clock},dt)=>{
    const manual=input.current;
    if(!overhead&&interactive){
      if(manual.lookX||manual.lookY){view.current.yaw-=manual.lookX*.003;view.current.pitch=THREE.MathUtils.clamp(view.current.pitch-manual.lookY*.003,-1.25,1.25);manual.lookX=0;manual.lookY=0;applyView();}
      let dx=manual.moveX,forward=manual.moveY;
      if(keys.current.has('KeyW')||keys.current.has('ArrowUp'))forward++;
      if(keys.current.has('KeyS')||keys.current.has('ArrowDown'))forward--;
      if(keys.current.has('KeyA')||keys.current.has('ArrowLeft'))dx--;
      if(keys.current.has('KeyD')||keys.current.has('ArrowRight'))dx++;
      if(dx||forward){
        const length=Math.max(1,Math.hypot(dx,forward)),speed=manual.sprint||keys.current.has('ShiftLeft')||keys.current.has('ShiftRight')?10:4.5;
        const movement=new THREE.Vector3(dx/length,0,-forward/length).applyAxisAngle(new THREE.Vector3(0,1,0),view.current.yaw).multiplyScalar(Math.min(dt,.05)*speed);
        const x=THREE.MathUtils.clamp(camera.position.x+movement.x,ground.xmin+8,ground.xmax-8),z=THREE.MathUtils.clamp(camera.position.z+movement.z,-ground.ymax+8,-ground.ymin-8);
        const h=groundHeight(ground,x,z),old=groundHeight(ground,camera.position.x,camera.position.z);
        if(Math.abs(h-old)<Math.hypot(movement.x,movement.z)*.8+.08){camera.position.set(x,h+EYE,z);}
        invalidate();
      }else if(moving&&guided){const f=returnProgress/100,x=returning&&returnOrigin?returnOrigin.x*(1-f):0,z=returning&&returnOrigin?returnOrigin.z+(DEPARTURE_Z-returnOrigin.z)*f:DEPARTURE_Z-progress*3.42;camera.position.lerp(new THREE.Vector3(x,groundHeight(ground,x,z)+EYE,z),1-Math.exp(-Math.min(dt,.1)*5));invalidate();}
    }
    const bearing=(ground.heading-view.current.yaw*180/Math.PI+720)%360;
    const compass=document.querySelector<HTMLElement>('.mx-compass svg');if(compass)compass.style.transform=`rotate(${-bearing}deg)`;
    if(!overhead)lastSurfacePose.current.copy(camera.position);
    document.documentElement.dataset.playerPosition=JSON.stringify({x:camera.position.x,z:camera.position.z,y:camera.position.y,yaw:view.current.yaw,fov:camera instanceof THREE.PerspectiveCamera?camera.fov:0,mode:overhead?'overhead':'ground'});
    const last=lastReported.current;
    if(!overhead&&clock.elapsedTime-last.time>.15&&(!Number.isFinite(last.x)||Math.hypot(camera.position.x-last.x,camera.position.z-last.z)>.1)){
      lastReported.current={x:camera.position.x,z:camera.position.z,time:clock.elapsedTime};onPosition({x:camera.position.x,z:camera.position.z,elevation:groundHeight(ground,camera.position.x,camera.position.z)+ground.elevationOrigin,heading:bearing});
    }
  });
  return overhead?<OrbitControls ref={orbit} makeDefault target={[0,groundHeight(ground,0,TARGET_Z),TARGET_Z]} enableDamping dampingFactor={.08} minPolarAngle={0} maxPolarAngle={Math.PI*.45}/>:null;
}
