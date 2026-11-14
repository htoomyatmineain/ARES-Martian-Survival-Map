import {MAP_SCIENCE_SITES} from './scienceSites.ts';
export const DEPARTURE_CHECKS=[
 {id:'equipment',label:'Suit, tools and simulated supply budgets reviewed'},
 {id:'comms',label:'Simulated local habitat radio check acknowledged'},
 {id:'return',label:'Return corridor, reserve and rover-failure option reviewed'},
 {id:'conditions',label:'Weather, radiation, lighting and ground hazards are unverified; demonstration only'},
 {id:'access',label:'Reported target position and any unresolved final access reviewed'},
] as const;
export function missionProcedure(targetId:string){
 const site=MAP_SCIENCE_SITES.find(s=>s.id===targetId),name=site?.name.replace(' (provisional)','')??'Custom observation point';
 const wildcat=targetId.includes('wildcat'),skinner=targetId.includes('skinner');
 return {label:'TEAM-PROPOSED PROCEDURE · SIMULATED',siteId:targetId,name,
 objective:wildcat?'Document sedimentary layers and context around the Wildcat Ridge sampling outcrop; record interpretations without claiming evidence of life.':skinner?'Document exposed layering and context around the Skinner Ridge sampling outcrop; compare field observations with the historical sample record.':`Document visible terrain and geological context at ${name}; compare with the reported historical record where available.`,
 historicalContext:site?`${site.sample} / ${site.designation}. ${site.geology}`:'No historical sample association; crew-defined documentation activity.',
 tools:['Suit camera','Digital field notebook','Location reference / map'],
 samplePolicy:'Documentation only. No drilling, collection, sample mass or laboratory result is simulated. Sampling requires a separately approved procedure.',
 tasks:[{id:'document',label:`Record a context photograph at ${name}`,evidence:'Note an illustrative photo reference and viewing direction; no automatic image capture.'},{id:'observe',label:wildcat||skinner?'Describe visible layering, textures and surrounding ground':'Describe visible material, textures and surrounding ground',evidence:'Record a short observation and uncertainty; no automatic mineral identification.'},{id:'record',label:`Save the ${site?.sample??'field'} observation record`,evidence:'Enter field notes with the site, tools used and any access limitation.'}],
 operations:'Demo plan: local habitat radio check before departure and at arrival; stop work if communications are lost. Use the verified corridor for return. Rescue capability and sun position are not modelled.'};
}
