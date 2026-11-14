"""Prepare native NASA CRISM spectral indicators on the shared regional frame.

Run with the existing elevation-validation Python environment (numpy/rasterio/
pyproj). Only selected source band byte ranges are downloaded; no classifications
or mineral-confidence percentages are fabricated. Invalid coverage remains NaN.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import urllib.request

import numpy as np
import rasterio
from pyproj import CRS, Transformer

CACHE = Path('scripts/.cache/orbital')
OUT = Path('public/data/orbital')
BASE = 'https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/mtrdr/2007/2007_029/hrl000040ff/'
STEM = 'hrl000040ff_07_su183j_mtr3'
PARAMETERS = [
    ('OLINDEX3', 14, 'Olivine-sensitive index', 'Olivine-sensitive spectral shape; not a confirmed identification or abundance.', '#e6bd64'),
    ('D2300', 40, 'Clay-related spectral index', '2.3 µm absorption structure associated with Fe/Mg-OH-bearing materials; not a confirmed clay classification.', '#79bdab'),
    ('BD2500_2', 46, 'Carbonate-sensitive band depth', 'Carbonate-sensitive 2.5 µm absorption indicator; spectra and additional bands are needed to confirm a mineral.', '#c2afe9'),
]


def fetch(download):
    CACHE.mkdir(parents=True, exist_ok=True)
    for suffix in ['hdr', 'lbl', 'xml']:
        path = CACHE/f'{STEM}.{suffix}'
        if download and not path.exists():
            path.write_bytes(urllib.request.urlopen(BASE+path.name, timeout=90).read())
    header = (CACHE/f'{STEM}.hdr').read_text()
    width = int(re.search(r'samples\s*=\s*(\d+)', header).group(1))
    height = int(re.search(r'lines\s*=\s*(\d+)', header).group(1))
    assert 'interleave = bsq' in header and 'byte order = 0' in header
    band_size = width*height*4
    def get(parameter):
        name, band, *_ = parameter
        path = CACHE/f'crism-{name}.f32'
        start, end = (band-1)*band_size, band*band_size-1
        if download and not path.exists():
            request = urllib.request.Request(BASE+STEM+'.img', headers={'Range':f'bytes={start}-{end}'})
            with urllib.request.urlopen(request, timeout=120) as response:
                assert response.status == 206
                assert response.headers['Content-Range'].startswith(f'bytes {start}-{end}/')
                content = response.read(band_size+1)
                assert len(content) == band_size
                path.write_bytes(content)
        assert path.stat().st_size == band_size
        return {'parameter':name, 'band':band, 'url':BASE+STEM+'.img', 'start':start, 'end':end, 'bytes':band_size, 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        ranges = list(pool.map(get, PARAMETERS))
    (CACHE/'crism-ranges.json').write_text(json.dumps(ranges, indent=2)+'\n')
    return header, ranges


def build(download=False):
    header, ranges = fetch(download)
    OUT.mkdir(parents=True, exist_ok=True)
    # GDAL interprets the delivered ENVI map information; no Earth CRS is used.
    width = int(re.search(r'samples\s*=\s*(\d+)', header).group(1))
    height = int(re.search(r'lines\s*=\s*(\d+)', header).group(1))
    grid_size, spacing, radius = 250, 40, 3396190
    registration = json.loads(Path('../docs/mineral-registration-results.json').read_text())
    assert registration['accepted']
    reference = Path('source-data/Western-Jezero-Web-Lossless/overview-imagery.webp')
    assert hashlib.sha256(reference.read_bytes()).hexdigest() == registration['referenceSha256']
    matrix = np.asarray(registration['sourceRegionalPixelsToReferencePixels'])
    target_col, target_row = np.meshgrid(np.arange(grid_size), np.arange(grid_size))
    source_pixels = np.linalg.solve(matrix[:,:2], np.stack([target_col.ravel(),target_row.ravel()])-matrix[:,2,None])
    xx = (-5000+(source_pixels[0]+.5)*spacing).reshape(grid_size,grid_size)
    zz = (-5000+(source_pixels[1]+.5)*spacing).reshape(grid_size,grid_size)
    lat = 18.46-zz/radius*180/np.pi
    lon = 77.42+xx/(radius*np.cos(np.deg2rad(18.46)))*180/np.pi
    label = (CACHE/f'{STEM}.lbl').read_text()
    start = re.search(r'^START_TIME\s*=\s*(\S+)', label, re.M).group(1)+'Z'
    end = re.search(r'^STOP_TIME\s*=\s*(\S+)', label, re.M).group(1)+'Z'
    entries = []
    checks = []
    for name, band, title, interpretation, color in PARAMETERS:
        single = re.sub(r'bands\s*=\s*60', 'bands = 1', header)
        single = re.sub(r'default bands\s*=\s*\{[^}]*\}', 'default bands = {1}', single)
        single = re.sub(r'band names\s*=\s*\{[^}]*\}', f'band names = {{{name}}}', single)
        path = CACHE/f'crism-{name}.f32'
        path.with_suffix('.hdr').write_text(single)
        with rasterio.open(path) as source:
            geographic = source.crs.geodetic_crs if hasattr(source.crs, 'geodetic_crs') else CRS.from_wkt(source.crs.to_wkt()).geodetic_crs
            transformer = Transformer.from_crs(geographic, source.crs, always_xy=True)
            east, north = transformer.transform(lon, lat)
            source_rows, source_cols = rasterio.transform.rowcol(source.transform, east.ravel(), north.ravel())
            rows = np.asarray(source_rows).reshape(xx.shape).astype(int)
            cols = np.asarray(source_cols).reshape(xx.shape).astype(int)
            native = source.read(1)
            inside = (rows>=0)&(rows<height)&(cols>=0)&(cols<width)
            values = np.full(xx.shape, np.nan, dtype='<f4')
            values[inside] = native[rows[inside], cols[inside]]
            values[(values==65535)|~np.isfinite(values)] = np.nan
            valid = values[np.isfinite(values)]
            p2, p98 = np.quantile(valid, [.02,.98])
            filename = f'crism-hrl40ff-{name.lower()}.bin'
            raw = values.tobytes()
            (OUT/filename).write_bytes(raw)
            check = []
            for row in range(0,grid_size,16):
                for col in range(0,grid_size,16):
                    check.append({'row':row,'col':col,'latitude':float(lat[row,col]),'longitude':float(lon[row,col]),'sourceRow':int(rows[row,col]),'sourceCol':int(cols[row,col]),'value':float(values[row,col]) if np.isfinite(values[row,col]) else None})
            checks.append({'parameter':name,'controls':check})
            entry = {
                'id':f'crism-{name.lower()}', 'kind':'minerals', 'title':title,
                'parameter':name,'units':'dimensionless index','interpretation':interpretation,
                'url':'/data/orbital/'+filename,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),
                'width':grid_size,'height':grid_size,'spacingMetres':spacing,'sizeMetres':10000,
                'center':{'lat':18.46,'lon':77.42},'sourceProjectedSpacingMetres':36,
                'validPixels':len(valid),'totalPixels':grid_size*grid_size,'coveragePercent':len(valid)/(grid_size*grid_size)*100,
                'min':float(valid.min()),'max':float(valid.max()),'displayMin':float(p2),'displayMax':float(p98),'color':color,
                'stretch':'2nd–98th percentile of valid selected-zone values, for visibility only; not detection thresholds.',
                'observedStart':start,'observedEnd':end,'instrument':'MRO / CRISM',
                'productId':STEM.upper(),'sourceUrl':BASE+STEM+'.img','labelUrl':BASE+STEM+'.lbl',
                'definitionUrl':'https://pds-geosciences.wustl.edu/missions/mro/crism_summary_parameter_reference.pdf',
                'confidence':'No numerical mineral-identification confidence supplied; this is a spectral indicator, not a detection catalogue.',
                'registration':'Locally aligned to HiRISE using infrared image features, checked with visible reflectance and phase correlation. Held-out relative residual: median 22 m, P95 47 m (22 matches). Absolute Mars position accuracy remains unverified.',
                'registrationTransform':registration['sourceRegionalPixelsToReferencePixels'],
                'registrationReferenceSha256':registration['referenceSha256'],
                'sourceCRS':source.crs.to_wkt(), 'sourceTransform':list(source.transform)[:6],
                'sourceWindow':{'width':width,'height':height},'sourceRange':next(item for item in ranges if item['parameter']==name),
                'resampling':'Nearest native pixel at each 40 m output-cell centre; missing pixels remain NaN. No spatial smoothing.',
            }
            entries.append(entry)
    catalog = {'version':1,'datasets':entries,'thermalStatus':'Orbital thermal coverage is not loaded. Historical rover temperatures remain available as point observations.'}
    Path('src/data/orbital-layer-catalog.json').write_text(json.dumps(catalog,indent=2)+'\n',encoding='utf-8')
    (CACHE/'crism-controls.json').write_text(json.dumps(checks,indent=2)+'\n')
    print(json.dumps([{'id':entry['id'],'coveragePercent':entry['coveragePercent'],'bytes':entry['bytes'],'displayRange':[entry['displayMin'],entry['displayMax']]} for entry in entries],indent=2))


if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--download',action='store_true')
    build(parser.parse_args().download)
