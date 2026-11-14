import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files = await readdir('dist', { recursive: true, withFileTypes: true });
const manifest = files.filter(f => f.isFile() && f.name !== 'sw.js').map(f => '/' + f.parentPath.replaceAll('\\', '/').replace(/^dist\/?/, '') + (f.parentPath === 'dist' ? '' : '/') + f.name).map(s => s.replaceAll('//', '/'));
const fingerprint = createHash('sha256').update(manifest.join('|'));
for (const file of manifest) fingerprint.update(await readFile('dist' + file));
const version = fingerprint.digest('hex').slice(0, 12);
const worker = `const CACHE='ares-${version}';
const FILES=${JSON.stringify(manifest)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ares-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/index.html')));return;}
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});`;
await writeFile('dist/sw.js', worker);
console.log(`Offline shell generated: ${manifest.length} local assets, cache ${version}.`);
