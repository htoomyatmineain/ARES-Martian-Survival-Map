import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Orbit } from 'lucide-react';
import MissionInterface from './MissionInterface';
import { appendTrack, type TrackPoint } from './mapCoordinates';
import { loadGround, playerGeo, type Ground } from './cinematicGround';
import { type ExplorationInput, type PlayerPosition } from './explorationInput';
import TouchControls from './TouchControls';
import meda from '../public/data/meda-observation.json';
import ExplorerDialogs from './ExplorerDialogs';
import './explorer.css';
import './exploration.css';
import './final-polish.css';
import './hub-layout.css';
import './suit-typography.css';
import './visor.css';
import { DEPARTURE_Z, TARGET_Z } from './missionSite';
const CinematicScene = lazy(() => import('./CinematicScene'));
const ScientificWorkspace = lazy(() => import('./ScientificWorkspace'));
export type ExplorerModal = 'mission' | 'data' | 'search' | 'notifications' | 'profile' | 'scan' | 'home' | null;
export default function Explorer() {
  const science = new URLSearchParams(location.search).get('workspace') === 'science';
  const [ground, setGround] = useState<Ground | null>(null), [error, setError] = useState(''), [ready, setReady] = useState(false), [retry, setRetry] = useState(0);
  const [layer, setLayer] = useState(0), [moving, setMoving] = useState(false), [progress, setProgress] = useState(0), [overhead, setOverhead] = useState(false);
  const [action, setAction] = useState({ kind: 'reset', tick: 0 }), [modal, setModal] = useState<ExplorerModal>(null), [query, setQuery] = useState('');
  const [scanning, setScanning] = useState(false), [scanProgress, setScanProgress] = useState(0), [scanned, setScanned] = useState(false), [samples, setSamples] = useState(0);
  const [toast, setToast] = useState(''), [storm, setStorm] = useState(false), [returning, setReturning] = useState(false), [returned, setReturned] = useState(false), [, setMissionOpen] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [travel, setTravel] = useState(0), [guided, setGuided] = useState(false), [checkpoints, setCheckpoints] = useState([false,false,false]);
  const [track, setTrack] = useState<TrackPoint[]>([{x:0,z:DEPARTURE_Z}]);
  const [player, setPlayer] = useState<PlayerPosition>({x:0,z:DEPARTURE_Z,elevation:0,heading:285});
  const [returnOrigin, setReturnOrigin] = useState<{x:number;z:number}|null>(null), [returnProgress, setReturnProgress] = useState(0);
  const input = useRef<ExplorationInput>({moveX:0,moveY:0,lookX:0,lookY:0,sprint:false}), playerRef = useRef(player), guidedRef = useRef(guided);
  guidedRef.current = guided;
  const notify = useCallback((message: string) => setToast(message), []);
  const sceneReady = useCallback(() => { setReady(true); document.documentElement.dataset.cinematicReady = 'true'; }, []);
  const scan = useCallback(() => { if (scanning) return; setModal('scan'); setScanning(true); setScanned(false); setScanProgress(0); }, [scanning]);
  useEffect(() => { if (science) return; const c = new AbortController(); setError(''); loadGround(c.signal).then(setGround).catch(e => { if (e.name !== 'AbortError') setError(e.message); }); return () => c.abort(); }, [retry, science]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 5000); return () => clearTimeout(id); }, [toast]);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  useEffect(() => { if (!moving || modal || !guided) return; const id = setInterval(() => { if(returning){const duration=Math.max(3,Math.hypot(returnOrigin?.x||0,(returnOrigin?.z??DEPARTURE_Z)-DEPARTURE_Z)/4.5);setReturnProgress(p=>Math.min(100,p+50/duration));}else setProgress(p=>Math.min(100,p+.5)); }, 500); return () => clearInterval(id); }, [moving, returning, modal, guided, returnOrigin]);
  useEffect(() => { if (progress >= 100 && moving && guided && !returning) { setMoving(false); notify('Science waypoint reached. Scan a specimen, then return to base.'); } if (returnProgress >= 100 && moving && returning) { setMoving(false); setReturning(false); setReturned(true); notify('Safe return confirmed. Jezero exploration complete.'); } }, [progress, returnProgress, moving, guided, returning, notify]);
  useEffect(() => { if (!scanning) return; const id = setInterval(() => setScanProgress(p => Math.min(100, p + 10)), 140); return () => clearInterval(id); }, [scanning]);
  useEffect(() => { if (scanProgress >= 100 && scanning) { setScanning(false); setScanned(true); } }, [scanProgress, scanning]);
  useEffect(() => { if (science) return; const key = (e: KeyboardEvent) => { if ((e.target as HTMLElement).matches('input,textarea,select')) return; if (e.code === 'KeyE' && !modal) scan(); if (e.code === 'Escape') setModal(null); if (e.code === 'KeyR' && !modal) setAction(p => ({ kind: 'reset', tick: p.tick + 1 })); if (e.code === 'Space' && !modal) { e.preventDefault(); setMoving(p => !p); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [modal, scan, science]);
  const modalRef = useRef<HTMLElement>(null);
  useEffect(() => { if (!modal) return; const previous = document.activeElement as HTMLElement; const el = modalRef.current; const focusable = () => Array.from(el?.querySelectorAll<HTMLElement>('button:not(:disabled),a,input') || []); focusable()[0]?.focus(); const trap = (e: KeyboardEvent) => { if (e.key === 'Tab') { const nodes = focusable(), first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } }; window.addEventListener('keydown', trap); return () => { window.removeEventListener('keydown', trap); previous?.focus(); }; }, [modal]);
  const visited = checkpoints.filter(Boolean).length, oxygen = Math.max(0, Math.round(78 - travel * .13)), battery = Math.max(0, Math.round(82 - travel * .09 - (storm ? 16 : 0))), distance = Math.round(Math.hypot(player.x,player.z-(returning?DEPARTURE_Z:TARGET_Z)));
  const geo = ground ? playerGeo(ground,player.x,player.z) : {lat:18.4802,lon:77.3809};
  const onPosition = useCallback((p:PlayerPosition)=>{
    const old=playerRef.current,delta=Math.hypot(p.x-old.x,p.z-old.z);playerRef.current=p;setPlayer(p);setTrack(history=>appendTrack(history,p));
    if(delta>.05&&delta<30)setTravel(t=>t+delta/342*100);
    if(!guidedRef.current)setProgress(Math.max(0,Math.min(100,(DEPARTURE_Z-p.z)/342*100)));
    setCheckpoints(prev=>{const next=prev.map((done,i)=>done||Math.hypot(p.x,p.z-(DEPARTURE_Z-(i+1)*114))<25);return next.some((v,i)=>v!==prev[i])?next:prev;});
  },[]);
  const onManualInput = useCallback(()=>{setGuided(false);setReturning(false);setMoving(true);setMissionOpen(false);setOverhead(false);},[]);
  const searchResults = useMemo(() => ['Jezero Exploration mission', 'Basaltic rock specimen', 'Western delta science site', 'USGS scientific terrain workspace'].filter(x => x.toLowerCase().includes(query.toLowerCase())), [query]);
  const camera = (kind: string) => setAction(p => ({ kind, tick: p.tick + 1 }));
  const reset = () => { setTrack([{x:0,z:DEPARTURE_Z}]);setProgress(0); setCheckpoints([false,false,false]); setTravel(0); setGuided(false); setMoving(false); setSamples(0); setReturned(false); setReturning(false); setReturnOrigin(null); setReturnProgress(0); setStorm(false); setScanned(false); setOverhead(false); camera('home'); setModal(null); notify('Mission reset. Ready for a new exploration.'); };
  const beginReturn = () => { if(Math.hypot(player.x,player.z-DEPARTURE_Z)<8){notify('You are already at the departure point. Explore freely or choose the guided trail.');return;}setReturnOrigin({x:player.x,z:player.z});setReturnProgress(0);setReturning(true);setGuided(true);setMoving(true);setMissionOpen(false);notify('Return guidance activated from your current position.'); };
  const start = () => { if (returned) setReturned(false); if (progress >= 100 && guided && !returning) beginReturn(); else setMoving(p => !p); setOverhead(false); if(!moving){setMissionOpen(false);notify(guided?'Guided traverse started. Switch to Free roam to leave the trail.':'Free roam enabled. Drag or lock the mouse to look. Use WASD or the movement joystick to explore.');} };
  const mode = (value:boolean) => {setGuided(value);if(!value)setReturning(false);setMoving(true);setMissionOpen(false);setOverhead(false);notify(value?'Guided trail selected.':'Free roam selected. The camera will not follow the scripted route.');};
  const lockMouse = async () => {try{await document.querySelector<HTMLCanvasElement>('.mx-world canvas')?.requestPointerLock();}catch{notify('Mouse lock is unavailable here. Drag to look, or use the Look touchpad.');}};
  const exportReport = () => { const blob = new Blob([JSON.stringify({ mission: 'Jezero Exploration', type: 'Real NASA/USGS terrain with simulated crew resources', progress, visited, samples, returned, oxygen, battery, location:{...geo,elevation:player.elevation}, mode:guided?'Guided trail':'Free roam', meda, radiationDose:null, weather: storm ? 'Simulated dust event' : 'Illustrative lighting', assetPipeline: 'Blender 5.2 → glTF → Three.js', colorTreatment: 'Reference-based rust-red palette over NASA orbital grayscale; not calibrated natural color', scientificWorkspace: '/?workspace=science', note: 'Measured HiRISE/CTX terrain at true scale. MEDA temperatures are historical (2021-04-03/04). Radiation unavailable. Crew resources and mineral classification are simulated.' }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'jezero-exploration-report.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('Exploration report downloaded.'); };
  if (science) return <><Suspense fallback={<div className="mx-science-loading">Loading scientific mission workspace…</div>}><ScientificWorkspace/></Suspense><a className="mx-back-to-surface" href="/"><ArrowLeft size={14}/> Return to Mars Explorer</a></>;
  return <MissionInterface track={track} returnOrigin={returnOrigin} ready={ready} moving={moving} returning={returning} returned={returned} oxygen={oxygen} battery={battery} distance={distance} progress={progress} samples={samples} player={player} geo={geo} layer={layer} storm={storm} online={online} toast={toast}
    onStart={start} onReturn={beginReturn} onReset={reset} onScan={scan} onExport={exportReport} onDismissToast={() => setToast('')} onLayer={setLayer} onStorm={setStorm} onOverhead={setOverhead} onCamera={camera}
    controls={<TouchControls input={input} visible={moving && !modal && !overhead} onScan={scan} guided={guided} onMode={mode} onLock={lockMouse}/>}
    dialogs={<ExplorerDialogs modal={modal} setModal={setModal} modalRef={modalRef} moving={moving} start={start} progress={progress} visited={visited} samples={samples} returned={returned} scanning={scanning} scanProgress={scanProgress} scanned={scanned} scan={scan} collect={() => { setSamples(p => Math.min(2, p + 1)); setModal(null); notify(samples === 0 ? 'Sample 1 of 2 secured.' : 'Both geological samples secured.'); }} query={query} setQuery={setQuery} searchResults={searchResults} storm={storm} setStorm={setStorm} online={online} exportReport={exportReport} reset={reset}/>}
  >
    <div className={`mx-app ${moving ? 'mx-is-exploring' : ''}`}><div className={`mx-surface ${overhead ? 'mx-overhead' : ''} ${storm ? 'mx-storm' : ''}`}>
      <div className="mx-world">{ground && <Suspense fallback={null}><CinematicScene ground={ground} layer={layer === 1 ? 1 : 0} moving={moving && !modal} progress={progress} returning={returning} returnProgress={returnProgress} returnOrigin={returnOrigin} guided={guided} input={input} interactive={!modal} onPosition={onPosition} onManualInput={onManualInput} overhead={overhead} action={action} scanned={scanned} storm={storm} onScan={scan} onReady={sceneReady}/></Suspense>}</div>
      {(!ready || error) && <div className="mx-loading"><Orbit size={36}/><h2>{error ? 'Surface connection interrupted' : 'Descending into Jezero'}</h2><p>{error || 'Preparing the existing terrain…'}</p>{error && <button className="mx-primary" onClick={() => setRetry(p => p + 1)}>Retry surface load</button>}</div>}
    </div></div>
  </MissionInterface>;
}
