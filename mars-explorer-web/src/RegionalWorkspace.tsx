import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Layers, Map, Mountain, Route as RouteIcon, Crosshair } from 'lucide-react';
import { elevation, slope, toGeo, type Terrain, type Point } from './terrain';
import { DEMO_RULES, type RoutingRules } from './nativeRouting';
import { useNativeRoute } from './useNativeRoute';
import { loadSharedRegional, type SharedRegionalMap } from './sharedRegionalData';
import RegionalMap2D from './RegionalMap2D';
import type { AnalysisLayer } from './regionalLayers';
import { SCIENCE_SITES, sciencePoint, type ScienceFocus, type ScienceSite } from './scienceSites';
import ScienceSitePopup from './ScienceSitePopup';
import ObservationPanel from './RegionalObservationPanel';
import { MINERALS, THERMAL, observationMarkers, type ObservationLayer } from './environmentObservations';
import { ORBITAL_LAYERS, ORBITAL_THERMAL_STATUS, loadOrbitalRaster, type OrbitalRaster } from './orbitalLayers';
import OrbitalLayerPanel from './OrbitalLayerPanel';
import TravelEstimate from './TravelEstimate';
import EvaMissionPanel from './EvaMissionPanel';
import SidebarTabs, {type SidebarPanel} from './SidebarTabs';
import {useEvaMission} from './useEvaMission';
import {pointOnMission} from './evaMission';
import {TRAVEL_DEFAULTS,type TravelMode} from './travelTime';
import './regional-map.css';
import './regional-sidebar.css';

