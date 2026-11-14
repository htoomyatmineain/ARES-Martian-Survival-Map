import { useId, useRef, useState } from 'react';
import { Crosshair, Globe2, Minus, Plus } from 'lucide-react';
import site from '../public/assets/mars/field-site.json';
import groundFrame from '../public/assets/mars/ground.json';
import { DEPARTURE_Z, TARGET_Z } from './missionSite';
import { CRATER_MAP, geoToMap, isOnMap, mapToGeo, sceneToGeo, type TrackPoint } from './mapCoordinates';
import type { PlayerPosition } from './explorationInput';

type Props = { player: PlayerPosition; returning: boolean; expanded?: boolean; live?: boolean; track: TrackPoint[]; returnOrigin: { x: number; z: number } | null };
const landing = { lat: 18.4446, lon: 77.4509 };

export default function JezeroMap({ player, returning, returnOrigin, expanded = false, live = false, track }: Props) {
  const [view, setView] = useState<'crater' | 'local'>(expanded ? 'crater' : 'local');
  const [failed, setFailed] = useState(false);
  const patternId = useId();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({x:500,y:500});
  const [follow, setFollow] = useState(false);
  const [grid, setGrid] = useState(false);
  const [inspected, setInspected] = useState<{lat:number;lon:number}|null>(null);
  const drag = useRef<{x:number;y:number;panX:number;panY:number;moved:boolean}|null>(null);
  const crater = view === 'crater';
  const center = crater ? CRATER_MAP.center : site.center;
  const span = crater ? CRATER_MAP.spanMeters : 1500;
  const plot = (x: number, z: number) => geoToMap(sceneToGeo(site, x, z), center, span);
  const currentGeo = sceneToGeo(site, player.x, player.z);
  const current = geoToMap(currentGeo, center, span);
  const viewCenter = follow ? current : pan;
  const trackPoints = track.map(p => plot(p.x,p.z));
  const departure = plot(0, DEPARTURE_Z), target = plot(0, TARGET_Z);
  const routeStart = returning && returnOrigin ? plot(returnOrigin.x, returnOrigin.z) : departure;
  const routeEnd = returning ? departure : target;
  const field = [[-256,-256],[256,-256],[256,256],[-256,256]].map(([x,z]) => plot(x,z));
  const sceneBounds = [[groundFrame.xmin,-groundFrame.ymax],[groundFrame.xmax,-groundFrame.ymax],[groundFrame.xmax,-groundFrame.ymin],[groundFrame.xmin,-groundFrame.ymin]].map(([x,z])=>plot(x,z));
  const fieldCenter = plot(0,0);
  const landingPoint = geoToMap(landing, center, span);
  const imageSize = site.imagerySize / span * 1000;
  const marker = expanded ? 8 : 13;
  const scaleMeters = crater ? (zoom>4?1000:zoom>2?5000:10000) : (zoom>2?50:200);
  const changeView = (next: 'crater' | 'local') => { setView(next); setFailed(false); setZoom(1);setPan({x:500,y:500});setFollow(false);setInspected(null); };
  const changeZoom = (factor:number) => setZoom(z=>Math.max(1,Math.min(16,z*factor)));
  const mapPoint = (clientX:number,clientY:number,svg:SVGSVGElement) => {
    const matrix=svg.getScreenCTM();
    if(!matrix)return null;
    const screen=svg.createSVGPoint();screen.x=clientX;screen.y=clientY;
    return screen.matrixTransform(matrix.inverse());
  };
  return <div className={`mm-map mm-real-map ${expanded ? 'expanded' : ''} ${live ? 'mm-map-live' : ''}`}>
    {expanded && <div className="mm-map-switch" role="group" aria-label="Map extent"><button aria-pressed={crater} onClick={() => changeView('crater')}><Globe2 size={14}/> Jezero Crater</button><button aria-pressed={!crater} onClick={() => changeView('local')}><Crosshair size={14}/> Local traverse</button></div>}
    {expanded && <div className="mm-map-toolbar"><span><i/> LIVE / 3D POSITION</span><div><button aria-label="Zoom map in" onClick={()=>changeZoom(1.5)}><Plus size={14}/></button><button aria-label="Zoom map out" onClick={()=>changeZoom(1/1.5)}><Minus size={14}/></button><button aria-pressed={grid} onClick={()=>setGrid(!grid)}>Grid</button><button aria-pressed={follow} onClick={()=>setFollow(!follow)}><Crosshair size={13}/>Follow</button><button onClick={()=>{setPan({x:500,y:500});setZoom(1);setFollow(false);}}>Fit</button></div></div>}
    <svg viewBox="0 0 1000 1000" role="img" aria-label={crater ? 'Georeferenced 55 kilometer Jezero Crater CTX relief map, north up' : 'Georeferenced HiRISE orbital image of the Jezero field site, north up'}
      style={expanded?{touchAction:'none',cursor:'grab'}:undefined}
      onPointerDown={expanded?e=>{const p=mapPoint(e.clientX,e.clientY,e.currentTarget);if(!p)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:p.x,y:p.y,panX:viewCenter.x,panY:viewCenter.y,moved:false};}:undefined}
      onPointerMove={expanded?e=>{const d=drag.current;if(!d)return;const p=mapPoint(e.clientX,e.clientY,e.currentTarget);if(!p)return;const dx=(p.x-d.x)/zoom,dy=(p.y-d.y)/zoom;if(Math.hypot(dx,dy)*zoom>5)d.moved=true;if(d.moved){setFollow(false);setPan({x:Math.max(0,Math.min(1000,d.panX-dx)),y:Math.max(0,Math.min(1000,d.panY-dy))});}}:undefined}
      onPointerUp={expanded?e=>{const d=drag.current,p=mapPoint(e.clientX,e.clientY,e.currentTarget);if(d&&!d.moved&&p){const point={x:(p.x-500)/zoom+viewCenter.x,y:(p.y-500)/zoom+viewCenter.y};if(isOnMap(point))setInspected(mapToGeo(point,center,span));}drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}:undefined}
      onPointerCancel={()=>{drag.current=null;}}
    >
      <defs><pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M0 20L20 0" stroke="#718078" strokeOpacity=".12" strokeWidth="2"/></pattern></defs>
      <rect width="1000" height="1000" fill="#171e20"/><rect width="1000" height="1000" fill={`url(#${patternId})`}/>
      <g transform={`translate(500 500) scale(${zoom}) translate(${-viewCenter.x} ${-viewCenter.y})`}>
      {!failed && (crater ? <image href={CRATER_MAP.image} width="1000" height="1000" onError={() => setFailed(true)}/> : <image href="/assets/mars/hirise-ortho.jpg" x={500-imageSize/2} y={500-imageSize/2} width={imageSize} height={imageSize} transform={`rotate(${site.heading} 500 500)`} onError={() => setFailed(true)}/>)}
      {!failed && <>
        {crater && <polygon points={sceneBounds.map(p=>`${p.x},${p.y}`).join(' ')} fill="#9cdddd09" stroke="#ade7e0" strokeWidth={2/zoom} strokeDasharray={`${7/zoom} ${5/zoom}`}/>}
        {grid && [200,400,600,800].map(n=>{const geo=mapToGeo({x:n,y:n},center,span);return <g key={n}><path d={`M${n} 0V1000M0 ${n}H1000`} stroke="#c7eadb55" strokeWidth={1/zoom} strokeDasharray={`${5/zoom} ${7/zoom}`}/><text x={n+8} y="35" className="mm-map-label mm-map-secondary-label">{geo.lon.toFixed(3)}° E</text><text x="10" y={n-8} className="mm-map-label mm-map-secondary-label">{geo.lat.toFixed(3)}° N</text></g>;})}
        <polygon points={field.map(p => `${p.x},${p.y}`).join(' ')} fill="#9cdddd10" stroke="#a2e6e0" strokeWidth={crater ? 3 : 2} strokeDasharray={crater ? undefined : '9 9'}/>
        {crater ? <>
          <circle cx={fieldCenter.x} cy={fieldCenter.y} r="22" fill="none" stroke="#ace5df" strokeWidth="2"/>
          <path d={`M${fieldCenter.x+25} ${fieldCenter.y}h75`} stroke="#ace5df" strokeWidth="2"/>
          <text x={fieldCenter.x+110} y={fieldCenter.y+8} className="mm-map-label">SIMULATION SITE</text>
          <circle cx={landingPoint.x} cy={landingPoint.y} r="6" fill="#efc17f" stroke="#121a1d" strokeWidth="3"/>
          <text x={landingPoint.x+15} y={landingPoint.y+8} className="mm-map-label mm-map-secondary-label">PERSEVERANCE LANDING</text>
          <text x="520" y="460" className="mm-map-landform">JEZERO CRATER</text>
          <text x="210" y="300" className="mm-map-landform small">WESTERN DELTA</text>
        </> : <>
          <path d={`M${routeStart.x} ${routeStart.y}L${routeEnd.x} ${routeEnd.y}`} fill="none" stroke="#182326" strokeWidth="12"/>
          <path d={`M${routeStart.x} ${routeStart.y}L${routeEnd.x} ${routeEnd.y}`} fill="none" stroke="#9cffff" strokeWidth="5"/>
          <circle cx={departure.x} cy={departure.y} r={marker} fill="#1b2525" stroke="#f6e5c8" strokeWidth="4"/>
          <text x={departure.x+22} y={departure.y+8} className="mm-map-label">DEPARTURE</text>
          <circle cx={target.x} cy={target.y} r={marker} fill="#efc17f" stroke="#2d2922" strokeWidth="3"/>
          <text x={target.x+22} y={target.y+8} className="mm-map-label">SCIENCE WAYPOINT</text>
          <text x="500" y="950" textAnchor="middle" className="mm-map-footprint">HATCHED AREA: OUTSIDE THE BUNDLED IMAGE</text>
        </>}
        {trackPoints.length>1 && <polyline points={trackPoints.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#edb970" strokeWidth={3/zoom} strokeDasharray={`${5/zoom} ${4/zoom}`}/>}
        {isOnMap(current) && <g aria-label="Current simulated astronaut position" data-map-x={current.x.toFixed(6)} data-map-y={current.y.toFixed(6)} data-heading={player.heading.toFixed(1)}><circle cx={current.x} cy={current.y} r={marker*2.5/zoom} fill="#9cffff30"/><g transform={`translate(${current.x} ${current.y}) rotate(${player.heading}) scale(${1/zoom})`}><path d="M0 -55L-24 -18Q0 -4 24 -18Z" fill="#a8ffff40"/><path d="M0 -18L-9 10L0 5L9 10Z" fill="#ceffff" stroke="#13343a" strokeWidth="2"/></g></g>}
        {inspected && (()=>{const point=geoToMap(inspected,center,span);return <g transform={`translate(${point.x} ${point.y}) scale(${1/zoom})`}><path d="M-15 0H15M0 -15V15" stroke="#fff3d4" strokeWidth="2"/></g>;})()}
      </>}
      </g>
      <g transform="translate(55 55)"><rect x="-20" y="-22" width="84" height="110" rx="8" fill="#122022cc"/><path d="M20 65V5M6 23L20 3L34 23" fill="none" stroke="#f2ead6" strokeWidth="4"/><text x="20" y="-2" textAnchor="middle" fill="#f2ead6" fontSize="22">N</text></g>
      <g transform="translate(60 885)"><rect x="-15" y="-25" width={scaleMeters/span*1000*zoom+35} height="70" rx="5" fill="#122022d9"/><path d={`M0 -10V8H${scaleMeters/span*1000*zoom}V-10`} fill="none" stroke="#f2ead6" strokeWidth="3"/><text x="0" y="32" fill="#f2ead6" fontSize="22">{scaleMeters>=1000?`${scaleMeters/1000} km`:`${scaleMeters} m`}</text></g>
    </svg>
    {failed && <p className="mm-map-error" role="alert">Map image unavailable. No substitute map is shown.</p>}
    <div className="mm-map-caption"><span><i/>{crater ? 'Jezero Crater · 55 × 55 km' : returning ? 'Simulated return guidance' : 'Simulated traverse'}</span><span>{crater ? 'CTX RELIEF' : 'MRO / HiRISE'}</span></div>
    {expanded && <div className="mm-map-details"><div><span>ASTRONAUT / LIVE SIMULATION</span><strong>{currentGeo.lat.toFixed(5)}° N · {currentGeo.lon.toFixed(5)}° E</strong></div><div className="mm-live-readings"><span>HEADING <b>{Math.round(player.heading)}°</b></span><span>ELEVATION <b>{Math.round(player.elevation)} m</b></span><span>TRACK <b>{track.length} points</b></span></div>{inspected && <p>Inspected: {inspected.lat.toFixed(5)}° N · {inspected.lon.toFixed(5)}° E</p>}<p>{crater ? 'Whole-crater 2D coverage. Cyan boundary: detailed terrain tile; the existing 3D scene covers only the local field region. Zoom or switch to Local traverse to see walking progress clearly.' : 'North-up HiRISE orbital image. Cyan arrow: live astronaut heading. Amber dots: recorded movement. Cyan line: simulated guidance, not a validated safe route.'}</p>{!isOnMap(current) && <p role="status">Astronaut is outside this map extent. Switch to Jezero Crater for context.</p>}<a href={crater ? 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif' : site.orthoUrl} target="_blank" rel="noreferrer">{crater ? 'USGS / JPL · CTX elevation source' : 'NASA / JPL-Caltech / University of Arizona / USGS · HiRISE source'} ↗</a></div>}
  </div>;
}
