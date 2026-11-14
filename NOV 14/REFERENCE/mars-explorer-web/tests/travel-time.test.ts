import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAVEL_DEFAULTS,estimateTravel,formatTravelMinutes} from '../src/travelTime.ts';

test('crewed rover and suited walking estimates use average speed and the actual selected route distance',()=>{
  const rover=estimateTravel(10052.545272294046,TRAVEL_DEFAULTS.rover),walk=estimateTravel(10052.545272294046,TRAVEL_DEFAULTS.walk);
  assert.ok(rover&&walk);assert.ok(Math.abs(rover.metresPerMinute-83.33333333333333)<1e-10);assert.ok(Math.abs(walk.metresPerMinute-33.33333333333333)<1e-10);
  assert.ok(Math.abs(rover.minutes-120.63054326752855)<1e-9);assert.equal(formatTravelMinutes(rover.minutes),'2 h 1 min');assert.equal(formatTravelMinutes(walk.minutes),'5 h 2 min');
  assert.equal(estimateTravel(1000,6)?.minutes,10);assert.equal(estimateTravel(2000,6)?.minutes,20);assert.equal(estimateTravel(1000,12)?.minutes,5);
});
test('invalid speeds/distances cannot yield a misleading ETA; zero and minute rounding are explicit',()=>{
  for(const speed of [0,-1,NaN,Infinity,Number.MAX_VALUE])assert.equal(estimateTravel(1000,speed),null);
  for(const distance of [-1,NaN,Infinity])assert.equal(estimateTravel(distance,5),null);
  assert.equal(formatTravelMinutes(estimateTravel(0,5)!.minutes),'0 min');assert.equal(formatTravelMinutes(.01),'1 min');assert.equal(formatTravelMinutes(60),'1 h');assert.equal(formatTravelMinutes(59.9),'1 h');assert.equal(formatTravelMinutes(NaN),'—');
});
