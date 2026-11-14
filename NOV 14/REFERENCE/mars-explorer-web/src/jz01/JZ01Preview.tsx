import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import * as THREE from 'three';
import './jz01.css';
import SurveyFrame from './SurveyFrame';
import POVCamera, { POVTouchControls, type POVInput } from './POVCamera';
import { JZ01_NAVIGATION, type NavigationConfig } from './navigation';
import Map2D from './Map2D';

const ASSET = '/assets/mars/jz01/terrain.glb';
const POSITION: [number, number, number] = [610, 520, 740];
const CAMERA = { position: POSITION, fov: 35, near: 0.5, far: 4000 };

type Runtime = {
  root: THREE.Object3D; camera: THREE.Camera; renderer: THREE.WebGLRenderer;
  controls: OrbitImpl | null; frameTimes: number[]; renderedFrames: number; measuring: boolean;
  source: THREE.Object3D; mode: PresentationMode;
  view: View;
};
export type PresentationMode = 'cinematic' | 'scientific';
export type View = 'map' | 'tactical' | 'pov';
export type MarsTerrainViewerProps = {
  assetUrl?:string;navigationUrl?:string;navigation?:NavigationConfig;label?:string;
  initialView?:View;initialMode?:PresentationMode;className?:string;diagnostics?:boolean;
  showPresentationControls?:boolean;showHints?:boolean;onViewChange?:(view:View)=>void;
};
declare global { interface Window { __jz01?: Runtime } }

class PreviewBoundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  render() {
    return this.state.error ? <div className="jz01-message" role="alert">
      <h2>Terrain could not load</h2><p>{this.state.error}</p>
      <button onClick={() => location.reload()}>Retry preview</button>
    </div> : this.props.children;
  }
}

function Atmosphere({ mode, view }: { mode: PresentationMode; view:View }) {
  const { scene, gl, invalidate } = useThree();
  useEffect(() => {
    const previousBackground = scene.background, previousFog = scene.fog;
    let texture: THREE.CanvasTexture | undefined;
    if (mode === 'cinematic') {
      const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, view==='tactical'?'#51463e':'#a28b7e');
      gradient.addColorStop(.5, view==='tactical'?'#463b31':'#b39986');
      gradient.addColorStop(1, view==='tactical'?'#232522':'#695042'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 2, 256);
      texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      scene.background = texture;
      scene.fog = new THREE.Fog('#ac8165', view==='tactical'?1300:80, view==='tactical'?5000:1200);
    } else { scene.background = new THREE.Color('#25292c'); scene.fog = null; }
    gl.toneMappingExposure = mode === 'cinematic' ? 1.2 : 1.05;
    invalidate();
    return () => { scene.background = previousBackground; scene.fog = previousFog; texture?.dispose(); };
  }, [mode, view, scene, gl, invalidate]);
  return mode === 'cinematic' ? <>
    <hemisphereLight args={['#ecd2b5', '#50372d', 1.1]} />
    <directionalLight position={[-280, 240, -400]} intensity={3.1} color="#ffdbb4" />
  </> : <><ambientLight intensity={0.8} color="white" />
    <directionalLight position={[-350, 500, 200]} intensity={2.1} color="white" /></>;
}

