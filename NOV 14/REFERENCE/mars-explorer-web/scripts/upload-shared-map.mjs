import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root='source-data/Western-Jezero-Web-Lossless';
const session=JSON.parse(await readFile('scripts/.cache/map-upload-session.json','utf8'));
if(Date.now()>session.expires)throw Error('Upload session expired');
const manifest=JSON.parse(await readFile(`${root}/package-manifest.json`,'utf8'));
const entries=[...Object.values(manifest.products).flatMap(p=>p.tiles),...manifest.assets];
const manifestBytes=await readFile(`${root}/package-manifest.json`);
entries.push({file:'package-manifest.json',bytes:manifestBytes.length,sha256:createHash('sha256').update(manifestBytes).digest('hex')});
const publicBase='https://qcgpyoegjwqfhvzvuhdl.supabase.co/storage/v1/object/public/jezero-map/western-jezero-v1';
let signed;
try{signed=JSON.parse(await readFile('scripts/.cache/map-upload-urls.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(!signed){
 const r=await fetch('https://qcgpyoegjwqfhvzvuhdl.supabase.co/functions/v1/map-release-signer',{method:'POST',headers:{'content-type':'application/json','x-upload-session':session.token},body:JSON.stringify({files:session.files}),signal:AbortSignal.timeout(120000)});
 if(!r.ok)throw Error(`Signer failed: ${r.status} ${await r.text()}`);signed=await r.json();await writeFile('scripts/.cache/map-upload-urls.json',JSON.stringify(signed));
}
async function request(url,options={}){
 for(let attempt=0;;attempt++)try{return await fetch(url,{...options,signal:AbortSignal.timeout(180000)});}catch(error){if(attempt>=2)throw error;await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)));}
}
const completed=[];
let previous=[];
try{previous=JSON.parse(await readFile('scripts/.cache/map-upload-progress.json','utf8')).completed;}catch{}
let progressWrite=Promise.resolve();
async function upload(entry){
 const bytes=await readFile(`${root}/${entry.file}`);
 if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error(`Local hash mismatch: ${entry.file}`);
 const url=`${publicBase}/${entry.file}`;
 if(previous.some(p=>p.file===entry.file&&p.sha256===entry.sha256)){completed.push(entry);console.log(`${completed.length}/${entries.length} already remote-verified: ${entry.file}`);return;}
 const head=await request(url,{method:'HEAD'});
 if(!head.ok){
  const target=signed.urls.find(t=>t.file===entry.file);if(!target)throw Error('Missing upload signature');
  const type=entry.file.endsWith('.webp')?'image/webp':entry.file.endsWith('.json')?'application/json':'application/octet-stream';
  const uploaded=await request(target.url,{method:'PUT',headers:{'content-type':type,'cache-control':'max-age=31536000'},body:bytes});
  if(!uploaded.ok&&uploaded.status!==409)throw Error(`Upload failed: ${entry.file} ${uploaded.status} ${await uploaded.text()}`);
 }
 const verification=await request('https://qcgpyoegjwqfhvzvuhdl.supabase.co/functions/v1/map-release-signer',{method:'POST',headers:{'content-type':'application/json','x-upload-session':session.token},body:JSON.stringify({verify:true,files:[entry.file]})});
 if(!verification.ok)throw Error(`Remote verification failed: ${entry.file} ${verification.status}`);
 const verified=await verification.json();
 if(verified.sha256!==entry.sha256||verified.bytes!==entry.bytes)throw Error(`Remote hash mismatch: ${entry.file}`);
 completed.push({file:entry.file,bytes:entry.bytes,sha256:entry.sha256});
 console.log(`${completed.length}/${entries.length} uploaded and remote SHA-256 verified: ${entry.file}`);
 const snapshot=JSON.stringify({baseUrl:publicBase,completed},null,2);
 progressWrite=progressWrite.then(()=>writeFile('scripts/.cache/map-upload-progress.json',snapshot));await progressWrite;
}
let next=0;
await Promise.all(Array.from({length:6},async()=>{while(next<entries.length-1){const entry=entries[next++];await upload(entry);}}));
await upload(entries.at(-1));
await writeFile('src/data/shared-map-release.json',JSON.stringify({version:1,manifestUrl:`${publicBase}/package-manifest.json`,manifestSha256:entries.at(-1).sha256,files:completed.length,bytes:entries.reduce((s,e)=>s+e.bytes,0),verifiedAt:new Date().toISOString()},null,2));
