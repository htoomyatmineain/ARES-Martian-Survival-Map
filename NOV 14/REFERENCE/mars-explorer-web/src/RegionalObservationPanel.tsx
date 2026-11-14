import { celsius, MINERALS, MINERAL_NOTE, THERMAL, THERMAL_NOTE, type ObservationLayer, type ThermalObservation } from './environmentObservations';
import { SCIENCE_SITES } from './scienceSites';

type Props = { layer: Exclude<ObservationLayer, 'none' | 'environment'>; reading: ThermalObservation; onReading: (id: string) => void; onClose: () => void; onLocate: () => void };
const FLAG_NAMES: Record<string, string> = {
  RSM_HEAD_OUTSIDE_TIRS_UPWARD_LOOKING_FOV: 'Mast outside sky view',
  WHEEL_OUTSIDE_TIRS_DOWNWARD_LOOKING_FOV: 'Wheel outside ground view',
  SUN_OUTSIDE_TIRS_FOV: 'Sun outside view', ROVER_LOW_TILT: 'Low rover tilt',
  TIRS_GROUND_FOOTPRINT_NOT_IN_SHADOW: 'Ground not rover-shadowed',
  ROVER_HGA_OFF: 'Antenna off', SKYCAM_OFF: 'SkyCam off', ROVER_STILL: 'Rover stationary',
};
export default function ObservationPanel({ layer, reading, onReading, onClose, onLocate }: Props) {
  const day = THERMAL.days.find(day => day.sol === reading.sol)!;
  const readings = THERMAL.observations.filter(item => item.sol === reading.sol);
  const source = THERMAL.sources.find(source => source.file === reading.sourceFile)!;
  const mineral = MINERALS[0], site = SCIENCE_SITES.find(site => site.id === mineral.siteId)!;
  return <section className="rm-science-popup rm-observation-popup" aria-label={layer === 'thermal' ? 'Thermal observations' : 'Mineral observations'}>
    <header><span>{layer === 'thermal' ? 'THERMAL / HISTORICAL OBSERVATIONS' : 'MINERALS / REPORTED DETECTIONS'}</span><button aria-label="Close observation details" onClick={onClose}>×</button></header>
    <div className="rm-science-content">
      {layer === 'thermal' ? <>
        <p className="rm-science-status">HISTORICAL SUBSET · NOT LIVE WEATHER</p>
        <h2>Ground brightness temperature</h2><p>Perseverance / MEDA TIRS · calibrated infrared observation. This is not air temperature or a zone-wide thermal map.</p>
        <label className="rm-observation-field">Observation day<select aria-label="Thermal observation day" value={reading.sol} onChange={e => { const first = THERMAL.observations.find(item => item.sol === Number(e.target.value)); if (first) onReading(first.id); }}>{THERMAL.days.map(day => <option key={day.sol} value={day.sol}>Sol {day.sol} · {day.utcStart.slice(0, 10)}–{day.utcEnd.slice(0, 10)}</option>)}</select></label>
        <label className="rm-observation-field">Recorded local Mars time<select aria-label="Thermal observation time" value={reading.id} onChange={e => onReading(e.target.value)}>{readings.map(item => <option key={item.id} value={item.id}>{item.lmst} LMST · {celsius(item.kelvin).toFixed(1)} °C</option>)}</select></label>
        <div className="rm-observation-temperature" aria-live="polite">{celsius(reading.kelvin).toFixed(1)}<span> °C</span><small>{reading.kelvin.toFixed(2)} K · ±{reading.uncertaintyKelvin.toFixed(2)} K source uncertainty (1σ)</small></div>
        <p className="rm-science-caution">{THERMAL_NOTE}</p>
        <dl><dt>MEASUREMENT TIME</dt><dd>Sol {reading.sol} · {reading.lmst} LMST</dd><dt>LOCAL TRUE SOLAR TIME</dt><dd>{reading.ltst}</dd><dt>PRODUCT UTC COVERAGE</dt><dd>{day.utcStart} → {day.utcEnd}</dd><dt>APPROXIMATE ROVER POSITION</dt><dd>{reading.latitude.toFixed(6)}° N · {reading.longitude.toFixed(6)}° E</dd><dt>SPATIAL COVERAGE / RESOLUTION</dt><dd>Near-rover ground only. Sensor footprint not mapped; marker size is symbolic.</dd><dt>SELECTION</dt><dd>{readings.length} actual readings, at most one per available local hour. No averaging or interpolation between times. Two selected historical sols; not the full or latest archive.</dd><dt>POSITION QUALITY</dt><dd>{reading.positionStatus}</dd></dl>
        <details className="rm-observation-quality"><summary>Quality flags · {reading.quality}</summary><p>Filters require stationary rover, low tilt and unshadowed ground; reject known wheel obstruction. Unknown flags remain unknown, not passed.</p><dl>{Object.entries(reading.flags).map(([key, value]) => <div key={key}><dt>{FLAG_NAMES[key] ?? key}</dt><dd>{value === null ? 'Unknown / not supplied' : value === 1 ? 'Yes (1)' : 'No (0)'}</dd></div>)}</dl><p>Temperature uncertainty is the instrument value. It does not include position error or representativeness elsewhere.</p></details>
        <button className="rm-science-zoom" onClick={onLocate}>Locate this observation</button>
        <div className="rm-science-sources"><a href={source.url} target="_blank" rel="noreferrer">NASA PDS temperature CSV · source row {reading.sourceLine}</a><a href={source.labelUrl} target="_blank" rel="noreferrer">NASA product label · units and quality definitions</a><a href={THERMAL.placesSource.url} target="_blank" rel="noreferrer">NASA PLACES position reference</a></div>
      </> : <>
        <p className="rm-science-status">POINT OBSERVATION · PROVISIONAL POSITION</p><h2>{mineral.mineral}</h2><p className="rm-science-sample">{mineral.name}</p><p>{mineral.evidence}</p><p className="rm-science-caution">{MINERAL_NOTE}</p>
        <dl><dt>INSTRUMENT</dt><dd>{mineral.instrument}</dd><dt>OBSERVATION PERIOD</dt><dd>{mineral.observationTime}</dd><dt>NASA REPORT PUBLISHED</dt><dd>{mineral.published}</dd><dt>OUTCROP LOCATOR</dt><dd>{site.latitude.toFixed(6)}° N · {site.longitude.toFixed(6)}° E</dd><dt>COVERAGE / RESOLUTION</dt><dd>{mineral.coverage}</dd><dt>CONFIDENCE</dt><dd>{mineral.confidence}</dd><dt>POSITION QUALITY</dt><dd>{mineral.positionStatus}</dd></dl>
        <p>No concentration, quantity, extraction value, or deposit boundary is supplied. No zone-wide mineral raster is loaded. Other minerals and unobserved ground remain unknown.</p>
        <button className="rm-science-zoom" onClick={onLocate}>Locate this observation</button><div className="rm-science-sources"><a href={mineral.sourceUrl} target="_blank" rel="noreferrer">{mineral.sourceTitle}</a><a href={mineral.contextUrl} target="_blank" rel="noreferrer">NASA outcrop context</a><a href={site.reportUrl} target="_blank" rel="noreferrer">NASA PDS sample report · provisional location source</a></div>
      </>}
    </div>
  </section>;
}
