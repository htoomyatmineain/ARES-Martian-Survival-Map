import test from 'node:test';
import assert from 'node:assert/strict';
import { oxygenLevel, validOutbound, pointOnOutbound, remainingScience } from '../src/emergency.ts';
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
