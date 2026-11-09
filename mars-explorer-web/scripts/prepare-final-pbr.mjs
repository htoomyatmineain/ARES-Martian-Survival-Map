import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { join } from 'node:path';
const cache='scripts/.cache/photoscan',out='public/assets/mars';
await mkdir(cache,{recursive:true});await mkdir(out,{recursive:true});
async function get(url){for(let k=0;;k++){try{const r=await fetch(url,{headers:{'User-Agent':'MarsExplorer educational visualization'}});if(!r.ok)throw new Error('HTTP '+r.status);return Buffer.from(await r.arrayBuffer());}catch(e){if(k===4)throw e;}}}
const rockId='namaqualand_boulder_02';
const rock=JSON.parse(await get('https://api.polyhaven.com/files/'+rockId));
const ground=JSON.parse(await get('https://api.polyhaven.com/files/dry_ground_rocks'));
const model=rock.gltf['2k'].gltf;
const jobs=[{url:model.url,path:join(cache,rockId+'_2k.gltf')}];
for(const [name,file] of Object.entries(model.include))jobs.push({url:file.url,path:join(cache,name)});
for(const [key,name] of [['Diffuse','soil-photo-color.jpg'],['nor_gl','soil-photo-normal.jpg'],['Rough','soil-photo-rough.jpg'],['Displacement','soil-photo-height.jpg']])jobs.push({url:ground[key]['2k'].jpg.url,path:join(out,name)});
let next=0;
await Promise.all(Array.from({length:3},async()=>{while(next<jobs.length){const j=jobs[next++];await mkdir(join(j.path,'..'),{recursive:true});let existing=false;try{existing=(await readFile(j.path)).length>1000;}catch{}if(!existing)await writeFile(j.path,await get(j.url));console.log('Prepared',j.path);}}));
await writeFile(join(out,'pbr-credits.json'),JSON.stringify({license:'CC0',provider:'Poly Haven',licenseUrl:'https://polyhaven.com/license',assets:[{id:rockId,url:'https://polyhaven.com/a/'+rockId,usage:'Visual rock reconstruction; not a NASA-sampled specimen'},{id:'dry_ground_rocks',url:'https://polyhaven.com/a/dry_ground_rocks',usage:'Near-field PBR surface reconstruction; no modification of observed elevation'}],note:'NASA HiRISE/CTX remain the terrain and orbital data sources. These material-detail assets are not measurements of this Jezero site.'},null,2));
