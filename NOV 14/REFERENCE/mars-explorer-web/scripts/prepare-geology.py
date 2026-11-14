"""Prepare original SIM 3464 context geometry; retain producer offset warning.

Run from mars-explorer-web with the existing validation Python environment.
Original archive remains ignored under scripts/.cache/geology. No terrain/routing changes.
"""
from pathlib import Path
import json, math, hashlib, zipfile
import numpy as np
import pyogrio, pyogrio.raw, shapely
from shapely.geometry import box, Polygon, mapping
from shapely.ops import transform, unary_union
from pyproj import CRS, Transformer
import rasterio
from rasterio.windows import Window
import cv2

ROOT=Path('scripts/.cache/geology')
ORIGINAL=ROOT/'original/sim3464_JezeroNili_FINAL'
GDB=ORIGINAL/'Geodatabase/Nili.gdb'
OUT=Path('../docs/geology-validation'); OUT.mkdir(exist_ok=True)
archive=ROOT/'sim3464_database.zip'
archive_hash=hashlib.file_digest(archive.open('rb'),'sha256').hexdigest()
if archive_hash!='a88bd53a5573743cc4a20036c10e585106d08a433ad2f34af269e9cea1529f87':
 raise ValueError('Original USGS archive differs from the reviewed release; reassess it before rebuilding.')
if not GDB.exists():
 with zipfile.ZipFile(archive) as zipped:
  extract_root=(ROOT/'original').resolve()
  for item in zipped.infolist():
   if '/Geodatabase/' in item.filename or '/CoordinateSystems/' in item.filename or item.filename.endswith('Nili_CTX_Mosaic_Beta01_Feb2018_MTM.tif'):
    if not (extract_root/item.filename).resolve().is_relative_to(extract_root):raise ValueError('Unsafe archive path')
    zipped.extract(item,extract_root)
R=3396190.; LAT=18.46; LON=77.42
source=CRS.from_wkt(pyogrio.read_info(GDB,layer='GeoUnits_v1')['crs'])
to_geo=Transformer.from_crs(source,source.geodetic_crs,always_xy=True)
from_geo=Transformer.from_crs(source.geodetic_crs,source,always_xy=True)
def local(x,y,z=None):
 lon,lat=to_geo.transform(x,y)
 return (np.asarray(lon)-LON)*math.pi/180*R*math.cos(math.radians(LAT)), -(np.asarray(lat)-LAT)*math.pi/180*R
def geog(x,z):return LON+np.asarray(x)/R/math.cos(math.radians(LAT))*180/math.pi,LAT-np.asarray(z)/R*180/math.pi
def projected(x,z):return from_geo.transform(*geog(x,z))
boundary=box(-5000,-5000,5000,5000)
source_zone=Polygon([projected(x,z) for x,z in boundary.exterior.coords])
legend=json.loads(Path('../docs/resource-preparation/teammate/geology/units.json').read_text())['units']
legend={u['unitId']:u for u in legend}
features=[];contacts=[];coverage=[];rejected=[]
for layer,kind in [('GeoUnits_v1','units'),('GeoContacts','contacts')]:
 meta,fids,wkbs,fields=pyogrio.raw.read(GDB,layer=layer,bbox=source_zone.bounds,return_fids=True)
 for idx,raw in enumerate(wkbs):
  geom=shapely.from_wkb(raw)
  if not geom.is_valid:raise ValueError(f'Invalid original geometry {layer}/{fids[idx]}')
  # Densify projected edges before the nonlinear geographic/local transformation.
  at=transform(local,shapely.segmentize(geom,100)).intersection(boundary)
  if at.is_empty:continue
  if not at.is_valid:raise ValueError('Invalid clipped geometry')
  props={name:values[idx].item() if hasattr(values[idx],'item') else values[idx] for name,values in zip(meta['fields'],fields)}
  if kind=='units':
   code=str(props['unit']);unit=legend[code]
   polys=[at] if at.geom_type=='Polygon' else [g for g in at.geoms if g.geom_type=='Polygon']
   for part,poly in enumerate(polys):
    features.append({'id':f'{int(fids[idx])}-{part}','sourceFeatureId':int(fids[idx]),'unitId':code,'geometry':mapping(poly)})
    coverage.append(poly)
  else:
   lines=[at] if at.geom_type=='LineString' else [g for g in at.geoms if g.geom_type=='LineString']
   for part,line in enumerate(lines):contacts.append({'id':f'{int(fids[idx])}-{part}','type':props['TYPE'],'coordinates':list(line.coords)})

# Relative image-feature comparisons with the map's own CTX base. No fit/shift is applied to geology.
ctx_file=ORIGINAL/'Rasters/Caltech_CTX_mosaic_feb2018/Nili_CTX_Mosaic_Beta01_Feb2018_MTM.tif'
axis=(np.arange(1000)+.5)*10-5000;xx,zz=np.meshgrid(axis,axis)
px,py=projected(xx,zz)
with rasterio.open(ctx_file) as ds:
 assert CRS(ds.crs)==source
 inv=~ds.transform;col,row=inv*(px,py)
 left,top=int(np.floor(col.min()))-2,int(np.floor(row.min()))-2
 right,bottom=int(np.ceil(col.max()))+2,int(np.ceil(row.max()))+2
 original=ds.read(1,window=Window(left,top,right-left,bottom-top))
 ctx=cv2.remap(original,(col-left-.5).astype('float32'),(row-top-.5).astype('float32'),cv2.INTER_LINEAR)
