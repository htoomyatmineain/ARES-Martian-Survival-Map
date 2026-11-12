import { decodeLosslessElevation } from './losslessElevation.ts';

type Tile = { file: string; sourceWindow: number[]; width: number; height: number; nodata: number | null; sha256: string };
type Product = { sourceOrigin: number[]; sourceResolution: number[]; sourceGeoKeys: Record<string, number | string>; tiles: Tile[] };
export type RegionalPackage = { version: number; status: string; products: { elevation: Product; imagery: Product } };

export function nativePixel(product: Product, latitude: number, longitude: number, kind: 'elevation' | 'imagery') {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90) throw Error('Invalid geographic position');
  const k = product.sourceGeoKeys, radius = Number(k.GeogSemiMajorAxisGeoKey), d = Math.PI / 180;
  if (!Number.isFinite(radius) || radius <= 0) throw Error('Invalid Mars radius');
  const lat = latitude * d, lon = longitude * d;
  let x: number, y: number;
  if (kind === 'elevation') {
    if (Number(k.ProjCoordTransGeoKey) !== 17 || Number(k.ProjStdParallel1GeoKey) !== 0 || Number(k.ProjCenterLongGeoKey) !== 0) throw Error('Unsupported elevation projection');
    x = radius * lon; y = radius * lat;
  } else {
    if (Number(k.ProjCoordTransGeoKey) !== 21) throw Error('Unsupported imagery projection');
    const lat0 = Number(k.ProjCenterLatGeoKey) * d, dl = lon - Number(k.ProjCenterLongGeoKey) * d;
    if (Math.sin(lat0) * Math.sin(lat) + Math.cos(lat0) * Math.cos(lat) * Math.cos(dl) < 0) return null;
    x = radius * Math.cos(lat) * Math.sin(dl);
    y = radius * (Math.cos(lat0) * Math.sin(lat) - Math.sin(lat0) * Math.cos(lat) * Math.cos(dl));
  }
  return {
    col: Math.floor((x - product.sourceOrigin[0]) / product.sourceResolution[0]),
    row: Math.floor((y - product.sourceOrigin[1]) / product.sourceResolution[1]),
  };
}

// Reads numeric high-resolution samples only when requested. Not a safety/routing model.
export class RegionalTileStore {
  private cache = new Map<string, Float32Array>();
  private cacheBytes = 0;
  private baseUrl: string;
  private manifest: RegionalPackage;
  private fetcher: typeof fetch;
  private maxCacheBytes: number;
  constructor(baseUrl: string, manifest: RegionalPackage, fetcher: typeof fetch = fetch, maxCacheBytes = 64 * 1024 * 1024) {
    this.baseUrl = baseUrl; this.manifest = manifest; this.fetcher = fetcher.bind(globalThis); this.maxCacheBytes = maxCacheBytes;
    if (manifest.version !== 1 || manifest.status !== 'complete') throw Error('Unsupported or incomplete map package');
    if (!Number.isFinite(maxCacheBytes) || maxCacheBytes < 0) throw Error('Invalid tile cache budget');
  }
  private url(file: string) {
    if (!/^[a-zA-Z0-9._-]+$/.test(file)) throw Error('Invalid tile filename');
    return `${this.baseUrl.replace(/\/$/, '')}/${file}`;
  }
  imageryAt(latitude: number, longitude: number) {
    const p = this.manifest.products.imagery, point = nativePixel(p, latitude, longitude, 'imagery');
    if (!point) return null;
    const tile = p.tiles.find(t => point.col >= t.sourceWindow[0] && point.col < t.sourceWindow[2] && point.row >= t.sourceWindow[1] && point.row < t.sourceWindow[3]);
    return tile ? { url: this.url(tile.file), tile, pixel: { x: point.col - tile.sourceWindow[0], y: point.row - tile.sourceWindow[1] } } : null;
  }
  async elevationAt(latitude: number, longitude: number, signal?: AbortSignal) {
    signal?.throwIfAborted();
    const p = this.manifest.products.elevation, point = nativePixel(p, latitude, longitude, 'elevation');
    if (!point) return null;
    const tile = p.tiles.find(t => point.col >= t.sourceWindow[0] && point.col < t.sourceWindow[2] && point.row >= t.sourceWindow[1] && point.row < t.sourceWindow[3]);
    if (!tile) return null;
    let values = this.cache.get(tile.file);
    if (values) { this.cache.delete(tile.file); this.cache.set(tile.file, values); }
    else {
      const response = await this.fetcher(this.url(tile.file), { signal });
      if (!response.ok) throw Error(`Elevation tile request failed (${response.status})`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      if (hash !== tile.sha256) throw Error('Elevation tile integrity check failed');
      values = await decodeLosslessElevation(bytes, tile.width, tile.height);
      signal?.throwIfAborted();
      while (this.cache.size && this.cacheBytes + values.byteLength > this.maxCacheBytes) {
        const oldest = this.cache.keys().next().value!;
        this.cacheBytes -= this.cache.get(oldest)!.byteLength; this.cache.delete(oldest);
      }
      if (values.byteLength <= this.maxCacheBytes) {
        const existing = this.cache.get(tile.file);
        if (existing) this.cacheBytes -= existing.byteLength;
        this.cache.set(tile.file, values); this.cacheBytes += values.byteLength;
      }
    }
    const value = values[(point.row - tile.sourceWindow[1]) * tile.width + point.col - tile.sourceWindow[0]];
    return Number.isFinite(value) && value !== tile.nodata ? value : null;
  }
}
