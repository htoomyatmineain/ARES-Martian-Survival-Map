// Generate application-side controls, then validate with independent GDAL/PROJ.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { toGeo } from '../src/terrain.ts';
import { nativePixel } from '../src/regionalTileStore.ts';
const m=JSON.parse(await readFile('source-data/Western-Jezero-10km-HiRISE/download-manifest.json','utf8'));
const controls=[];
for(let row=0;row<=16;row++)for(let col=0;col<=16;col++){
  const point={x:(col/16-.5)*10000,z:(row/16-.5)*10000},geo=toGeo(point,m.zone.center);
  controls.push({point,geo,elevation:nativePixel(m.products.elevation,geo.lat,geo.lon,'elevation'),imagery:nativePixel(m.products.imagery,geo.lat,geo.lon,'imagery')});
}
await mkdir('scripts/.cache/elevation-validation',{recursive:true});
await writeFile('scripts/.cache/elevation-validation/js-controls.json',JSON.stringify(controls));
const python=process.env.ELEVATION_VALIDATION_PYTHON??'scripts/.cache/elevation-validation-venv/Scripts/python.exe';
const child=spawn(python,['scripts/validate_elevation.py'],{stdio:'inherit'});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