function Terrain({ onReady, mode, view, values, input,assetUrl,navigation,diagnostics }: {
  onReady: () => void; mode: PresentationMode; view:View;values:Float32Array|null;
  input:React.RefObject<POVInput>;assetUrl:string;navigation:NavigationConfig;diagnostics:boolean;
}) {
  const { scene } = useGLTF(assetUrl);
  const { camera, gl, invalidate, size } = useThree();
  // Clone hierarchy/materials only. Immutable geometry and original texture remain shared.
  const display = useMemo(() => {
    const root = scene.clone(true);
    root.traverse(o => { if (o instanceof THREE.Mesh) {
      o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
    } });
    return root;
  }, [scene]);
  const bounds=useMemo(()=>{display.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(display);},[display]);
  const target=useMemo(()=>new THREE.Vector3((bounds.min.x+bounds.max.x)/2,
    bounds.min.y+(bounds.max.y-bounds.min.y)*.43,(bounds.min.z+bounds.max.z)/2),[bounds]);
  const span=Math.max(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z);
  useEffect(() => () => { display.traverse(o => { if (o instanceof THREE.Mesh) {
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  } }); }, [display]);
  useEffect(() => {
    display.traverse(o => { if (o instanceof THREE.Mesh) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.MeshStandardMaterial) => {
        m.color.set(mode === 'cinematic' ? '#cba183' : '#ffffff');
        m.roughness = .94; m.metalness = 0;
      });
    } });
    if (runtimeRef.current) runtimeRef.current.mode = mode;
    invalidate();
  }, [display, mode, invalidate]);
  const controls = useRef<OrbitImpl>(null);
  const transition = useRef<{ from: THREE.Vector3; to: THREE.Vector3; fromTarget:THREE.Vector3;toTarget:THREE.Vector3;elapsed: number;duration:number } | null>(null);
  const runtimeRef=useRef<Runtime|null>(null);
  const panDelta=useRef(new THREE.Vector3());
  const ready = useRef(false);
  const readyFrame = useRef(0);
  const lastFrame = useRef(0);
  useEffect(() => {
    // Keep the complete cached GLB hierarchy; no geometry/material mutations.
    display.updateWorldMatrix(true, true);
    const runtime: Runtime = { root: display, source: scene, mode, view, camera, renderer: gl, controls: controls.current,
      frameTimes: [], renderedFrames: 0, measuring: false };
    runtimeRef.current=runtime;
    if(diagnostics)window.__jz01 = runtime;
    invalidate();
    return () => { cancelAnimationFrame(readyFrame.current);runtimeRef.current=null;if (window.__jz01 === runtime) delete window.__jz01; };
  // The runtime is owned by this asset mount; mode is updated separately above.
  }, [scene, display, camera, gl, invalidate,diagnostics]);
  useFrame((_, dt) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.controls=controls.current;runtime.view=view;
    const now = performance.now();
    if (lastFrame.current && runtime.measuring) {
      runtime.frameTimes.push(now - lastFrame.current);
      if (runtime.frameTimes.length > 1200) runtime.frameTimes.shift();
    }
    lastFrame.current = now;
    runtime.renderedFrames++;
    if (!ready.current) { ready.current = true; readyFrame.current = requestAnimationFrame(onReady); }
    const tween = view==='tactical'?transition.current:null;
    if (tween) {
      tween.elapsed += Math.min(dt, .05);
      const t = Math.min(1, tween.elapsed / tween.duration), eased = t * t * (3 - 2 * t);
      camera.position.lerpVectors(tween.from, tween.to, eased);
      controls.current?.target.lerpVectors(tween.fromTarget,tween.toTarget,eased); controls.current?.update();
      if (t === 1) { transition.current = null; if (controls.current) controls.current.enabled = true; }
      invalidate();
    }
  });
  const home = useCallback(() => {
    if(size.width/size.height>=1)return target.clone().add(new THREE.Vector3(610,495,740).multiplyScalar(span/499));
    // Fit an actual projected bounding box, using a fuller front-facing mobile pose.
    const direction=new THREE.Vector3(-35,950,800).normalize();
    const probe=new THREE.PerspectiveCamera(35,size.width/size.height,.5,4000),point=new THREE.Vector3();
    let lo=span*520/499,hi=span*2600/499;
    for(let n=0;n<20;n++){
      const distance=(lo+hi)/2;probe.position.copy(target).addScaledVector(direction,distance);
      probe.lookAt(target);probe.updateMatrixWorld();let extent=0;
      for(const x of [bounds.min.x-navigation.spacing/2,bounds.max.x+navigation.spacing/2])for(const y of [bounds.min.y-8,bounds.max.y])for(const z of [bounds.min.z-navigation.spacing/2,bounds.max.z+navigation.spacing/2]){
        point.set(x,y,z).project(probe);extent=Math.max(extent,Math.abs(point.x)/.95,Math.abs(point.y)/.84);
      }
      if(extent>1)lo=distance;else hi=distance;
    }
    return target.clone().addScaledVector(direction,hi);
  },[size.width,size.height,target,bounds,navigation.spacing,span]);
  const reset = useCallback(() => {
    camera.position.copy(home());
    controls.current?.target.copy(target);
    controls.current?.update(); invalidate();
  }, [camera, invalidate, home,target]);
  useLayoutEffect(()=>{transition.current=null;if(view==='tactical')reset();}, [reset,view]);
  useEffect(() => {
    const action = (event: Event) => {
      if(view!=='tactical')return;
      const kind = (event as CustomEvent<string>).detail;
      const c = controls.current; if (!c) return;
      // Drain orbit damping before starting a camera-only transition.
      c.enableDamping = false; c.update(); c.enableDamping = true;
      const to = kind === 'reset' ? home() : camera.position.clone().sub(c.target)
        .multiplyScalar(kind === 'in' ? .8 : 1.25);
      if (kind !== 'reset') to.setLength(THREE.MathUtils.clamp(to.length(),span*520/499,span*2600/499)).add(c.target);
      const toTarget=kind==='reset'?target.clone():c.target.clone();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        camera.position.copy(to); c.target.copy(toTarget); c.update();
      } else { transition.current = { from: camera.position.clone(), to,fromTarget:c.target.clone(),toTarget,elapsed: 0,duration:.65 }; c.enabled = false; }
      invalidate();
    };
    gl.domElement.addEventListener('mars-camera', action);
    const interrupt = () => { transition.current = null; if (controls.current) controls.current.enabled = true; };
    const wheel=(e:WheelEvent)=>{
      if(view!=='tactical'||!controls.current||!e.deltaY)return;
      e.preventDefault();e.stopImmediatePropagation();
      const c=controls.current;
      const to=(transition.current?.to??camera.position).clone().sub(c.target)
        .multiplyScalar(Math.exp(THREE.MathUtils.clamp(e.deltaY*.001,-.4,.4)));
      to.setLength(THREE.MathUtils.clamp(to.length(),span*520/499,span*2600/499)).add(c.target);
      c.enableDamping=false;c.update();c.enableDamping=true;
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(to);transition.current=null;c.enabled=true;c.update();}
      else {transition.current={from:camera.position.clone(),to,fromTarget:c.target.clone(),toTarget:c.target.clone(),elapsed:0,duration:.28};c.enabled=false;}
      invalidate();
    };
    gl.domElement.addEventListener('pointerdown', interrupt, true);
    gl.domElement.addEventListener('wheel', wheel, {capture:true,passive:false});
    return () => { gl.domElement.removeEventListener('mars-camera', action);
      gl.domElement.removeEventListener('pointerdown', interrupt, true); gl.domElement.removeEventListener('wheel', wheel, true); };
  }, [camera, invalidate, home, gl,view,target,span]);
  return <>
    <primitive object={display} dispose={null} />
    {view==='tactical'&&<SurveyFrame root={display} spacing={navigation.spacing}/>}
    <POVCamera active={view==='pov'} values={values} input={input} navigation={navigation} diagnostics={diagnostics}/>
    {view==='tactical'&&<OrbitControls ref={controls} makeDefault target={target} enableDamping dampingFactor={0.08}
      minDistance={span*520/499} maxDistance={span*2600/499} minPolarAngle={0.12} maxPolarAngle={Math.PI * 0.40}
      enablePan screenSpacePanning={false} panSpeed={.65} rotateSpeed={0.7} zoomSpeed={0.8}
      onChange={()=>{
        const c=controls.current;if(!c)return;
        panDelta.current.copy(c.target);
        c.target.x=THREE.MathUtils.clamp(c.target.x,bounds.min.x,bounds.max.x);c.target.z=THREE.MathUtils.clamp(c.target.z,bounds.min.z,bounds.max.z);
        c.target.y=target.y;panDelta.current.subVectors(c.target,panDelta.current);camera.position.add(panDelta.current);
      }} />}
  </>;
}

