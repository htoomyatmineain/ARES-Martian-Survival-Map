import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {RegionalTileStore} from '../src/regionalTileStore.ts';
import {decodeHazards} from '../src/loadNativeHazards.ts';
import {planScienceRoute} from '../src/scienceRouting.ts';
import {DEMO_RULES,densify,profileMetrics} from '../src/nativeRouting.ts';
import {fromGeo,toGeo} from '../src/terrain.ts';
const base='https://qcgpyoegjwqfhvzvuhdl.supabase.co/storage/v1/object/public/jezero-map/western-jezero-v1';
const cache='scripts/.cache/science-validation';await mkdir(cache,{recursive:true});
async function get(file){const path=cache+'/'+file;if(existsSync(path)&&file!=='package-manifest.json'){const expected=manifest.products.elevation.tiles.find(t=>t.file===file)?.sha256;if(expected&&createHash('sha256').update(await readFile(path)).digest('hex')!==expected)await (await import('node:fs/promises')).unlink(path);}if(!existsSync(path))execFileSync('curl.exe',['-f','-sS','--retry','2','--retry-all-errors','--max-time','40',base+'/'+file,'-o',path]);return readFile(path);}
const manifest=JSON.parse(await get('package-manifest.json'));
const store=new RegionalTileStore(base,manifest,async url=>new Response(await get(new URL(url).pathname.split('/').at(-1))));
const b=await readFile('public/data/routing/native-hazards.bin'),grid=await decodeHazards(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
const sites=JSON.parse(await readFile('src/data/additional-science-sites.json','utf8'));const records=[];
const previous=existsSync('../docs/science-catalogues/native-profile-validation.json')?JSON.parse(await readFile('../docs/science-catalogues/native-profile-validation.json','utf8')).records:[];
for(const site of sites){
 const done=previous.find(r=>r.siteId===site.id&&r.profileStatus!=='failed');if(done){records.push(done);continue;}
 const result=planScienceRoute(grid,{x:1900,z:1500},fromGeo(site.latitude,site.longitude),DEMO_RULES,false,true),r=result.route;
 let profile=null,error=null;
 if(r)try{const p=densify(r.points,1);profile={...profileMetrics(p,await store.elevationProfile(p.map(x=>toGeo(x)))),samples:p.length};}catch(e){error=e.message;}
 records.push({siteId:site.id,status:!r?'unreachable':r.approach?'approach-only':'exactly-reachable',reason:result.diagnosis?.message??'Exact graph route found.',remainingHorizontalGapMetres:r?r.approach?.gapMetres??0:null,profileStatus:!r?'not-applicable':profile?'verified-current-run':'failed',profile,error,operationalClearance:false});
 console.log(site.id,records.at(-1).status,records.at(-1).profileStatus);
}
await writeFile('../docs/science-catalogues/native-profile-validation.json',JSON.stringify({schemaVersion:1,source:base,rules:DEMO_RULES,start:{x:1900,z:1500},strategy:'slope-priority',exclusion:false,records,limitations:['Computed route consistency under demo rules, not astronaut safety certification.','Source coordinates retain unresolved linkage and absolute placement.','Missing or corrupt tiles fail native profile verification.']},null,2)+'\n');
