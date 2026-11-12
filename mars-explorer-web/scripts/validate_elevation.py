"""Read-only source/grid checks. GDAL and PROJ do not use the app projection code."""
import csv, datetime, hashlib, json, math, pathlib, re, zlib
import numpy as np
import pyproj
import rasterio
from rasterio.windows import Window

source=pathlib.Path('source-data/Western-Jezero-10km-HiRISE')
package=pathlib.Path('source-data/Western-Jezero-Web-Lossless')
m=json.loads((source/'download-manifest.json').read_text())
p=json.loads((package/'package-manifest.json').read_text())
meta=json.loads((package/p['display']['terrainMeta']).read_text())
grid=np.fromfile(package/p['display']['terrainValues'],dtype='<f4').reshape(meta['height'],meta['width'])
controls=json.loads(pathlib.Path('scripts/.cache/elevation-validation/js-controls.json').read_text())
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'tools':{'numpy':np.__version__,'rasterio':rasterio.__version__,'GDAL':rasterio.__gdal_version__,'pyproj':pyproj.__version__,'PROJ':pyproj.proj_version_str},
        'limits':['Processing fidelity and display resampling error are not absolute terrain accuracy.',
                  'No independent survey/control-point accuracy claim is made.',
                  'No terrain pixels, cloud objects, routing rules or display settings are changed.']}
def digest(path):
    with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
for asset in p['assets']:
    assert digest(package/asset['file'])==asset['sha256'],asset['file']
radius=3396190
label_dir=pathlib.Path('../docs/elevation-validation-sources')
stem='JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40'
isis=(label_dir/(stem+'.lbl')).read_text()
pds=(label_dir/(stem+'_pds3.lbl')).read_text()
for expected in ['LatitudeType         = Planetocentric','LongitudeDirection   = PositiveEast','PixelResolution      = 1.0 <meters/pixel>','EquatorialRadius     = 3396190.0 <meters>','UpperLeftCornerX     = 4577366.0','UpperLeftCornerY     = 1106618.0']:
    assert expected in isis,expected
assert re.search(r'SCALING_FACTOR\s*=\s*1\.0',pds)
assert re.search(r'OFFSET\s*=\s*0\.0',pds)
report['originalLabels']={'sourceIndexUrl':'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/index.html',
  'latitude':'Planetocentric','longitude':'Positive east','radiusMetres':radius,'projection':'Equirectangular, standard parallel 0, central meridian 0','pixelSpacingMetres':1,
  'scalingFactor':1,'offset':0,'files':[{'file':f.name,'sha256':digest(f)} for f in label_dir.iterdir() if f.is_file() and f.name.startswith(stem)],
  'verticalReferenceLimit':'MOLA/DeltaGeoid provenance is named by the source product; the GeoTIFF/VRT has no explicit vertical CRS/model-version definition. PLACES documents MOLA-areoid-relative elevation, but this alone does not establish identical versions or independent accuracy.'}
