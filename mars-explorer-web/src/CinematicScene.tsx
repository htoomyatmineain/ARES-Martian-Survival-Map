import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Line } from '@react-three/drei';
import * as THREE from 'three';
import CameraRig from './FreeCameraRig';
import SurfaceDressing from './SurfaceDressing';
import { DEPARTURE_Z, TARGET_Z, TRAIL_OFFSET } from './missionSite';
import { useObservedTerrainMaterial } from './ObservedTerrainMaterial';
import { PhotographicSkyFill,SurfaceSun,ScannedRocks } from './RealismDetails';
import type { ExplorationInput, PlayerPosition } from './explorationInput';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { groundHeight, type Ground } from './cinematicGround';

export type CinemaProps = { ground: Ground; layer: number; moving: boolean; guided: boolean; input: RefObject<ExplorationInput>; interactive: boolean; onPosition: (position: PlayerPosition) => void; onManualInput: () => void; progress: number; returning: boolean; returnProgress: number; returnOrigin: {x:number;z:number}|null; overhead: boolean; action: { kind: string; tick: number }; scanned: boolean; storm: boolean; onScan: () => void; onReady: () => void };
const noiseCode = `
float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1)),f.x),f.y),f.z);}
`;
const INITIAL_CAMERA={position:[0,5.8,DEPARTURE_Z] as [number,number,number],fov:55,near:.2,far:6000};
const RENDERER_OPTIONS={antialias:true,powerPreference:'high-performance' as const};
function useMarsMaterial(layer: number, rocky = false) {
  const uniforms = useMemo(() => ({ uLayer: { value: layer }, uRock: { value: rocky ? 1 : 0 } }), []);
  useEffect(() => { uniforms.uLayer.value = layer; }, [layer, uniforms]);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .99 });
    m.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'varying vec3 vMarsWorld;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 marsP=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          marsP=instanceMatrix*marsP;
        #endif
        vMarsWorld=(modelMatrix*marsP).xyz;
      `);
      shader.fragmentShader = `varying vec3 vMarsWorld; uniform float uLayer; uniform float uRock; ${noiseCode}\n` + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        vec3 p=vMarsWorld;
        float broad=noise3(p*.065)*.55+noise3(p*.21)*.3+noise3(p*.8)*.15;
        float detailFade=1.-smoothstep(.04,.4,max(length(dFdx(p)),length(dFdy(p))));
        float grit=mix(.5,noise3(p*6.)*.6+noise3(p*24.)*.4,detailFade);
        float strata=sin(p.y*3.7+noise3(p*.15)*4.);
        vec3 sand=mix(vec3(.15,.045,.025),vec3(.42,.16,.08),broad);
        vec3 rock=mix(vec3(.075,.018,.009),vec3(.3,.075,.025),broad);
        diffuseColor.rgb=mix(sand,rock,uRock*.65);
        diffuseColor.rgb*=.78+grit*.4+strata*(.08*uRock+.11*smoothstep(8.,26.,p.y));
        float speck=step(.83,noise3(p*13.))*detailFade;
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.35,speck*.38);
        if(uLayer>.5&&uLayer<1.5) diffuseColor.rgb=mix(vec3(.035,.11,.14),vec3(.9,.33,.08),clamp(p.y/110.,0.,1.));
        if(uLayer>1.5&&uLayer<2.5) diffuseColor.rgb=mix(vec3(.035,.15,.35),vec3(.65,.1,.025),broad*.65+max(0.,p.y)*.003);
        if(uLayer>2.5&&uLayer<3.5) diffuseColor.rgb=mix(vec3(.13,.065,.025),vec3(.8,.37,.025),broad);
        if(uLayer>3.5) diffuseColor.rgb=mix(vec3(.11,.06,.035),vec3(.02,.55,.66),smoothstep(.56,.75,noise3(p*.02)));
      `).replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        float aa=1.-smoothstep(.04,.35,max(length(dFdx(vMarsWorld)),length(dFdy(vMarsWorld))));
        float micro=(noise3(vMarsWorld*4.5)*.07+noise3(vMarsWorld*19.)*.025)*aa;
        vec3 q0=dFdx(-vViewPosition.xyz),q1=dFdy(-vViewPosition.xyz);
        vec3 r1=cross(q1,normal),r2=cross(normal,q0);
        float det=dot(q0,r1);
        vec3 grad=sign(det)*(dFdx(micro)*r1+dFdy(micro)*r2);
        normal=normalize(max(abs(det),.0000001)*normal-grad*.42);
      `);
    };
    m.customProgramCacheKey = () => `mars-pbr-${rocky}`;
    return m;
  }, [uniforms, rocky]);
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}
function Landscape({ layer, ground, onReady }: { layer: number; ground: Ground; onReady: () => void }) {
  const { scene } = useGLTF('/assets/mars/jezero-landscape.glb');
  const material = useObservedTerrainMaterial(layer, ground);
  const meshes = useMemo(() => { const list: THREE.Mesh[] = []; scene.traverse(o => { if (o instanceof THREE.Mesh) list.push(o); }); return list; }, [scene]);
  const ready = useRef(false);
  return <group>{meshes.map(m => <mesh key={m.uuid} geometry={m.geometry} position={m.position} rotation={m.rotation} scale={m.scale} material={material} receiveShadow onAfterRender={() => { if (!ready.current) { ready.current = true; onReady(); } }}/>)}</group>;
}
function random(seed: number) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function Rocks({ ground, layer, onScan }: { ground: Ground; layer: number; onScan: () => void }) {
  const { scene } = useGLTF('/assets/mars/basalt-library.glb');
  const material = useMarsMaterial(layer, true);
  const meshes = useMemo(() => { const list: THREE.Mesh[] = []; scene.traverse(o => { if (o instanceof THREE.Mesh) list.push(o); }); return list; }, [scene]);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useEffect(() => {
    const rng = random(8481), transform = new THREE.Object3D();
    meshes.forEach((_, group) => {
      const mesh = refs.current[group]; if (!mesh) return;
      for (let i = 0; i < 30; i++) {
        const depth = rng(); let z = 90 + TRAIL_OFFSET - depth * depth * 1450;
        let x = (rng() - .5) * (180 + Math.max(0, -z) * .85);
        if (Math.abs(x) < 5 && z < 65 && z > -300) x += x > 0 ? 8 : -8;
        let s = .04 + Math.pow(rng(), 4) * .7;
        if (i < 2 && group < 6) { x = (group % 2 ? 1 : -1) * (8 + rng() * 25); z=TRAIL_OFFSET-80-rng()*500; s = .15 + rng() * .4; }
        transform.position.set(x, groundHeight(ground, x, z) + s * .3, z);
        transform.rotation.set(rng() * .4, rng() * Math.PI * 2, rng() * .3);
        transform.scale.set(s * (1 + rng() * .6), s, s * (1 + rng() * .5)); transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    });
  }, [ground, meshes]);
  return <group>{meshes.map((m, i) => <instancedMesh key={m.uuid} ref={o => { refs.current[i] = o; }} args={[m.geometry, material, 30]} castShadow receiveShadow onClick={e => { if (e.delta > 4) return; e.stopPropagation(); onScan(); }}/>)}</group>;
}
function Sky() {
  const mat = useMemo(() => new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: {}, vertexShader: 'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: `${noiseCode}
  varying vec3 vDirection;void main(){vec3 d=normalize(vDirection);float up=max(0.,d.y);vec3 col=mix(vec3(.70,.30,.19),vec3(.006,.004,.009),pow(up,.18));float glow=pow(max(0.,dot(d,normalize(vec3(-.6,.13,-.7)))),12.);col+=vec3(.16,.045,.015)*glow;float cloud=noise3(vec3(d.x*9.,d.y*38.,d.z*9.));col+=vec3(.025,.015,.012)*smoothstep(.65,.9,cloud)*smoothstep(.01,.2,up);gl_FragColor=vec4(col,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include', ';\n#include') }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  return <mesh material={mat}><sphereGeometry args={[4200, 32, 20]}/></mesh>;
}
function RouteArrows({ ground }: { ground: Ground }) {
  const shape = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-1.5, -.85); s.lineTo(0, .1); s.lineTo(1.5, -.85); s.lineTo(1.5, -.12); s.lineTo(0, .95); s.lineTo(-1.5, -.12); s.closePath(); const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return g; }, []);
  useEffect(() => () => shape.dispose(), [shape]);
  const arrows=useMemo(()=>[63,60,55,48,37,23,5,-20,-55,-105,-170,-260].map((z,i)=>{
    const x=Math.sin(i*.57)*.25,s=.72+i*.035,g=shape.clone(),p=g.attributes.position;
    for(let v=0;v<p.count;v++){const xx=x+p.getX(v)*s,zz=z+TRAIL_OFFSET+p.getZ(v)*s;p.setXYZ(v,xx,groundHeight(ground,xx,zz)+.045,zz);}g.computeBoundingSphere();return g;
  }),[ground,shape]);
  useEffect(()=>()=>arrows.forEach(g=>g.dispose()),[arrows]);
  return <group>{arrows.map((g,i)=><mesh key={i} geometry={g}><meshBasicMaterial color={[.35,1.2,1.8]} toneMapped={false} side={THREE.DoubleSide}/></mesh>)}<Line points={Array.from({ length: 65 }, (_, i): [number, number, number] => { const z = -80 + TRAIL_OFFSET - i * 3; return [0, groundHeight(ground, 0, z) + .08, z]; })} color="#b0e9ef" lineWidth={1.1} transparent opacity={.55}/></group>;
}
function Waypoint({ ground, returning }: { ground: Ground; returning: boolean }) {
  const z = returning ? DEPARTURE_Z : TARGET_Z, y = groundHeight(ground, 0, z), ring = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => { ring.current?.quaternion.copy(camera.quaternion); const p = new THREE.Vector3(0, y + 14, z).project(camera); const el = document.querySelector<HTMLElement>('.mx-waypoint'); if (el) { el.style.left = `${(p.x * .5 + .5) * 100}%`; el.style.top = `${(-p.y * .5 + .5) * 100}%`; el.style.visibility = p.z < 1 ? 'visible' : 'hidden'; } });
  return <group position={[0, y + 13, z]}><mesh ref={ring}><ringGeometry args={[2.3, 2.7, 48]}/><meshBasicMaterial color={[3.4, 1.5, .05]} toneMapped={false} side={THREE.DoubleSide}/></mesh><mesh><sphereGeometry args={[1.1, 16, 12]}/><meshBasicMaterial color={[4.5, 2.4, .4]} toneMapped={false}/></mesh><Line points={[[0, -12, 0], [0, 0, 0]]} color="#ffb53c" lineWidth={1}/></group>;
}
function Effects() {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => { const c = new EffectComposer(gl); c.addPass(new RenderPass(scene, camera)); c.addPass(new UnrealBloomPass(new THREE.Vector2(size.width / 2, size.height / 2), .13, .18, 1.65)); c.addPass(new OutputPass()); return c; }, [gl, scene, camera]);
  useEffect(() => { composer.setSize(size.width, size.height); }, [size, composer]);
  useEffect(() => () => { composer.passes.forEach(p => p.dispose()); composer.dispose(); }, [composer]);
  useFrame((_, delta) => composer.render(delta), 1);
  return null;
}
function Contents(props: CinemaProps) {
  return <><Sky/><fog attach="fog" args={[props.storm ? '#aa694b' : '#bc7963', props.storm ? 60 : 600, props.storm ? 650 : 2600]}/><PhotographicSkyFill/><hemisphereLight args={['#d8c6b6', '#5d4232', .55]}/><SurfaceSun ground={props.ground}/><Landscape layer={props.layer} ground={props.ground} onReady={props.onReady}/><Rocks ground={props.ground} layer={props.layer} onScan={props.onScan}/><ScannedRocks ground={props.ground} onScan={props.onScan}/><SurfaceDressing ground={props.ground}/><RouteArrows ground={props.ground}/><Waypoint ground={props.ground} returning={props.returning}/><CameraRig {...props}/><Effects/></>;
}
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> { state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; } render() { return this.state.failed ? <div className="mx-asset-error">The 3D scene could not load. Reload to retry, or open the scientific map from Data.</div> : this.props.children; } }
export default function CinematicScene(props: CinemaProps) {
  return <SceneBoundary><Canvas frameloop="demand" shadows dpr={[1, 1.5]} camera={INITIAL_CAMERA} gl={RENDERER_OPTIONS} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }} fallback={<div className="mx-asset-error">Enable WebGL and hardware acceleration to explore the 3D surface.</div>}><Suspense fallback={null}><Contents {...props}/></Suspense></Canvas></SceneBoundary>;
}
