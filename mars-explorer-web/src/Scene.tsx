import { Component, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, Line, OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { elevation, sites, type Terrain, type Point, type Route } from './terrain';
import ScienceWalking from './ScienceWalking';
import { analysisPixels } from './regionalLayers';
import { MAP_SCIENCE_SITES as SCIENCE_SITES, sciencePoint } from './scienceSites';
import type { ObservationMarker } from './environmentObservations';
import type { OrbitalRaster } from './orbitalLayers';
import { drapePoints, meshHeight, type NativeRoute } from './nativeRouting';
import {geologyCanvas,type GeologyData} from './geology';
import {POVTouchControls,type POVInput} from './jz01/POVCamera';
import './science-walking.css';

export type SceneProps = { geology?:GeologyData|null; imageryUrl?: string; terrain: Terrain; layer: string; contours: boolean; exaggeration: number; mode: string; cameraAction: { kind: string; tick: number }; route: Route | null; selected: string; onSelect: (id: string) => void; onPick: (p: Point) => void; planning: boolean; progress: number; storm: boolean; markers: boolean; running: boolean; destination?: Point; blocked?: boolean; accentColor?: string; scienceSitesVisible?: boolean; selectedScienceId?: string | null; onScienceSelect?: (id: string) => void; observations?: ObservationMarker[]; onObservationSelect?: () => void; orbital?: OrbitalRaster | null; missionPosition?: Point | null; orbitalOpacity?: number; onInspect?: (point: Point) => void; onOrbitalInspect?: (point: Point) => void };
const SCALE = 1000;
const SCIENCE_CAMERA={position:[10,9,11] as [number,number,number],fov:39,near:.05,far:100};
function ground(t: Terrain, p: Point, ex: number): [number, number, number] { return [p.x / SCALE, (elevation(t, p.x, p.z) - t.meta.min) / SCALE * ex, p.z / SCALE]; }
function TerrainMesh({ terrain, layer, contours, exaggeration, onPick, planning, imageryUrl, orbital, orbitalOpacity = .65, onOrbitalInspect, onInspect, geology }: SceneProps) {
  const sourceTexture = useTexture(imageryUrl ?? '/data/ortho.jpg');
  const texture = useMemo(() => { const t = sourceTexture.clone(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; }, [sourceTexture]);
  useEffect(() => () => texture.dispose(), [texture]);
  const geometry = useMemo(() => {
    const { width, height, size, min } = terrain.meta;
    const g = new THREE.PlaneGeometry(size / SCALE, size / SCALE, width - 1, height - 1); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, Number.isFinite(terrain.values[i]) ? (terrain.values[i] - min) / SCALE * exaggeration : 0);
    if (g.index) {
      const valid: number[] = [], indices = g.index.array;
      for (let i = 0; i < indices.length; i += 3) if (Number.isFinite(terrain.values[indices[i]]) && Number.isFinite(terrain.values[indices[i+1]]) && Number.isFinite(terrain.values[indices[i+2]])) valid.push(indices[i], indices[i+1], indices[i+2]);
      g.setIndex(valid);
    }
    g.computeVertexNormals();
    const colors = new Float32Array(p.count * 3), c = new THREE.Color();
    const analysis = layer === 'slope' || layer === 'elevation' ? analysisPixels(terrain, layer) : null;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) * SCALE, z = p.getZ(i) * SCALE, h = terrain.values[i];
      const fraction = Number.isFinite(h) ? (h - min) / (terrain.meta.max - min) : 0;
      if (analysis) c.setRGB(analysis[i * 4] / 255, analysis[i * 4 + 1] / 255, analysis[i * 4 + 2] / 255, THREE.SRGBColorSpace);
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
        ${contours ? `float h=vLocal.y/${exaggeration.toFixed(2)}*1000.0+(${terrain.meta.min.toFixed(6)});
        float band=abs(fract(h/20.0-0.5)-0.5)/max(fwidth(h/20.0),0.0001);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.85,0.73,0.54),0.4*(1.0-min(band,1.0)));` : ''}
      `);
    };
    m.customProgramCacheKey = () => `terrain-${contours}-${exaggeration}-${terrain.meta.min}`;
    return m;
  }, [contours, exaggeration, texture, layer, terrain.meta.min]);
  useEffect(() => () => material.dispose(), [material]);
  const orbitalTexture = useMemo(() => {
    if (!orbital) return null;
    const result = new THREE.DataTexture(new Uint8Array(orbital.rgba),orbital.meta.width,orbital.meta.height,THREE.RGBAFormat);
    result.flipY=true; result.colorSpace=THREE.SRGBColorSpace; result.minFilter=THREE.NearestFilter; result.magFilter=THREE.NearestFilter; result.generateMipmaps=false; result.needsUpdate=true;
    return result;
  },[orbital]);
  useEffect(() => () => orbitalTexture?.dispose(),[orbitalTexture]);
  const geologyTexture=useMemo(()=>{if(!geology)return null;const t=new THREE.CanvasTexture(geologyCanvas(geology));t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;},[geology]);
  useEffect(()=>()=>geologyTexture?.dispose(),[geologyTexture]);
  const pick = (e: ThreeEvent<MouseEvent>) => { if (!planning && !orbital && !onInspect) return; e.stopPropagation(); const point = {x:e.point.x*SCALE,z:e.point.z*SCALE}; if (planning) onPick(point); else if(orbital) onOrbitalInspect?.(point); else onInspect?.(point); };
  return <><mesh geometry={geometry} material={material} onClick={pick} onAfterRender={() => { document.documentElement.dataset.terrainReady = 'true'; }} receiveShadow />
    {geologyTexture&&<mesh geometry={geometry} renderOrder={2} raycast={()=>{}}><meshBasicMaterial map={geologyTexture} transparent opacity={orbitalOpacity} depthWrite={false} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-2}/></mesh>}
    {orbitalTexture && <mesh geometry={geometry} renderOrder={2} raycast={() => {}}><meshBasicMaterial map={orbitalTexture} transparent opacity={orbitalOpacity} depthWrite={false} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-2}/></mesh>}
  </>;
}
function Skirt({ terrain, exaggeration }: { terrain: Terrain; exaggeration: number }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry(), pos: number[] = [], idx: number[] = [];
    const n = 500;
    for (let edge = 0; edge < 4; edge++) for (let i = 0; i <= n; i++) {
      const s = i / n * 10000 - 5000;
      const p = edge === 0 ? { x: s, z: -5000 } : edge === 1 ? { x: 5000, z: s } : edge === 2 ? { x: -s, z: 5000 } : { x: -5000, z: -s };
      const a = ground(terrain, p, exaggeration); if (!Number.isFinite(a[1])) a[1] = -.55; const v = pos.length / 3;
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
  const routePoints = useMemo(() => route ? drapePoints(terrain,route.points).map(p => [p.x/SCALE,(meshHeight(terrain,p)-terrain.meta.min)/SCALE*exaggeration+.0002,p.z/SCALE] as [number,number,number]) : [], [terrain, route, exaggeration]);
  const warningLines = useMemo(() => (route as NativeRoute|null)?.warnings?.map(segment=>drapePoints(terrain,segment).map(p=>[p.x/SCALE,(meshHeight(terrain,p)-terrain.meta.min)/SCALE*exaggeration+.0003,p.z/SCALE] as [number,number,number]))??[],[terrain,route,exaggeration]);
  const cursor = routePoints[Math.min(routePoints.length - 1, Math.floor(progress / 100 * (routePoints.length - 1)))];
  const exclusion = useMemo(() => props.blocked ? Array.from({ length: 65 }, (_, i) => {
    const at = ground(terrain, { x: 100 + Math.cos(i / 64 * Math.PI * 2) * 800, z: 300 + Math.sin(i / 64 * Math.PI * 2) * 800 }, exaggeration); at[1] += .012; return at;
  }) : [], [props.blocked, terrain, exaggeration]);
  return <>
    <color attach="background" args={[props.mode==='Explore'?'#9b846f':props.accentColor?'#0b0d10':'#292924']} />
    <fog attach="fog" args={[props.storm ? '#75604a' : props.mode==='Explore'?'#9b846f':props.accentColor?'#0b0d10':'#292924', props.mode==='Explore'?1.5:props.storm ? 5 : 22, props.mode==='Explore'?18:props.storm ? 22 : 55]} />
    <ambientLight intensity={1.5} color="#d5c7ad" />
    <directionalLight position={[-8, 9, -5]} intensity={3.5} color="#ffe1b8" />
    <hemisphereLight args={['#c9cbd0', '#332118', .7]} />
    <TerrainMesh {...props} />
    {props.geology?.units.map(u=>{const at=ground(terrain,{x:u.label[0],z:u.label[1]},exaggeration);return Number.isFinite(at[1])?<Html key={u.id} position={at} center zIndexRange={[3,0]}><span className="rm-geology-label">{u.name}</span></Html>:null;})}
    {props.observations?.map(marker => {
      const at = ground(terrain, marker.point, exaggeration);
      if (!Number.isFinite(at[1])) return null;
      const dx = marker.kind !== 'minerals' ? 58 : -58, dy = -65;
      return <Html key={marker.id} position={at} center zIndexRange={[9, 0]}><div className="rm-observation-pin" style={{ transform: `translate(${dx}px,${dy}px)`, color: marker.color }}><svg aria-hidden="true" width="160" height="160" viewBox="-80 -80 160 160"><line x1={-dx} y1={-dy} x2="0" y2="0" stroke="currentColor"/><circle cx={-dx} cy={-dy} r="3" fill="currentColor"/></svg><button data-testid={`3d-${marker.kind}-marker`} aria-label={`Open ${marker.description}`} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); props.onObservationSelect?.(); }}>{marker.label}</button></div></Html>;
    })}
    {props.scienceSitesVisible && SCIENCE_SITES.map((site, index) => {
      const at = ground(terrain, sciencePoint(site, terrain.meta.center), exaggeration); at[1] += .01;
      return <Html key={site.id} position={at} center zIndexRange={[8, 0]}><div className="rm-science-pin" style={{ transform: `translate(${index % 2 === 0 ? 24 : -24}px, ${index % 2 === 0 ? -32 : 32}px)` }}><svg aria-hidden="true" viewBox="-50 -50 100 100" style={{ position: 'absolute', left: -50, top: -50, width: 100, height: 100, pointerEvents: 'none' }}><line x1={index % 2 === 0 ? -24 : 24} y1={index % 2 === 0 ? 32 : -32} x2={0} y2={0} stroke="#f39b58" /><circle cx={index % 2 === 0 ? -24 : 24} cy={index % 2 === 0 ? 32 : -32} r={2} fill="white" /></svg><button aria-label={`Open ${site.name} / ${site.sample}`} aria-pressed={props.selectedScienceId === site.id} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); props.onScienceSelect?.(site.id); }}>{site.code}</button></div></Html>;
    })}
    {props.missionPosition&&<Html position={[props.missionPosition.x/SCALE,(meshHeight(terrain,props.missionPosition)-terrain.meta.min)/SCALE*exaggeration+.0005,props.missionPosition.z/SCALE]} center zIndexRange={[10,0]}><span className="rm-crew-pin" data-testid="eva-crew-marker-3d">● CREW · SIM</span></Html>}
    {props.destination && Number.isFinite(elevation(terrain,props.destination.x,props.destination.z)) && <mesh position={ground(terrain, props.destination, exaggeration)}><sphereGeometry args={[.055, 16, 16]}/><meshBasicMaterial color={props.accentColor ?? '#8ee3d3'}/></mesh>}
    {(props.route as NativeRoute|null)?.approach&&<Html position={ground(terrain,(props.route as NativeRoute).approach!.endpoint,exaggeration)} center zIndexRange={[8,0]}><span className="rm-crew-pin" data-testid="approach-endpoint-3d">◆ APPROACH · STOPS SHORT</span></Html>}
    {exclusion.length > 0 && <Line points={exclusion} color="#f0b276" lineWidth={2}/>}
    {props.mode!=='Explore'&&<><Skirt terrain={terrain} exaggeration={exaggeration} />
    <gridHelper args={[30, 60, '#4b4b40', '#36382f']} position={[0, -.56, 0]} />
    <Habitat position={ground(terrain, sites[0], exaggeration)} /></>}
    {props.mode!=='Explore'&&routePoints.length > 1 && <><Line points={routePoints} color="#0b0d10" lineWidth={6} depthTest={false} depthWrite={false} renderOrder={5}/><Line points={routePoints} color={props.storm ? '#ffad64' : props.accentColor ?? '#f5bb70'} lineWidth={3} depthTest={false} depthWrite={false} renderOrder={6}/></>}
    {props.mode!=='Explore'&&warningLines.map((points,i)=><Line key={i} points={points} color="#ff6556" lineWidth={4} depthTest={false} depthWrite={false} renderOrder={7}/>)}
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
