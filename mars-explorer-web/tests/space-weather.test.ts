import {test} from 'node:test';import assert from 'node:assert/strict';
import {solarWindow,parseSolarEvents,parseSolarBody,latestSolarEvents,nasaApiKey,solarUrl,SOLAR_KINDS} from '../src/spaceWeather.ts';

test('solar lookup has explicit UTC window and rejects failure-shaped or malformed responses',()=>{
 assert.deepEqual(solarWindow(new Date('2026-11-14T08:00:00Z')),{start:'2026-10-15',end:'2026-11-14'});
 assert.deepEqual(solarWindow(new Date('2026-11-14T08:00:00Z'),7),{start:'2026-11-07',end:'2026-11-14'});
 assert.deepEqual(parseSolarEvents([]),[]);
 assert.throws(()=>parseSolarEvents({error:'rate limited'}));
 assert.throws(()=>parseSolarEvents([{}]));
 assert.equal(parseSolarEvents([{sepID:'event',eventTime:'2026-11-14T00:00Z',link:'https://bad.example'}])[0].url,null);
});

test('each DONKI catalogue is read with its own identifier and time fields',()=>{
 assert.deepEqual(SOLAR_KINDS.map(k=>k.kind),['CME','SEP']);
 const flare=parseSolarEvents([{flrID:'2026-11-10T01:00:00-FLR-001',beginTime:'2026-11-10T01:00Z',classType:'M1.2',link:'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/FLR/1/-1'}],'FLR')[0];
 assert.deepEqual(flare,{id:'2026-11-10T01:00:00-FLR-001',time:'2026-11-10T01:00Z',url:'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/FLR/1/-1',kind:'FLR',detail:'M1.2'});
 const cme=parseSolarEvents([{activityID:'2026-11-09T12:00:00-CME-001',startTime:'2026-11-09T12:00Z'}],'CME')[0];
 assert.deepEqual(cme,{id:'2026-11-09T12:00:00-CME-001',time:'2026-11-09T12:00Z',url:null,kind:'CME'});
 // A record from another catalogue must not be accepted under the wrong kind.
 assert.throws(()=>parseSolarEvents([{sepID:'event',eventTime:'2026-11-14T00:00Z'}],'FLR'));
 // An unexpected flare class is dropped, not displayed.
 assert.equal(parseSolarEvents([{flrID:'f',beginTime:'2026-11-10T01:00Z',classType:'<b>X9</b>'}],'FLR')[0].detail,undefined);
});

test('empty NASA bodies mean no records; broken bodies stay errors; newest records are listed first',()=>{
 assert.deepEqual(parseSolarBody('','CME'),[]);
 assert.deepEqual(parseSolarBody('  \n','SEP'),[]);
 assert.deepEqual(parseSolarBody('[]','FLR'),[]);
 assert.throws(()=>parseSolarBody('<html>error</html>','FLR'));
 assert.throws(()=>parseSolarBody('{"error":{"code":"OVER_RATE_LIMIT"}}','FLR'));
 const events=parseSolarEvents([{sepID:'old',eventTime:'2026-11-01T00:00Z'},{sepID:'new',eventTime:'2026-11-12T00:00Z'},{sepID:'mid',eventTime:'2026-11-05T00:00Z'}]);
 assert.deepEqual(latestSolarEvents(events,2).map(e=>e.id),['new','mid']);
 assert.equal(events[0].id,'old');
});

test('a configured team key is used; a missing or malformed one falls back to the shared demo key',()=>{
 assert.equal(nasaApiKey(undefined),'DEMO_KEY');
 assert.equal(nasaApiKey(''),'DEMO_KEY');
 assert.equal(nasaApiKey('has spaces & symbols'),'DEMO_KEY');
 assert.equal(nasaApiKey(' AbCdEf1234567890 '),'AbCdEf1234567890');
 assert.equal(solarUrl('FLR','2026-10-15','2026-11-14','DEMO_KEY'),'https://api.nasa.gov/DONKI/FLR?startDate=2026-10-15&endDate=2026-11-14&api_key=DEMO_KEY');
});
