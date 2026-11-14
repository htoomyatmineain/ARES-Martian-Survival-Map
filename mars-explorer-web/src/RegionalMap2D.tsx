import EmergencyRoute2D from './EmergencyRoute2D';
import type { EmergencyOverlay } from './emergency';
import type { SharedRegionalMap } from './sharedRegionalData';
import SharedImageryTiles from './SharedImageryTiles';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { MARS_RADIUS, sites, elevation, slope, type Terrain, type Point, type Route } from './terrain';
import { analysisPixels, nativeSlopePixels, contourPath, coordinateGrid, mapFrame, type AnalysisLayer } from './regionalLayers';
import { MAP_SCIENCE_SITES as SCIENCE_SITES, sciencePoint, type ScienceFocus } from './scienceSites';
import type { ObservationMarker } from './environmentObservations';
import type { OrbitalRaster } from './orbitalLayers';
import {geologyPath,type GeologyData} from './geology';
import type { NativeRoute } from './nativeRouting';

type Props = { emergencyOverlay?: EmergencyOverlay; destinationVisible?: boolean; routeColor?: string; comparisonRoutes?: {route: Route; color: string; label: string}[]; mapHelpId?: string; routeDashed?: boolean; geology?:GeologyData|null; shared: SharedRegionalMap | null; terrain: Terrain; analysis: AnalysisLayer; opacity: number; imagery: boolean; contours: boolean; route: Route | null; routeVisible: boolean; destination: Point; destinationLabel?:string; picking: boolean; onPick: (p: Point) => void; missionPosition?: Point | null; hidden: boolean; blocked: boolean; grid: boolean; scienceVisible: boolean; selectedScienceId: string | null; scienceFocus: ScienceFocus | null; onScienceSelect: (id: string) => void; observations: ObservationMarker[]; observationFocus: { point: Point; tick: number } | null; onObservationSelect: () => void; orbital: OrbitalRaster | null; onInspect?: (point: Point) => void; onOrbitalInspect: (point: Point) => void };
export default memo(function RegionalMap2D(p: Props) {
  const [flagTip,setFlagTip]=useState<{x:number;y:number;elevation:string;slope:string}|null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const [zoom, setZoom] = useState(1), [center, setCenter] = useState({ x: (sites[0].x + p.destination.x) / 2, z: (sites[0].z + p.destination.z) / 2 });
  const [viewport, setViewport] = useState({ width: 600, height: 600 });
  const [framing, setFraming] = useState<'fill' | 'fit'>('fill');
  const { width: visibleWidth, height: visibleHeight, unitsPerPixel } = mapFrame(p.terrain.meta.size, viewport.width, viewport.height, zoom, framing);
  const half = p.terrain.meta.size / 2;
  const clampCenter = (v: number, length: number) => Math.max(-Math.max(0, half - length / 2), Math.min(Math.max(0, half - length / 2), v));
  const cx = clampCenter(center.x, visibleWidth), cz = clampCenter(center.z, visibleHeight);
  const targetDegrees = unitsPerPixel * 60 / (MARS_RADIUS * Math.cos(p.terrain.meta.center.lat * Math.PI / 180)) * 180 / Math.PI;
  const gridStep = [.0001, .0002, .0005, .001, .002, .005, .01, .02, .05, .1, .2, .5, 1, 2, 5, 10].find(v => v >= targetDegrees) ?? 10;
  const allGrid = useMemo(() => coordinateGrid(p.terrain.meta, gridStep), [p.terrain.meta, gridStep]);
  const graticule = {longitude:allGrid.longitude.filter(at=>at.x>=cx-visibleWidth/2&&at.x<=cx+visibleWidth/2),latitude:allGrid.latitude.filter(at=>at.z>=cz-visibleHeight/2&&at.z<=cz+visibleHeight/2)};
  const gridPath = graticule.longitude.map(at => `M${at.x},${-half}V${half}`).join('') + graticule.latitude.map(at => `M${-half},${at.z}H${half}`).join('');
  const leftEdge = Math.max(-half, cx - visibleWidth / 2), topEdge = Math.max(-half, cz - visibleHeight / 2);
  const geologyShapes=useMemo(()=>p.geology?.features.map(f=>({...f,path:geologyPath(f.geometry.coordinates)}))??[],[p.geology]);
  const geologyContacts=useMemo(()=>p.geology?.contacts.map(c=>({...c,path:c.coordinates.map((at,i)=>(i?'L':'M')+at[0]+','+at[1]).join('')}))??[],[p.geology]);
  const rasters = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = p.terrain.meta.width; canvas.height = p.terrain.meta.height;
    const ctx = canvas.getContext('2d'); if (!ctx) return { elevation: '', slope: '', missing: '' };
    const make = (layer: 'elevation' | 'slope') => { ctx.putImageData(new ImageData(analysisPixels(p.terrain, layer), canvas.width, canvas.height), 0, 0); return canvas.toDataURL(); };
    const height = make('elevation');let slope:string;
    if(p.terrain.nativeSlope){const g=p.terrain.nativeSlope;canvas.width=g.width;canvas.height=g.height;ctx.putImageData(new ImageData(nativeSlopePixels(g),g.width,g.height),0,0);slope=canvas.toDataURL();canvas.width=p.terrain.meta.width;canvas.height=p.terrain.meta.height;}else slope=make('slope');
    const missing = new Uint8ClampedArray(p.terrain.values.length * 4);
    for(let i=0;i<p.terrain.values.length;i++)if(!Number.isFinite(p.terrain.values[i]))missing.set([205,140,80,210],i*4);
    ctx.putImageData(new ImageData(missing,canvas.width,canvas.height),0,0);
    return { elevation: height, slope, missing: canvas.toDataURL() };
  }, [p.terrain]);
  const contours = useMemo(() => p.contours ? contourPath(p.terrain) : '', [p.terrain, p.contours]);
  const orbitalImage = useMemo(() => {
    if (!p.orbital) return '';
    const canvas = document.createElement('canvas'); canvas.width=p.orbital.meta.width; canvas.height=p.orbital.meta.height;
    const context = canvas.getContext('2d'); if (!context) return '';
    context.putImageData(new ImageData(new Uint8ClampedArray(p.orbital.rgba),canvas.width,canvas.height),0,0);
    return canvas.toDataURL();
  },[p.orbital]);
  useEffect(() => {
    const site = SCIENCE_SITES.find(s => s.id === p.scienceFocus?.id);
    if (site) { setFraming('fill'); setZoom(12); setCenter(sciencePoint(site, p.terrain.meta.center)); }
  }, [p.scienceFocus, p.terrain.meta.center]);
  useEffect(() => { if (p.observationFocus) { setFraming('fill'); setZoom(12); setCenter(p.observationFocus.point); } }, [p.observationFocus]);
  useEffect(() => {
    const el = svg.current; if (!el) return;
    const observer = new ResizeObserver(() => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) setViewport({ width: r.width, height: r.height }); });
    observer.observe(el);
    const wheel = (e: WheelEvent) => { e.preventDefault(); setZoom(v => Math.max(1, Math.min(64, v * (e.deltaY > 0 ? .85 : 1.18)))); };
    el.addEventListener('wheel', wheel, { passive: false }); return () => { observer.disconnect(); el.removeEventListener('wheel', wheel); };
  }, []);
  const pick = (clientX: number, clientY: number) => {
    const el = svg.current, matrix = el?.getScreenCTM(); if (!el || !matrix) return;
    const at = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    if (Math.abs(at.x) <= half && Math.abs(at.y) <= half) { const point = {x:at.x,z:at.y}; if (p.picking) p.onPick(point); else if (p.orbital) p.onOrbitalInspect(point); else p.onInspect?.(point); }
  };
  return <div className="rm-map2d" hidden={p.hidden}>
    <svg ref={svg} className={p.picking ? 'rm-svg rm-picking' : 'rm-svg'} data-testid="regional-map" viewBox={`${cx - visibleWidth / 2} ${cz - visibleHeight / 2} ${visibleWidth} ${visibleHeight}`} role="group" aria-label="Regional terrain map" aria-describedby={p.mapHelpId??"rm-map-help"} tabIndex={0}
      onPointerDown={e => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, cx, cy: cz, moved: false }; }}
      onPointerMove={e => { const a = drag.current; if (!a) return; if (Math.hypot(e.clientX - a.x, e.clientY - a.y) > 5) a.moved = true; if (a.moved) setCenter({ x: a.cx - (e.clientX - a.x) * unitsPerPixel, z: a.cy - (e.clientY - a.y) * unitsPerPixel }); }}
      onPointerUp={e => { if (drag.current && !drag.current.moved && (p.picking || p.orbital || p.onInspect)) pick(e.clientX, e.clientY); drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
      onKeyDown={e => { if (!p.picking) { if (e.key === 'Enter') { e.preventDefault(); if(p.orbital)p.onOrbitalInspect({x:cx,z:cz});else p.onInspect?.({x:cx,z:cz}); } return; } const delta: Record<string, [number, number]> = { ArrowLeft: [-100, 0], ArrowRight: [100, 0], ArrowUp: [0, -100], ArrowDown: [0, 100] }; const v = delta[e.key]; if (v) { e.preventDefault(); p.onPick({ x: Math.max(-half, Math.min(half, p.destination.x + v[0])), z: Math.max(-half, Math.min(half, p.destination.z + v[1])) }); } }}>
      <title>Western Jezero regional map</title>
      <defs><clipPath id="rm-footprint"><rect x={-half} y={-half} width={half * 2} height={half * 2}/></clipPath><pattern id="rm-hatch" width="150" height="150" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="150" height="150" fill="#c67e4530"/><path d="M0 0V150" stroke="#f0b276" strokeWidth="2" vectorEffect="non-scaling-stroke"/></pattern></defs>
      <rect x={-half} y={-half} width={half * 2} height={half * 2} fill="#252a30"/>
      {p.imagery && <image data-testid="orbital-layer" href={p.shared?.imageryUrl ?? '/data/ortho.jpg'} x={-half} y={-half} width={half * 2} height={half * 2} preserveAspectRatio="none"/>}
      {p.imagery && p.shared && zoom >= 8 && <SharedImageryTiles shared={p.shared} bounds={[cx-visibleWidth/2,cz-visibleHeight/2,cx+visibleWidth/2,cz+visibleHeight/2]}/>}
      {p.analysis !== 'none' && <image data-testid="analysis-layer" href={rasters[p.analysis]} opacity={p.opacity} x={-half} y={-half} width={half * 2} height={half * 2} preserveAspectRatio="none" style={p.analysis==='slope'?{imageRendering:'pixelated'}:undefined}/>}
      {orbitalImage && <image data-testid="orbital-area-layer" href={orbitalImage} opacity={p.opacity} x={-half} y={-half} width={half*2} height={half*2} preserveAspectRatio="none" style={{imageRendering:'pixelated'}}><title>{p.orbital?.meta.title} · transparent means no data</title></image>}
      {p.geology&&<g data-testid="geology-layer" clipPath="url(#rm-footprint)" pointerEvents="none"><g opacity={p.opacity}>{geologyShapes.map(f=><path key={f.id} d={f.path} fill={p.geology!.units.find(u=>u.id===f.unitId)?.color??'#777'} fillRule="evenodd"/>)}{geologyContacts.map(c=><path key={c.id} d={c.path} fill="none" stroke="#17202b" strokeWidth="1" strokeDasharray={c.type==='certain'?undefined:'5 4'} vectorEffect="non-scaling-stroke"/>)}</g>{p.geology.units.map(u=><text key={u.id} x={u.label[0]} y={u.label[1]} fontSize={10*unitsPerPixel} textAnchor="middle" fill="#fff" stroke="#0b0d10" strokeWidth={3*unitsPerPixel} paintOrder="stroke">{u.name}</text>)}</g>}
      <image data-testid="missing-elevation-mask" href={rasters.missing} x={-half} y={-half} width={half*2} height={half*2} preserveAspectRatio="none"><title>Amber area: elevation unavailable; excluded from routing</title></image>
      <rect x={-half} y={-half} width={half * 2} height={half * 2} fill="none" stroke="#f39b58" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
      {p.contours && <path data-testid="contour-layer" d={contours} stroke="#f4f3ef" opacity=".6" fill="none" strokeWidth=".7" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
      {p.blocked && <circle data-testid="exclusion-layer" cx="100" cy="300" r="800" fill="url(#rm-hatch)" stroke="#f0b276" strokeWidth="2" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
      {p.grid && <g data-testid="coordinate-grid" pointerEvents="none" clipPath="url(#rm-footprint)">
        <path d={gridPath} fill="none" stroke="#0b0d10" strokeOpacity=".7" strokeWidth="2.5" strokeDasharray="5 5" vectorEffect="non-scaling-stroke"/>
        <path d={gridPath} fill="none" stroke="#e6e8eb" strokeOpacity=".75" strokeWidth=".8" strokeDasharray="5 5" vectorEffect="non-scaling-stroke"/>
        <g fontFamily="IBM Plex Mono, monospace" fontSize={9 * unitsPerPixel} fill="#f4f3ef" stroke="#0b0d10" strokeWidth={3 * unitsPerPixel} paintOrder="stroke">
          {graticule.longitude.filter(at => at.x > leftEdge + 35 * unitsPerPixel && at.x < Math.min(half, cx + visibleWidth / 2) - 70 * unitsPerPixel).map(at => <text key={at.degrees} x={at.x} y={topEdge + 74 * unitsPerPixel} textAnchor="middle">{Math.abs(at.degrees).toFixed(4)}°{at.degrees >= 0 ? 'E' : 'W'}</text>)}
          {graticule.latitude.filter(at => at.z > topEdge + 90 * unitsPerPixel && at.z < Math.min(half, cz + visibleHeight / 2) - 12 * unitsPerPixel).map(at => <text key={at.degrees} x={leftEdge + 7 * unitsPerPixel} y={at.z - 5 * unitsPerPixel}>{Math.abs(at.degrees).toFixed(4)}°{at.degrees >= 0 ? 'N' : 'S'}</text>)}
        </g>
      </g>}
      {!p.emergencyOverlay&&p.comparisonRoutes?.map(item => <g key={item.label}><title>{item.label}</title><polyline points={item.route.points.map(at => `${at.x},${at.z}`).join(' ')} fill="none" stroke="#0b0d10" strokeWidth="7" vectorEffect="non-scaling-stroke"/><polyline points={item.route.points.map(at => `${at.x},${at.z}`).join(' ')} fill="none" stroke={item.color} strokeWidth="3" strokeDasharray="8 6" vectorEffect="non-scaling-stroke"/></g>)}
      {!p.emergencyOverlay && p.routeVisible && p.route && <><polyline points={p.route.points.map(at => `${at.x},${at.z}`).join(' ')} fill="none" stroke="#0b0d10" strokeWidth="7" vectorEffect="non-scaling-stroke"/><polyline data-testid="route-line" strokeDasharray={p.routeDashed?"8 6":undefined} points={p.route.points.map(at => `${at.x},${at.z}`).join(' ')} fill="none" stroke={p.routeColor??"#f39b58"} strokeWidth="3" vectorEffect="non-scaling-stroke"/></>}
      {!p.emergencyOverlay && p.routeVisible && (p.route as NativeRoute|null)?.approach && (()=>{const at=(p.route as NativeRoute).approach!.endpoint;return <g transform={`translate(${at.x} ${at.z})`} pointerEvents="none" data-testid="approach-endpoint"><path d={`M0 ${-7*unitsPerPixel}L${7*unitsPerPixel} 0L0 ${7*unitsPerPixel}L${-7*unitsPerPixel} 0Z`} fill="#f39b58" stroke="#0b0d10" strokeWidth="2" vectorEffect="non-scaling-stroke"/><text y={-15*unitsPerPixel} fontSize={9*unitsPerPixel} textAnchor="middle" fill="#fff" stroke="#0b0d10" strokeWidth={3*unitsPerPixel} paintOrder="stroke">APPROACH · STOPS SHORT</text></g>;})()}
      {!p.emergencyOverlay && p.routeVisible && (p.route as NativeRoute|null)?.warnings?.map((segment,i)=><g key={i} onPointerEnter={e=>{const heights=segment.map(at=>elevation(p.terrain,at.x,at.z)).filter(Number.isFinite),a=segment[0],b=segment[segment.length-1],v=slope(p.terrain,(a.x+b.x)/2,(a.z+b.z)/2);setFlagTip({x:Math.max(8,Math.min(e.clientX+14,window.innerWidth-238)),y:Math.max(8,Math.min(e.clientY+14,window.innerHeight-154)),elevation:heights.length?`${Math.min(...heights).toFixed(0)} to ${Math.max(...heights).toFixed(0)} m`:'Unavailable',slope:Number.isFinite(v)?`${v.toFixed(1)}°`:'Unavailable'});}} onPointerLeave={()=>setFlagTip(null)}><polyline points={segment.map(at=>`${at.x},${at.z}`).join(' ')} fill="none" stroke="#0b0d10" strokeWidth="9" strokeLinecap="round" vectorEffect="non-scaling-stroke"/><polyline points={segment.map(at=>`${at.x},${at.z}`).join(' ')} fill="none" stroke="#ff42dc" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke"/></g>)}
      {!p.emergencyOverlay&&[{ ...sites[0], label: 'SIMULATED BASE', color: '#f4f3ef' }, { ...p.destination, label: p.destinationLabel??'DEMO DESTINATION', color: '#f39b58' }].filter((_,i) => i === 0 || p.destinationVisible !== false).map(at => <g key={at.label} transform={`translate(${at.x} ${at.z})`} pointerEvents="none"><circle r={5 * unitsPerPixel} fill={at.color} stroke="#0b0d10" strokeWidth="2" vectorEffect="non-scaling-stroke"/><text y={-12 * unitsPerPixel} fontSize={9 * unitsPerPixel} textAnchor="middle" fill="#fff" stroke="#0b0d10" strokeWidth={2.5 * unitsPerPixel} paintOrder="stroke" fontFamily="IBM Plex Mono, monospace">{at.label}</text></g>)}
      {p.scienceVisible && SCIENCE_SITES.map((site, index) => {
        const at = sciencePoint(site, p.terrain.meta.center), dx = (index % 2 === 0 ? 24 : -24) * unitsPerPixel, dy = (index % 2 === 0 ? -32 : 32) * unitsPerPixel, active = p.selectedScienceId === site.id;
        return <g key={site.id} data-science-id={site.id} role="button" aria-label={`Open ${site.name} / ${site.sample}`} aria-pressed={active} tabIndex={0} transform={`translate(${at.x} ${at.z})`} className="rm-science-marker" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); p.onScienceSelect(site.id); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); p.onScienceSelect(site.id); } }}>
          <title>{site.name} / {site.sample} · provisional position</title>
          <line x2={dx} y2={dy} stroke="#f4f3ef" strokeWidth="1.2" vectorEffect="non-scaling-stroke"/>
          <circle r={2.5 * unitsPerPixel} fill="#fff" stroke="#0b0d10" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
          <rect x={dx - 16 * unitsPerPixel} y={dy - 14 * unitsPerPixel} width={32 * unitsPerPixel} height={28 * unitsPerPixel} rx={3 * unitsPerPixel} fill={active ? '#f39b58' : '#15191e'} stroke={active ? '#f39b58' : '#fff'} strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
          <text x={dx} y={dy + 3.5 * unitsPerPixel} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize={11 * unitsPerPixel} fill={active ? '#0b0d10' : '#fff'}>{site.code}</text>
        </g>;
      })}
      {!p.emergencyOverlay && p.missionPosition && <g transform={`translate(${p.missionPosition.x} ${p.missionPosition.z})`} pointerEvents="none" data-testid="eva-crew-marker"><circle r={7*unitsPerPixel} fill="#f4f3ef" stroke="#0b0d10" strokeWidth="2" vectorEffect="non-scaling-stroke"/><text y={-14*unitsPerPixel} textAnchor="middle" fontSize={9*unitsPerPixel} fill="#fff" stroke="#0b0d10" strokeWidth={2*unitsPerPixel} paintOrder="stroke">CREW · SIM</text></g>}
      {p.observations.map(marker => {
        const dx = (marker.kind !== 'minerals' ? 58 : -58) * unitsPerPixel, dy = -65 * unitsPerPixel;
        return <g key={marker.id} data-testid={`${marker.kind}-marker`} role="button" tabIndex={0} aria-label={`Open ${marker.description}`} transform={`translate(${marker.point.x} ${marker.point.z})`} className="rm-science-marker" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); p.onObservationSelect(); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); p.onObservationSelect(); } }}>
          <title>{marker.description} · symbolic point, not coverage</title><line x2={dx} y2={dy} stroke={marker.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke"/><circle r={3 * unitsPerPixel} fill={marker.color} stroke="#0b0d10" strokeWidth="1" vectorEffect="non-scaling-stroke"/><rect x={dx-14*unitsPerPixel} y={dy-13*unitsPerPixel} width={28*unitsPerPixel} height={26*unitsPerPixel} rx={3*unitsPerPixel} fill="#15191e" stroke={marker.color} strokeWidth="2" vectorEffect="non-scaling-stroke"/><text x={dx} y={dy+4*unitsPerPixel} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize={12*unitsPerPixel} fill={marker.color}>{marker.label}</text>
        </g>;
      })}
      {p.emergencyOverlay&&<EmergencyRoute2D overlay={p.emergencyOverlay} units={unitsPerPixel}/>}
    </svg>
    {flagTip&&<div className="rm-flag-tooltip" role="tooltip" style={{left:flagTip.x,top:flagTip.y}}><strong>Slope caution</strong><div><span>Est. elevation</span><b>{flagTip.elevation}</b></div><div><span>Midpoint slope{p.terrain.nativeSlope?' bound':''}</span><b>{flagTip.slope}</b></div><small>Near a configured slope limit.<br/>Heights relative to Mars datum.</small></div>}
    <div className="rm-map-tools"><button aria-label="Zoom in" onClick={() => setZoom(v => Math.min(64, v * 1.3))}>+</button><button aria-label="Zoom out" onClick={() => setZoom(v => Math.max(1, v / 1.3))}>−</button><button aria-label="Reset map" title="Reset map" onClick={() => { setFraming('fill'); setZoom(1); setCenter({ x: (sites[0].x + p.destination.x) / 2, z: (sites[0].z + p.destination.z) / 2 }); }}>↺</button><button aria-label={framing === 'fill' ? 'Fit whole zone' : 'Fill map view'} title={framing === 'fill' ? 'Fit whole zone' : 'Fill map view'} onClick={() => { setFraming(v => v === 'fill' ? 'fit' : 'fill'); setZoom(1); setCenter({ x: 0, z: 0 }); }}>⛶</button></div>
    <div className="rm-north rm-compass" role="img" aria-label="Compass: north is up, east is right"><svg viewBox="0 0 80 80" aria-hidden="true"><circle className="rm-compass-ring" cx="40" cy="40" r="31"/><path className="rm-compass-ticks" d="M40 9v5 M71 40h-5 M40 71v-5 M9 40h5 M18 18l3 3 M62 18l-3 3 M62 62l-3-3 M18 62l3-3"/><text x="40" y="24" textAnchor="middle" className="rm-compass-n">N</text><text x="62" y="44" textAnchor="middle">E</text><text x="40" y="65" textAnchor="middle">S</text><text x="18" y="44" textAnchor="middle">W</text><path className="rm-compass-north" d="M40 28 47 48 40 44 33 48Z"/><path className="rm-compass-south" d="M40 54 35 43 40 45 45 43Z"/></svg></div><div className="rm-scale"><span>{framing === 'fill' ? 'Fill view' : 'Whole zone'} · {p.grid ? `Mars lat/lon · ${gridStep.toFixed(gridStep < .001 ? 4 : 3)}° grid · ` : ''}{zoom.toFixed(1)}× zoom</span></div>
    <p id={p.mapHelpId??"rm-map-help"} className="rm-map-help">Drag to pan · Scroll to zoom · {p.picking ? 'Click to choose destination, or focus map and use arrow keys' : p.orbital ? 'Click to inspect a spectral pixel · Enter inspects map centre' : 'Choose “Set destination” to place a waypoint'}</p>
  </div>;
});
