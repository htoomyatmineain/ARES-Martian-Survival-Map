import catalog from './data/routing-catalog.json' with {type:'json'};
import type { HazardGrid } from './nativeRouting.ts';
export const ROUTING_CATALOG=catalog;
const sha=async(bytes:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export async function decodeHazards(packed:ArrayBuffer):Promise<HazardGrid>{
  if(packed.byteLength!==catalog.compressedBytes||await sha(packed)!==catalog.compressedSha256)throw Error('Native slope package integrity check failed');
  const bytes=await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if(bytes.byteLength!==catalog.bytes||await sha(bytes)!==catalog.sha256)throw Error('Native slope values failed integrity check');
  const data=new DataView(bytes),values=new Float32Array(bytes.byteLength/4);let valid=0;
  for(let i=0;i<values.length;i+=5){for(let k=0;k<5;k++)values[i+k]=data.getFloat32((i+k)*4,true);if(Number.isFinite(values[i+4])){if(!values.subarray(i,i+5).every(Number.isFinite)||values[i]>values[i+1]||values[i+2]>values[i+3])throw Error('Invalid native gradient bounds');valid++;}else if(!values.subarray(i,i+5).every(Number.isNaN))throw Error('Invalid native missing-data mask');}
  if(valid!==catalog.validCells)throw Error('Native slope coverage check failed');
  return {width:catalog.width,height:catalog.height,spacing:catalog.spacing,size:catalog.size,values};
}
export async function loadNativeHazards(signal:AbortSignal){const r=await fetch('/data/routing/native-hazards.bin',{signal});if(!r.ok)throw Error(`Native slope data unavailable (${r.status})`);const result=await decodeHazards(await r.arrayBuffer());signal.throwIfAborted();return result;}
