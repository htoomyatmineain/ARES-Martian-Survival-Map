import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Activity, ArrowDownLeft, ArrowRight, Battery, Check, ChevronDown, ChevronRight, CircleHelp, Compass, Crosshair, Download, Flag, FlaskConical, Footprints, Home, Layers3, Map, MapPin, Maximize2, Mountain, Navigation, Pause, Play, Radio, RotateCcw, Route, Settings2, ShieldCheck, SlidersHorizontal, Tablet, Thermometer, TriangleAlert, UserRound, Wind, X } from 'lucide-react';
import type { PlayerPosition } from './explorationInput';
import './mission-interface.css';
import JezeroMap from './JezeroMap';
import type { TrackPoint } from './mapCoordinates';

type Props = {
  track: TrackPoint[]; children: ReactNode; controls: ReactNode; dialogs: ReactNode;
  ready: boolean; moving: boolean; returning: boolean; returned: boolean;
  oxygen: number; battery: number; distance: number; progress: number; samples: number;
  returnOrigin: { x: number; z: number } | null; player: PlayerPosition; geo: { lat: number; lon: number }; layer: number;
  storm: boolean; online: boolean; toast: string;
  onStart: () => void; onReturn: () => void; onReset: () => void;
  onScan: () => void; onExport: () => void; onDismissToast: () => void;
  onLayer: (layer: number) => void; onStorm: (storm: boolean) => void;
  onOverhead: (overhead: boolean) => void; onCamera: (action: string) => void;
};
const sections = [
  { id: 'navigate', label: 'Navigate', icon: Navigation },
  { id: 'suit', label: 'Suit', icon: Activity },
  { id: 'mission', label: 'Mission', icon: Flag },
  { id: 'layers', label: 'Layers', icon: Layers3 },
  { id: 'emergency', label: 'Safety', icon: ShieldCheck },
] as const;
type Section = typeof sections[number]['id'];

function Metric({ icon: Icon, label, value, detail, percent, caution = false }: { icon: typeof Battery; label: string; value: string; detail: string; percent?: number; caution?: boolean }) {
  return <div className={`mm-metric ${caution ? 'caution' : ''}`}><Icon size={18}/><div><span>{label}</span><strong>{value}</strong><small>{detail}</small>{percent !== undefined && <div className="mm-meter"><i style={{ width: `${percent}%` }}/></div>}</div></div>;
}

