import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
export default defineConfig({ plugins: [react(), { name: 'local-nasa-map-review', configureServer(server) {
  server.middlewares.use('/local-map-preview', async (req, res, next) => {
    const file = (req.url ?? '').split('?')[0].slice(1);
    if (!/^[\w.-]+\.(json|bin|webp|deflate)$/.test(file)) return next();
    try {
      const directory = path.resolve('source-data/Western-Jezero-Web-Lossless');
      let bytes: Buffer;
      try { bytes = await readFile(path.join(directory, file)); }
      catch {
        // Keep local development independent of browser cross-origin connectivity.
        const response = await fetch(`https://qcgpyoegjwqfhvzvuhdl.supabase.co/storage/v1/object/public/jezero-map/western-jezero-v1/${file}`, { signal: AbortSignal.timeout(120000) });
        if (!response.ok) { res.statusCode = response.status; res.end('Map asset unavailable'); return; }
        bytes = Buffer.from(await response.arrayBuffer());
        if (file !== 'package-manifest.json') {
          const manifest = JSON.parse(await readFile(path.join(directory, 'package-manifest.json'), 'utf8'));
          const entry = manifest.assets.find((asset: {file: string}) => asset.file === file);
          if (!entry || bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw Error('Map integrity check failed');
        }
        await mkdir(directory, { recursive: true });
        await writeFile(path.join(directory, file), bytes);
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Type', file.endsWith('.json') ? 'application/json' : file.endsWith('.webp') ? 'image/webp' : 'application/octet-stream'); res.end(bytes); } catch { res.statusCode = 404; res.end('Local map preview file not found'); }
  });
} }], build: { rollupOptions: { output: { manualChunks(id) { if (/node_modules\/(three|@react-three|three-stdlib)\//.test(id.replaceAll('\\', '/'))) return 'three'; } } } } });
