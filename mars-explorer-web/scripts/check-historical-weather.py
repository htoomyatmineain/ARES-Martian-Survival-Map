"""Independent source-row audit; run after prepare-historical-weather.py."""
import csv
import hashlib
import json
from pathlib import Path

data = json.loads(Path('src/data/historical-weather.json').read_text())
thermal = json.loads(Path('src/data/thermal-observations.json').read_text())
targets = {r['id']: r for r in thermal['observations']}
cache = Path('scripts/.cache/environment')
rows = {}
for source in data['sources']:
    raw = (cache / source['file']).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == source['sha256']
    assert hashlib.md5(raw).hexdigest() == source['md5']
    assert len(raw) == source['bytes']
    rows[source['file']] = list(csv.DictReader(raw.decode('utf-8-sig').splitlines()))
    assert len(rows[source['file']]) == source['records']
assert len(data['observations']) == len(targets) == 43
assert len({r['thermalId'] for r in data['observations']}) == 43
counts = {'air': 0, 'pressure': 0}
for record in data['observations']:
    target = targets[record['thermalId']]
    assert record['sol'] == target['sol'] and record['referenceSclk'] == target['sclk']
    assert record['wind']['metresPerSecond'] is None and not record['wind']['available']
    for kind in counts:
        sample = record[kind]['sample']
        if sample is None:
            assert not record[kind]['available']
            source = next(s for s in data['sources'] if f"{record['sol']:04d}" in s['file'] and ('ATS' if kind == 'air' else 'DER_PS') in s['file'])
            assert min(abs(float(r['SCLK']) - target['sclk']) for r in rows[source['file']]) > 30
            continue
        original = rows[sample['sourceFile']][sample['sourceLine'] - 2]
        assert float(original['SCLK']) == sample['sclk']
        assert original['LMST'] == sample['lmst'] and original['LTST'] == sample['ltst']
        assert sample['qualityFlags'] is None
        assert abs(sample['offsetSeconds']) <= 30
        assert sample['offsetSeconds'] == sample['sclk'] - target['sclk']
        assert abs(sample['offsetSeconds']) == min(abs(float(r['SCLK']) - target['sclk']) for r in rows[sample['sourceFile']])
        if sample['position']:
            assert abs(sample['position']['positionOffsetSeconds']) <= 2
        if kind == 'air':
            for detector in sample['detectors']:
                assert detector['kelvin'] == float(original[detector['sourceField']])
            assert sample['uncertaintyKelvin'] is None
        else:
            assert sample['pascal'] == float(original['PRESSURE'])
        counts[kind] += int(record[kind]['available'])
assert counts == {'air': 43, 'pressure': 42}
print(json.dumps({'result': 'PASS', 'matchedRecords': 43, 'available': counts, 'wind': 'Unavailable', 'checks': 'Source hashes, every exported value, nearest source clocks, missing sample, source times, unknown flags, ancillary time offsets'}, indent=2))
