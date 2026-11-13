import { useEffect, useRef, useState } from 'react';
import type { RegionalTileStore } from './regionalTileStore';
import { MAP_SCIENCE_SITES as SCIENCE_SITES, sciencePoint, isProvisionalSite, type ScienceSite } from './scienceSites';
import { elevation, type Terrain } from './terrain';
import coverage from './data/science-site-coverage.json';
import ScienceSitePhoto from './ScienceSitePhoto';
import additionalAccess from './data/additional-science-access.json';

export default function ScienceSitePopup({ site, terrain, store, onClose, onSelect, onZoom }: { site: ScienceSite; terrain: Terrain; store?: RegionalTileStore; onClose: () => void; onSelect: (id: string) => void; onZoom: (site: ScienceSite) => void }) {
  const [native, setNative] = useState<{id:string;value:number|null;error?:string}|null>(null);
  useEffect(() => {
    if (!store) return;
    const controller=new AbortController();
    store.elevationAt(site.latitude,site.longitude,controller.signal).then(value=>setNative({id:site.id,value})).catch(error=>{if(error.name!=='AbortError')setNative({id:site.id,value:null,error:error.message});});
    return ()=>controller.abort();
  },[site,store]);
  const close = useRef<HTMLButtonElement>(null), trigger = useRef<HTMLElement | null>(null);
  useEffect(() => { trigger.current = document.activeElement as HTMLElement; return () => { if (trigger.current?.isConnected) trigger.current.focus?.(); }; }, []);
  useEffect(() => { close.current?.focus(); }, [site.id]);
  const checked = coverage.sites.find(s => s.siteId === site.id);
  const recordedAccess = additionalAccess.find(row => row.siteId === site.id);
  const point = sciencePoint(site, terrain.meta.center);
  return <section className="rm-science-popup" aria-labelledby="rm-science-title" data-testid="science-site-popup">
    <header><span>NASA PERSEVERANCE / {site.code}</span><button ref={close} aria-label="Close science site" onClick={onClose}>×</button></header>
    <div className="rm-science-content">
      <div className="rm-site-tabs" role="group" aria-label="Choose science site">{SCIENCE_SITES.map(s => <button key={s.id} aria-pressed={s.id === site.id} onClick={() => onSelect(s.id)}>{s.name}</button>)}</div>
      <small className="rm-science-status">{isProvisionalSite(site.id) ? 'HISTORICAL SAMPLE · PROVISIONAL POSITION' : 'HISTORICAL SAMPLING SITE · NASA MAP CROSS-CHECKED'}</small>
      <h2 id="rm-science-title">{site.name}</h2><p className="rm-science-sample">{site.sample} / {site.designation}</p>
      <p>{site.geology}</p><p>{site.interest}</p>
      {recordedAccess && <div className="rm-science-caution"><strong>Recorded graph assessment: {recordedAccess.status}</strong><p>{recordedAccess.reason}</p>{recordedAccess.remainingHorizontalGapMetres !== null && recordedAccess.remainingHorizontalGapMetres > 0 && <p>{recordedAccess.remainingHorizontalGapMetres.toFixed(1)} m horizontal gap remains; final access is unresolved.</p>}<p>Snapshot: default habitat, slope priority, exclusion off. {recordedAccess.profileStatus === 'verified-current-run' ? 'Native profile checked for this recorded route.' : 'No verified native profile for this snapshot.'} Choose Mission destination for current routing and native-profile checks; this snapshot is not departure clearance.</p><p>Proposed tools: camera and field notebook. Ground hazards, soil strength and traction remain unknown.</p></div>}
      <ScienceSitePhoto key={site.id} siteId={site.id}/>
      <dl><dt>REPORTED LATITUDE</dt><dd>{site.latitude}° N</dd><dt>REPORTED LONGITUDE</dt><dd>{site.longitude}° E</dd><dt>PDS REPORTED ELEVATION</dt><dd>{site.pdsElevationMetres} m</dd><dt>HiRISE DISPLAY GRID / 10 M</dt><dd>{elevation(terrain, point.x, point.z).toFixed(2)} m</dd><dt>LOCAL HiRISE PIXEL</dt><dd>{checked?.samples.elevation.value.toFixed(4) ?? 'Unchecked'} m</dd></dl>
      <p className="rm-science-coverage">HiRISE point coverage: {checked?.samples.elevation.valid && checked.samples.imagery.valid ? 'valid elevation + imagery pixels, under the stated coordinate assumption.' : 'not confirmed.'} The map overview is sampled from HiRISE.</p>
      {store && <p data-testid="native-elevation">NATIVE 1 M TILE: {native?.id!==site.id?'Loading…':native.error?`Source tile could not load: ${native.error}`:native.value===null?'No valid elevation pixel.':`${native.value.toFixed(4)} m · file hash verified`}</p>}
      <button className="rm-science-zoom" onClick={() => onZoom(site)}>Zoom to {site.sample}</button>
      <p className="rm-science-caution">{site.coordinateStatus} {site.verticalDatumStatus} Relative map agreement does not establish absolute survey accuracy. Separate elevation values are not an accuracy comparison.</p>
      <p className="rm-science-caution">Leader lines connect offset labels to reported coordinates. Choose this sample in Mission destination to calculate access. Selecting a marker alone does not certify EVA access.</p>
      <div className="rm-science-sources"><a href={`${site.reportUrl}#page=${site.reportPage}`} target="_blank" rel="noreferrer">PDS initial report · PDF p. {site.reportPage}</a><a href={site.archiveUrl} target="_blank" rel="noreferrer">PDS sample dossier archive</a><a href={site.nasaUrl} target="_blank" rel="noreferrer">NASA source context</a></div>
    </div>
  </section>;
}
