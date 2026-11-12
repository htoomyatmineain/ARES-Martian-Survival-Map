import { RegionalTileStore, type RegionalPackage } from './regionalTileStore.ts';
import type { Terrain, TerrainMeta } from './terrain.ts';
export type SharedRegionalMap = { terrain: Terrain; imageryUrl: string; baseUrl: string; manifest: RegionalPackage; store: RegionalTileStore; preview: boolean };
const CLOUD_BASE = 'https://qcgpyoegjwqfhvzvuhdl.supabase.co/storage/v1/object/public/jezero-map/western-jezero-v1';
export async function loadSharedRegional(signal: AbortSignal): Promise<SharedRegionalMap> {
  signal = AbortSignal.any([signal, AbortSignal.timeout(120000)]);
  const preview = location.hostname === '127.0.0.1' && new URLSearchParams(location.search).get('mapSource') === 'preview';
  const baseUrl = preview ? '/local-map-preview' : CLOUD_BASE;
  const response = await fetch(`${baseUrl}/package-manifest.json`, { signal, cache: 'no-store' });
  if (!response.ok) throw Error(`Shared NASA map is unavailable (${response.status}). The cloud upload must be complete.`);
  const manifest = await response.json();
  if (manifest.status !== 'complete' || manifest.version !== 1 || !manifest.display || !Array.isArray(manifest.assets)) throw Error('Shared map manifest failed validation');
  async function verified(file: string) {
    if (!/^[\w.-]+$/.test(file)) throw Error('Invalid map asset filename');
    const entry = manifest.assets.find((a: { file: string }) => a.file === file);
    if (!entry) throw Error('Map asset is not listed');
    const r = await fetch(`${baseUrl}/${file}`, { signal });
    if (!r.ok) throw Error(`Shared map asset failed to load (${r.status})`);
    const bytes = await r.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    if (bytes.byteLength !== entry.bytes || hash !== entry.sha256) throw Error('Shared map integrity check failed');
    return bytes;
  }
  const [metaBytes, grid, imagery] = await Promise.all([verified(manifest.display.terrainMeta), verified(manifest.display.terrainValues), verified(manifest.display.imagery)]);
  const meta = JSON.parse(new TextDecoder().decode(metaBytes)) as TerrainMeta;
  const values = new Float32Array(grid);
  if (values.length !== meta.width * meta.height || meta.width !== 1001 || meta.height !== 1001 || meta.size !== 10000 || values.some(v => v === Infinity || v === -Infinity)) throw Error('Shared terrain dimensions or values are invalid');
  const imageryUrl = URL.createObjectURL(new Blob([imagery], { type: 'image/webp' }));
  return { terrain: { meta, values }, imageryUrl, baseUrl, manifest, store: new RegionalTileStore(baseUrl, manifest), preview };
}
