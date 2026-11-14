import { useEffect, useRef, type RefObject, type PointerEvent } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { surfaceAt, clampPosition, type NavigationConfig } from './navigation';

export type POVInput = { moveX:number; moveY:number; lookX:number; lookY:number };
declare global { interface Window { __jz01POV?: {
  x:number;y:number;z:number;yaw:number;pitch:number;dtm:number;mesh:number;eye:number;
  sample:(x:number,z:number)=>ReturnType<typeof surfaceAt>;
  place:(x:number,z:number)=>void;
} } }

type Position = {x:number;z:number;y:number;yaw:number;pitch:number;dtm:number;mesh:number;eye:number};
export default function POVCamera({active,values,input,navigation,diagnostics=false,focusScope='.mars-terrain-viewer',onPosition}:{active:boolean;values:Float32Array|null;input:RefObject<POVInput>;navigation:NavigationConfig;diagnostics?:boolean;focusScope?:string;onPosition?:(position:Position)=>void}) {
  const {camera,gl,invalidate}=useThree();
  const pose=useRef({...navigation.spawn});
  const site=useRef(navigation);
  const keys=useRef(new Set<string>()), velocity=useRef(new THREE.Vector2());
  const pointer=useRef<{id:number;x:number;y:number}|null>(null);
  useEffect(()=>{
    if(!active||!values||values.length!==navigation.width*navigation.height)return;
    if(site.current!==navigation){pose.current={...navigation.spawn};site.current=navigation;}
    const ground=surfaceAt(values,pose.current.x,pose.current.z,navigation)!;
    camera.position.set(pose.current.x,ground.eye,pose.current.z);
    camera.rotation.set(pose.current.pitch,pose.current.yaw,0,'YXZ');
    const previous=camera instanceof THREE.PerspectiveCamera?{fov:camera.fov,near:camera.near,far:camera.far}:null;
    if(camera instanceof THREE.PerspectiveCamera){camera.fov=60;camera.near=navigation.eyeHeight/20;camera.far=navigation.width*navigation.spacing*3;camera.updateProjectionMatrix();}
    const canvas=gl.domElement;
    const oldTabIndex=canvas.getAttribute('tabindex');canvas.tabIndex=0;
    const clear=()=>{keys.current.clear();velocity.current.set(0,0);input.current.moveX=0;input.current.moveY=0;input.current.lookX=0;input.current.lookY=0;pointer.current=null;};
    const down=(e:KeyboardEvent)=>{
      if(document.pointerLockElement!==canvas&&!canvas.closest(focusScope)?.contains(document.activeElement))return;
      if((e.target as HTMLElement).matches('input,select,textarea,[contenteditable="true"]'))return;
      if(e.code==='Escape'){if(document.pointerLockElement===canvas)document.exitPointerLock();clear();invalidate();return;}
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){
        e.preventDefault();keys.current.add(e.code);invalidate();
      }
    };
    const up=(e:KeyboardEvent)=>{keys.current.delete(e.code);invalidate();};
    const start=(e:globalThis.PointerEvent)=>{if(e.button!==0)return;canvas.focus({preventScroll:true});pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};
    const move=(e:globalThis.PointerEvent)=>{
      const p=pointer.current;if(!p||p.id!==e.pointerId||document.pointerLockElement===canvas)return;
      input.current.lookX+=e.clientX-p.x;input.current.lookY+=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;invalidate();
    };
    const end=(e:globalThis.PointerEvent)=>{if(pointer.current?.id===e.pointerId)pointer.current=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
    const locked=(e:MouseEvent)=>{if(document.pointerLockElement===canvas){input.current.lookX+=e.movementX;input.current.lookY+=e.movementY;invalidate();}};
    const wake=()=>invalidate();
    const reset=()=>{clear();pose.current={...navigation.spawn};invalidate();};
    const visibility=()=>{if(document.hidden)clear();};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);
    canvas.addEventListener('mars-pov-input',wake);document.addEventListener('visibilitychange',visibility);
    canvas.addEventListener('mars-pov-reset',reset);
    document.addEventListener('mousemove',locked);
    canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointermove',move);
    canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
    invalidate();
    return()=>{
      clear();if(document.pointerLockElement===canvas)document.exitPointerLock();
      window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);
      canvas.removeEventListener('mars-pov-input',wake);document.removeEventListener('visibilitychange',visibility);
      canvas.removeEventListener('mars-pov-reset',reset);
      document.removeEventListener('mousemove',locked);
      canvas.removeEventListener('pointerdown',start);canvas.removeEventListener('pointermove',move);
      canvas.removeEventListener('pointerup',end);canvas.removeEventListener('pointercancel',end);canvas.removeEventListener('lostpointercapture',end);
      if(diagnostics)delete window.__jz01POV;
      if(oldTabIndex===null)canvas.removeAttribute('tabindex');else canvas.setAttribute('tabindex',oldTabIndex);
      if(camera instanceof THREE.PerspectiveCamera&&previous){Object.assign(camera,previous);camera.updateProjectionMatrix();}
    };
  },[active,values,camera,gl,input,invalidate,navigation,diagnostics,focusScope]);
  useFrame((_,dt)=>{
    if(!active||!values||values.length!==navigation.width*navigation.height)return;
    const p=pose.current,i=input.current;
    p.yaw-=i.lookX*.0025;p.pitch=THREE.MathUtils.clamp(p.pitch-i.lookY*.0025,-1.3,1.3);
    i.lookX=0;i.lookY=0;
    const forward=i.moveY+Number(keys.current.has('KeyW')||keys.current.has('ArrowUp'))-Number(keys.current.has('KeyS')||keys.current.has('ArrowDown'));
    const right=i.moveX+Number(keys.current.has('KeyD')||keys.current.has('ArrowRight'))-Number(keys.current.has('KeyA')||keys.current.has('ArrowLeft'));
    const length=Math.max(1,Math.hypot(forward,right)),speed=keys.current.has('ShiftLeft')||keys.current.has('ShiftRight')?navigation.fastSpeed:navigation.walkSpeed;
    const targetX=(right*Math.cos(p.yaw)-forward*Math.sin(p.yaw))/length*speed;
    const targetZ=(-right*Math.sin(p.yaw)-forward*Math.cos(p.yaw))/length*speed;
    const step=Math.min(dt,.04),blend=1-Math.exp(-14*step),v=velocity.current;
    v.x=THREE.MathUtils.lerp(v.x,targetX,blend);v.y=THREE.MathUtils.lerp(v.y,targetZ,blend);
    if(!forward&&!right&&v.length()<.015)v.set(0,0);
    const bounded=clampPosition(p.x+v.x*step,p.z+v.y*step,navigation);p.x=bounded.x;p.z=bounded.z;
    const ground=surfaceAt(values,p.x,p.z,navigation)!;
    camera.position.set(p.x,ground.eye,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');
    onPosition?.({...p,y:ground.eye,...ground});
    if(diagnostics)window.__jz01POV={...p,y:ground.eye,...ground,sample:(x,z)=>surfaceAt(values,x,z,navigation),
      place:(x,z)=>{if(!Number.isFinite(x+z))return;Object.assign(p,clampPosition(x,z,navigation));v.set(0,0);invalidate();}};
    if(v.lengthSq()>.000001||forward||right)invalidate();
  });
  return null;
}

