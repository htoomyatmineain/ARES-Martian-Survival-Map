import test from 'node:test';import assert from 'node:assert/strict';
import {SCENARIO_DEFAULTS,advancePlayback,eventJourney,scenarioPlan,assessScenario,validScenario} from '../src/emergencyScenario.ts';
import {initialEmergencyActions,emergencyActionReducer} from '../src/emergency.ts';
import {RESOURCE_DEFAULTS,type EmergencyResourcePlan} from '../src/emergencyResources.ts';
import {eligibleTasks} from '../src/emergencyTasks.ts';import {DEMO_RULES,type NativeRoute} from '../src/nativeRouting.ts';
const back=():NativeRoute=>({points:[{x:2900,z:1500},{x:2900,z:2000},{x:1900,z:2000},{x:1900,z:1500}],distance:2000,ascent:0,maxSlope:2,maxAlongSlope:2,maxCrossSlope:1,warnings:[],profileStatus:'verified',profileSamples:2001,rules:{...DEMO_RULES},expanded:1,minutes:NaN,oxygen:NaN,feasible:false});
const outbound=():NativeRoute=>({...back(),points:[{x:1900,z:1500},{x:2900,z:1500}],distance:1000,returnRoute:back()});
const plan=():EmergencyResourcePlan=>({location:{x:2900,z:1500},task:{...eligibleTasks(null,null)[0],minutes:20,partial:{title:'Short',minutes:5,tasks:['Record context']}},shortened:false,equipment:'baseline',activity:'walk',assumptions:{...RESOURCE_DEFAULTS}});
test('triggers follow checked outbound, site and return geometry without shortcuts',()=>{
 assert.deepEqual(eventJourney(outbound(),{...SCENARIO_DEFAULTS,timing:'outbound'})?.location,{x:2400,z:1500});
 assert.deepEqual(eventJourney(outbound(),SCENARIO_DEFAULTS)?.location,{x:2900,z:1500});
 const s={...SCENARIO_DEFAULTS,timing:'returning' as const,scienceAcknowledged:true};
 assert.deepEqual(eventJourney(outbound(),s)?.location,{x:2400,z:2000});
 assert.equal(eventJourney({...outbound(),returnRoute:undefined},s),null);
 assert.equal(validScenario({...s,scienceAcknowledged:false}),false);
 assert.equal(validScenario({...s,evaMinutes:NaN}),false);
});
test('oxygen, failed rover and low visibility enforce stage-appropriate actions',()=>{
 const p=plan(),r=back();
 assert.equal(assessScenario(p,75,r,240,SCENARIO_DEFAULTS).actions.continue.state,'allowed');
 assert.equal(assessScenario(p,5,r,240,SCENARIO_DEFAULTS).actions.continue.state,'blocked');
 for(const timing of ['outbound','returning'] as const)assert.equal(assessScenario(p,75,r,240,{...SCENARIO_DEFAULTS,timing,scienceAcknowledged:true}).actions.continue.state,'blocked');
 assert.equal(assessScenario(p,75,r,240,{...SCENARIO_DEFAULTS,kind:'rover-failure'}).recommendation,'return');
 const visibility={...SCENARIO_DEFAULTS,kind:'visibility' as const,visibilityMetres:10};
 assert.equal(assessScenario(p,75,r,240,visibility).recommendation,'contingency');
 assert.equal(assessScenario(p,75,r,240,{...visibility,visibilityMetres:50}).recommendation,'return');
 assert.equal(scenarioPlan(p,{...visibility,speedPercent:50},p.location).assumptions.walkingKmh,1);
 assert.equal(assessScenario(p,75,null,240,SCENARIO_DEFAULTS).actions.return.state,'unknown');
});
test('science playback consumes explicit task amounts and cannot start twice',()=>{
 const assessment=assessScenario(plan(),75,back(),240,SCENARIO_DEFAULTS);
 let s=emergencyActionReducer(initialEmergencyActions(),{type:'continue',assessment,route:back()});
 assert.equal(s.scienceMinutes,20);assert.equal(s.scienceDone,false);
 s=emergencyActionReducer(s,{type:'tick-science',fraction:.5});assert.equal(s.scienceFraction,.5);
 assert.equal(emergencyActionReducer(s,{type:'continue',assessment,route:back()}),s);
 s=emergencyActionReducer(s,{type:'tick-science',fraction:1});assert.equal(s.scienceDone,true);assert.equal(s.scienceFraction,1);
 assert.deepEqual(emergencyActionReducer(s,{type:'reset'}),initialEmergencyActions());
});

test('all scenario and timing combinations preserve return-only rules away from the site',()=>{
 for(const kind of ['oxygen','rover-failure','visibility'] as const)for(const timing of ['outbound','onsite','returning'] as const){const s={...SCENARIO_DEFAULTS,kind,timing,scienceAcknowledged:true};assert.ok(eventJourney(outbound(),s));const a=assessScenario(plan(),75,back(),240,s);assert.equal(a.actions.return.state,'allowed');if(kind!=='oxygen'||timing!=='onsite')assert.equal(a.actions.continue.state,'blocked');}
 const done=assessScenario(plan(),75,back(),240,SCENARIO_DEFAULTS,false,true);assert.equal(done.recommendation,'return');assert.equal(done.actions.continue.state,'blocked');
 assert.equal(assessScenario(plan(),5,back(),240,SCENARIO_DEFAULTS).severity,'critical');
});

test('playback completes a stage in 12 seconds normally and 6 seconds at 2x',()=>{
 assert.equal(advancePlayback(0,6000,1),.5);
 assert.equal(advancePlayback(0,12000,1),1);
 assert.equal(advancePlayback(0,6000,2),1);
 assert.equal(advancePlayback(.8,12000,2),1);
 assert.equal(advancePlayback(.4,-1000,1),.4);
});
