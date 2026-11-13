// Reproduce the bounded catalogue check from saved NASA UI evidence; no raster reprocessing.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const output='../docs/resource-preparation/main-agent/';
const files=['trek-dem-metadata.txt','trek-imagery-catalog.txt','trek-skinner-context.png'];
const evidence=[];
for(const file of files){const bytes=await readFile(output+file);evidence.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const demText=await readFile(output+files[0],'utf8'),imageText=await readFile(output+files[1],'utf8');
const manifest=JSON.parse(await readFile('source-data/Western-Jezero-Web-Lossless/package-manifest.json','utf8'));
const sites=JSON.parse(await readFile('src/data/science-sites.json','utf8'));
const dem='JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40';
const trekImage='JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd';
const appImage='JEZ_hirise_soc_007_orthoMosaic_25cm_Ortho_blend120';
const zone={west:77.33107113608344,south:18.375646975709426,east:77.50892886391657,north:18.544353024290576};
const trekBounds={west:77.2229331,south:18.3067994,east:77.583964,north:18.669315};
const contains=(b,p)=>p.longitude>=b.west&&p.longitude<=b.east&&p.latitude>=b.south&&p.latitude<=b.north;
const checks={
 demIdentity:demText.includes(dem)&&JSON.stringify(manifest).includes(dem+'.tif'),
 imageryIdentityRecorded:imageText.includes(trekImage)&&JSON.stringify(manifest).includes(appImage+'.tif'),
 imageryVersionsDiffer:trekImage!==appImage,
 catalogueBoundsRecorded:Object.values(trekBounds).every(v=>imageText.includes(String(v))),
 zoneInsideCatalogueBounds:contains(trekBounds,{longitude:zone.west,latitude:zone.south})&&contains(trekBounds,{longitude:zone.east,latitude:zone.north}),
 sitesInsideCatalogueBounds:sites.every(p=>contains(trekBounds,p)),
 sitesInsideZone:sites.every(p=>contains(zone,p)),
};
if(Object.values(checks).some(v=>!v))throw Error('Reference evidence or geographic contract differs; review before replacing the recorded result.');
const report={checkedOn:'2026-11-13',method:'Saved NASA Mars Trek UI catalogue/metadata versus local release manifest and site catalogue',dem,trekImage,appImage,zone,trekBounds,checks,evidence,
 limitations:['Bounding-box containment is not valid-pixel coverage. Existing native raster coverage checks remain authoritative for that question.','DEM identity is source consistency, not independent absolute-accuracy validation.','Trek imagery soc_006 and app imagery soc_007 differ in version/projection; they are not claimed pixel-identical.','Context screenshot confirms the regional terrain is rendered, not a numerical landmark residual measurement.','No new numerical landmark offsets or surveyed absolute accuracy were established.']};
await writeFile(output+'trek-reference-results.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(checks,null,2));
