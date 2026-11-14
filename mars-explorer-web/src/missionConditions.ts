// NASA RAD historical reference; not a Jezero measurement or safety threshold.
export const RADIATION_RATE=0.67;
export const RADIATION_SOURCE='https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/';
export const SITE_SOURCE='https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf';
export const RADIATION_LABEL='Estimate from Curiosity RAD at Gale Crater, August 2012–June 2013. Not measured at Jezero. No solar-event or suit/habitat shielding model. Not a forecast or a clearance.';
export const SITE_LABEL='Historical estimated rover-ambient conditions at sample sealing, July–August 2022. MEDA values may be estimated from nearby sols; temperature uses low-mounted atmospheric sensors, not ground temperature. Not current conditions or a forecast.';
const records=[
 {siteId:'skinner-ridge-skyland',sample:'Swift Run',sampleId:'M2020-490-11',pressurePa:817,temperatureK:208,sol:490,lmst:'21:23'},
 {siteId:'skinner-ridge-skyland',sample:'Skyland',sampleId:'M2020-495-12',pressurePa:808,temperatureK:210,sol:495,lmst:'21:22'},
 {siteId:'wildcat-ridge-hazeltop',sample:'Hazeltop',sampleId:'M2020-509-14',pressurePa:800,temperatureK:212,sol:509,lmst:'20:57'},
 {siteId:'wildcat-ridge-hazeltop',sample:'Bearwallow',sampleId:'M2020-516-15',pressurePa:797,temperatureK:214,sol:516,lmst:'20:27'},
];
export function doseFromMinutes(minutes:number){return Number.isFinite(minutes)&&minutes>=0?RADIATION_RATE*minutes/1440:null;}
export function siteReadings(targetId:string){return records.filter(r=>r.siteId===targetId||r.sampleId===targetId).map(r=>({...r,temperatureC:r.temperatureK-273.15,source:SITE_SOURCE}));}
export function missionConditions(targetId:string,plannedMinutes:number,budgetMinutes:number){return {radiation:{rateMsvPerDay:RADIATION_RATE,plannedMinutes,estimatedDoseMsv:doseFromMinutes(plannedMinutes),budgetDoseMsv:doseFromMinutes(budgetMinutes),label:RADIATION_LABEL,source:RADIATION_SOURCE},siteReadings:siteReadings(targetId),siteReadingsLabel:SITE_LABEL};}
