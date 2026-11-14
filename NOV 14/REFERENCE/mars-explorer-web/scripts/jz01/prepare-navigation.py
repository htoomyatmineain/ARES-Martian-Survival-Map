"""Copy source DTM samples losslessly to a browser-readable navigation buffer."""
from pathlib import Path
import hashlib
import json
from PIL import Image
import numpy as np

root = Path(__file__).resolve().parents[2]
source = root / 'source-data/JZ01_Codex_Handoff'
out = root / 'public/assets/mars/jz01'
manifest = json.loads((source / 'manifest.json').read_text())
data = source / 'dtm_1m.tif'
assert hashlib.sha256(data.read_bytes()).hexdigest() == manifest['files_sha256'][data.name]
samples = np.asarray(Image.open(data), dtype='<f4')
assert samples.shape == (500, 500) and np.isfinite(samples).all()
out.mkdir(parents=True, exist_ok=True)
(out / 'navigation-heights.bin').write_bytes(samples.tobytes())
(out / 'navigation-source.json').write_text(json.dumps({
    'source': 'dtm_1m.tif', 'source_sha256': manifest['files_sha256'][data.name],
    'width': 500, 'height': 500, 'spacing_m': 1,
    'row_order': 'north to south', 'format': 'little-endian float32 original elevation meters',
    'pixel_center_three_xz_min': [-249.5, -249.5],
    'local_height_offset_m': 2425.92626953125,
    'processing': 'Lossless copy of decoded samples; no resampling or terrain modification'
}, indent=2), encoding='utf-8')
print('Prepared 250000 unchanged DTM samples for navigation.')
