import sys
import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.warp import transform

mars = CRS.from_proj4(
    "+proj=longlat +a=3396190 +b=3396190 +no_defs"
)

lons = np.linspace(77.331071, 77.508929, 11)
lats = np.linspace(18.375647, 18.544353, 11)

points = [(float(lon), float(lat))
          for lat in lats for lon in lons]

for name, path in [
    ("Imagery", sys.argv[1]),
    ("DEM", sys.argv[2])
]:
    with rasterio.open(path) as ds:
        xs, ys = transform(
            mars, ds.crs,
            [p[0] for p in points],
            [p[1] for p in points]
        )

        valid = 0

        for sample in ds.sample(
            list(zip(xs, ys)), masked=True
        ):
            value = sample[0]
            if np.ma.is_masked(value):
                continue
            if not np.isfinite(value):
                continue
            if ds.nodata is not None and value == ds.nodata:
                continue
            valid += 1

        print(f"{name}: {valid}/121 valid samples")
