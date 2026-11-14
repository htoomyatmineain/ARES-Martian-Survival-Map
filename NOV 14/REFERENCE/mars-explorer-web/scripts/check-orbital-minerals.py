"""Independently compare every output cell with source bands and map equations."""
import hashlib
import json
from pathlib import Path
import re
import numpy as np

cache = Path('scripts/.cache/orbital')
catalog = json.loads(Path('src/data/orbital-layer-catalog.json').read_text())
label = (cache/'hrl000040ff_07_su183j_mtr3.lbl').read_text()
header = (cache/'hrl000040ff_07_su183j_mtr3.hdr').read_text()
radius = float(re.search(r'A_AXIS_RADIUS\s*=\s*([\d.]+)',label).group(1))*1000
parallel = float(re.search(r'CENTER_LATITUDE\s*=\s*([\d.]+)',label).group(1))
map_info = re.search(r'map info\s*=\s*\{([^}]+)\}',header).group(1).split(',')
west,north,dx,dy = map(float,map_info[3:7])
reports = []
for meta in catalog['datasets']:
    n = meta['width']
    c,r = np.meshgrid(np.arange(n),np.arange(n))
    a,b,tx = meta['registrationTransform'][0]
    d,e,ty = meta['registrationTransform'][1]
    determinant = a*e-b*d
    sc = (e*(c-tx)-b*(r-ty))/determinant
    sr = (-d*(c-tx)+a*(r-ty))/determinant
    x = -5000+(sc+.5)*meta['spacingMetres']
    z = -5000+(sr+.5)*meta['spacingMetres']
    lat = 18.46-z/3396190*180/np.pi
    lon = 77.42+x/(3396190*np.cos(np.deg2rad(18.46)))*180/np.pi
    # Direct declared equirectangular equations, independent of GDAL/PROJ.
    easting = radius*np.cos(np.deg2rad(parallel))*np.deg2rad(lon)
    northing = radius*np.deg2rad(lat)
    row = np.floor((north-northing)/dy).astype(int)
    col = np.floor((easting-west)/dx).astype(int)
    native_path = cache/f'crism-{meta["parameter"]}.f32'
    source_bytes = native_path.read_bytes()
    assert hashlib.sha256(source_bytes).hexdigest() == meta['sourceRange']['sha256']
    native = np.frombuffer(source_bytes,dtype='<f4').reshape(751,455)
    expected = native[row,col].copy()
    expected[(expected==65535)|~np.isfinite(expected)] = np.nan
    raw = Path('public'+meta['url']).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == meta['sha256']
    actual = np.frombuffer(raw,dtype='<f4').reshape(n,n)
    assert np.array_equal(np.isnan(expected),np.isnan(actual))
    mask = np.isfinite(expected)
    assert np.array_equal(expected[mask].view('u4'),actual[mask].view('u4'))
    assert int(mask.sum()) == meta['validPixels']
    reports.append({'parameter':meta['parameter'],'cellsChecked':n*n,'valid':int(mask.sum()),'missing':int((~mask).sum()),'valueMismatches':0,'maskMismatches':0})
result = {'reports':reports,'method':'Direct source-projection equations versus GDAL/PROJ preparation, all output cells. Processing agreement only; not absolute registration or mineral-identification accuracy.'}
Path('../docs/orbital-mineral-validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
