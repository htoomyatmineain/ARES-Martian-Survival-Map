"""Plot PDS Skyland and Hazeltop coordinates on the original CTX orthoimage.

Run from the Mars Map project folder:
    py scripts/plot_science_sites.py

Important: PDS latitude convention and vertical datum remain unverified.
Coordinates are provisionally interpreted as planetocentric north/east on
Mars 2000 Sphere (R=3,396,190 m). This is a map-registration check,
NOT a certified geolocation or astronaut-safe route assessment.
"""
from pathlib import Path
from math import radians, sin, cos, asin, sqrt
import sys

import numpy as np
import matplotlib.pyplot as plt
import rasterio
from rasterio.crs import CRS
from rasterio.warp import transform
from rasterio.enums import Resampling
from rasterio.windows import from_bounds, bounds as window_bounds

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "source-data" / "western-jezero" / "ctx-originals"
OUTPUT = ROOT / "docs" / "science-site-map-check.png"

SITES = [
    ("Skinner Ridge / Skyland", 18.458931, 77.40617078, -2520.185, "#ff3939"),
    ("Wildcat Ridge / Hazeltop", 18.45863707, 77.40588851, -2523.0974, "#02c7ff"),
]
MARS_RADIUS_M = 3396190.0
MARS_GEO = CRS.from_proj4(
    "+proj=longlat +a=3396190 +b=3396190 +no_defs +type=crs"
)


def find_image():
    candidates = sorted(DATA.glob("*orthoMosaic*6m*.tif"))
    if not candidates:
        candidates = sorted(DATA.glob("*ortho*6m*.tif"))
    if not candidates:
        raise FileNotFoundError(f"No original 6 m CTX orthoimage found in {DATA}")
    if len(candidates) > 1:
        raise RuntimeError(f"Multiple matching images; choose one explicitly: {candidates}")
    return candidates[0]


def inside(ds, x, y):
    b = ds.bounds
    return b.left <= x < b.right and b.bottom < y <= b.top


def sample(ds, x, y):
    if not inside(ds, x, y):
        return None
    v = next(ds.sample([(x, y)], masked=True))[0]
    if np.ma.is_masked(v):
        return None
    v = float(v)
    if not np.isfinite(v) or (ds.nodata is not None and v == float(ds.nodata)):
        return None
    return v


def distance_m(a, b):
    lat1, lon1, lat2, lon2 = map(radians, (a[1], a[2], b[1], b[2]))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * MARS_RADIUS_M * asin(min(1, sqrt(h)))


def plot_panel(ax, data, extent, sites_xy, title):
    ax.imshow(data, cmap="gray", extent=extent, origin="upper", interpolation="nearest")
    for i, (name, x, y, color) in enumerate(sites_xy):
        ax.scatter(x, y, s=95, c=color, edgecolors="black", linewidths=0.8, zorder=4)
        ax.annotate(name, (x, y), xytext=(8, 14 if i == 0 else -22),
                    textcoords="offset points", color=color, fontsize=8,
                    weight="bold", zorder=5,
                    bbox=dict(facecolor="black", alpha=0.55, edgecolor="none", pad=2))
    ax.plot([s[1] for s in sites_xy], [s[2] for s in sites_xy],
            linestyle="--", color="yellow", linewidth=1, zorder=3)
    ax.set_title(title)
    ax.set_xlabel("CTX projected easting (m)")
    ax.set_ylabel("CTX projected northing (m)")
    ax.set_aspect("equal", adjustable="box")
    ax.ticklabel_format(style="plain", useOffset=False)
    ax.tick_params(axis="x", labelrotation=30, labelsize=8)
    ax.tick_params(axis="y", labelsize=8)