export function POVTouchControls({input,onInput}:{input:RefObject<POVInput>;onInput:()=>void}) {
  const movePointer=useRef<number|null>(null),look=useRef<{id:number;x:number;y:number}|null>(null);
  const wake=onInput;
  const update=(e:PointerEvent<HTMLButtonElement>)=>{
    const r=e.currentTarget.getBoundingClientRect();input.current.moveX=THREE.MathUtils.clamp((e.clientX-r.left-r.width/2)/(r.width*.35),-1,1);
    input.current.moveY=THREE.MathUtils.clamp(-(e.clientY-r.top-r.height/2)/(r.height*.35),-1,1);wake();
  };
  const endMove=(e:PointerEvent<HTMLButtonElement>)=>{if(movePointer.current!==e.pointerId)return;movePointer.current=null;input.current.moveX=0;input.current.moveY=0;wake();};
  const endLook=(e:PointerEvent<HTMLButtonElement>)=>{if(look.current?.id===e.pointerId)look.current=null;};
  return <div className="jz01-pov-touch" aria-label="POV touch controls">
    <button aria-label="POV movement joystick" onPointerDown={e=>{e.preventDefault();movePointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);update(e);}}
      onPointerMove={e=>{if(movePointer.current===e.pointerId)update(e);}} onPointerUp={endMove} onPointerCancel={endMove} onLostPointerCapture={endMove}>Move<br/>↑<br/>← · →</button>
    <button aria-label="POV look touchpad" onPointerDown={e=>{e.preventDefault();look.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e=>{const p=look.current;if(p?.id===e.pointerId){input.current.lookX+=e.clientX-p.x;input.current.lookY+=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;wake();}}}
      onPointerUp={endLook} onPointerCancel={endLook} onLostPointerCapture={endLook}>Look<br/>＋</button>
  </div>;
}
