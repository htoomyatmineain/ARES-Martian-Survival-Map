// Earth-side NASA DONKI catalogue lookups. Context only: never a Mars forecast or clearance.
export type SolarKind='FLR'|'CME'|'SEP';
export type SolarEvent={id:string;time:string;url:string|null;kind:SolarKind;detail?:string};
// Catalogues the lookup queries. Solar flares (FLR) are parsed below but not queried:
// api.nasa.gov/DONKI/FLR answered 404 on 14 November 2026. Add {kind:'FLR',label:'Solar flares'}
// here if NASA restores it.
export const SOLAR_KINDS=[
 {kind:'CME',label:'Coronal mass ejections'},
 {kind:'SEP',label:'Solar energetic particle events'},
] as const;
export const SOLAR_WINDOW_DAYS=30;
// DONKI uses a different identifier and time field for each catalogue.
const FIELDS:Record<SolarKind,{id:string;time:string}>={FLR:{id:'flrID',time:'beginTime'},CME:{id:'activityID',time:'startTime'},SEP:{id:'sepID',time:'eventTime'}};

export function solarWindow(now=new Date(),days=SOLAR_WINDOW_DAYS){
 const end=now.toISOString().slice(0,10),start=new Date(now.getTime()-days*86400000).toISOString().slice(0,10);
 return {start,end};
}
/** A team key from api.nasa.gov if one is configured and well-formed; otherwise NASA's shared DEMO_KEY. */
export function nasaApiKey(value:unknown){
 return typeof value==='string'&&/^[A-Za-z0-9]{10,80}$/.test(value.trim())?value.trim():'DEMO_KEY';
}
export function solarUrl(kind:SolarKind,start:string,end:string,key:string){
 return `https://api.nasa.gov/DONKI/${kind}?startDate=${start}&endDate=${end}&api_key=${encodeURIComponent(key)}`;
}
export function parseSolarEvents(value:unknown,kind:SolarKind='SEP'):SolarEvent[]{
 if(!Array.isArray(value))throw Error('Unexpected NASA response');
 const fields=FIELDS[kind];
 return value.map(row=>{
  if(!row||typeof row!=='object')throw Error('Invalid event record');
  const id=row[fields.id],time=row[fields.time];
  if(typeof id!=='string'||typeof time!=='string'||!Number.isFinite(Date.parse(time)))throw Error('Invalid event record');
  let url:null|string=null;
  try{const u=new URL(row.link);if(u.protocol==='https:'&&(u.hostname==='nasa.gov'||u.hostname.endsWith('.nasa.gov')))url=u.href;}catch{/* no trusted detail link */}
  const event:SolarEvent={id,time,url,kind};
  // Flare class as published (for example M1.2); anything unexpected is left out rather than shown.
  if(kind==='FLR'&&typeof row.classType==='string'&&/^[A-Z]\d{1,2}(\.\d{1,2})?$/.test(row.classType))event.detail=row.classType;
  return event;
 });
}
/** DONKI can answer a window with no records using an empty body rather than an empty list. */
export function parseSolarBody(text:string,kind:SolarKind):SolarEvent[]{
 return text.trim()===''?[]:parseSolarEvents(JSON.parse(text),kind);
}
export function latestSolarEvents(events:SolarEvent[],limit=5){
 return [...events].sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)).slice(0,limit);
}
