import { useState } from 'react';
import weather from './data/historical-weather.json';
import { celsius, THERMAL, type ThermalObservation } from './environmentObservations';

type Props = { reading: ThermalObservation; onReading: (id: string) => void; onClose: () => void; onLocate: () => void };
export default function HistoricalEnvironmentPanel({ reading, onReading, onClose, onLocate }: Props) {
  const [sensor, setSensor] = useState(1);
  const record = weather.observations.find(item => item.thermalId === reading.id);
  const air = record?.air.sample;
  const pressure = record?.pressure.sample;
  const detector = air?.detectors.find(item => item.sensor === sensor);
  const readings = THERMAL.observations.filter(item => item.sol === reading.sol);
  return <section className="rm-science-popup rm-observation-popup" aria-label="Environmental observations">
    <header><span>ENVIRONMENT / RECORDED OBSERVATIONS</span><button aria-label="Close environmental details" onClick={onClose}>×</button></header>
    <div className="rm-science-content">
      <p className="rm-science-status">HISTORICAL · NOT LIVE WEATHER · REVIEW REQUIRED</p>
      <h2>Near-rover environment</h2>
      <p>NASA Perseverance / MEDA. These readings describe recorded conditions near the rover, not the astronaut or the whole zone.</p>
      <label className="rm-observation-field">Observation day<select aria-label="Environmental observation day" value={reading.sol} onChange={e => { const first = THERMAL.observations.find(item => item.sol === Number(e.target.value)); if (first) onReading(first.id); }}>{THERMAL.days.map(day => <option key={day.sol} value={day.sol}>Sol {day.sol} · {day.utcStart.slice(0, 10)}–{day.utcEnd.slice(0, 10)}</option>)}</select></label>
      <label className="rm-observation-field">Reference local Mars time<select aria-label="Environmental observation time" value={reading.id} onChange={e => onReading(e.target.value)}>{readings.map(item => <option key={item.id} value={item.id}>{item.lmst} LMST</option>)}</select></label>
      <dl aria-live="polite">
        <dt>GROUND BRIGHTNESS TEMPERATURE</dt><dd>{celsius(reading.kelvin).toFixed(1)} °C · {reading.kelvin.toFixed(2)} K · ±{reading.uncertaintyKelvin.toFixed(2)} K (source 1σ)</dd>
        <dt>AIR SENSOR LOCAL TEMPERATURE · ATS {sensor}</dt><dd>{detector?.kelvin != null ? `${celsius(detector.kelvin).toFixed(1)} °C · ${detector.kelvin.toFixed(2)} K` : 'Unavailable'}</dd>
        <dt>PRESSURE</dt><dd>{pressure?.pascal != null ? `${pressure.pascal.toFixed(1)} Pa` : `Unavailable · ${record?.pressure.reason ?? 'No matching record'}`}</dd>
        <dt>WIND SPEED / DIRECTION</dt><dd>Unavailable · no wind product in the checked sol directories.</dd>
      </dl>
      <label className="rm-observation-field">Air detector<select aria-label="Air detector" value={sensor} onChange={e => setSensor(Number(e.target.value))}><option value={1}>ATS 1 · mast 50°</option><option value={2}>ATS 2 · mast 155°</option><option value={3}>ATS 3 · mast 290°</option><option value={4}>ATS 4 · front body port</option><option value={5}>ATS 5 · front body starboard</option></select></label>
      <p className="rm-science-caution">Local detector temperature is not corrected ambient air temperature. Rover heating and illumination can affect it. No zone-wide weather map or EVA safety assessment is inferred.</p>
      <details className="rm-observation-quality"><summary>Source times, position and limitations</summary>
        <p>{weather.selection}</p><p>{weather.spatialCoverage}</p><p>{weather.qualityNote}</p><p>{weather.pressureUncertaintyNote} No pressure error bar is shown.</p>
        <dl><dt>GROUND REFERENCE TIME</dt><dd>{reading.lmst} LMST · {reading.ltst} LTST</dd><dt>REFERENCE ROVER POSITION</dt><dd>{reading.latitude.toFixed(6)}° N · {reading.longitude.toFixed(6)}° E (approximate)</dd></dl>
        {([['Air', air], ['Pressure', pressure]] as const).map(([name, sample]) => <div key={name}><h3>{name}</h3>{sample ? <><p>{sample.lmst} LMST · {sample.ltst} LTST · {sample.offsetSeconds > 0 ? '+' : ''}{sample.offsetSeconds} s from ground reference. Samples are not necessarily simultaneous.</p><p>{sample.position ? `${sample.position.latitude.toFixed(6)}° N · ${sample.position.longitude.toFixed(6)}° E (approximate ancillary position)` : 'Sample position unavailable'}</p><p>{sample.qualityStatus}</p><p>{sample.sourceFile} · CSV line {sample.sourceLine}</p>{weather.sources.filter(source => source.file === sample.sourceFile).map(source => <div className="rm-science-sources" key={source.file}><a href={source.url} target="_blank" rel="noreferrer">NASA PDS {name.toLowerCase()} CSV</a><a href={source.labelUrl} target="_blank" rel="noreferrer">NASA product label</a><p>Product UTC coverage (not sample UTC): {source.utcStart} → {source.utcEnd}</p></div>)}</> : <p>Unavailable within the 30-second matching window.</p>}</div>)}
        <p>Air uncertainty is not supplied. Ground uncertainty excludes position error and representativeness elsewhere. Unavailable means unknown, never zero.</p>
      </details>
      <button className="rm-science-zoom" onClick={onLocate}>Locate recorded rover position</button>
    </div>
  </section>;
}
