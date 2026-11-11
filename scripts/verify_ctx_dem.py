
from pathlib import Path
import math
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from rasterio.transform import Affine

root = Path(r"D:\Github project\Mars Map")

dem_path = root / (
    "source-data/western-jezero/ctx-originals/"
    "M20_JezeroCrater_CTXDEM_20m.tif"
)
app_path = root / "public/data/terrain.bin"

size = 501
app = np.fromfile(app_path, dtype="<f4")
assert app.size == size * size, "Unexpected terrain size"
app = app.reshape(size, size)

# Working assumptions from project metadata.
radius = 3396190.0
center_lat = 18.4600
center_lon = 77.4200
standard_parallel = 18.4663
spacing = 20.0

x = radius * math.cos(math.radians(standard_parallel)) * math.radians(center_lon)
y = radius * math.radians(center_lat)

# Assumes app grid is north-up and row-major.
transform = Affine(
    spacing, 0, x - (size * spacing / 2),
    0, -spacing, y + (size * spacing / 2)
)

reference = np.full((size, size), np.nan, dtype="float32")

with rasterio.open(dem_path) as src:
    reproject(
        source=rasterio.band(src, 1),
        destination=reference,
        src_transform=src.transform,
        src_crs=src.crs,
        src_nodata=src.nodata,
        dst_transform=transform,
        dst_crs=src.crs,
        dst_nodata=np.nan,
        resampling=Resampling.bilinear,
    )

print("Original DEM vs App Terrain")
print("Grid:", app.shape)
print("Reference valid cells:", np.isfinite(reference).sum())

for name, terrain in [
    ("As stored", app),
    ("Vertical flip", np.flipud(app)),
    ("Horizontal flip", np.fliplr(app)),
    ("Both flips", np.flipud(np.fliplr(app))),
]:
    valid = np.isfinite(reference) & np.isfinite(terrain)
    if not valid.any():
        print(name, ": No valid comparisons")
        continue

    error = terrain[valid] - reference[valid]
    rmse = np.sqrt(np.mean(error.astype("float64") ** 2))
    mae = np.mean(np.abs(error))

    print(
        f"{name}: count={valid.sum()}, "
        f"RMSE={rmse:.3f} m, "
        f"MAE={mae:.3f} m, "
        f"MaxError={np.max(np.abs(error)):.3f} m"
    )

print("Center reference:", reference[250, 250])
print("Center app:", app[250, 250])
