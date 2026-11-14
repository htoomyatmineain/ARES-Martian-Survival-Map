import {test} from 'node:test';
import assert from 'node:assert/strict';
import {doseFromMinutes,siteReadings,missionConditions} from '../src/missionConditions.ts';
test('historical radiation scaling uses Earth minutes and rejects invalid durations',()=>{assert.equal(doseFromMinutes(0),0);assert.ok(Math.abs(doseFromMinutes(140)!-.0651389)<1e-6);assert.ok(Math.abs(doseFromMinutes(480)!-.2233333)<1e-6);for(const v of [-1,NaN,Infinity])assert.equal(doseFromMinutes(v),null);});
test('site sealing estimates stay attached to their site or sample, never nearby locations',()=>{assert.equal(siteReadings('skinner-ridge-skyland').length,2);assert.equal(siteReadings('wildcat-ridge-hazeltop').length,2);assert.equal(siteReadings('M2020-509-14')[0].pressurePa,800);assert.equal(siteReadings('custom').length,0);assert.equal(siteReadings('M2020-164-2').length,0);assert.equal(missionConditions('custom',NaN,480).radiation.estimatedDoseMsv,null);});
