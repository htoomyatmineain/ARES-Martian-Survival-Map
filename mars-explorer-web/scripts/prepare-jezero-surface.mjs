// Fetch only the HiRISE rows/tiles needed for the local field site.
import { fromCustomClient, BaseClient, BaseResponse } from 'geotiff';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
const out = 'public/assets/mars';
await mkdir(out, { recursive: true });
await mkdir('scripts/.cache', { recursive: true });
const R = 3396190, d = Math.PI / 180;
const original = JSON.parse(await readFile('public/data/terrain.json', 'utf8'));
const center = { lat: original.center.lat + 1200 / R / d, lon: original.center.lon - 2200 / (R * Math.cos(original.center.lat * d)) / d };
const heading = 285, angle = heading * d;
const toGeo = (x, z) => {
  const east = x * Math.cos(angle) - z * Math.sin(angle), south = x * Math.sin(angle) + z * Math.cos(angle);
  return { lat: center.lat - south / R / d, lon: center.lon + east / (R * Math.cos(center.lat * d)) / d };
};
const dtmUrl = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif';
const orthoUrl = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_007_orthoMosaic_25cm_Ortho_blend120.tif';
const width = 513, size = 512;
const fetchRetry = async (url, options) => { for (let k = 0; ; k++) { try { const response = await fetch(url, options); if (!response.ok) throw new Error(`HTTP ${response.status}`); return response; } catch (e) { if (k >= 3) throw e; } } };
class BufferedResponse extends BaseResponse {
  constructor(response, data) { super(); this.response=response; this.data=data; }
  get status(){return this.response.status;}
  getHeader(name){return this.response.headers.get(name)||undefined;}
  async getData(){return this.data;}
}
class LimitedClient extends BaseClient {
  constructor(url){super(url);this.active=0;this.queue=[];}
  async request(options){
    if(this.active>=8)await new Promise(resolve=>this.queue.push(resolve));
    this.active++;
    try{const r=await fetchRetry(this.url,options);return new BufferedResponse(r,await r.arrayBuffer());}
    finally{this.active--;this.queue.shift()?.();}
  }
}
const t = await fromCustomClient(new LimitedClient(dtmUrl), { allowFullFile: false }), im = await t.getImage();
const origin = im.getOrigin(), res = im.getResolution();
if (im.fileDirectory.getValue('Compression') !== 1 || im.getTileHeight() !== 1 || im.fileDirectory.getValue('BitsPerSample')[0] !== 32) throw new Error('Unexpected source layout; refusing unsafe byte decoding.');
const pixel = (x, z) => { const g = toGeo(x, z); return [(g.lon * d * R - origin[0]) / res[0] - .5, (g.lat * d * R - origin[1]) / res[1] - .5]; };
const corners = [[-256,-256],[256,-256],[-256,256],[256,256]].map(p => pixel(...p));
const bounds = [Math.floor(Math.min(...corners.map(p => p[0]))) - 1, Math.floor(Math.min(...corners.map(p => p[1]))) - 1, Math.ceil(Math.max(...corners.map(p => p[0]))) + 2, Math.ceil(Math.max(...corners.map(p => p[1]))) + 2];
const rw = bounds[2] - bounds[0], rh = bounds[3] - bounds[1], raw = new Float32Array(rw * rh);
const cacheKey=createHash('sha256').update(JSON.stringify({dtmUrl,bounds})).digest('hex').slice(0,12);
const cacheFile = `scripts/.cache/hirise-dtm-${cacheKey}.bin`;
let cached;
try { cached = await readFile(cacheFile); } catch {}
if (cached?.byteLength === raw.byteLength) raw.set(new Float32Array(cached.buffer, cached.byteOffset, cached.byteLength / 4));
else {
  const offsets = await im.fileDirectory.loadValue('StripOffsets');
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: 12 }, async () => {
    while (next < rh) {
      const row = next++, start = Number(offsets[bounds[1] + row]) + bounds[0] * 4, end = start + rw * 4 - 1;
      const response = await fetchRetry(dtmUrl, { headers: { Range: `bytes=${start}-${end}` } });
      if (response.status !== 206) throw new Error('Server ignored byte range.');
      const data = new DataView(await response.arrayBuffer());
      if (data.byteLength !== rw * 4) throw new Error('Incomplete elevation row.');
      for (let col = 0; col < rw; col++) raw[row * rw + col] = data.getFloat32(col * 4, im.littleEndian);
      if (++done % 100 === 0) console.log(`HiRISE elevation rows ${done}/${rh}`);
    }
  }));
  await writeFile(cacheFile, Buffer.from(raw.buffer));
}
const heights = new Float32Array(width * width);
let min = Infinity, max = -Infinity;
for (let row = 0; row < width; row++) for (let col = 0; col < width; col++) {
  const p = pixel(col - 256, row - 256), u = p[0] - bounds[0], v = p[1] - bounds[1], x = Math.floor(u), y = Math.floor(v), fx = u - x, fy = v - y;
  const s = [raw[y * rw + x], raw[y * rw + x + 1], raw[(y + 1) * rw + x], raw[(y + 1) * rw + x + 1]];
  if (s.some(h => !Number.isFinite(h) || h < -10000 || h > 10000)) throw new Error(`No valid HiRISE coverage at ${col},${row}`);
  const h = (s[0] * (1 - fx) + s[1] * fx) * (1 - fy) + (s[2] * (1 - fx) + s[3] * fx) * fy;
  heights[row * width + col] = h; min = Math.min(min, h); max = Math.max(max, h);
}
await writeFile(`${out}/hirise-heights.bin`, Buffer.from(heights.buffer));
console.log(`HiRISE ground: ${min.toFixed(2)}…${max.toFixed(2)} m`);

