import { useEffect,useMemo,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { groundHeight,type Ground } from './cinematicGround';
import { TRAIL_OFFSET } from './missionSite';
export function PhotographicSkyFill(){
 const {gl,scene,invalidate}=useThree();
 useEffect(()=>{
  const canvas=document.createElement('canvas');canvas.width=16;canvas.height=64;const ctx=canvas.getContext('2d')!;
  const gradient=ctx.createLinearGradient(0,0,0,64);gradient.addColorStop(0,'#b6b7ba');gradient.addColorStop(.43,'#c4b6a5');gradient.addColorStop(.55,'#b9997f');gradient.addColorStop(1,'#463127');ctx.fillStyle=gradient;ctx.fillRect(0,0,16,64);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const sphere=new THREE.Mesh(new THREE.SphereGeometry(50,24,16),new THREE.MeshBasicMaterial({map,side:THREE.BackSide})),world=new THREE.Scene();world.add(sphere);
  const pmrem=new THREE.PMREMGenerator(gl),target=pmrem.fromScene(world,.05,.1,100,{size:128});
  sphere.geometry.dispose();sphere.material.dispose();map.dispose();pmrem.dispose();
  const old=scene.environment,oldIntensity=scene.environmentIntensity;scene.environment=target.texture;scene.environmentIntensity=.45;invalidate();
  return()=>{scene.environment=old;scene.environmentIntensity=oldIntensity;target.dispose();};
 },[gl,scene,invalidate]);return null;
}
export function SurfaceSun({ground}:{ground:Ground}){
 const light=useRef<THREE.DirectionalLight>(null),target=useMemo(()=>new THREE.Object3D(),[]),{scene,gl}=useThree();
 const previous=useRef(new THREE.Vector3(Infinity,0,0));
 useEffect(()=>{scene.add(target);const old=gl.shadowMap.autoUpdate;gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;return()=>{scene.remove(target);gl.shadowMap.autoUpdate=old;};},[scene,target,gl]);
 useFrame(({camera})=>{if(!light.current||camera.position.distanceToSquared(previous.current)<.04)return;previous.current.copy(camera.position);target.position.set(camera.position.x,groundHeight(ground,camera.position.x,camera.position.z),camera.position.z-15);target.updateMatrixWorld();light.current.position.copy(target.position).add(new THREE.Vector3(-85,52,38));light.current.updateMatrixWorld();gl.shadowMap.needsUpdate=true;});
 return <directionalLight ref={light} target={target} intensity={2.8} color="#fff0db" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-85} shadow-camera-right={85} shadow-camera-top={85} shadow-camera-bottom={-85} shadow-camera-near={1} shadow-camera-far={350} shadow-bias={-.00008} shadow-normalBias={.02}/>;
}
export function ScannedRocks({ground,onScan}:{ground:Ground;onScan:()=>void}){
 const {scene}=useGLTF('/assets/mars/rock-photoscan.glb');
 const parts=useMemo(()=>{scene.updateMatrixWorld(true);const list:{geometry:THREE.BufferGeometry;material:THREE.MeshStandardMaterial}[]=[];scene.traverse(o=>{if(o instanceof THREE.Mesh){const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);const material=(Array.isArray(o.material)?o.material[0]:o.material).clone() as THREE.MeshStandardMaterial;material.color.multiply(new THREE.Color('#e3946e'));material.roughness=1;material.metalness=0;material.normalScale?.set(.8,.8);list.push({geometry,material});}});return list;},[scene]);
 const points=useMemo(()=>{
  const values:[number,number,number,number][]=[[-3.2,66.5,1.05,.3],[4.1,63,.7,2.1],[-6.2,58,1.25,1.2],[7.5,50,.75,3.1],[-10,42,1.1,.9],[11,22,.9,4.2],[-5,37,.35,2],[6,35,.45,.7],[-8,11,.6,1.5],[13,-18,.8,3.4],[-20,-50,.9,5.2],[28,-100,1.2,2.4]];
  return values.map(([x,z,s,r])=>({position:[x,groundHeight(ground,x,z+TRAIL_OFFSET),z+TRAIL_OFFSET] as [number,number,number],scale:s,rotation:r}));
 },[ground]);
 useEffect(()=>()=>parts.forEach(p=>{p.geometry.dispose();p.material.dispose();}),[parts]);
 return <group>{points.map((p,i)=><group key={i} position={p.position} scale={p.scale} rotation={[0,p.rotation,0]}>{parts.map((part,j)=><mesh key={j} geometry={part.geometry} material={part.material} castShadow receiveShadow onClick={e=>{if(e.delta<4){e.stopPropagation();onScan();}}}/>)}</group>)}</group>;
}