export default function MissionInterface(p: Props) {
  const [presentation, setPresentation] = useState<'hud' | 'tablet'>('hud');
  const [section, setSection] = useState<Section>('navigate');
  const [route, setRoute] = useState('fast');
  const [controller, setController] = useState(false);
  const [fault, setFault] = useState<'none' | 'oxygen' | 'comms'>('none');
  const [acknowledged, setAcknowledged] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [liveMapOpen, setLiveMapOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(true);
  const mapDialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mapOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = mapDialog.current;
    dialog?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMapOpen(false);
      if (event.key !== 'Tab') return;
      const buttons = Array.from(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? []);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [mapOpen]);
  const emergency = fault === 'oxygen';
  const warning = emergency || p.storm;
  const changeMode = (value: 'hud' | 'tablet') => { setPresentation(value); p.onOverhead(value === 'tablet'); };
  const previewFault = (value: typeof fault) => { setFault(value); setAcknowledged(false); };
  return <div className={`mm-shell mm-${presentation} ${warning ? 'mm-warning' : ''} ${!plannerOpen ? 'mm-planner-collapsed' : ''} ${liveMapOpen ? 'mm-live-enabled' : ''}`}>
    <header className="mm-header">
      <a className="mm-brand" href="/" aria-label="Martian Map home"><span className="mm-brand-mark"><Compass size={24}/></span><div><strong>MARTIAN MAP<span> / </span></strong><small>INTERPLANETARY SURVIVAL GUIDE</small></div></a>
      <div className="mm-region"><span>OPERATING REGION</span><strong>Jezero Crater <ChevronDown size={12}/></strong></div>
      <div className="mm-mode-switch" role="group" aria-label="Presentation mode"><button aria-pressed={presentation === 'hud'} onClick={() => changeMode('hud')}><Crosshair size={15}/> Helmet HUD</button><button aria-pressed={presentation === 'tablet'} onClick={() => changeMode('tablet')}><Tablet size={15}/> Tablet</button></div>
      <button className="mm-live-toggle" aria-pressed={liveMapOpen} onClick={()=>setLiveMapOpen(!liveMapOpen)}><Map size={15}/><span>{liveMapOpen ? 'Field terminal' : 'Live 2D map'}</span></button>{presentation === 'tablet' && <button className="mm-planner-toggle" aria-pressed={plannerOpen} onClick={() => setPlannerOpen(!plannerOpen)}><SlidersHorizontal size={15}/><span>Planner</span></button>}<span className="mm-preview-badge">UI PREVIEW</span><button className="mm-icon-button" aria-label="Help and controls" onClick={() => setShowHelp(!showHelp)}><CircleHelp size={19}/></button>
    </header>

    <div className="mm-body">
      <main className="mm-viewport" aria-label={presentation === 'hud' ? 'Helmet visor' : 'Tablet mission view'}>
        <div className="mm-scene-host">{p.children}</div>
        <div className="mm-visor-vignette"/>
        <div className="mm-scene-top"><span><i/> {presentation === 'hud' ? 'HELMET VISOR' : 'MISSION OVERVIEW'} <b>01</b></span><span className="mm-compass-tape">W <i/> NW <i/> <strong>▲ N</strong> <i/> NE <i/> E</span><span><Radio size={13}/>{fault === 'comms' ? 'EARTH LINK LOST · PREVIEW' : p.online ? 'LOCAL SYSTEM ACTIVE' : 'BROWSER OFFLINE'}</span></div>

        <div className="mm-mission-anchor"><span className="mm-eyebrow">EVA / JZ-01</span><h1>{p.returned ? 'Back at base.' : p.returning ? 'Bring it home.' : 'Into the ancient delta.'}</h1><p>{p.returned ? 'Exploration complete. Review your mission.' : p.returning ? 'Follow the existing trail to your departure point.' : 'Collect a sample. Find a story billions of years old.'}</p><span className="mm-stage"><i/>{p.returned ? 'MISSION COMPLETE' : p.returning ? 'RETURN TRAVERSE' : p.moving ? 'SURFACE EXPLORATION' : 'READY FOR DEPARTURE'}</span></div>

        {warning && <div className={`mm-alert ${emergency ? 'critical' : ''}`} role="alert"><TriangleAlert size={19}/><div><strong>{emergency ? 'Oxygen reserve warning' : 'Dust event active'}</strong><span>{emergency ? 'Alert preview only · inspect return options.' : 'Simulated dust · route forecast not connected yet.'}</span></div><button onClick={() => { setSection('emergency'); setLiveMapOpen(false); setTerminalOpen(true); }}>Review <ArrowRight size={15}/></button></div>}

        <div className="mm-scene-tools"><button aria-label="Recenter view" title="Recenter view" onClick={() => p.onCamera('reset')}><Crosshair size={17}/></button><button aria-label="Zoom in" title="Zoom in" onClick={() => p.onCamera('zoomIn')}>+</button><button aria-label="Zoom out" title="Zoom out" onClick={() => p.onCamera('zoomOut')}>−</button><button aria-label="Expand Jezero map" title="Expand Jezero map" onClick={() => setMapOpen(true)}><Map size={17}/></button></div>

        <div className="mm-destination"><MapPin size={22}/><strong>{p.distance}<small> m</small></strong><span>{p.returning ? 'DEPARTURE POINT' : 'SCIENCE WAYPOINT'}</span></div>

        <div className="mm-lower-left"><span className="mm-location"><Crosshair size={12}/>{p.geo.lat.toFixed(4)}° N / {p.geo.lon.toFixed(4)}° E <span>SIM POSITION</span></span><div className="mm-navigation-cue"><div><Navigation size={23}/></div><section><small>{p.returning ? 'RETURN GUIDANCE' : 'NEXT OBJECTIVE'}</small><strong>{p.returning ? 'Return to departure' : 'Follow the cyan trail'}</strong><p>{p.distance} m direct range <span>·</span> {p.returning ? 'Habitat approach' : 'Western delta site'}</p></section></div></div>

        <button className="mm-minimap" onClick={() => setMapOpen(true)} aria-label="Open Jezero map"><div className="mm-minimap-title"><span><Map size={12}/>JEZERO / LOCAL MAP</span><Maximize2 size={12}/></div><JezeroMap track={p.track} player={p.player} returning={p.returning} returnOrigin={p.returnOrigin}/></button>

        <div className="mm-survival"><Metric icon={Activity} label="OXYGEN" value={`${emergency ? 24 : p.oxygen}%`} detail={emergency ? 'Alert preview · not telemetry' : 'Simulated reserve'} percent={emergency ? 24 : p.oxygen} caution={emergency}/><Metric icon={Battery} label="SUIT BATTERY" value={`${p.battery}%`} detail="Simulated reserve" percent={p.battery}/><Metric icon={Thermometer} label="AIR / HISTORICAL" value="−22°C" detail="MEDA · 03–04 Apr 2021"/><Metric icon={ShieldCheck} label="RETURN MARGIN" value="— min" detail="Awaiting resource model"/><button className="mm-start" aria-label={p.moving ? 'Pause EVA' : 'Explore surface'} disabled={!p.ready} onClick={p.onStart}>{p.moving ? <Pause size={17}/> : <Play size={17}/>}<span>{p.moving ? 'Pause EVA' : 'Explore surface'}</span><ArrowRight size={16}/></button></div>
        <div className="mm-controls-host">{p.controls}</div>
        <footer className="mm-scene-footer"><span>NASA TERRAIN <i/> SIMULATED CREW RESOURCES</span><button onClick={() => { setSection('layers'); setLiveMapOpen(false); setTerminalOpen(true); }}>Data & provenance <ArrowRight size={11}/></button></footer>
        <button className="mm-open-terminal" onClick={() => {setLiveMapOpen(false);setTerminalOpen(true);}}><SlidersHorizontal size={16}/> Field terminal</button>
      </main>

      {liveMapOpen && <aside className="mm-live-panel" aria-label="Live 2D map connected to 3D"><header><div><span className="mm-eyebrow">MARTIAN MAP / LIVE POSITION</span><h2>Jezero navigation</h2></div><button className="mm-icon-button" aria-label="Close live map" onClick={()=>setLiveMapOpen(false)}><X size={17}/></button></header><JezeroMap track={p.track} player={p.player} returning={p.returning} returnOrigin={p.returnOrigin} expanded live/><footer><span>Move in 3D to update the map.</span><button onClick={()=>setLiveMapOpen(false)}>Open field terminal <ArrowRight size={12}/></button></footer></aside>}
      <aside className={`mm-terminal ${terminalOpen ? 'is-open' : ''}`} aria-label={presentation === 'hud' ? 'Forearm field terminal' : 'Mission planning panel'}>
        <div className="mm-terminal-hardware"><span>ARES / EXPLORATION SYSTEMS</span><i/><button className="mm-terminal-close" aria-label="Close terminal" onClick={() => setTerminalOpen(false)}><X size={15}/></button></div>
        <div className="mm-terminal-heading"><div><span className="mm-eyebrow">{presentation === 'hud' ? 'FOREARM DISPLAY' : 'MISSION PLANNER'}</span><h2>Field terminal<span> / 01</span></h2></div><span className="mm-link-dot" title="Shared local session"/></div>
        <nav className="mm-tabs" aria-label="Field terminal sections">{sections.map(s => <button key={s.id} aria-current={section === s.id ? 'page' : undefined} onClick={() => setSection(s.id)}><s.icon size={17}/><span>{s.label}</span></button>)}</nav>
        <div className="mm-terminal-content">
          {section === 'navigate' && <>
            <div className="mm-section-heading"><span>01 / ROUTE PLANNING</span><Route size={15}/></div>
            <div className="mm-target"><div className="mm-target-icon"><MapPin size={20}/></div><div><small>DESTINATION</small><h3>{p.returning ? 'Departure point' : 'Western delta site'}</h3><span>{p.returning ? 'Return to base' : 'Geological sample collection'}</span></div></div>
            <div className="mm-path-steps"><span><i/>Habitat / departure</span><span><i/>{p.returning ? 'Return in progress' : 'Science waypoint'}</span></div>
            <div className="mm-section-label">COMPARE ROUTES <span>ILLUSTRATIVE</span></div>
            <button className={`mm-route-card ${route === 'fast' ? 'selected' : ''}`} aria-pressed={route === 'fast'} onClick={() => setRoute('fast')}><div><span className="mm-radio"/><strong>Fastest traverse</strong><span className="mm-route-letter">A</span></div><p><b>18 <small>min</small></b><span>720 m <i/> +45 m ascent</span></p><footer><Mountain size={12}/> Steeper terrain <span>EXAMPLE</span></footer></button>
            <button className={`mm-route-card ${route === 'smooth' ? 'selected' : ''}`} aria-pressed={route === 'smooth'} onClick={() => setRoute('smooth')}><div><span className="mm-radio"/><strong>Lower O₂ demand</strong><span className="mm-route-letter">B</span></div><p><b>22 <small>min</small></b><span>900 m <i/> +15 m ascent</span></p><footer><Footprints size={12}/> Smoother approach <span>EXAMPLE</span></footer></button>
            <p className="mm-disclosure">Route comparison is a UI example. Selection does not change the existing 3D trail.</p>
            <div className="mm-profile"><div><span>ELEVATION PROFILE</span><span>ILLUSTRATIVE</span></div><svg viewBox="0 0 260 52" role="img" aria-label="Illustrative elevation profile"><path d={route === 'fast' ? 'M0 43L25 39L48 42L74 23L98 30L120 12L143 21L165 8L188 18L214 12L238 5L260 10' : 'M0 43L30 40L60 39L90 32L120 33L150 27L180 25L210 19L240 16L260 14'} fill="none" stroke="#9cdddd" strokeWidth="2"/><path d="M0 51H260" stroke="#ffffff20"/></svg><footer><span>DEPARTURE</span><span>SCIENCE SITE</span></footer></div>
            <button className="mm-primary" disabled={!p.ready} onClick={p.onStart}>{p.moving ? <Pause size={15}/> : <Navigation size={15}/>} {p.moving ? 'Pause exploration' : 'Explore existing scene'}<ArrowRight size={15}/></button>
            <button className="mm-return" onClick={p.onReturn}><Home size={16}/> Return to departure <ArrowDownLeft size={15}/></button>
          </>}
          {section === 'suit' && <><div className="mm-section-heading"><span>02 / LIFE SUPPORT</span><Activity size={15}/></div><h3 className="mm-panel-title">Know your reserves.</h3><p className="mm-panel-copy">Crew telemetry is simulated. Endurance calculations will connect in the data implementation.</p><div className="mm-reading-list"><div><span>{emergency ? 'Oxygen alert preview' : 'Oxygen reserve'}</span><strong>{emergency ? 24 : p.oxygen}% <small>{emergency ? 'PREVIEW' : 'SIM'}</small></strong></div><div><span>Battery reserve</span><strong>{p.battery}% <small>SIM</small></strong></div><div><span>Suit pressure</span><strong>— <small>NO FEED</small></strong></div><div><span>O₂ duration</span><strong>— min</strong></div><div><span>Return margin</span><strong>— min</strong></div><div><span>Cooling / CO₂</span><strong><small>NOT MODELED</small></strong></div></div><div className="mm-note"><ShieldCheck size={18}/><p>Percentage alone cannot establish a safe return. Route demand, ingress, and protected reserves must be included.</p></div></>}
          {section === 'mission' && <><div className="mm-section-heading"><span>03 / MISSION BRIEF</span><Flag size={15}/></div><span className="mm-mission-id">JZ-01</span><h3 className="mm-panel-title">Lost in the Dust</h3><p className="mm-panel-copy">Explore the western Jezero region, inspect a science target, and return to your departure point.</p><div className="mm-crew"><UserRound size={20}/><div><strong>A. Morgan</strong><small>EXPLORER 01 · FICTIONAL CREW</small></div></div><div className="mm-checklist"><div className="done"><Check size={15}/><span>Review the mission</span></div><div className={p.progress >= 95 ? 'done' : ''}><span className="mm-check-box"/><span>Reach the science waypoint</span></div><button onClick={p.onScan}><FlaskConical size={15}/><span>Inspect & collect <small>{p.samples}/2</small></span><ChevronRight size={14}/></button><button onClick={p.onReturn}><Home size={15}/><span>Return to departure</span><ChevronRight size={14}/></button></div><button className="mm-secondary" onClick={p.onExport}><Download size={15}/> Export exploration report</button></>}
          {section === 'layers' && <><div className="mm-section-heading"><span>04 / INTEGRATED DATA</span><Layers3 size={15}/></div><h3 className="mm-panel-title">One place. Many perspectives.</h3><p className="mm-panel-copy">Terrain layers use the existing scene. Additional overlays await verified datasets.</p>{[{title:'Surface imagery',text:'MRO / HiRISE + CTX',index:0},{title:'Elevation',text:'Existing terrain display',index:1}].map(l => <button className="mm-layer-row" key={l.title} aria-pressed={p.layer === l.index} onClick={() => p.onLayer(l.index)}><Mountain size={18}/><div><strong>{l.title}</strong><small>{l.text}</small></div><span className="mm-toggle"/></button>)}<div className="mm-source"><span>HISTORICAL / MARS 2020</span><h4>MEDA air temperature</h4><strong>−83° <span>to</span> −22°C</strong><p>03–04 April 2021 · sols 43–44.<br/>Rover observations, not current local weather.</p></div><div className="mm-reading-list"><div><span>Slope / reachability</span><small>NOT CONNECTED</small></div><div><span>MGS / MOLA context</span><small>NOT CONNECTED</small></div><div><span>Ambient pressure</span><small>NO FEED</small></div><div><span>Science evidence</span><small>AWAITING DATA</small></div></div><a className="mm-secondary" href="/?workspace=science"><Map size={15}/> Open existing science workspace</a></>}
          {section === 'emergency' && <><div className="mm-section-heading"><span>05 / SAFETY & RESPONSE</span><ShieldCheck size={15}/></div><div className={`mm-safety-state ${warning ? 'has-warning' : ''}`}>{warning ? <TriangleAlert size={27}/> : <ShieldCheck size={27}/>}<h3>{emergency ? 'Review return options.' : p.storm ? 'Conditions have changed.' : 'Stay ahead of the unexpected.'}</h3><p>{warning ? 'Demonstration alert. This preview does not calculate a safe route.' : 'Emergency guidance will use resource forecasts and verified terrain.'}</p></div>{warning && <button className="mm-secondary" onClick={() => setAcknowledged(true)}><Check size={15}/>{acknowledged ? 'Alert acknowledged · remains active' : 'Acknowledge preview alert'}</button>}<button className="mm-return" onClick={p.onReturn}><Home size={16}/> Existing return guidance <ArrowRight size={15}/></button><div className="mm-reading-list"><div><span>Earth communication</span><strong><small>{fault === 'comms' ? 'LOST · PREVIEW' : 'SIMULATION'}</small></strong></div><div><span>Browser connection</span><strong><small>{p.online ? 'ONLINE' : 'OFFLINE'}</small></strong></div><div><span>Emergency procedures</span><small>NOT LOADED</small></div></div><p className="mm-disclosure">No distress message is transmitted by this interface. No medical or flight procedures are connected.</p></>}
        </div>
        <div className="mm-terminal-bottom"><span><i/> LOCAL SESSION</span><button onClick={() => setController(!controller)}><Settings2 size={14}/> Demo controls</button></div>
      </aside>
    </div>

    <footer className="mm-global-footer"><span>MISSION JZ-01 <i/> A. MORGAN <i/> JEZERO WESTERN REGION</span><span>INTERFACE PROTOTYPE <b> / </b> DATA INTEGRATION PENDING</span><button onClick={() => setController(!controller)}><SlidersHorizontal size={13}/> Scenario controls</button></footer>

    {controller && <div className="mm-controller"><header><div><span className="mm-eyebrow">OPERATOR / UI DEMONSTRATION</span><h3>Change the conditions.</h3></div><button className="mm-icon-button" aria-label="Close scenario controls" onClick={() => setController(false)}><X size={18}/></button></header><p>Preview alerts and existing scene effects. No mission calculations are connected.</p><div><button aria-pressed={p.storm} onClick={() => {p.onStorm(!p.storm);setAcknowledged(false);}}><Wind size={19}/><span>Dust event</span><small>{p.storm ? 'ACTIVE' : 'INJECT'}</small></button><button aria-pressed={fault === 'oxygen'} onClick={() => previewFault(fault === 'oxygen' ? 'none' : 'oxygen')}><Activity size={19}/><span>Low oxygen alert</span><small>{fault === 'oxygen' ? 'ACTIVE' : 'PREVIEW'}</small></button><button aria-pressed={fault === 'comms'} onClick={() => previewFault(fault === 'comms' ? 'none' : 'comms')}><Radio size={19}/><span>Earth link loss</span><small>{fault === 'comms' ? 'ACTIVE' : 'PREVIEW'}</small></button></div><button className="mm-secondary" onClick={() => {p.onReset();previewFault('none');setAcknowledged(false);}}><RotateCcw size={15}/> Reset exploration & previews</button></div>}

    {mapOpen && <div className="mm-modal-backdrop" onClick={() => setMapOpen(false)}><section ref={mapDialog} className="mm-map-dialog" role="dialog" aria-modal="true" aria-label="Jezero Crater map" onClick={e => e.stopPropagation()}><header><div><span className="mm-eyebrow">NAVIGATION / JEZERO</span><h2>Jezero Crater map</h2></div><button className="mm-icon-button" aria-label="Close route overview" onClick={() => setMapOpen(false)}><X size={20}/></button></header><JezeroMap track={p.track} player={p.player} returning={p.returning} returnOrigin={p.returnOrigin} expanded/><button className="mm-primary" onClick={() => setMapOpen(false)}>Return to exploration <ArrowRight size={16}/></button></section></div>}
    {showHelp && <div className="mm-help"><button className="mm-icon-button" aria-label="Close help" onClick={() => setShowHelp(false)}><X size={16}/></button><h3>Your next Marswalk.</h3><p>Press Explore surface, then use <kbd>WASD</kbd> to move and drag to look. <kbd>E</kbd> inspects a specimen. <kbd>Space</kbd> pauses. Tablet uses the existing overhead view; camera controls remain unchanged.</p><p>Route cards and emergency alerts preview the PRD interface. They are not operational forecasts.</p><button className="mm-secondary" onClick={() => p.onCamera('reset')}><Crosshair size={14}/>Recenter view</button></div>}
    {p.toast && <div className="mm-toast" role="status"><Radio size={17}/><span>{p.toast}</span><button aria-label="Dismiss notification" onClick={p.onDismissToast}><X size={15}/></button></div>}
    <div className="mm-legacy-dialogs">{p.dialogs}</div>
  </div>;
}
