"""Build a small, reproducible NASA observation subset; never synthesize coverage.

Run from mars-explorer-web: python scripts/prepare-environment.py [--download]
Raw NASA files remain in ignored scripts/.cache/environment. Only selected real
records and their provenance enter the client bundle. No cloud writes.
"""
import argparse
import bisect
import concurrent.futures
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import urllib.request
import xml.etree.ElementTree as ET

BASE = 'https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda'
CACHE = Path('scripts/.cache/environment')
NS = {'p': 'http://pds.nasa.gov/pds4/pds/v1'}
R = 3396190
SOLS = [477, 502]


def load_product(sol, kind, download):
    level, sensor = ('calibrated', 'TIRS') if kind == 'CAL' else ('derived', 'ANCILLARY')
    stem = f'WE__{sol:04d}___________{kind}_{sensor}'
    stem += '_' * (43-len(stem)) + 'P01'
    url = f'{BASE}/data_{level}_env/sol_0420_0539/sol_{sol:04d}/{stem}'
    label = CACHE / f'{stem}.xml'
    data = CACHE / f'{stem}.CSV'
    if download and not label.exists():
        label.write_bytes(urllib.request.urlopen(url+'.xml', timeout=120).read())
    root = ET.parse(label).getroot()
    size = int(root.find('.//p:File/p:file_size', NS).text)
    expected = root.find('.//p:File/p:md5_checksum', NS).text
    if download and (not data.exists() or data.stat().st_size != size):
        content = urllib.request.urlopen(url+'.CSV', timeout=180).read()
        if len(content) != size or hashlib.md5(content).hexdigest() != expected:
            raise ValueError(f'Incomplete or invalid NASA download: {stem}')
        data.write_bytes(content)
    content = data.read_bytes()
    assert len(content) == size, f'Incomplete download: {stem}'
    assert hashlib.md5(content).hexdigest() == expected, f'NASA checksum mismatch: {stem}'
    rows = list(csv.DictReader(io.StringIO(content.decode('utf-8-sig'))))
    assert len(rows) == int(root.find('.//p:Table_Delimited/p:records', NS).text)
    return rows, {
        'file': data.name, 'url': url+'.CSV', 'labelUrl': url+'.xml',
        'sha256': hashlib.sha256(content).hexdigest(), 'md5': expected,
        'bytes': size, 'records': len(rows),
        'utcStart': root.find('.//p:Time_Coordinates/p:start_date_time', NS).text,
        'utcEnd': root.find('.//p:Time_Coordinates/p:stop_date_time', NS).text,
    }


def nearest(rows, clocks, clock, max_age=2):
    i = bisect.bisect_left(clocks, clock)
    candidates = [j for j in [i-1, i] if 0 <= j < len(rows)]
    j = min(candidates, key=lambda j: abs(clocks[j]-clock))
    return rows[j] if abs(clocks[j]-clock) <= max_age else None


def number(row, key):
    try:
        value = float(row[key])
        return value if math.isfinite(value) else None
    except (KeyError, ValueError, TypeError):
        return None


