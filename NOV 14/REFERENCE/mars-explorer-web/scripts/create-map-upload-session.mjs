// Creates a short-lived, filename-scoped signer. No project secret keys leave Supabase.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes, createHash } from 'node:crypto';
const folder = 'source-data/Western-Jezero-Web-Lossless';
const m = JSON.parse(await readFile(`${folder}/package-manifest.json`, 'utf8'));
const names = [...Object.values(m.products).flatMap(p => p.tiles.map(t => t.file)), ...m.assets.map(t => t.file), 'package-manifest.json'];
const token = randomBytes(32).toString('hex'), digest = createHash('sha256').update(token).digest('hex'), expires = Date.now() + 2 * 60 * 60 * 1000;
await mkdir('scripts/.cache', { recursive: true });
await writeFile('scripts/.cache/map-upload-session.json', JSON.stringify({ token, expires, files: names }));
const content = `import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
const allowed = new Set(${JSON.stringify(names)});
const expected = '${digest}', deadline = ${expires};
Deno.serve(async req => {
 if (req.method !== 'POST' || Date.now() > deadline) return new Response('Unavailable', {status:410});
 const token=req.headers.get('x-upload-session') || '';
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==expected)return new Response('Forbidden',{status:403});
 const body=await req.json();
 if(!Array.isArray(body.files)||body.files.length>130||body.files.some(f=>!allowed.has(f)))return new Response('Invalid filenames',{status:400});
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const bucket='jezero-map', prefix='western-jezero-v1/';
 const existing=await client.storage.getBucket(bucket);
 if(existing.error){ const made=await client.storage.createBucket(bucket,{public:true,fileSizeLimit:12000000,allowedMimeTypes:['image/webp','application/octet-stream','application/json']});if(made.error)return Response.json({error:made.error.message},{status:500}); }
 else if(!existing.data.public)return new Response('Bucket access mismatch',{status:409});
 const urls=[];
 for(const file of body.files){const result=await client.storage.from(bucket).createSignedUploadUrl(prefix+file,{upsert:false});if(result.error)return Response.json({error:result.error.message},{status:500});urls.push({file,url:result.data.signedUrl});}
 return Response.json({urls});
});`;
console.log(JSON.stringify({ project_id: 'qcgpyoegjwqfhvzvuhdl', name: 'map-release-signer', verify_jwt: false, entrypoint_path: 'index.ts', files: [{ name: 'index.ts', content }] }));