def main():
    image_path = find_image()
    dem_path = DATA / "M20_JezeroCrater_CTXDEM_20m.tif"
    if not dem_path.is_file():
        raise FileNotFoundError(f"Original 20 m DEM missing: {dem_path}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    print("Original CTX imagery:", image_path)
    print("Original CTX DEM:    ", dem_path)
    print("ASSUMPTION: PDS coordinates treated provisionally as Mars planetocentric N/E.")
    print("PDS latitude type and sample elevation vertical datum are NOT verified.\n")

    with rasterio.open(image_path) as img, rasterio.open(dem_path) as dem:
        if img.crs is None or dem.crs is None:
            raise ValueError("Raster CRS missing; cannot georeference sample points")
        print("Imagery native pixel size (m):", img.res)
        print("DEM native pixel size (m):    ", dem.res)
        print("Imagery CRS:", img.crs)
        print("DEM CRS:    ", dem.crs)

        sites_xy = []
        for name, lat, lon, pds_elevation, color in SITES:
            xi, yi = transform(MARS_GEO, img.crs, [lon], [lat])
            xd, yd = transform(MARS_GEO, dem.crs, [lon], [lat])
            xi, yi, xd, yd = xi[0], yi[0], xd[0], yd[0]
            row, col = img.index(xi, yi)
            image_value = sample(img, xi, yi)
            dem_value = sample(dem, xd, yd)
            print(f"\n{name}")
            print(f"  PDS N/E:             {lat:.8f}, {lon:.8f}")
            print(f"  Imagery XY (m):      {xi:.2f}, {yi:.2f}")
            print(f"  Imagery pixel:       row={row}, col={col}")
            print(f"  Imagery valid:       {image_value is not None}")
            print(f"  DEM XY (m):          {xd:.2f}, {yd:.2f}")
            print(f"  DEM valid:           {dem_value is not None}")
            print(f"  PDS elevation (m):   {pds_elevation:.3f}")
            if dem_value is not None:
                print(f"  CTX DEM elevation:   {dem_value:.3f} m")
                print(f"  DEM minus PDS:       {dem_value - pds_elevation:+.3f} m")
                print("  Difference is NOT an accuracy metric until vertical datums match.")
            if image_value is None or dem_value is None:
                print("  WARNING: missing or NoData at site; investigate before proceeding")
            sites_xy.append((name, xi, yi, color))

        print(f"\nPDS site-to-site horizontal distance (Mars sphere): {distance_m(*SITES):.2f} m")
        print("Distance is calculated from coordinates, not a walking-route distance.")

        # Regional panel: use a downsampled preview without altering georeferencing.
        out_h = min(1200, img.height)
        out_w = max(1, round(img.width * out_h / img.height))
        overview = img.read(1, out_shape=(out_h, out_w), resampling=Resampling.average)
        full_extent = (img.bounds.left, img.bounds.right,
                       img.bounds.bottom, img.bounds.top)

        # Local panel: show original 6 m pixels (no invented higher resolution).
        cx = (sites_xy[0][1] + sites_xy[1][1]) / 2
        cy = (sites_xy[0][2] + sites_xy[1][2]) / 2
        half_width_m = 140
        win = from_bounds(cx - half_width_m, cy - half_width_m,
                          cx + half_width_m, cy + half_width_m,
                          transform=img.transform).round_offsets().round_lengths()
        zoom = img.read(1, window=win, boundless=True, fill_value=0)
        left, bottom, right, top = window_bounds(win, img.transform)
        zoom_extent = (left, right, bottom, top)

        fig, axes = plt.subplots(1, 2, figsize=(15, 7), constrained_layout=True)
        plot_panel(axes[0], overview, full_extent, sites_xy, "Original CTX imagery — regional")
        plot_panel(axes[1], zoom, zoom_extent, sites_xy,
                   "Original CTX imagery — local (~280 m), native 6 m pixels")
        fig.suptitle("PDS sample sites on Mars CTX imagery | PROVISIONAL coordinate convention",
                     fontsize=13, weight="bold")
        fig.savefig(OUTPUT, dpi=160)
        plt.close(fig)
        print("\nSUCCESS — preview saved:", OUTPUT)
        print("NEXT: Compare the local landform to PDS Volume 2, Hazeltop Figure 2 (HiRISE map).")
        print("Do not use the oblique Mastcam-Z photo for map georegistration.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
