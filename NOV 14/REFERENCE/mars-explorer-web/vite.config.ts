import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export default defineConfig({ plugins: [react(), { name: 'local-nasa-map-review', configureServer(server) {
  server.middlewares.use('/local-map-preview', async (req, res, next) => {
    const file = (req.url ?? '').split('?')[0].slice(1);
    if (!/^[\w.-]+\.(json|bin|webp|deflate)$/.test(file)) return next();
    try { const bytes = await readFile(path.resolve('source-data/Western-Jezero-Web-Lossless', file)); res.setHeader('Content-Type', file.endsWith('.json') ? 'application/json' : file.endsWith('.webp') ? 'image/webp' : 'application/octet-stream'); res.end(bytes); } catch { res.statusCode = 404; res.end('Local map preview file not found'); }
  });
} }], build: { rollupOptions: { output: { manualChunks(id) { if (/node_modules\/(three|@react-three|three-stdlib)\//.test(id.replaceAll('\\', '/'))) return 'three'; } } } } });