const Scene = lazy(() => import('./Scene'));
const DEFAULT_DESTINATION = { x: -1850, z: -1100 };
export default function RegionalWorkspace() {
  const [baseTerrain, setTerrain] = useState<Terrain | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [shared, setShared] = useState<SharedRegionalMap | null>(null);
  const [view, setView] = useState<'2D' | '3D'>('2D'), [analysis, setAnalysis] = useState<AnalysisLayer>('none');
  const [imagery, setImagery] = useState(true), [opacity, setOpacity] = useState(.65), [contours, setContours] = useState(false);
  const [grid, setGrid] = useState(true);
  const [inspection,setInspection]=useState<Point|null>(null);
  const [telemetryOpen, setTelemetryOpen] = useState(true);
  const [sidebarPanel,setSidebarPanel]=useState<SidebarPanel>('mission');
  const [scienceVisible, setScienceVisible] = useState(true), [selectedScienceId, setSelectedScienceId] = useState<string | null>(null);
  const [scienceFocus, setScienceFocus] = useState<ScienceFocus | null>(null);
  const [observationLayer, setObservationLayer] = useState<ObservationLayer>('none');
  const [observationOpen, setObservationOpen] = useState(false);
  const [thermalId, setThermalId] = useState(THERMAL.observations[0].id);
  const [observationFocus, setObservationFocus] = useState<{ point: Point; tick: number } | null>(null);
  const [orbitalId, setOrbitalId] = useState('none'), [orbitalOpen, setOrbitalOpen] = useState(false);
  const [orbital, setOrbital] = useState<OrbitalRaster | null>(null), [orbitalError, setOrbitalError] = useState(''), [orbitalRetry, setOrbitalRetry] = useState(0);
  const [orbitalPoint, setOrbitalPoint] = useState<Point | null>(null);
  const orbitalMeta = ORBITAL_LAYERS.find(dataset => dataset.id === orbitalId);
  useEffect(() => {
    const controller = new AbortController(); setOrbital(null); setOrbitalError('');
    if (orbitalMeta) loadOrbitalRaster(orbitalMeta,controller.signal).then(data => { if (!controller.signal.aborted) setOrbital(data); }).catch(error => { if (!controller.signal.aborted) setOrbitalError(error.message); });
    return () => controller.abort();
  },[orbitalMeta,orbitalRetry]);
  const [destination, setDestination] = useState<Point>(DEFAULT_DESTINATION), [picking, setPicking] = useState(false);
  const [targetId,setTargetId]=useState('custom');
  const [travelMode,setTravelMode]=useState<TravelMode>('rover'),[speeds,setSpeeds]=useState<Record<TravelMode,string>>({rover:String(TRAVEL_DEFAULTS.rover),walk:String(TRAVEL_DEFAULTS.walk)});
  const mission=useEvaMission(),missionLocked=!!mission.state.snapshot;
  const missionPosition=useMemo(()=>pointOnMission(mission.state),[mission.state]);
  const [routeVisible, setRouteVisible] = useState(true), [slopePriority, setSlopePriority] = useState(true), [blocked, setBlocked] = useState(false);
  const [rules,setRules]=useState<RoutingRules>(DEMO_RULES),[routeRetry,setRouteRetry]=useState(0);
  const routing=useNativeRoute(shared,destination,slopePriority,blocked,rules,routeRetry,targetId!=='custom');
  const terrain=useMemo(()=>baseTerrain?{...baseTerrain,nativeSlope:routing.grid??undefined}:null,[baseTerrain,routing.grid]);
  const [sceneOpened,setSceneOpened]=useState(false);
  const [cameraAction, setCameraAction] = useState({ kind: 'reset', tick: 0 });
  useEffect(() => {
    const c = new AbortController(); let loaded: SharedRegionalMap | undefined; setError('');
    loadSharedRegional(c.signal).then(data => { loaded = data; if (c.signal.aborted) URL.revokeObjectURL(data.imageryUrl); else { setShared(data); setTerrain(data.terrain); } }).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => { c.abort(); if (loaded) URL.revokeObjectURL(loaded.imageryUrl); };
  }, [retry]);
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPicking(false); setInspection(null); setSelectedScienceId(null); setObservationOpen(false); setOrbitalOpen(false); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, []);
  const route = mission.state.snapshot?.route??routing.route;
  const routeEnd=route?.approach?.endpoint??destination;
  const geo = toGeo(destination);
  const pick = useCallback((at: Point) => {if(!missionLocked){setTargetId('custom');setDestination(at);}}, [missionLocked]);
  const chooseTarget=(id:string)=>{if(missionLocked)return;const site=SCIENCE_SITES.find(s=>s.id===id);setTargetId(site?id:'custom');if(site){setDestination(sciencePoint(site,terrain?.meta.center));setPicking(false);}};
  const selectScience = useCallback((id: string) => { if (SCIENCE_SITES.some(s => s.id === id)) { setInspection(null); setSelectedScienceId(id); setPicking(false); setObservationOpen(false); setOrbitalOpen(false); } }, []);
  const zoomScience = (site: ScienceSite) => { setInspection(null); setScienceVisible(true); setSelectedScienceId(site.id); setObservationOpen(false); setOrbitalOpen(false); setPicking(false); setView('2D'); setScienceFocus(v => ({ id: site.id, tick: (v?.tick ?? 0) + 1 })); };
  const selectedScience = SCIENCE_SITES.find(s => s.id === selectedScienceId);
  const reading = THERMAL.observations.find(item => item.id === thermalId) ?? THERMAL.observations[0];
  const observations = useMemo(() => observationMarkers(observationLayer, reading, terrain?.meta.center), [observationLayer, reading, terrain?.meta.center]);
  const enableObservation = (layer: ObservationLayer) => { setInspection(null); setObservationLayer(layer); setObservationOpen(layer !== 'none'); setSelectedScienceId(null); setPicking(false); setOrbitalOpen(false); };
  const openObservation = () => { setInspection(null); setObservationOpen(true); setSelectedScienceId(null); setPicking(false); setOrbitalOpen(false); };
  const inspectTerrain=(point:Point)=>{setInspection(point);setSelectedScienceId(null);setObservationOpen(false);setOrbitalOpen(false);};
  const inspectOrbital = (point: Point) => { setInspection(null); setOrbitalPoint(point); setOrbitalOpen(true); setObservationOpen(false); setSelectedScienceId(null); };
  const chooseOrbital = (id: string) => { setInspection(null); setOrbitalId(id); setOrbitalPoint(null); setAnalysis('none'); setOrbitalOpen(id !== 'none'); setObservationOpen(false); setSelectedScienceId(null); };
  const locateObservation = () => { const point = observations[0]?.point; if (point) { setView('2D'); setPicking(false); setObservationFocus(value => ({ point, tick: (value?.tick ?? 0) + 1 })); } };
  const travelSettings=<TravelEstimate presentation="settings" route={route} mode={travelMode} speeds={speeds} onMode={setTravelMode} onSpeed={(mode,value)=>setSpeeds(s=>({...s,[mode]:value}))} locked={missionLocked}/>;
  const destinationControls=<><button className="rm-pick-button rm-map-destination" disabled={missionLocked} aria-pressed={picking} onClick={()=>setPicking(v=>!v)}><Crosshair size={15}/>{picking?'Finish selection':'Set destination'}</button><div className="rm-coordinates" data-testid="destination-coordinates">{geo.lat.toFixed(5)}° N · {geo.lon.toFixed(5)}° E</div></>;
  const routeControls=(<>
      <section className="rm-section rm-route-preferences" aria-labelledby="rm-route-title"><h2 id="rm-route-title"><RouteIcon size={15}/> ROUTE WORKBENCH <span>PROTOTYPE</span></h2>
        <fieldset className="rm-mission-plan-controls" disabled={missionLocked}>
        <div className="rm-strategies"><button aria-pressed={!slopePriority} onClick={() => setSlopePriority(false)}>Distance priority</button><button aria-pressed={slopePriority} onClick={() => setSlopePriority(true)}>Slope priority</button></div>
        <details className="rm-route-rules"><summary>Demo slope rules</summary><label className="rm-check"><span>Simulated exclusion<small>800 m radius at local E +100, S +300 m</small></span><input type="checkbox" checked={blocked} onChange={e => setBlocked(e.target.checked)}/></label><p>Same limits for both strategies. These are configurable demonstration choices, not NASA astronaut limits.</p>{([{key:'alongLimit',label:'Along-route limit (degrees)'},{key:'crossLimit',label:'Sideways limit (degrees)'},{key:'totalLimit',label:'Ground slope limit (degrees)'}] as const).map(({key,label})=><label key={key}>{label}<input aria-label={label} type="number" min="1" max="45" step="1" value={rules[key]} onChange={e=>{const value=Number(e.target.value);if(Number.isFinite(value)&&value>=1&&value<=45)setRules(r=>({...r,[key]:value}));}}/></label>)}<p>Red route sections reach 80% of a configured limit. Bounds are conservative and can exclude passable ground.</p></details>
        </fieldset>
        <p className="rm-fineprint" role="status">{routing.status}</p>{route?.approach&&<div className="rm-approach-notice" role="status"><strong>APPROACH ONLY · {Math.ceil(route.approach.gapMetres)} m short of site</strong><p>{route.approach.reason}</p><p>Route stops at a reachable grid point within a 250 m demo search radius. The remaining straight-line gap is unplanned; it is not a verified walking leg. This simulation visits the approach point only, with no science task.</p></div>}{routing.error&&<p role="alert">{routing.error}</p>}{routing.error&&<button className="rm-pick-button" onClick={()=>setRouteRetry(v=>v+1)}>Retry native routing</button>}
      </section>
  </>);
  return <main className="regional-map">
    <header className="rm-header"><a href="/?workspace=jz01" aria-label="Back to JZ-01"><ArrowLeft size={18}/></a><div className="rm-wordmark">ARES<span>· Martian Survival Map</span></div><span className="rm-header-divider"/><span className="rm-header-title">REGIONAL SCIENCE WORKSPACE</span><span className="rm-status"><i/>{error ? 'DATA UNAVAILABLE' : !shared ? 'CONNECTING DATA' : shared.preview ? 'LOCAL REVIEW' : 'SHARED NASA DATA'}</span></header>
    <div className="rm-body"><aside className="rm-sidebar" aria-label="Mission workspace controls"><div className="rm-sidebar-head">
      
      <SidebarTabs value={sidebarPanel} onChange={setSidebarPanel}/></div><div className={`rm-sidebar-body rm-sidebar-body-${sidebarPanel}`}>
      <div id="rm-panel-mission" role="tabpanel" aria-labelledby="rm-tab-mission" hidden={sidebarPanel!=='mission'}>
      <EvaMissionPanel travelControls={travelSettings} routeControls={routeControls} destinationControl={destinationControls} route={routing.route} mode={travelMode} speedKmh={Number(speeds[travelMode])} target={SCIENCE_SITES.find(s=>s.id===targetId)?.name??'Custom map destination'} targetId={targetId} targets={SCIENCE_SITES} onTarget={chooseTarget} exclusion={blocked} state={mission.state} dispatch={action=>{if(action.type==='start')setPicking(false);mission.dispatch(action);}}/>
      </div>
      <div id="rm-panel-layers" role="tabpanel" aria-labelledby="rm-tab-layers" hidden={sidebarPanel!=='layers'}>
      <section className="rm-section" aria-labelledby="rm-layers-title"><h2 id="rm-layers-title"><Layers size={15}/> MAP LAYERS</h2>
        <label className="rm-check"><span>Orbital imagery<small>HiRISE grayscale · shared NASA data</small></span><input type="checkbox" checked={imagery} disabled={view === '3D'} onChange={e => setImagery(e.target.checked)}/></label>
        <fieldset className="rm-layer-options"><legend>Terrain overlay</legend>{([{ id: 'none', name: 'No terrain analysis', detail: 'Imagery with optional orbital layer' }, { id: 'elevation', name: 'Elevation', detail: 'Ground height in metres' }, { id: 'slope', name: 'Slope', detail: 'Inclination from the elevation grid' }] as const).map(l => <label key={l.id} className={analysis === l.id ? 'rm-layer-selected' : ''}><input type="radio" name="regional-analysis" value={l.id} checked={analysis === l.id} onChange={() => { setAnalysis(l.id); if (l.id !== 'none') { setOrbitalId('none'); setOrbitalOpen(false); } }}/><span>{l.name}<small>{l.detail}</small></span></label>)}</fieldset>
        <label className="rm-observation-field">Orbital area overlay<select aria-label="Orbital area overlay" value={orbitalId} onChange={e => chooseOrbital(e.target.value)}><option value="none">No orbital overlay</option>{ORBITAL_LAYERS.map(dataset => <option key={dataset.id} value={dataset.id}>{dataset.title} · CRISM</option>)}<option disabled>Thermal area raster · unavailable</option></select></label>
        <p className="rm-fineprint">{ORBITAL_THERMAL_STATUS}</p>
        {orbitalMeta && <><p className="rm-fineprint">{orbitalError || (!orbital ? 'Loading and checking orbital pixels…' : `${orbitalMeta.coveragePercent.toFixed(2)}% valid cells · 40 m output. Spectral indicator, not a confirmed mineral map.`)}</p><button className="rm-pick-button" onClick={() => { setOrbitalOpen(true); setObservationOpen(false); setSelectedScienceId(null); }}>Area layer details</button></>}
        <label className="rm-slider">Overlay opacity <strong>{Math.round(opacity * 100)}%</strong><input aria-label="Overlay opacity" type="range" min="0" max="1" step="0.05" value={opacity} disabled={orbitalId === 'none' && (analysis === 'none' || view === '3D')} onChange={e => setOpacity(Number(e.target.value))}/><small>Orbital layers blend in both views.</small></label>
        <label className="rm-check"><span>Contour lines<small>20 m elevation interval</small></span><input type="checkbox" checked={contours} onChange={e => setContours(e.target.checked)}/></label>
        <label className="rm-check"><span>Coordinate grid<small>Mars latitude / longitude · 2D</small></span><input type="checkbox" checked={grid} disabled={view === '3D'} onChange={e => setGrid(e.target.checked)}/></label>
        <label className="rm-check"><span>Science Sites<small>NASA rover sampling · map cross-checked</small></span><input type="checkbox" checked={scienceVisible} onChange={e => { setScienceVisible(e.target.checked); if (!e.target.checked) setSelectedScienceId(null); }}/></label>
        <label className="rm-check"><span>Thermal observations<small>MEDA ground temperature · historical points</small></span><input type="checkbox" checked={observationLayer === 'thermal'} onChange={e => enableObservation(e.target.checked ? 'thermal' : 'none')}/></label>
        <label className="rm-check"><span>Mineral observations<small>NASA-reported sulfates · outcrop locator</small></span><input type="checkbox" checked={observationLayer === 'minerals'} onChange={e => enableObservation(e.target.checked ? 'minerals' : 'none')}/></label>
        {observationLayer !== 'none' && <div className="rm-observation-sidebar"><p className="rm-fineprint">{observationLayer === 'thermal' ? `T / Sol ${reading.sol} · ${reading.lmst} LMST. Selected historical readings; no zone-wide temperature coverage.` : `M / ${MINERALS.length} reported mineral observation. Unobserved areas are unknown; no deposit map.`}</p><button className="rm-pick-button" onClick={openObservation}>Observation details &amp; time</button><button className="rm-pick-button" onClick={locateObservation}>Locate observation</button></div>}
        <label className="rm-check"><span>Demo route</span><input type="checkbox" checked={routeVisible} onChange={e => setRouteVisible(e.target.checked)}/></label>
      </section>
      </div>
      <div id="rm-panel-sites" role="tabpanel" aria-labelledby="rm-tab-sites" hidden={sidebarPanel!=='sites'}>
      <section className="rm-section" aria-labelledby="rm-science-heading"><h2 id="rm-science-heading">SCIENCE SITES <span>PROVISIONAL</span></h2>
        {scienceVisible ? SCIENCE_SITES.map(site => <div className="rm-site-row" key={site.id}><button aria-label={`View ${site.name}`} aria-pressed={site.id === selectedScienceId} onClick={() => selectScience(site.id)}><span>{site.code} / {site.name}</span><small>{site.sample} · {site.designation}</small></button><button className="rm-site-locate" aria-label={`Zoom to ${site.name}`} title={`Zoom to ${site.name}`} onClick={() => zoomScience(site)}><Crosshair size={15}/></button></div>) : <p className="rm-fineprint">Turn on Science Sites to show the historical sampling markers.</p>}
        <p className="rm-fineprint">Reported positions, separate from human EVA destinations. S1 and S2 labels have leader lines to the map coordinates.</p>
      </section>
      </div>
      <div id="rm-panel-sources" role="tabpanel" aria-labelledby="rm-tab-sources" hidden={sidebarPanel!=='sources'}><section className="rm-section"><h2>DATA &amp; ASSUMPTIONS</h2><p className="rm-fineprint">ARES / TERRAIN NAVIGATION<br/>DELTA / CRATER FLOOR</p>
        <p className="rm-fineprint">Simulated base and destination. 20 m search grid; each segment checks conservative 10 m envelopes built from every overlapping native 1 m DEM cell. These are not validated EVA routes.</p>
      <div className="rm-validation-note"><strong>HiRISE point coverage checked</strong><p>Both reported site positions have valid local 1 m elevation and 25 cm imagery pixels at the reported coordinates; both markers agree with NASA report-map targets.</p><p>NASA 1 m elevation and 25 cm imagery are retained in shared tiles. Both views use a 10 m display mesh and 2.44 m imagery overview. Relative NASA map alignment is checked. Absolute position accuracy and vertical datum compatibility remain unverified.</p></div>
      <section className="rm-resource-links" aria-label="Official resources"><h2>OFFICIAL RESOURCES</h2>
        <a href="https://trek.nasa.gov/mars/" target="_blank" rel="noreferrer">NASA Mars Trek ↗</a><p>Reference viewer. Its controlled Jezero DEM is the same source product used here; this is source consistency, not independent accuracy certification.</p>
        <a href="https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars" target="_blank" rel="noreferrer">Mars Trek layer catalogue ↗</a><p>The listed footprint contains our zone. Trek imagery is soc_006; ARES uses soc_007 with a different projection. No pixel-identical imagery claim.</p>
        <details><summary>Original terrain &amp; imagery</summary><a href="https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif" target="_blank" rel="noreferrer">Original 1 m elevation GeoTIFF · large file ↗</a><a href="https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_007_orthoMosaic_25cm_Ortho_blend120.tif" target="_blank" rel="noreferrer">Original 25 cm imagery GeoTIFF · large file ↗</a></details>
        <details><summary>Presentation references</summary><a href="https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/" target="_blank" rel="noreferrer">Curiosity route and science regions ↗</a><p>Named science objectives inform our mission itinerary display. Curiosity's route is elsewhere on Mars and is not used in Jezero calculations.</p><a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noreferrer">NASA Worldview ↗</a><p>Earth-only interface reference for layer, legend and time controls. Our historical Mars readings come from MEDA, not Worldview.</p></details>
      </section>
      </section></div>
      </div></aside>
    <section className="rm-stage" aria-label="Map workspace"><div className="rm-zone-heading"><h1>Western Jezero</h1><p>Zone area · 10 × 10 km</p></div>
      <div className="rm-stage-toolbar"><div className="rm-view-switch" role="group" aria-label="Map view"><button aria-pressed={view === '2D'} onClick={() => setView('2D')}><Map size={15}/>2D MAP</button><button aria-pressed={view === '3D'} onClick={() => {setSceneOpened(true);setView('3D');}}><Mountain size={15}/>3D TACTICAL</button></div><span>HiRISE · 10 m display grid · {view === '3D' ? 'True-scale height · 1×' : 'North up'}</span></div>
      {error ? <div className="rm-empty" role="alert"><h2>Terrain could not load</h2><p>{error}</p><button onClick={() => setRetry(v => v + 1)}>Retry</button></div> : !terrain ? <div className="rm-empty" role="status">Loading regional terrain…</div> : <>
        <RegionalMap2D shared={shared} terrain={terrain} analysis={analysis} opacity={opacity} imagery={imagery} contours={contours} destination={destination} destinationLabel={targetId==='custom'?'DEMO DESTINATION':SCIENCE_SITES.find(s=>s.id===targetId)?.name} route={route} missionPosition={missionPosition} routeVisible={routeVisible} picking={picking} onPick={pick} hidden={view !== '2D'} blocked={blocked} grid={grid} scienceVisible={scienceVisible} selectedScienceId={selectedScienceId} scienceFocus={scienceFocus} onScienceSelect={selectScience} observations={observations} observationFocus={observationFocus} onObservationSelect={openObservation} orbital={orbital?.meta.id === orbitalId ? orbital : null} onOrbitalInspect={inspectOrbital} onInspect={inspectTerrain}/>
        {sceneOpened && <div className="rm-scene" hidden={view!=='3D'}><Suspense fallback={<div className="rm-empty">Loading tactical view…</div>}><Scene imageryUrl={shared?.imageryUrl} terrain={terrain} layer={analysis === 'none' ? 'surface' : analysis} contours={contours} exaggeration={1} mode="3D" cameraAction={cameraAction} route={routeVisible ? route : null} missionPosition={missionPosition} selected="custom" onSelect={() => {}} onPick={pick} planning={picking} progress={0} storm={false} markers={false} running={false} destination={routeEnd} blocked={blocked} accentColor="#f39b58" scienceSitesVisible={scienceVisible} selectedScienceId={selectedScienceId} onScienceSelect={selectScience} observations={observations} onObservationSelect={openObservation} orbital={orbital?.meta.id === orbitalId ? orbital : null} orbitalOpacity={opacity} onOrbitalInspect={inspectOrbital} onInspect={inspectTerrain}/></Suspense><button className="rm-3d-reset" onClick={() => setCameraAction(a => ({ kind: 'reset', tick: a.tick + 1 }))}>Reset 3D camera</button></div>}
        {blocked && view === '2D' && <div className="rm-exclusion-note">Simulated exclusion active · see hatched area</div>}
        {analysis !== 'none' && <div className="rm-legend" aria-label="Map legend"><strong>{analysis === 'slope' ? 'Slope bound · degrees' : 'Elevation · metres'}</strong>{analysis === 'slope' ? <><div className="rm-slope-scale"><i/><i/><i/></div><div className="rm-legend-labels"><span>0–10°</span><span>10–18°</span><span>&gt;18°</span></div><small>{routing.grid?'Native 1 m terrain · 10 m conservative cells':'Native slopes not ready · display-grid preview'}<br/>Display bands · not safety limits</small></> : <><div className="rm-height-scale"/><div className="rm-legend-labels"><span>{Math.round(terrain.meta.min)} m</span><span>{Math.round(terrain.meta.max)} m</span></div></>}</div>}
        {orbitalMeta && orbital && <div className="rm-legend rm-orbital-legend" aria-label="Orbital indicator legend"><strong>{orbitalMeta.parameter} · index</strong><div className="rm-height-scale" style={{background:`linear-gradient(90deg,#191f28,${orbitalMeta.color})`}}/><div className="rm-legend-labels"><span>{orbitalMeta.displayMin.toFixed(4)}</span><span>{orbitalMeta.displayMax.toFixed(4)}</span></div><small>Colour stretch, not confidence<br/>Uncoloured = no data · {orbitalMeta.observedStart.slice(0,10)}</small></div>}
        <section className="rm-telemetry" aria-label="Route data" data-testid="route-data-card">
          <button className="rm-telemetry-toggle" aria-expanded={telemetryOpen} aria-controls="rm-route-data" aria-label={telemetryOpen ? 'Collapse route data' : 'Expand route data'} onClick={() => setTelemetryOpen(v => !v)}><span>{route?.approach?'APPROACH ROUTE':'ROUTE DATA'}</span><span aria-hidden="true">{telemetryOpen ? '−' : '+'}</span></button>
          <div id="rm-route-data" hidden={!telemetryOpen} aria-live="polite"><TravelEstimate route={route} mode={travelMode} speeds={speeds} onMode={setTravelMode} onSpeed={(mode,value)=>setSpeeds(s=>({...s,[mode]:value}))} locked={missionLocked}/><div className="rm-telemetry-grid">
            <div><small>DEMO ROUTE</small><strong>{route?.profileStatus==='verified' ? <>{(route.distance / 1000).toFixed(2)}<span className="rm-unit"> km</span></> : <span className="rm-no-route">{route?'Checking…':'—'}</span>}</strong></div>
            <div><small>UPHILL CLIMB</small><strong>{route?.profileStatus==='verified' ? <>{Math.round(route.ascent)}<span className="rm-unit"> m</span></> : '—'}</strong></div>
            <div><small>MAX ALONG / SIDEWAYS BOUNDS</small><strong>{route ? <>{route.maxAlongSlope.toFixed(1)} / {route.maxCrossSlope.toFixed(1)}<span className="rm-unit">°</span></> : '—'}</strong></div>
            <div><small>{route?.approach?'APPROACH HEIGHT':'DESTINATION HEIGHT'}</small><strong>{Number.isFinite(elevation(terrain,routeEnd.x,routeEnd.z)) ? <>{Math.round(elevation(terrain,destination.x,destination.z))}<span className="rm-unit"> m</span></> : 'No data'}</strong></div>
          </div><p className="rm-telemetry-foot">{routing.status}{route&&` · Max ground slope bound ${route.maxSlope.toFixed(1)}° · ${route.warnings.length} flagged segments · ${route.profileSamples} profile samples`} · DEMO LIMITS / NOT EVA CERTIFIED</p></div>
        </section>
        {inspection && <section className="rm-science-popup rm-terrain-inspector" aria-label="Terrain inspection"><header>TERRAIN INSPECTION<button aria-label="Close terrain inspection" onClick={()=>setInspection(null)}>×</button></header><div className="rm-science-content"><h2>Selected ground point</h2><dl><dt>MARS COORDINATES</dt><dd>{toGeo(inspection).lat.toFixed(5)}° N · {toGeo(inspection).lon.toFixed(5)}° E</dd><dt>ELEVATION</dt><dd>{Number.isFinite(elevation(terrain,inspection.x,inspection.z))?elevation(terrain,inspection.x,inspection.z).toFixed(1)+' m':'No data'}</dd><dt>{terrain.nativeSlope?'NATIVE TERRAIN SLOPE BOUND':'DISPLAY-GRID SLOPE'}</dt><dd>{Number.isFinite(slope(terrain,inspection.x,inspection.z))?slope(terrain,inspection.x,inspection.z).toFixed(1)+'°':'No data'}</dd></dl><p>Elevation uses the 10 m display grid. Slope uses native terrain bounds when loaded; otherwise it is a display estimate.</p></div></section>}
{scienceVisible && selectedScience && <ScienceSitePopup store={shared?.store} site={selectedScience} terrain={terrain} onClose={() => setSelectedScienceId(null)} onSelect={selectScience} onZoom={zoomScience}/>}
        {observationLayer !== 'none' && observationOpen && <ObservationPanel key={observationLayer} layer={observationLayer} reading={reading} onReading={setThermalId} onClose={() => setObservationOpen(false)} onLocate={locateObservation}/>}
        {orbitalMeta && orbitalOpen && <OrbitalLayerPanel meta={orbitalMeta} raster={orbital?.meta.id === orbitalId ? orbital : null} point={orbitalPoint} error={orbitalError} onClose={() => setOrbitalOpen(false)} onRetry={() => setOrbitalRetry(value => value+1)}/>}
      </>}
    </section></div>
  </main>;
}
