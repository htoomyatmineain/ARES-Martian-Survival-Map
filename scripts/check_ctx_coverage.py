import sys
import rasterio
from rasterio.crs import CRS
from rasterio.warp import transform_bounds

mars = CRS.from_proj4("+proj=longlat +a=3396190 +b=3396190 +no_defs")

region = (77.331071, 18.375647, 77.508929, 18.544353)

for name, path in [("Imagery", sys.argv[1]), ("DEM", sys.argv[2])]:
    with rasterio.open(path) as ds:
        left, bottom, right, top = transform_bounds(
            mars, ds.crs, *region
        )
        bounds = ds.bounds

        covered = (
            bounds.left <= left
            and bounds.bottom <= bottom
            and bounds.right >= right
            and bounds.top >= top
        )

        print(name, "covers study region:", covered)
