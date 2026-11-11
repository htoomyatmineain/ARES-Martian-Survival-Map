import { Component, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Line, OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { elevation, slope, sites, type Terrain, type Point, type Route } from './terrain';
import ScienceWalking from './ScienceWalking';
import {POVTouchControls,type POVInput} from './jz01/POVCamera';
import './science-walking.css';

export type SceneProps = { terrain: Terrain; layer: string; contours: boolean; exaggeration: number; mode: string; cameraAction: { kind: string; tick: number }; route: Route | null; selected: string; onSelect: (id: string) => void; onPick: (p: Point) => void; planning: boolean; progress: number; storm: boolean; markers: boolean; running: boolean };
const SCALE = 1000;
const SCIENCE_CAMERA={position:[10,9,11] as [number,number,number],fov:39,near:.05,far:100};
function ground(t: Terrain, p: Point, ex: number): [number, number, number] { return [p.x / SCALE, (elevation(t, p.x, p.z) - t.meta.min) / SCALE * ex, p.z / SCALE]; }
function TerrainMesh({ terrain, layer, contours, exaggeration, onPick, planning }: SceneProps) {
  const sourceTexture = useTexture('/data/ortho.jpg');
  const texture = useMemo(() => { const t = sourceTexture.clone(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; }, [sourceTexture]);
  useEffect(() => () => texture.dispose(), [texture]);
  const geometry = useMemo(() => {
    const { width, height, size, min } = terrain.meta;
    const g = new THREE.PlaneGeometry(size / SCALE, size / SCALE, width - 1, height - 1); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, (terrain.values[i] - min) / SCALE * exaggeration);
    g.computeVertexNormals();
    const colors = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) * SCALE, z = p.getZ(i) * SCALE, h = terrain.values[i];
      const steep = slope(terrain, x, z), fraction = (h - min) / (terrain.meta.max - min);
      if (layer === 'slope') c.set(steep > 18 ? '#e26c43' : steep > 10 ? '#b6a56c' : '#758981');
      else if (layer === 'elevation') c.setHSL(.065 + fraction * .09, .32, .29 + fraction * .3);
      else {
        const grain = Math.sin(x * .038 + Math.sin(z * .031) * 3) * Math.sin(z * .042 + x * .009);
        c.setHSL(.045 + fraction * .015, .36 + fraction * .07, .44 + fraction * .12 + grain * .008);
      }
      c.toArray(colors, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [terrain, exaggeration, layer]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, map: layer === 'surface' ? texture : null });
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = 'varying vec3 vLocal;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal=position;');
      shader.fragmentShader = 'varying vec3 vLocal;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float grain = fract(sin(dot(vLocal.xz,vec2(127.1,311.7)))*43758.5453);
        diffuseColor.rgb *= 0.92 + grain*0.16;
        ${contours ? `float h=vLocal.y/${exaggeration.toFixed(2)}*1000.0;
        float band=abs(fract(h/20.0-0.5)-0.5)/max(fwidth(h/20.0),0.0001);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.85,0.73,0.54),0.4*(1.0-min(band,1.0)));` : ''}
      `);
    };
    m.customProgramCacheKey = () => `terrain-${contours}-${exaggeration}`;
    return m;
  }, [contours, exaggeration, texture, layer]);
  useEffect(() => () => material.dispose(), [material]);
  const pick = (e: ThreeEvent<MouseEvent>) => { if (!planning) return; e.stopPropagation(); onPick({ x: e.point.x * SCALE, z: e.point.z * SCALE }); };
  return <mesh geometry={geometry} material={material} onClick={pick} onAfterRender={() => { document.documentElement.dataset.terrainReady = 'true'; }} receiveShadow />;
}
function Skirt({ terrain, exaggeration }: { terrain: Terrain; exaggeration: number }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry(), pos: number[] = [], idx: number[] = [];
    const n = 500;
    for (let edge = 0; edge < 4; edge++) for (let i = 0; i <= n; i++) {
      const s = i / n * 10000 - 5000;
      const p = edge === 0 ? { x: s, z: -5000 } : edge === 1 ? { x: 5000, z: s } : edge === 2 ? { x: -s, z: 5000 } : { x: -5000, z: -s };
      const a = ground(terrain, p, exaggeration); const v = pos.length / 3;
      pos.push(...a, a[0], -.55, a[2]);
      if (i < n) idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }, [terrain, exaggeration]);
  useEffect(() => () => geom.dispose(), [geom]);
  return <mesh geometry={geom}><meshStandardMaterial color="#45362b" roughness={1} side={THREE.DoubleSide} /></mesh>;
}
function Controls({ mode, cameraAction, terrain, exaggeration }: SceneProps) {
  const ref = useRef<OrbitImpl>(null);
  const { camera, invalidate } = useThree();
  useEffect(() => {
    if (!ref.current) return;
    const target = new THREE.Vector3(0, (terrain.meta.max - terrain.meta.min) / 2000 * exaggeration, 0);
    if (cameraAction.kind === 'zoomIn' || cameraAction.kind === 'zoomOut') { camera.position.sub(ref.current.target).multiplyScalar(cameraAction.kind === 'zoomIn' ? .8 : 1.25).add(ref.current.target); }
    else { ref.current.target.copy(target); camera.position.copy(target).add(mode === '2D' ? new THREE.Vector3(0, 15, .001) : new THREE.Vector3(10, 9, 11)); }
    ref.current.update(); invalidate();
  }, [cameraAction, mode, camera, terrain, exaggeration, invalidate]);
  return <OrbitControls ref={ref} makeDefault enableDamping dampingFactor={.12} minDistance={2} maxDistance={26} maxPolarAngle={Math.PI * .47} enableRotate={mode !== '2D'} target={[0, .4, 0]} />;
}
function Habitat({ position }: { position: [number, number, number] }) {
  return <group position={position} scale={.10}>
    <mesh position={[0, .3, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.42, .42, 1.6, 16]} /><meshStandardMaterial color="#e6dfd0" roughness={.65} /></mesh>
    <mesh position={[-.85, .3, 0]}><sphereGeometry args={[.42, 16, 12]} /><meshStandardMaterial color="#d7d1c2" /></mesh>
    <mesh position={[0, .3, .43]}><boxGeometry args={[.8, .18, .03]} /><meshStandardMaterial color="#242b2b" /></mesh>
    {[-1, 1].map(s => <group key={s} position={[0, .25, s * 1]}><mesh rotation={[-.2, 0, 0]}><boxGeometry args={[1.8, .04, .65]} /><meshStandardMaterial color="#334a55" metalness={.4} roughness={.4} /></mesh></group>)}
  </group>;
}
function MarkerProjection({ terrain, exaggeration, markerRefs }: { terrain: Terrain; exaggeration: number; markerRefs: RefObject<(HTMLDivElement | null)[]> }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    sites.forEach((s, i) => {
      const el = markerRefs.current[i]; if (!el) return;
      v.set(...ground(terrain, s, exaggeration)); v.y += .07; v.project(camera);
      el.style.transform = `translate(${(v.x * .5 + .5) * size.width}px,${(-v.y * .5 + .5) * size.height}px)`;
      el.style.visibility = v.z > 1 || v.z < -1 ? 'hidden' : 'visible';
    });
    const n = document.querySelector<HTMLElement>('.compass svg');
    if (n) n.style.transform = `rotate(${Math.atan2(camera.position.x, camera.position.z) * 180 / Math.PI}deg)`;
    // Project a one-kilometer east-west segment at the camera target for the scale bar.
    const controls = (camera as THREE.Camera & { userData: { target?: THREE.Vector3 } }).userData.target;
    const target = controls || new THREE.Vector3(0, .5, 0);
    const a = target.clone().add(new THREE.Vector3(-.5, 0, 0)).project(camera), b = target.clone().add(new THREE.Vector3(.5, 0, 0)).project(camera);
    const bar = document.querySelector<HTMLElement>('.map-scale i');
    if (bar) bar.style.width = `${Math.hypot((b.x - a.x) * size.width / 2, (b.y - a.y) * size.height / 2)}px`;
  });
  return null;
}
function Contents(props: SceneProps & { markerRefs: RefObject<(HTMLDivElement | null)[]>;input:RefObject<POVInput> }) {
  const { terrain, exaggeration, route, progress, markers } = props;
  const routePoints = useMemo(() => route?.points.map(p => { const a = ground(terrain, p, exaggeration); a[1] += .018; return a; }) || [], [terrain, route, exaggeration]);
  const cursor = routePoints[Math.min(routePoints.length - 1, Math.floor(progress / 100 * (routePoints.length - 1)))];
  return <>
    <color attach="background" args={[props.mode==='Explore'?'#9b846f':'#292924']} />
    <fog attach="fog" args={[props.storm ? '#75604a' : props.mode==='Explore'?'#9b846f':'#292924', props.mode==='Explore'?1.5:props.storm ? 5 : 22, props.mode==='Explore'?18:props.storm ? 22 : 55]} />
    <ambientLight intensity={1.5} color="#d5c7ad" />
    <directionalLight position={[-8, 9, -5]} intensity={3.5} color="#ffe1b8" />
    <hemisphereLight args={['#c9cbd0', '#332118', .7]} />
    <TerrainMesh {...props} />
    {props.mode!=='Explore'&&<><Skirt terrain={terrain} exaggeration={exaggeration} />
    <gridHelper args={[30, 60, '#4b4b40', '#36382f']} position={[0, -.56, 0]} />
    <Habitat position={ground(terrain, sites[0], exaggeration)} /></>}
    {props.mode!=='Explore'&&routePoints.length > 1 && <Line points={routePoints} color={props.storm ? '#ffad64' : '#f5bb70'} lineWidth={3} />}
    {props.mode!=='Explore'&&cursor && progress > 0 && <mesh position={[cursor[0], cursor[1] + .055, cursor[2]]}><sphereGeometry args={[.055, 16, 16]} /><meshBasicMaterial color="#fff5c4" /></mesh>}
    {props.mode!=='Explore'&&markers && sites.map((s, i) => { const p = ground(terrain, s, exaggeration); return <group key={s.id} position={p}>
      <mesh position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.07, .095, 32]} /><meshBasicMaterial color={i === 0 ? '#c9dfca' : '#efb875'} side={THREE.DoubleSide} /></mesh>
    </group>; })}
    {props.mode!=='Explore'&&<Controls {...props} />}
    <ScienceWalking terrain={terrain} active={props.mode==='Explore'} input={props.input} action={props.cameraAction}/>
    {props.mode!=='Explore'&&<MarkerProjection terrain={terrain} exaggeration={exaggeration} markerRefs={props.markerRefs}/>}
  </>;
}
class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="canvas-fallback"><h2>3D rendering unavailable</h2><p>Enable hardware acceleration in your browser and reload. Mission planning and the elevation profile remain available.</p></div> : this.props.children; }
}
export default function Scene(props: SceneProps) {
  const markerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const input=useRef<POVInput>({moveX:0,moveY:0,lookX:0,lookY:0});
  return <CanvasBoundary><Canvas frameloop="demand" dpr={[1, 1.75]} camera={SCIENCE_CAMERA} gl={{ antialias: true, powerPreference: 'high-performance' }} fallback={<div className="canvas-fallback">WebGL is unavailable. Use a browser with hardware acceleration.</div>} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}><Contents {...props} markerRefs={markerRefs} input={input}/></Canvas><div className="projected-markers" style={{ display: props.markers && props.mode!=='Explore' ? undefined : 'none' }}>{sites.map((s, i) => <div className={`projected-marker projected-${s.id}`} key={s.id} ref={el => { markerRefs.current[i] = el; }}><button className={`map-marker ${props.selected === s.id ? 'selected' : ''}`} onClick={() => props.onSelect(s.id)}><span className="marker-stem"/><span className="marker-dot">{i === 0 ? '⌂' : i === 2 ? '⊕' : '◇'}</span><span>{s.name}<small>{i === 0 ? 'HAB-01' : i === 2 ? '18.4446° N · 77.4509° E' : `SCI-0${i}`}</small></span></button></div>)}</div>{props.mode==='Explore'&&<div className="science-walk-inputs"><POVTouchControls input={input} onInput={()=>document.querySelector('.terrain-viewport canvas')?.dispatchEvent(new Event('mars-pov-input'))}/><small>WASD / arrows: walk · Drag: look · Shift: faster · R: reset · True-scale CTX terrain</small></div>}</CanvasBoundary>;
}