def build(download=False):
    CACHE.mkdir(parents=True, exist_ok=True)
    tasks = [(sol, kind) for sol in SOLS for kind in ['CAL', 'DER']]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        loaded = dict(zip(tasks, pool.map(lambda pair: load_product(*pair, download), tasks)))
    places_path = Path('../docs/elevation-validation-sources/best_tactical.csv')
    places_bytes = places_path.read_bytes()
    places = list(csv.DictReader(io.StringIO(places_bytes.decode())))
    observations, days, sources = [], [], []
    for sol in SOLS:
        rows, source = loaded[sol, 'CAL']
        anc, ancillary_source = loaded[sol, 'DER']
        clocks = [float(r['SCLK']) for r in anc]
        assert clocks == sorted(clocks)
        anchor = next(r for r in places if r['frame'] == 'ROVER' and int(r['sol']) == sol)
        anchor_clock = float(anchor['sclk'])
        origin = nearest(anc, clocks, anchor_clock)
        assert origin is not None, 'No time-matched ancillary position for PLACES anchor'
        sources += [source, ancillary_source]
        hourly = {}
        rejected = 0
        for line, row in enumerate(rows, 2):
            k, uncertainty = number(row, 'GROUND_TEMP'), number(row, 'GROUND_TEMP_UNCERTAINTY')
            # Numerical bounds are ingestion sanity checks, not EVA thresholds.
            if k is None or not 0 < k < 500 or uncertainty is None or uncertainty < 0:
                rejected += 1
                continue
            if any(number(row, key) != 1 for key in ['ROVER_STILL', 'ROVER_LOW_TILT', 'TIRS_GROUND_FOOTPRINT_NOT_IN_SHADOW']):
                rejected += 1
                continue
            wheel = number(row, 'WHEEL_OUTSIDE_TIRS_DOWNWARD_LOOKING_FOV')
            if wheel == 0:
                rejected += 1
                continue
            clock = float(row['SCLK'])
            position = nearest(anc, clocks, clock)
            if position is None:
                rejected += 1
                continue
            # MEDA M2020_TOPO: +X north, +Y west. Anchor its relative
            # displacements to the same-sol PLACES geographic rover location.
            north = float(position['ROVER_POSITION_X']) - float(origin['ROVER_POSITION_X'])
            east = -(float(position['ROVER_POSITION_Y']) - float(origin['ROVER_POSITION_Y']))
            lat = float(anchor['planetocentric_latitude']) + north/R*180/math.pi
            lon = float(anchor['longitude']) + east/(R*math.cos(float(anchor['planetocentric_latitude'])*math.pi/180))*180/math.pi
            x = (lon-77.42)*math.pi/180*R*math.cos(18.46*math.pi/180)
            z = -(lat-18.46)*math.pi/180*R
            if abs(x) > 5000 or abs(z) > 5000:
                rejected += 1
                continue
            lmst = row['LMST'].split('M')[1]
            hour, minute, second = map(float, lmst.split(':'))
            distance_to_half_hour = abs(minute*60+second-1800)
            if int(hour) in hourly and hourly[int(hour)][0] <= distance_to_half_hour:
                continue
            flags = {key: number(row, key) for key in row if key not in ['SCLK', 'LMST', 'LTST'] and key not in ['GROUND_TEMP', 'GROUND_TEMP_UNCERTAINTY'] and ('FOV' in key or key in ['ROVER_LOW_TILT', 'TIRS_GROUND_FOOTPRINT_NOT_IN_SHADOW', 'ROVER_HGA_OFF', 'SKYCAM_OFF', 'ROVER_STILL'])}
            record = {
                'id': f'thermal-{sol}-{int(clock)}', 'sol': sol, 'sclk': clock,
                'lmst': lmst, 'ltst': row['LTST'], 'latitude': lat, 'longitude': lon,
                'kelvin': k, 'uncertaintyKelvin': uncertainty, 'flags': flags,
                'sourceFile': source['file'], 'sourceLine': line,
                'positionSclk': float(position['SCLK']),
                'anchorSclk': anchor_clock, 'anchorSite': int(anchor['site']),
                'anchorDrive': int(anchor['drive']),
                'northOffsetMetres': north, 'eastOffsetMetres': east,
                'positionStatus': 'Approximate rover position: same-sol PLACES anchor plus MEDA relative displacement; ground footprint not geolocated.',
                'quality': 'Review required' if any(v is None for v in flags.values()) else 'Selected flags checked',
            }
            hourly[int(hour)] = (distance_to_half_hour, record)
        selected = [entry[1] for _, entry in sorted(hourly.items())]
        assert selected, 'No eligible temperatures'
        observations += selected
        days.append({'sol': sol, 'utcStart': source['utcStart'], 'utcEnd': source['utcEnd'], 'sourceRows': len(rows), 'rejectedRows': rejected, 'selectedReadings': len(selected)})
    result = {
        'version': 1, 'selection': 'Curated historical sols 477 and 502; one actual eligible sample per available LMST hour, nearest half-hour. Not hourly averages, not a complete archive, not latest weather.',
        'variable': 'Ground brightness temperature', 'instrument': 'Perseverance MEDA / TIRS',
        'spatialCoverage': 'Near-rover ground observation only; marker locates the rover, not a resolved sensor footprint. No interpolation across the zone.',
        'positionMethod': 'Same-sol PLACES planetocentric anchor, nearest ancillary timestamp within 2 s; relative north/east offsets from M2020_TOPO. Approximate, not independently registered.',
        'qualityMethod': 'Require finite temperature and uncertainty, stationary rover, low tilt, unshadowed ground, no known wheel obstruction. Unknown flags are retained and disclosed; not certified quality.',
        'placesSource': {'url': 'https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rover_places/data_localizations/best_tactical.csv', 'sha256': hashlib.sha256(places_bytes).hexdigest()},
        'sources': sources, 'days': days, 'observations': observations,
    }
    output = Path('src/data/thermal-observations.json')
    output.write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'file': str(output), 'bytes': output.stat().st_size, 'days': days, 'observations': len(observations)}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--download', action='store_true')
    build(parser.parse_args().download)
