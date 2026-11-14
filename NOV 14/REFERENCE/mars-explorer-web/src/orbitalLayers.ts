import catalog from './data/orbital-layer-catalog.json' with { type: 'json' };
import type { Point } from './terrain.ts';

export const ORBITAL_LAYERS = catalog.datasets;
export const ORBITAL_THERMAL_STATUS = catalog.thermalStatus;
export type OrbitalDataset = (typeof catalog.datasets)[number];
export type OrbitalRaster = { meta: OrbitalDataset; values: Float32Array; rgba: Uint8ClampedArray };
export function orbitalPixels(meta: Pick<OrbitalDataset, 'color' | 'displayMin' | 'displayMax'>, values: Float32Array) {
  const pixels = new Uint8ClampedArray(values.length * 4);
  const high = [1, 3, 5].map(offset => parseInt(meta.color.slice(offset, offset+2), 16));
  const low = [25, 31, 40];
  for (let i=0; i<values.length; i++) {
    if (!Number.isFinite(values[i])) continue;
    const fraction = Math.max(0, Math.min(1, (values[i]-meta.displayMin)/(meta.displayMax-meta.displayMin)));
    pixels.set([...low.map((value, channel) => Math.round(value+(high[channel]-value)*fraction)),255],i*4);
  }
  return pixels;
}
export function orbitalSample(raster: OrbitalRaster, point: Point) {
  const {width,height,sizeMetres} = raster.meta;
  if (point.x < -sizeMetres/2 || point.x >= sizeMetres/2 || point.z < -sizeMetres/2 || point.z >= sizeMetres/2) return null;
  const col = Math.floor((point.x/sizeMetres+.5)*width), row = Math.floor((point.z/sizeMetres+.5)*height);
  const value = raster.values[row*width+col];
  return Number.isFinite(value) ? value : null;
}
export async function decodeOrbitalRaster(meta: OrbitalDataset, bytes: ArrayBuffer): Promise<OrbitalRaster> {
  if (bytes.byteLength !== meta.width*meta.height*4 || bytes.byteLength !== meta.bytes) throw Error('Orbital raster size does not match its release metadata.');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2,'0')).join('');
  if (hash !== meta.sha256) throw Error('Orbital raster checksum failed. No replacement data was generated.');
  const view = new DataView(bytes), values = new Float32Array(meta.width*meta.height);
  let valid = 0;
  for (let i=0;i<values.length;i++) { values[i] = view.getFloat32(i*4,true); if (Number.isFinite(values[i])) valid++; else if (!Number.isNaN(values[i])) throw Error('Invalid orbital sample.'); }
  if (valid !== meta.validPixels) throw Error('Orbital coverage mask does not match its release metadata.');
  return {meta,values,rgba:orbitalPixels(meta,values)};
}
export async function loadOrbitalRaster(meta: OrbitalDataset, signal: AbortSignal) {
  const response = await fetch(meta.url,{signal});
  if (!response.ok) throw Error(`Orbital raster unavailable (HTTP ${response.status}).`);
  return decodeOrbitalRaster(meta,await response.arrayBuffer());
}
