import { orbitalSample, type OrbitalDataset, type OrbitalRaster } from './orbitalLayers';
import { toGeo, type Point } from './terrain';

type Props = { meta: OrbitalDataset; raster: OrbitalRaster | null; point: Point | null; error: string; onClose: () => void; onRetry: () => void };
export default function OrbitalLayerPanel({meta,raster,point,error,onClose,onRetry}: Props) {
  const geo = point ? toGeo(point,meta.center) : null;
  const value = raster && point ? orbitalSample(raster,point) : null;
  return <section className="rm-science-popup rm-observation-popup" aria-label="Orbital area layer details">
    <header><span>ORBITAL / SPECTRAL INDICATOR</span><button aria-label="Close orbital layer details" onClick={onClose}>×</button></header>
    <div className="rm-science-content"><p className="rm-science-status">HISTORICAL CRISM OBSERVATION · NOT A DEPOSIT MAP</p><h2>{meta.title}</h2>
      {error ? <p role="alert">{error} <button onClick={onRetry}>Retry raster</button></p> : !raster ? <p role="status">Loading and checking orbital pixels…</p> : <>
        <p>{meta.interpretation}</p>
        <div className="rm-orbital-inspection" aria-live="polite"><small>{point ? 'SELECTED PIXEL' : 'PIXEL INSPECTION'}</small><strong>{point ? value === null ? 'No data' : value.toFixed(6) : 'Click the map'}</strong><small>{geo ? `${geo.lat.toFixed(6)}° N · ${geo.lon.toFixed(6)}° E` : 'Or focus the 2D map and press Enter.'}</small></div>
      </>}
      <p className="rm-science-caution">Colour shows a spectral indicator, not confirmed mineral identity, abundance, or confidence. Detected minerals do not confirm a usable or mineable deposit. Uncoloured areas are unknown.</p>
      <dl><dt>PARAMETER / UNITS</dt><dd>{meta.parameter} · {meta.units}</dd><dt>OBSERVATION UTC</dt><dd>{meta.observedStart} → {meta.observedEnd}</dd><dt>INSTRUMENT</dt><dd>{meta.instrument}</dd><dt>RESOLUTION</dt><dd>{meta.sourceProjectedSpacingMetres} m source projected pixels; {meta.spacingMetres} m regional output cells. Zoom does not add detail.</dd><dt>VALID OUTPUT COVERAGE</dt><dd>{meta.coveragePercent.toFixed(2)}% of regional cells. Transparent pixels have no data.</dd><dt>COLOUR SCALE</dt><dd>{meta.stretch} Negative index values can occur; they are retained.</dd><dt>CONFIDENCE</dt><dd>{meta.confidence}</dd><dt>POSITION QUALITY</dt><dd>{meta.registration}</dd><dt>ROUTING</dt><dd>This historical spectral overlay does not change the prototype route costs.</dd></dl>
      <div className="rm-science-sources"><a href={meta.labelUrl} target="_blank" rel="noreferrer">NASA PDS product label</a><a href={meta.sourceUrl} target="_blank" rel="noreferrer">NASA CRISM source cube · selected bands only</a><a href={meta.definitionUrl} target="_blank" rel="noreferrer">NASA spectral-parameter definitions</a></div>
    </div>
  </section>;
}