reference=cv2.imdecode(np.fromfile('source-data/Western-Jezero-Web-Lossless/overview-imagery.webp',dtype=np.uint8),cv2.IMREAD_GRAYSCALE)
reference=cv2.resize(reference,(1000,1000),interpolation=cv2.INTER_AREA)
ctx=ctx.astype('uint8');cv2.imencode('.png',ctx)[1].tofile(str(OUT/'source-ctx-local.png'))
cv2.imencode('.png',reference)[1].tofile(str(OUT/'controlled-hirise-local.png'))
clahe=cv2.createCLAHE(2.,(8,8));a=clahe.apply(ctx);b=clahe.apply(reference)
sift=cv2.SIFT_create(nfeatures=6000);comparisons=[]
for name,left,top in [('northwest',50,50),('centre',300,300),('southeast',550,550)]:
 size=400;k1,d1=sift.detectAndCompute(a[top:top+size,left:left+size],None);k2,d2=sift.detectAndCompute(b[top:top+size,left:left+size],None)
 pairs=[]
 if d1 is not None and d2 is not None:
  for candidates in cv2.BFMatcher().knnMatch(d1,d2,k=2):
   if len(candidates)!=2:continue
   m,n=candidates
   if m.distance<.65*n.distance:
    p=np.array(k1[m.queryIdx].pt);q=np.array(k2[m.trainIdx].pt)
    pairs.append((p,q))
 if len(pairs)<4:raise ValueError('Not enough independent feature candidates in '+name)
 src=np.float32([p for p,q in pairs]);dst=np.float32([q for p,q in pairs]);cv2.setRNGSeed(20261113)
 # RANSAC excludes descriptor mismatches only. Its fitted model is never used to warp the layer.
 model,inliers=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=3.,maxIters=5000,confidence=.99)
 accepted=np.flatnonzero(inliers.ravel()) if inliers is not None else []
 if len(accepted)<8:raise ValueError('Insufficient consistent feature matches in '+name)
 offsets=(dst[accepted]-src[accepted])*10
 controls=[]
 for i in accepted:
  p,q=src[i],dst[i];controls.append({'sourceLocal':[float((p[0]+left+.5)*10-5000),float((p[1]+top+.5)*10-5000)],'referenceLocal':[float((q[0]+left+.5)*10-5000),float((q[1]+top+.5)*10-5000)],'separationMetres':float(np.linalg.norm(q-p)*10)})
 comparisons.append({'region':name,'roiPixels':[left,top,size,size],'candidateMatches':len(pairs),'consistentMatches':len(accepted),'medianSeparationMetres':float(np.median(np.linalg.norm(offsets,axis=1))),'p95SeparationMetres':float(np.percentile(np.linalg.norm(offsets,axis=1),95)),'medianReferenceMinusSourceEastMetres':float(np.median(offsets[:,0])),'medianReferenceMinusSourceSouthMetres':float(np.median(offsets[:,1])),'modelForOutlierRejectionOnly':model.tolist(),'controls':controls})
used=sorted(set(f['unitId'] for f in features));units=[]
for id in used:
 u=legend[id];geom=unary_union([shapely.geometry.shape(f['geometry']) for f in features if f['unitId']==id]);parts=list(geom.geoms) if geom.geom_type=='MultiPolygon' else [geom];largest=max(parts,key=lambda p:p.area);label=largest.representative_point()
 units.append({'id':id,'code':u['code'],'name':u['label'],'description':u['description'],'color':'#'+''.join(f'{int(v):02x}' for v in u['rgba'][:3]),'label':[label.x,label.y],'areaSquareMetres':geom.area})
report={'sourceArchiveUrl':'https://pubs.usgs.gov/sim/3464/sim3464_database.zip','archiveBytes':(ROOT/'sim3464_database.zip').stat().st_size,'archiveSha256':hashlib.file_digest((ROOT/'sim3464_database.zip').open('rb'),'sha256').hexdigest(),'sourceCrsWkt':source.to_wkt(),'sourceCentralMeridian':77.5,'pamphletCentralMeridian':77.3,'crsDecision':'Use the released GDB feature-class CRS, matching its PRJ, raster and readme (77.5 E). The conflicting pamphlet prose remains disclosed; no assertion of publisher correction.','features':len(features),'contacts':len(contacts),'contactTypes':sorted(set(c['type'] for c in contacts)),'coverageFraction':unary_union(coverage).area/1e8,'comparisons':comparisons,'registrationCorrectionApplied':False,'interpretation':'Three spatially separated relative image checks expose offsets; geology is approximate regional context, not precise ground boundaries or trafficability. Comparisons do not establish absolute accuracy.'}
OUT.joinpath('results.json').write_text(json.dumps(report,indent=2)+'\n')
data={'version':1,'coordinateSpace':'local-mars-metres','axes':'x east / z south','size':10000,'center':{'lat':LAT,'lon':LON},'radius':R,'title':'Jezero geology · USGS SIM 3464','sourceUrl':'https://pubs.usgs.gov/sim/3464/','scale':75000,'sourceCrsCentralMeridian':77.5,'notice':'Approximate geological context. Producer reports about 100–200 m offsets from controlled operations imagery; local differences vary. Not a soil-strength, mineral-deposit or routing-safety map.','units':units,'features':features,'contacts':contacts}
Path('public/data/geology').mkdir(exist_ok=True)
payload=json.dumps(data,separators=(',',':'),allow_nan=False).encode();Path('public/data/geology/jezero-sim3464.json').write_bytes(payload)
print(json.dumps({'features':len(features),'units':used,'coverage':report['coverageFraction'],'bytes':len(payload),'checks':[{k:v for k,v in c.items() if k!='controls' and k!='modelForOutlierRejectionOnly'} for c in comparisons]},indent=2))
