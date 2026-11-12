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

// Reads hash-verified native elevation tiles on demand; cache is bounded.
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
    const values = await this.valuesFor(tile, signal);
    const value = values[(point.row - tile.sourceWindow[1]) * tile.width + point.col - tile.sourceWindow[0]];
    return Number.isFinite(value) && value !== tile.nodata ? value : null;
  }
  private async valuesFor(tile: Tile, signal?: AbortSignal) {
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
    return values;
  }
  async elevationProfile(positions: {lat:number;lon:number}[], signal?: AbortSignal, onProgress?:(done:number,total:number)=>void) {
    signal?.throwIfAborted();
    const p=this.manifest.products.elevation,k=p.sourceGeoKeys,radius=Number(k.GeogSemiMajorAxisGeoKey);
    const queries=positions.map(g=>{
      const x=(radius*g.lon*Math.PI/180-p.sourceOrigin[0])/p.sourceResolution[0]-.5;
      const y=(radius*g.lat*Math.PI/180-p.sourceOrigin[1])/p.sourceResolution[1]-.5;
      const c=Math.floor(x),r=Math.floor(y),u=x-c,v=y-r;
      return [{col:c,row:r,w:(1-u)*(1-v)},{col:c+1,row:r,w:u*(1-v)},{col:c,row:r+1,w:(1-u)*v},{col:c+1,row:r+1,w:u*v}];
    });
    const sums=new Float64Array(positions.length),missing=new Uint8Array(positions.length);
    const groups=new Map<Tile,{index:number;col:number;row:number;w:number}[]>();
    queries.forEach((q,index)=>q.forEach(query=>{
      const tile=p.tiles.find(t=>query.col>=t.sourceWindow[0]&&query.col<t.sourceWindow[2]&&query.row>=t.sourceWindow[1]&&query.row<t.sourceWindow[3]);
      if(!tile){missing[index]=1;return;}const list=groups.get(tile)??[];list.push({...query,index});groups.set(tile,list);
    }));
    const entries=[...groups];let cursor=0,done=0;
    const consume=async()=>{while(cursor<entries.length){const [tile,queries]=entries[cursor++];signal?.throwIfAborted();const values=await this.valuesFor(tile,signal);for(const q of queries){const value=values[(q.row-tile.sourceWindow[1])*tile.width+q.col-tile.sourceWindow[0]];if(!Number.isFinite(value)||value===tile.nodata)missing[q.index]=1;else sums[q.index]+=value*q.w;}onProgress?.(++done,entries.length);}};
    await Promise.all(Array.from({length:Math.min(3,entries.length)},consume));
    return Array.from(sums,(v,i)=>missing[i]?null:v);
  }

}
