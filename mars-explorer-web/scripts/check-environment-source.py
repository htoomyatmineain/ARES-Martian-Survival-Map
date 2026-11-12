"""Read-only independent check of every bundled temperature against source CSVs."""
import csv
import hashlib
import io
import json
import math
from pathlib import Path

data = json.loads(Path('src/data/thermal-observations.json').read_text())
cache = Path('scripts/.cache/environment')
tables = {}
for source in data['sources']:
    content = (cache/source['file']).read_bytes()
    assert hashlib.sha256(content).hexdigest() == source['sha256']
    tables[source['file']] = list(csv.DictReader(io.StringIO(content.decode())))
max_coordinate_error_m = 0
for reading in data['observations']:
    row = tables[reading['sourceFile']][reading['sourceLine']-2]
    assert float(row['GROUND_TEMP']) == reading['kelvin']
    assert float(row['GROUND_TEMP_UNCERTAINTY']) == reading['uncertaintyKelvin']
    assert float(row['SCLK']) == reading['sclk']
    assert row['LMST'].split('M')[1] == reading['lmst']
    assert row['LTST'] == reading['ltst']
    for key, value in reading['flags'].items():
        assert (float(row[key]) if row[key] else None) == value
    # Independent small-angle geodesic check of retained relative displacements.
    places = list(csv.DictReader(Path('../docs/elevation-validation-sources/best_tactical.csv').open()))
    anchor = next(row for row in places if row['frame'] == 'ROVER' and float(row['sclk']) == reading['anchorSclk'])
    lat0, lon0 = map(math.radians, [float(anchor['planetocentric_latitude']), float(anchor['longitude'])])
    lat1, lon1 = map(math.radians, [reading['latitude'], reading['longitude']])
    dlat, dlon = lat1-lat0, lon1-lon0
    hav = math.sin(dlat/2)**2 + math.cos(lat0)*math.cos(lat1)*math.sin(dlon/2)**2
    distance = 2*3396190*math.asin(math.sqrt(hav))
    reference = math.hypot(reading['northOffsetMetres'], reading['eastOffsetMetres'])
    max_coordinate_error_m = max(max_coordinate_error_m, abs(distance-reference))
assert max_coordinate_error_m < .001
print(json.dumps({'verifiedReadings': len(data['observations']), 'sourceValueMismatches': 0, 'maxLocalDisplacementVsSphericalDistanceMetres': max_coordinate_error_m, 'note': 'Processing agreement only; not independent absolute geolocation accuracy.'}, indent=2))