local=pyproj.CRS.from_proj4(f"+proj=eqc +lat_ts={meta['center']['lat']} +lat_0={meta['center']['lat']} +lon_0={meta['center']['lon']} +R={radius} +units=m +type=crs")
with rasterio.Env(GDAL_CACHEMAX=64000000), rasterio.open(source/'elevation.vrt') as dem, rasterio.open(source/'imagery.vrt') as image:
    dem_crs=pyproj.CRS.from_wkt(dem.crs.to_wkt())
    image_crs=pyproj.CRS.from_wkt(image.crs.to_wkt())
    assert dem_crs.ellipsoid.semi_major_metre==radius
    assert dem_crs.ellipsoid.semi_minor_metre==radius
    assert image_crs.ellipsoid.semi_major_metre==radius
    to_dem=pyproj.Transformer.from_crs(dem_crs.geodetic_crs,dem_crs,always_xy=True)
    to_image=pyproj.Transformer.from_crs(image_crs.geodetic_crs,image_crs,always_xy=True)
    to_local=pyproj.Transformer.from_crs(dem_crs,local,always_xy=True)
    from_local=pyproj.Transformer.from_crs(local,dem_crs,always_xy=True)
    pixel_mismatches={'elevation':0,'imagery':0}
    max_geo_error=0.0
    local_to_geo=pyproj.Transformer.from_crs(local,dem_crs.geodetic_crs,always_xy=True)
    for control in controls:
        lon,lat=local_to_geo.transform(control['point']['x'],-control['point']['z'])
        max_geo_error=max(max_geo_error,abs(lon-control['geo']['lon']),abs(lat-control['geo']['lat']))
        for kind,dataset,transformer in [('elevation',dem,to_dem),('imagery',image,to_image)]:
            x,y=transformer.transform(control['geo']['lon'],control['geo']['lat'])
            row,col=dataset.index(x,y)
            col+=m['products'][kind]['cropWindow'][0];row+=m['products'][kind]['cropWindow'][1]
            expected=control[kind]
            pixel_mismatches[kind]+=int(col!=expected['col'] or row!=expected['row'])
    assert not any(pixel_mismatches.values())
    assert max_geo_error<1e-10
    report['coordinates']={'controls':len(controls),'pixelMismatches':pixel_mismatches,'maxApplicationVsPROJDegrees':max_geo_error,
      'demCRS':dem.crs.to_string(),'demWKT':dem.crs.to_wkt(),'imageryWKT':image.crs.to_wkt(),'demGridSpacing':list(dem.res),'rasterBandUnit':dem.units[0],
      'note':'Band unit is absent in local VRT; metre units require the published product metadata.'}
    originals={t['file']:t for t in m['products']['elevation']['tiles']}
    exact_samples=0
    for entry in p['products']['elevation']['tiles']:
        original=originals[entry['sourceFile']]
        assert digest(source/original['file'])==original['sha256']
        assert digest(package/entry['file'])==entry['sha256']
        with rasterio.open(source/original['file']) as tile:
            data=tile.read(1)
            inflated=zlib.decompress((package/entry['file']).read_bytes())
            decoded=np.frombuffer(inflated,dtype=np.uint8).reshape(4,-1).T.copy().view('<f4').reshape(data.shape)
            assert np.array_equal(data.view(np.uint32),decoded.view(np.uint32)),original['file']
            exact_samples+=data.size
        print('Exact native samples verified:',original['file'],flush=True)
    report['losslessSource']={'tiles':len(originals),'samples':exact_samples,'mismatches':0}
    # Test all display nodes against source pixels using PROJ and GDAL, independently.
    node_mismatches=0;mask_mismatches=0;node_count=0
    xs=np.linspace(-meta['size']/2,meta['size']/2,meta['width'])
    zs=np.linspace(-meta['size']/2,meta['size']/2,meta['height'])
    for start in range(0,meta['height'],32):
        stop=min(meta['height'],start+32)
        xx,yy=from_local.transform(np.broadcast_to(xs,(stop-start,len(xs))).copy(),np.broadcast_to(-zs[start:stop,None],(stop-start,len(xs))).copy())
        cc=np.floor((xx-dem.transform.c)/dem.transform.a).astype(int)
        rr=np.floor((yy-dem.transform.f)/dem.transform.e).astype(int)
        assert cc.min()>=0 and cc.max()<dem.width and rr.min()>=0 and rr.max()<dem.height
        top,bottom=rr.min(),rr.max()+1
        values=dem.read(1,window=Window(0,int(top),dem.width,int(bottom-top)))[rr-top,cc]
        valid=np.isfinite(values)&(values!=dem.nodata)
        actual=grid[start:stop]
        mask_mismatches+=int(np.count_nonzero(valid!=np.isfinite(actual)))
        node_mismatches+=int(np.count_nonzero(valid&(values!=actual)))
        node_count+=actual.size
    assert node_mismatches==0 and mask_mismatches==0
    report['displayNodes']={'nodes':node_count,'heightMismatches':node_mismatches,'missingMaskMismatches':mask_mismatches}
    reference=label_dir/'best_tactical.csv'
    with reference.open(newline='') as stream:external=list(csv.DictReader(stream))
    controls_external=[];outside=0;invalid=0
    for point in external:
        if point['frame']!='ROVER':continue
        lat=float(point['planetocentric_latitude']);lon=float(point['longitude']);reported=float(point['elevation'])
        east,north=pyproj.Transformer.from_crs(dem_crs.geodetic_crs,local,always_xy=True).transform(lon,lat)
        if not(-5000<=east<=5000 and -5000<=north<=5000):outside+=1;continue
        x,y=to_dem.transform(lon,lat)
        value=float(next(dem.sample([(x,y)]))[0])
        if not math.isfinite(value) or value==dem.nodata or reported==-9999:invalid+=1;continue
        controls_external.append({'site':int(point['site']),'drive':int(point['drive']),'sol':int(point['sol']),
          'latitude':lat,'longitude':lon,'reportedElevation':reported,'nativeElevation':value,'nativeMinusReferenceMetres':value-reported})
    differences=np.array([v['nativeMinusReferenceMetres'] for v in controls_external])
    report['externalConsistency']={'sourceUrl':'https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rover_places/data_localizations/best_tactical.csv',
      'sourceSha256':digest(reference),'allRows':len(external),'roverRowsOutsideZone':outside,'invalidInsideZone':invalid,'comparedRoverRows':len(controls_external),
      'meanNativeMinusReferenceMetres':float(differences.mean()),'medianNativeMinusReferenceMetres':float(np.median(differences)),
      'rmseMetres':float(np.sqrt(np.mean(differences**2))),'p95AbsoluteDifferenceMetres':float(np.quantile(np.abs(differences),.95)),
      'maxAbsoluteDifferenceMetres':float(np.abs(differences).max()),
      'interpretation':'External archive consistency only. Rover localizations reference orbital DEMs and their origins are virtual ground points; these are not independent surveyed terrain heights. No fit/shift or accuracy pass threshold was applied.',
      'worstRows':sorted(controls_external,key=lambda v:abs(v['nativeMinusReferenceMetres']),reverse=True)[:5]}
    # Compare every native pixel centre inside the selected zone with the current
    # bilinear 10 m application sampler. These are display differences, not DEM errors.
    source_x=dem.transform.c+(np.arange(dem.width)+.5)*dem.transform.a
    source_y=dem.transform.f+(np.arange(dem.height)+.5)*dem.transform.e
    local_x=to_local.transform(source_x,np.full(dem.width,source_y[0]))[0]
    local_z=-to_local.transform(np.full(dem.height,source_x[0]),source_y)[1]
    half=meta['size']/2
    columns=np.where((local_x>=-half)&(local_x<=half))[0]
    rows=np.where((local_z>=-half)&(local_z<=half))[0]
    u=np.clip((local_x[columns]/meta['size']+.5)*(meta['width']-1),0,meta['width']-1.001)
    a=np.floor(u).astype(int);fx=u-a
    hist=np.zeros(1000001,dtype=np.int64);n=0;summed=0.0;squares=0.0;maximum=-1.0;worst=None
    missing_prediction=0;source_missing=0;examined=0
    mesh_hist=np.zeros(1000001,dtype=np.int64);mesh_n=0;mesh_sum=0.0;mesh_squares=0.0;mesh_max=0.0;mesh_unavailable=0
    for start in range(int(rows[0]),int(rows[-1])+1,64):
        stop=min(int(rows[-1])+1,start+64)
        data=dem.read(1,window=Window(int(columns[0]),start,len(columns),stop-start)).astype(np.float64)
        v=np.clip((local_z[start:stop]/meta['size']+.5)*(meta['height']-1),0,meta['height']-1.001)
        b=np.floor(v).astype(int);fy=(v-b)[:,None]
        prediction=(grid[b[:,None],a]*(1-fx)+grid[b[:,None],a+1]*fx)*(1-fy)+(grid[b[:,None]+1,a]*(1-fx)+grid[b[:,None]+1,a+1]*fx)*fy
        ga=grid[b[:,None],a];gb=grid[b[:,None],a+1];gc=grid[b[:,None]+1,a];gd=grid[b[:,None]+1,a+1]
        triangle=np.where(fx+fy<=1,ga*(1-fx-fy)+gb*fx+gc*fy,gb*(1-fy)+gc*(1-fx)+gd*(fx+fy-1))
        good=np.isfinite(data)&(data!=dem.nodata)
        mesh_valid=good&np.isfinite(triangle);mesh_unavailable+=int(np.count_nonzero(good&~np.isfinite(triangle)))
        mesh_error=triangle[mesh_valid]-data[mesh_valid];mesh_abs=np.abs(mesh_error)
        mesh_n+=mesh_error.size;mesh_sum+=float(mesh_error.sum());mesh_squares+=float(np.square(mesh_error).sum());mesh_max=max(mesh_max,float(mesh_abs.max(initial=0)))
        mesh_bins=np.bincount(np.floor(mesh_abs*1000).astype(int));mesh_hist[:len(mesh_bins)]+=mesh_bins
        source_missing+=int(np.count_nonzero(~good));missing_prediction+=int(np.count_nonzero(good&~np.isfinite(prediction)));examined+=data.size
        valid=good&np.isfinite(prediction)
        error=prediction[valid]-data[valid]
        absolute=np.abs(error)
        n+=error.size;summed+=float(error.sum());squares+=float(np.square(error).sum())
        bins=np.bincount(np.floor(absolute*1000).astype(int))
        hist[:len(bins)]+=bins
        if absolute.size and float(absolute.max())>maximum:
            maximum=float(absolute.max());error_field=np.where(valid,np.abs(prediction-data),-1)
            r,c=np.unravel_index(np.argmax(error_field),error_field.shape)
            lon,lat=pyproj.Transformer.from_crs(dem_crs,dem_crs.geodetic_crs,always_xy=True).transform(source_x[columns[c]],source_y[start+r])
            worst={'latitude':lat,'longitude':lon,'localX':float(local_x[columns[c]]),'localZ':float(local_z[start+r]),'nativeHeight':float(data[r,c]),'displayHeight':float(prediction[r,c])}
        if (start-int(rows[0]))%1024==0:print('Native/display rows checked:',stop,'/',int(rows[-1])+1,flush=True)
    cumulative=np.cumsum(hist)
    quantiles={}
    for label,q in [('median',.5),('p95',.95),('p99',.99)]:
        index=int(np.searchsorted(cumulative,math.ceil(n*q)))
        quantiles[label]={'lowerMetres':index/1000,'upperMetres':(index+1)/1000}
    report['displayVsNative']={'method':'Every native source pixel centre in selected zone versus the current 10 m bilinear display sampler; display minus source.',
      'nativePixelCentresExamined':examined,'validComparisons':n,'sourceMissing':source_missing,'sourceValidButDisplayUnavailable':missing_prediction,
      'meanSignedDifferenceMetres':summed/n,'rmseMetres':math.sqrt(squares/n),'absoluteDifferenceQuantiles':quantiles,'maxAbsoluteDifferenceMetres':maximum,'worstPoint':worst}
    mesh_cumulative=np.cumsum(mesh_hist);mesh_quantiles={}
    for label,q in [('median',.5),('p95',.95),('p99',.99)]:
        index=int(np.searchsorted(mesh_cumulative,math.ceil(mesh_n*q)))
        mesh_quantiles[label]={'lowerMetres':index/1000,'upperMetres':(index+1)/1000}
    report['meshVsNative']={'method':'Ideal triangular surface of the 10 m display grid at every native pixel centre; metre units, excluding GPU Float32 rounding.',
      'validComparisons':mesh_n,'sourceValidButMeshUnavailable':mesh_unavailable,'meanSignedDifferenceMetres':mesh_sum/mesh_n,'rmseMetres':math.sqrt(mesh_squares/mesh_n),
      'absoluteDifferenceQuantiles':mesh_quantiles,'maxAbsoluteDifferenceMetres':mesh_max}
report['scope']='Step 2: elevation processing, coordinates and display precision. No step-3 slope/routing-limit certification.'
output=pathlib.Path('../docs/elevation-validation-results.json')
output.write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in report.items() if k!='coordinates'},indent=2))
