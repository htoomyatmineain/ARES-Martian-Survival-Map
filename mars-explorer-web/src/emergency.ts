import type { MissionSnapshot, MissionState } from './evaMission.ts';
import type { NativeRoute } from './nativeRouting.ts';
import { sites, type Point } from './terrain.ts';
import { estimateTravel } from './travelTime.ts';

/** Route locks at departure; Mission context refreshes at arrival. Oxygen is the selected ARRIVAL value. */
export interface EmergencyContext {
  location: Point;
  arrivalOxygen: number;
  outboundRoute: NativeRoute;
  missionSnapshot: MissionSnapshot | null;
  remainingScienceMinutes: number | null;
}
export const PLAYBACK_SECONDS = 20;
export const WALKING_KMH = 2;
export const FULL_OXYGEN_MINUTES = 480;
export const RESERVE_MINUTES = 60;

export function validReturn(route: NativeRoute | null, arrival: Point): route is NativeRoute {
  // Reuse endpoint/profile checks with a reversed COPY, never mutate Mission or outbound data.
  return !!route && validOutbound({ ...route, points: [...route.points].reverse() }, arrival);
}
export type DecisionStatus = 'continue' | 'return' | 'no-feasible-return' | 'insufficient-data';
export function assessEmergency(oxygen: number, science: number | null, route: NativeRoute | null,
  arrival: Point, noTerrainRoute = false, reserve = RESERVE_MINUTES) {
  const available = Number.isFinite(oxygen) && oxygen >= 0 && oxygen <= 100 ? oxygen / 100 * FULL_OXYGEN_MINUTES : null;
  const eta = validReturn(route, arrival) ? estimateTravel(route.distance, WALKING_KMH)?.minutes ?? null : null;
  const knownScience = science !== null && Number.isFinite(science) && science >= 0 ? science : null;
  const returnRequired = eta === null ? null : eta + reserve;
  const missionRequired = returnRequired === null || knownScience === null ? null : returnRequired + knownScience;
  const feasible = available !== null && returnRequired !== null && returnRequired <= available;
  let status: DecisionStatus = 'insufficient-data';
  let explanation = 'INSUFFICIENT DATA: return routing or required measurements are unavailable.';
  if (available !== null && noTerrainRoute) {
    status = 'no-feasible-return'; explanation = 'CRITICAL: No complete return route was found under the configured terrain constraints.';
  } else if (available !== null && returnRequired !== null) {
    if (!feasible) { status = 'no-feasible-return'; explanation = 'CRITICAL: verified return travel plus reserve exceeds arrival oxygen endurance.'; }
    else if (oxygen <= 10) { status = 'return'; explanation = 'Abort science and return to habitat. Critical-oxygen simulation policy prohibits continuation even when the time budget fits.'; }
    else if (missionRequired === null) { explanation = 'INSUFFICIENT DATA: remaining science time is UNKNOWN. Return fits the model, but science continuation cannot be assessed.'; }
    else if (missionRequired <= available) { status = 'continue'; explanation = 'Science continuation may be considered: remaining science, verified return travel and reserve fit arrival oxygen endurance.'; }
    else { status = 'return'; explanation = 'Abort science and return to habitat: return plus reserve fits oxygen endurance; continuing science does not.'; }
  }
  return { status, explanation, available, eta, science: knownScience, reserve, returnRequired, missionRequired, feasible };
}
export function distinctRoute(a: NativeRoute, b: NativeRoute) {
  return a.points.length !== b.points.length || a.points.some((p, i) => Math.hypot(p.x - b.points[i].x, p.z - b.points[i].z) > .01);
}
export function terrainRiskier(candidate: NativeRoute, preferred: NativeRoute) {
  return candidate.warnings.length > 0 && (candidate.maxAlongSlope > preferred.maxAlongSlope + .01 ||
    candidate.maxCrossSlope > preferred.maxCrossSlope + .01 || candidate.maxSlope > preferred.maxSlope + .01);
}
export function oxygenLevel(value: number) {
  return value <= 10 ? 'Critical' : value < 30 ? 'Low' : value < 60 ? 'Caution' : 'Normal';
}
export function remainingScience(state: MissionState): number | null {
  if (!state.snapshot) return null;
  if (state.scienceCompleted) return 0;
  if (state.phase === 'science') return Math.max(0, state.snapshot.scienceMinutes - state.phaseElapsed);
  // An aborted task may have partial science progress that Mission does not retain.
  if (['returning', 'complete'].includes(state.phase)) return null;
  return state.snapshot.scienceMinutes;
}
export function validOutbound(route: NativeRoute | null, destination: Point | null): route is NativeRoute {
  if (!destination || !route || route.profileStatus !== 'verified' || route.approach ||
      !Number.isFinite(route.distance) || route.distance <= 0 || route.points.length < 2 ||
      route.profileSamples < 2 || !route.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.z))) return false;
  const first = route.points[0], last = route.points.at(-1)!;
  return Math.hypot(first.x - sites[0].x, first.z - sites[0].z) < .01 &&
    Math.hypot(last.x - destination.x, last.z - destination.z) < .01 &&
    Number.isFinite(route.maxAlongSlope + route.maxCrossSlope + route.maxSlope) &&
    route.maxAlongSlope <= route.rules.alongLimit && route.maxCrossSlope <= route.rules.crossLimit &&
    route.maxSlope <= route.rules.totalLimit;
}
export function pointOnOutbound(route: NativeRoute, fraction: number): Point {
  const points = route.points;
  if (fraction >= 1) return points.at(-1)!;
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.z - points[i].z));
  let remaining = Math.max(0, fraction) * lengths.reduce((sum, n) => sum + n, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] > 0 && remaining <= lengths[i]) {
      const f = remaining / lengths[i];
      return { x: points[i].x + (points[i + 1].x - points[i].x) * f, z: points[i].z + (points[i + 1].z - points[i].z) * f };
    }
    remaining -= lengths[i];
  }
  return points.at(-1)!;
}