export function MarsTerrainViewer({assetUrl=ASSET,navigationUrl='/assets/mars/jz01/navigation-heights.bin',navigation=JZ01_NAVIGATION,
  label='JZ-01 Mars terrain',initialView='tactical',initialMode='cinematic',className='',diagnostics=false,
  showPresentationControls=true,showHints=true,onViewChange}:MarsTerrainViewerProps) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<PresentationMode>(initialMode);
  const [view,setView]=useState<View>(initialView),[values,setValues]=useState<Float32Array|null>(null);
  const [navError,setNavError]=useState(''),[lockError,setLockError]=useState(''),[locked,setLocked]=useState(false);
  const host=useRef<HTMLDivElement>(null);
  const input=useRef<POVInput>({moveX:0,moveY:0,lookX:0,lookY:0});
  const [mapAction,setMapAction]=useState({kind:'reset',tick:0});
  useEffect(()=>{
    const controller=new AbortController();
    setValues(null);setNavError('');
    fetch(navigationUrl,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Navigation DTM unavailable');return r.arrayBuffer();})
      .then(buffer=>{const data=new Float32Array(buffer);if(data.length!==navigation.width*navigation.height||!data.every(Number.isFinite))throw Error('Navigation DTM invalid');setValues(data);})
      .catch(e=>{if(!controller.signal.aborted)setNavError(String(e));});
    const changed=()=>setLocked(document.pointerLockElement===host.current?.querySelector('canvas'));document.addEventListener('pointerlockchange',changed);
    return()=>{controller.abort();document.removeEventListener('pointerlockchange',changed);};
  },[navigationUrl,navigation.width,navigation.height]);
  const dispatch=(name:string,detail?:string)=>host.current?.querySelector('canvas')?.dispatchEvent(new CustomEvent(name,{detail}));
  const action = (kind: string) => view==='map'?setMapAction(s=>({kind,tick:s.tick+1})):dispatch('mars-camera',kind);
  const switchView=(next:View)=>{setView(next);onViewChange?.(next);};
  return <div ref={host} className={`jz01-preview mars-terrain-viewer ${className}`} role="region" aria-label={label} data-ready={ready} data-mode={mode} data-view={view}>
    <div className="jz01-toolbar">
      <div className="jz01-modes jz01-views" role="group" aria-label="Terrain view">
        <button aria-pressed={view==='map'} onClick={()=>switchView('map')}>2D Map</button>
        <button aria-pressed={view==='tactical'} onClick={()=>switchView('tactical')}>Bird's-Eye 3D</button>
        <button aria-pressed={view==='pov'} disabled={!values||!ready} onClick={()=>switchView('pov')}>Explore</button>
      </div>
      {showPresentationControls&&<div className="jz01-modes" role="group" aria-label="Presentation mode">
        <button aria-pressed={mode === 'scientific'} onClick={() => setMode('scientific')}>Scientific</button>
        <button aria-pressed={mode === 'cinematic'} onClick={() => setMode('cinematic')}>Cinematic</button>
      </div>}
    </div>
    <section className="jz01-viewport" aria-label="Interactive JZ-01 terrain">
      <PreviewBoundary>
        <div className="jz01-scene" style={{visibility:view==='map'?'hidden':undefined}}>
        <Canvas frameloop="demand" dpr={[1, 1.5]} camera={CAMERA}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.1; }}
          fallback={<div className="jz01-message" role="alert">WebGL is unavailable. Enable hardware acceleration to view the terrain.</div>}>
          <Atmosphere mode={mode} view={view} />
          <Suspense fallback={null}><Terrain mode={mode} view={view} values={values} input={input} assetUrl={assetUrl} navigation={navigation} diagnostics={diagnostics} onReady={() => setReady(true)} /></Suspense>
        </Canvas>
        {!ready && <div className="jz01-message" role="status">Loading verified JZ-01 terrain…</div>}
        </div>
      </PreviewBoundary>
      {view==='map'&&<Map2D action={mapAction}/>}
      {navError&&<p className="jz01-notice" role="alert">{navError}. POV unavailable.</p>}
      {lockError&&view==='pov'&&<p className="jz01-notice" role="status">{lockError}</p>}
      {view!=='pov'?<div className="jz01-controls" role="group" aria-label="Map camera">
        <button onClick={() => action('in')} aria-label="Zoom in">+</button>
        <button onClick={() => action('out')} aria-label="Zoom out">−</button>
        <button onClick={() => action('reset')}>Reset view</button>
      </div>:<><div className="jz01-pov-lock"><button onClick={()=>dispatch('mars-pov-reset')}>Reset POV</button><button onClick={()=>{
        if(document.pointerLockElement)document.exitPointerLock();
        else host.current?.querySelector('canvas')?.requestPointerLock()?.catch(()=>setLockError('Mouse lock unavailable; drag to look.'));
      }}>{locked?'Unlock mouse':'Lock mouse'}</button></div><POVTouchControls input={input} onInput={()=>dispatch('mars-pov-input')}/></>}
    </section>
    {showHints&&<small className="jz01-hint">{view==='map'?'Drag: pan · Scroll / buttons: zoom':view==='tactical'?'Drag: orbit · Right drag / two fingers: pan · Scroll / pinch: zoom · Display edges are schematic':'WASD: move · Drag: look · Shift: faster · Esc: unlock'}{mode==='cinematic'&&view!=='map'?' · Color illustrative':''}</small>}
  </div>;
}

export default function JZ01Preview(){return <div className="jz01-demo"><MarsTerrainViewer initialView="map" showPresentationControls={false} diagnostics/></div>;}
