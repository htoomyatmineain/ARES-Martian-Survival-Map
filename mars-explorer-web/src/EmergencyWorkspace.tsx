import { useEmergencyReturns } from './useEmergencyReturns';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import RegionalMap2D from './RegionalMap2D';
import { useNativeRoute } from './useNativeRoute';
import { DEMO_RULES } from './nativeRouting';
import type { MissionState } from './evaMission';
import type { SharedRegionalMap } from './sharedRegionalData';
import { sites, toGeo, type Point, type Terrain } from './terrain';
import { estimateTravel, formatTravelMinutes } from './travelTime';
import { assessEmergency, distinctRoute, terrainRiskier, FULL_OXYGEN_MINUTES, RESERVE_MINUTES, oxygenLevel, remainingScience, validOutbound, pointOnOutbound, PLAYBACK_SECONDS, WALKING_KMH, type EmergencyContext } from './emergency';
import './emergency.css';

const Scene = lazy(() => import('./Scene'));

type Props = { shared: SharedRegionalMap; terrain: Terrain; mission: MissionState };
export default function EmergencyWorkspace({ shared, terrain, mission }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<'2D' | '3D'>('2D');
  const latestMission = useRef(mission);
  useEffect(() => { latestMission.current = mission; }, [mission]);
  const [location, setLocation] = useState<Point | null>(null);
  const [oxygen, setOxygen] = useState(75);
  const [picking, setPicking] = useState(false);
  const [phase, setPhase] = useState<'configuring' | 'traveling' | 'arrived'>('configuring');
  const [context, setContext] = useState<EmergencyContext | null>(null);
  const [progress, setProgress] = useState(0);
  const routing = useNativeRoute(location ? shared : null, location ?? sites[0], true, false, DEMO_RULES, 0);
  const route = context?.outboundRoute ?? routing.route;
  const selected = context?.location ?? location;
  const arrivalOxygen = context?.arrivalOxygen ?? oxygen;
  const science = context ? context.remainingScienceMinutes : remainingScience(mission);
  const level = oxygenLevel(arrivalOxygen);
  const ready = validOutbound(routing.route, location);
  const position = useMemo(() => context ? pointOnOutbound(context.outboundRoute, progress) : sites[0], [context, progress]);
  const mapTerrain = useMemo(() => ({ ...terrain, nativeSlope: routing.grid ?? undefined }), [terrain, routing.grid]);
  const geo = selected ? toGeo(selected, terrain.meta.center) : null;
  const travel = route?.profileStatus === 'verified' ? estimateTravel(route.distance, WALKING_KMH) : null;

  const returns = useEmergencyReturns(phase === 'arrived' ? context : null, routing.grid, shared);
  const candidates = returns.candidates.filter(c => c.route);
  const preferred = candidates.find(c => assessEmergency(arrivalOxygen, science, c.route, selected ?? sites[0]).feasible) ?? candidates[0];
  const returnRoute = preferred?.route ?? null;
  const uncertainSearch = returns.loading || !routing.grid || returns.candidates.some(c => c.status === 'error');
  const evaluated = assessEmergency(arrivalOxygen, science, returnRoute, selected ?? sites[0]);
  const decision = assessEmergency(arrivalOxygen, science, uncertainSearch && !evaluated.feasible ? null : returnRoute,
    selected ?? sites[0], returns.candidates.length === 2 && returns.candidates.every(c => c.status === 'no-route'));
  const alternative = returnRoute ? candidates.find(c => c.route && distinctRoute(c.route, returnRoute) &&
    (terrainRiskier(c.route, returnRoute) || (decision.feasible && !assessEmergency(arrivalOxygen, science, c.route, selected ?? sites[0]).feasible))) : undefined;
  const displayRoute = phase === 'arrived' ? returnRoute : route;

  useEffect(() => {
    if (phase !== 'traveling') return;
    const start = performance.now();
    const timer = window.setInterval(() => {
      const fraction = Math.min(1, (performance.now() - start) / (PLAYBACK_SECONDS * 1000));
      setProgress(fraction);
      if (fraction === 1) {
        window.clearInterval(timer);
        const current = latestMission.current;
        setContext(previous => previous ? { ...previous, missionSnapshot: structuredClone(current.snapshot), remainingScienceMinutes: remainingScience(current) } : previous);
        setView('2D'); setPhase('arrived');
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [phase]);
  useEffect(() => { panelRef.current?.scrollTo(0, 0); }, [phase]);
  const reset = () => { panelRef.current?.scrollTo(0, 0); setView('2D'); setPhase('configuring'); setContext(null); setLocation(null); setOxygen(75); setProgress(0); setPicking(false); };
  const start = () => {
    if (phase !== 'configuring' || !validOutbound(routing.route, location) || !location) return;
    setContext(structuredClone({ location, arrivalOxygen: oxygen, outboundRoute: routing.route,
      missionSnapshot: mission.snapshot, remainingScienceMinutes: remainingScience(mission) } satisfies EmergencyContext));
    setPicking(false); setProgress(0); setPhase('traveling');
  };
  const pickLocation = (at: Point) => {
    if (phase === 'configuring' && Number.isFinite(at.x) && Number.isFinite(at.z)) { setLocation(at); setPicking(false); }
  };
  return <div className="rm-emergency">
    <aside ref={panelRef} className="rm-emergency-panel" aria-label="Emergency simulation">
      <section className="rm-section" hidden={phase === 'arrived'}><h2>Emergency Configuration</h2>
        <p>Low Oxygen / Oxygen Resource Assessment</p>
        <fieldset disabled={phase !== 'configuring'}><legend>Oxygen at emergency arrival</legend>
          <div className="rm-strategies">{[75, 45, 10].map(value => <button key={value} aria-pressed={oxygen === value} onClick={() => setOxygen(value)}>{value}% · {oxygenLevel(value)}</button>)}</div>
          <button className="rm-pick-button" aria-pressed={picking} onClick={() => setPicking(v => !v)}>{picking ? 'Cancel selection' : 'Select emergency location on map'}</button>
        </fieldset>
        <dl className="rm-mission-stats"><dt>Arrival oxygen</dt><dd>{arrivalOxygen}% · {level}</dd>
          <dt>Emergency location</dt><dd>{geo ? `${geo.lat.toFixed(5)}° N, ${geo.lon.toFixed(5)}° E` : 'Not selected'}</dd>
          <dt>Local coordinates</dt><dd>{selected ? `E ${selected.x.toFixed(1)}, S ${selected.z.toFixed(1)} m` : '—'}</dd>
          <dt>Remaining science</dt><dd>{science === null ? 'Unavailable from current Mission context' : `${science.toFixed(1)} min`}</dd>
          <dt>Mission context</dt><dd>{(context ? context.missionSnapshot : mission.snapshot)?.target ?? 'No active Mission plan'}</dd>
          <dt>Outbound route</dt><dd>{route?.profileStatus === 'verified' ? `${(route.distance / 1000).toFixed(2)} km · terrain profile checked` : location ? routing.status : 'Select a location'}</dd>
          <dt>Estimated walking time</dt><dd>{travel ? formatTravelMinutes(travel.minutes) : '—'}</dd>
          <dt>Terrain warnings</dt><dd>{route?.profileStatus === 'verified' ? `${route.warnings.length} flagged segments · max slope ${route.maxSlope.toFixed(1)}°` : '—'}</dd></dl>
        {routing.error && <p role="status">{routing.error}</p>}
        <p className="rm-fineprint">Simulation thresholds: Normal ≥60%, Caution 30–59%, Low &lt;30%, Critical ≤10%. These are not NASA standards. Oxygen is specified at arrival; outbound travel is not subtracted again. Endurance model: 100% = {FULL_OXYGEN_MINUTES} minutes at constant consumption; contingency reserve {RESERVE_MINUTES} minutes.</p>
        <p className="rm-fineprint">Walking assumption: {WALKING_KMH} km/h. Accelerated simulated playback: {PLAYBACK_SECONDS} seconds for the entire route, independent of estimated EVA travel time. Terrain checks use existing demo limits; no operational safety clearance.</p>
        <button className="rm-pick-button rm-primary-action" disabled={phase !== 'configuring' || !ready || picking} onClick={start}>Start Simulation</button>
        <button className="rm-pick-button" onClick={reset}>Reset</button>
        <p className="rm-fineprint">Leaving Emergency ends this isolated simulation. Mission is unchanged.</p>
      </section>
      {phase === 'traveling' && <section className="rm-section"><h3>Simulated outbound travel</h3><progress aria-label="Outbound travel progress" max={1} value={progress}/><p>{Math.floor(progress * 100)}% · accelerated visual playback</p></section>}
      {phase === 'arrived' && <section className={`rm-section rm-emergency-result ${arrivalOxygen <= 10 || decision.status === 'no-feasible-return' ? 'is-critical' : ''}`}>
        <h2>Emergency Assessment</h2>
        <div role={arrivalOxygen <= 10 || decision.status === 'no-feasible-return' ? 'alert' : 'status'}><h3>{arrivalOxygen <= 10 ? 'Critical oxygen — simulation warning' : `Arrival oxygen: ${level}`}</h3><p>Destination reached. Arrival oxygen: {arrivalOxygen}%.</p></div>
        <h3>{returns.loading ? 'Verifying return routes…' : decision.status === 'continue' ? 'Continuation may be considered' : decision.status === 'return' ? 'Return to habitat recommended' : decision.status === 'no-feasible-return' ? 'CRITICAL: No feasible return' : 'INSUFFICIENT DATA'}</h3>
        <p role="status">{returns.loading ? 'Independent return searches and native elevation checks are in progress.' : decision.explanation}</p>
        <dl className="rm-mission-stats"><dt>Emergency location</dt><dd>{geo ? `${geo.lat.toFixed(5)}° N, ${geo.lon.toFixed(5)}° E` : 'UNKNOWN'}</dd><dt>Mission context</dt><dd>{context?.missionSnapshot?.target ?? 'No active Mission plan'}</dd><dt>Available oxygen time</dt><dd>{decision.available?.toFixed(1) ?? 'UNKNOWN'} min</dd>
          <dt>Verified return ETA</dt><dd>{decision.eta?.toFixed(1) ?? 'UNKNOWN'} min</dd>
          <dt>Remaining science</dt><dd>{decision.science?.toFixed(1) ?? 'UNKNOWN'} min</dd>
          <dt>Contingency reserve</dt><dd>{decision.reserve} min</dd>
          <dt>Return + reserve</dt><dd>{decision.returnRequired?.toFixed(1) ?? 'UNKNOWN'} min</dd>
          <dt>Science + return + reserve</dt><dd>{decision.missionRequired?.toFixed(1) ?? 'UNKNOWN'} min</dd></dl>
        <h3>Emergency checklist</h3><ul>
          <li>Review arrival oxygen and the simulation assumptions.</li>
          <li>{decision.status === 'continue' ? 'Review remaining science tasks before considering continuation.' : decision.status === 'return' ? 'Stop science tasks and review the verified return corridor.' : decision.status === 'no-feasible-return' ? 'Do not assume self-return is feasible; assistance/rescue is outside this model.' : 'Resolve missing mission or routing data before making a continuation decision.'}</li>
          <li>Review terrain warnings. No route is guaranteed safe.</li></ul>
        <h3>Return route comparison</h3>
        {returns.candidates.map((candidate, index, all) => {
          const r = candidate.route;
          if (r && all.slice(0, index).some(c => c.route && !distinctRoute(c.route, r))) return null;
          const assessment = assessEmergency(arrivalOxygen, science, r, selected ?? sites[0]);
          return <div className="rm-emergency-route" key={candidate.name}><strong>{candidate.name}{candidate === preferred ? ' · selected' : ''}</strong>
            {r ? <p>{(r.distance / 1000).toFixed(2)} km · ETA {assessment.eta?.toFixed(1)} min · slopes {r.maxAlongSlope.toFixed(1)}° along / {r.maxCrossSlope.toFixed(1)}° cross / {r.maxSlope.toFixed(1)}° total · {r.warnings.length} warning segments.<br/>{assessment.feasible ? 'Fits return + reserve under simulation model.' : 'Does not fit return + reserve.'}{candidate === alternative ? ' Higher-risk alternative: greater terrain bounds near demo limits or insufficient oxygen margin.' : ''}</p> : <p>{candidate.status === 'error' ? 'INSUFFICIENT DATA: ' : ''}{candidate.reason}</p>}</div>;
        })}
        <p className="rm-fineprint">Blue: verified return that fits oxygen + reserve. Red: distinct verified higher-risk candidate, only with computed evidence. Amber: checked route that does not establish a feasible return. Identical search results are shown once. This model does not assess rescue, physiology or changing terrain. Assumptions: 480 minutes at 100% oxygen, 2 km/h walking and 60-minute reserve. Arrival oxygen does not deduct outbound travel again; thresholds are simulation choices, not NASA standards.</p>
        <button className="rm-pick-button" onClick={reset}>Reset</button>
      </section>}
    </aside>
    <section className="rm-emergency-map" aria-label="Emergency navigation map">
      <div className="rm-emergency-map-title"><div className="rm-view-switch" role="group" aria-label="Emergency map view"><button aria-pressed={view === '2D'} onClick={() => setView('2D')}>2D Map</button><button aria-pressed={view === '3D'} disabled={phase === 'arrived'} title="Return comparison is displayed in 2D" onClick={() => setView('3D')}>3D Tactical</button></div>{view} MAP · {picking ? 'Choose emergency location' : phase === 'traveling' ? 'Simulated outbound travel' : phase === 'arrived' ? 'Arrival · return route assessment' : 'Emergency planning'} · {phase === 'arrived' ? 'Blue: model-feasible return · red only with risk evidence' : 'Dashed: planned outbound route'}</div>
      <RegionalMap2D mapHelpId="rm-emergency-map-help" shared={shared} terrain={mapTerrain} analysis="none" opacity={.65} imagery contours={false}
        route={displayRoute?.profileStatus === 'verified' ? displayRoute : null} routeVisible routeDashed={phase !== 'arrived'}
        routeColor={phase === 'arrived' && decision.feasible ? '#38c9ff' : undefined}
        comparisonRoutes={phase === 'arrived' && alternative?.route ? [{route: alternative.route, color: '#ff736b', label: 'Verified higher-risk alternative'}] : undefined} destination={selected ?? sites[0]}
        destinationVisible={selected !== null} destinationLabel={selected ? 'EMERGENCY LOCATION' : 'SELECT EMERGENCY LOCATION'} picking={picking && phase === 'configuring'}
        onPick={pickLocation}
        missionPosition={context ? position : null} hidden={view !== '2D'} blocked={false} grid scienceVisible={false} selectedScienceId={null}
        scienceFocus={null} onScienceSelect={() => {}} observations={[]} observationFocus={null} onObservationSelect={() => {}}
        orbital={null} onOrbitalInspect={() => {}}/>
      {view === '3D' && <div className="rm-emergency-scene"><Suspense fallback={<p role="status">Loading tactical map…</p>}><Scene
        imageryUrl={shared.imageryUrl} terrain={mapTerrain} layer="surface" contours={false} exaggeration={1} mode="3D"
        cameraAction={{kind:'reset',tick:0}} route={route?.profileStatus === 'verified' ? route : null}
        selected="custom" onSelect={() => {}} onPick={pickLocation} planning={picking && phase === 'configuring'}
        progress={0} storm={false} markers={false} running={false} destination={selected ?? sites[0]}
        blocked={false} missionPosition={position} scienceSitesVisible={false}/></Suspense></div>}
      {phase === 'arrived' && returnRoute && <div className="rm-emergency-route-summary">
        <strong style={{color: decision.feasible ? '#38c9ff' : '#f39b58'}}>{decision.feasible ? 'Model-feasible return' : 'Return feasibility not established'}</strong>
        <p>{(returnRoute.distance / 1000).toFixed(2)} km · {evaluated.eta?.toFixed(1)} min · {returnRoute.warnings.length} terrain warnings</p>
        {alternative?.route && <p style={{color: '#ff736b'}}>Higher-risk alternative: {(alternative.route.distance / 1000).toFixed(2)} km · {estimateTravel(alternative.route.distance, WALKING_KMH)?.minutes.toFixed(1)} min · {alternative.route.warnings.length} terrain warnings</p>}
      </div>}
    </section>
  </div>;
}