// The 007 orthoimage is tiled and orthographic, independently projected from the DTM.
const imageTif = await fromCustomClient(new LimitedClient(orthoUrl), { allowFullFile: false, blockSize: 65536, cacheSize: 800 }), image = await imageTif.getImage();
const io = image.getOrigin(), ir = image.getResolution(), keys = image.getGeoKeys(), lat0 = keys.ProjCenterLatGeoKey * d, lon0 = keys.ProjCenterLongGeoKey * d;
const imagePixel = (x, z) => { const g = toGeo(x,z), lat = g.lat*d, dl = g.lon*d-lon0; const xx = R*Math.cos(lat)*Math.sin(dl), yy = R*(Math.cos(lat0)*Math.sin(lat)-Math.sin(lat0)*Math.cos(lat)*Math.cos(dl)); return [(xx-io[0])/ir[0]-.5,(yy-io[1])/ir[1]-.5]; };
const imageSize = 1024, ic = [[-512,-512],[512,-512],[-512,512],[512,512]].map(p=>imagePixel(...p));
const iw = [Math.floor(Math.min(...ic.map(p=>p[0])))-1, Math.floor(Math.min(...ic.map(p=>p[1])))-1, Math.ceil(Math.max(...ic.map(p=>p[0])))+2, Math.ceil(Math.max(...ic.map(p=>p[1])))+2];
console.log('Fetching tiled HiRISE 25 cm orbital imagery for the field site…');
const samples = await image.readRasters({ window: iw, samples: [0], interleave: true });
const sw = iw[2]-iw[0], n=4096, gray = Buffer.alloc(n*n);
let missing = 0;
for(let row=0;row<n;row++) for(let col=0;col<n;col++) {
  const p=imagePixel(col/(n-1)*imageSize-imageSize/2,row/(n-1)*imageSize-imageSize/2),u=p[0]-iw[0],v=p[1]-iw[1],x=Math.floor(u),y=Math.floor(v),fx=u-x,fy=v-y;
  const h=(samples[y*sw+x]*(1-fx)+samples[y*sw+x+1]*fx)*(1-fy)+(samples[(y+1)*sw+x]*(1-fx)+samples[(y+1)*sw+x+1]*fx)*fy;
  if(!Number.isFinite(h)||h<=0)missing++;
  gray[row*n+col]=Math.max(0,Math.min(255,h));
}
if(missing>n*n*.001)throw new Error(`HiRISE image has ${missing} missing samples; refusing a fabricated fill.`);
await sharp(gray,{raw:{width:n,height:n,channels:1}}).normalize({lower:1,upper:99}).jpeg({quality:92}).toFile(`${out}/hirise-ortho.jpg`);
await writeFile(`${out}/field-site.json`,JSON.stringify({ center, heading, size, width, height:width, min,max, imagerySize:imageSize, imageryPixels:n, dtmUrl,orthoUrl, dtmPostSpacing:1,imageryResolution:.25, referenceCenter:original.center, sourceOffset:{x:-2200,z:-1200}, elevationOrigin:Math.floor(min)-5, credit:'NASA/JPL-Caltech/University of Arizona/USGS', processing:'Real HiRISE stereo elevations and orbital grayscale resampled into a local rotated east/north grid. No sculpted mountains or added elevation. Color is a presentation tint. Rock props and microtexture are reconstructed detail.', retrieved:'2026-11-08', sourceProjection:keys },null,2));
await writeFile('public/data/meda-observation.json', JSON.stringify({ instrument:'MEDA', mission:'Perseverance', observedSols:[43,44],earthDates:['2021-04-03','2021-04-04'],temperatureC:{low:-83,high:-22},windGustMps:10,type:'Historical observation',source:'https://www.nasa.gov/directorates/stmd/nasas-first-weather-report-from-jezero-crater-on-mars/',published:'2021-04-06',note:'Historical readings, not a live feed or current forecast. No ionizing radiation dose measurement is supplied.' },null,2));
console.log('Prepared real HiRISE field-site assets and NASA MEDA observation provenance.');
