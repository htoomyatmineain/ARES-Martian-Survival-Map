import test from 'node:test';
import assert from 'node:assert/strict';
import { oxygenLevel, validOutbound, pointOnOutbound, remainingScience, assessEmergency, validReturn, distinctRoute, terrainRiskier } from '../src/emergency.ts';
import { DEMO_RULES, type NativeRoute } from '../src/nativeRouting.ts';
import { initialMission, type MissionSnapshot } from '../src/evaMission.ts';

const destination = { x: 2000, z: 1700 };
const route = (): NativeRoute => ({ points: [{ x: 1900, z: 1500 }, { x: 2000, z: 1500 }, destination],
  distance: 300, ascent: 0, maxSlope: 5, maxAlongSlope: 3, maxCrossSlope: 2, warnings: [],
  minutes: NaN, oxygen: NaN, feasible: false, profileStatus: 'verified', profileSamples: 301,
  rules: { ...DEMO_RULES }, expanded: 3 });

test('departure rejects incomplete, unverified, misplaced and slope-failing routes', () => {
  assert.equal(validOutbound(route(), destination), true);
  assert.equal(validOutbound(route(), null), false);
  assert.equal(validOutbound(null, destination), false);
  assert.equal(validOutbound({ ...route(), profileStatus: 'pending' }, destination), false);
  assert.equal(validOutbound({ ...route(), profileSamples: 0 }, destination), false);
  assert.equal(validOutbound({ ...route(), points: [destination, destination] }, destination), false);
  assert.equal(validOutbound(route(), { x: 1999, z: 1700 }), false);
  assert.equal(validOutbound({ ...route(), maxSlope: 40 }, destination), false);
  assert.equal(validOutbound({ ...route(), distance: NaN }, destination), false);
  assert.equal(validOutbound({ ...route(), approach: { requested: destination, endpoint: destination, gapMetres: 0, searchRadiusMetres: 100, reason: 'approach' } }, destination), false);
});
test('crew follows route bends by distance and stops exactly at arrival', () => {
  assert.deepEqual(pointOnOutbound(route(), 0), { x: 1900, z: 1500 });
  assert.deepEqual(pointOnOutbound(route(), .5), { x: 2000, z: 1550 });
  assert.deepEqual(pointOnOutbound(route(), 1), destination);
});
test('oxygen boundaries only flag critical at or below ten percent', () => {
  assert.deepEqual([100, 75, 60, 59, 45, 30, 29, 11, 10, 0].map(oxygenLevel),
    ['Normal', 'Normal', 'Normal', 'Caution', 'Caution', 'Caution', 'Low', 'Low', 'Critical', 'Critical']);
});
test('science context is read without changing Mission; missing progress remains unknown', () => {
  const state = initialMission();
  assert.equal(remainingScience(state), null);
  state.snapshot = { scienceMinutes: 20 } as MissionSnapshot;
  state.phase = 'science'; state.phaseElapsed = 7;
  const before = structuredClone(state);
  assert.equal(remainingScience(state), 13);
  assert.deepEqual(state, before);
  state.phase = 'returning'; assert.equal(remainingScience(state), null);
  state.scienceCompleted = true; assert.equal(remainingScience(state), 0);
});

const returnRoute = (distance = 1000): NativeRoute => ({ ...route(), points: [...route().points].reverse(), distance });
test('continuation fits arrival oxygen without double-counting outbound time', () => {
  const result = assessEmergency(75, 200, returnRoute(), destination);
  assert.equal(result.available, 360);
  assert.ok(Math.abs(result.eta! - 30) < 1e-9);
  assert.equal(result.missionRequired, 290);
  assert.equal(result.status, 'continue');
});
test('abort science when only return plus reserve fits', () => {
  const result = assessEmergency(45, 150, returnRoute(), destination);
  assert.equal(result.available, 216);
  assert.equal(result.returnRequired, 90);
  assert.equal(result.status, 'return');
});
test('no feasible return distinguishes insufficient oxygen and exhausted terrain searches', () => {
  assert.equal(assessEmergency(10, 0, returnRoute(), destination).status, 'no-feasible-return');
  assert.equal(assessEmergency(75, 0, null, destination, true).status, 'no-feasible-return');
  assert.equal(assessEmergency(75, 0, returnRoute(12000), destination).status, 'no-feasible-return');
});
test('unknown science never becomes zero; return feasibility remains independently available', () => {
  const result = assessEmergency(75, null, returnRoute(), destination);
  assert.equal(result.status, 'insufficient-data');
  assert.equal(result.missionRequired, null);
  assert.equal(result.feasible, true);
  assert.equal(assessEmergency(75, NaN, returnRoute(), destination).science, null);
});
test('return requires independent profile, complete endpoints and passing slopes', () => {
  assert.equal(validReturn(returnRoute(), destination), true);
  assert.equal(validReturn(route(), destination), false);
  for (const r of [{ ...returnRoute(), profileStatus: 'pending' as const }, { ...returnRoute(), maxCrossSlope: 50 }, { ...returnRoute(), points: [] }]) {
    assert.equal(assessEmergency(75, 20, r, destination).status, 'insufficient-data');
  }
});
test('preset budgets, exact equality and critical policy boundaries', () => {
  assert.deepEqual([75, 45, 10].map(p => assessEmergency(p, 0, returnRoute(), destination).available), [360, 216, 48]);
  assert.equal(assessEmergency(75, 270, returnRoute(), destination).status, 'continue');
  assert.equal(assessEmergency(75, 270.01, returnRoute(), destination).status, 'return');
  assert.equal(assessEmergency(10, 0, returnRoute(100), destination, false, 0).status, 'return');
  assert.equal(assessEmergency(11, 0, returnRoute(100), destination, false, 0).status, 'continue');
  assert.equal(assessEmergency(NaN, 0, returnRoute(), destination).status, 'insufficient-data');
});
test('alternative risk labels need distinct geometry and actual terrain evidence', () => {
  const primary = returnRoute();
  assert.equal(distinctRoute(primary, returnRoute()), false);
  const alternative = { ...primary, points: [destination, { x: 1900, z: 1700 }, primary.points.at(-1)!], maxSlope: 25, warnings: [[destination, primary.points.at(-1)!]] };
  assert.equal(distinctRoute(alternative, primary), true);
  assert.equal(terrainRiskier(alternative, primary), true);
  assert.equal(terrainRiskier({ ...alternative, warnings: [] }, primary), false);
});
