# Orbital area overlays — 12 November 2026

## Completed: NASA CRISM spectral-indicator rasters

The regional workspace now supports three selectable area overlays in 2D and 3D,
separate from the retained rover point observations:

| Parameter | Meaning | Source band (1-based) |
|---|---|---:|
| OLINDEX3 | Olivine-sensitive spectral index | 14 |
| D2300 | Clay-related / Fe-Mg-OH-sensitive spectral index | 40 |
| BD2500_2 | Carbonate-sensitive 2.5 µm band depth | 46 |

These are indicators, not confirmed mineral classifications, confidence percentages,
mineral abundance, or mineable-deposit boundaries. Mineral confirmation requires
additional spectral analysis. Negative values are preserved and can reflect
background/spectral variability or noise. No detection threshold is invented.

### Source and processing

NASA PDS MRO CRISM MTRDR product `HRL000040FF_07_SU183J_MTR3`, acquired
2007-01-29T10:48:10.159Z to 2007-01-29T10:50:17.893Z.

[Original product directory](https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/mtrdr/2007/2007_029/hrl000040ff/)

[Parameter definitions](https://pds-geosciences.wustl.edu/missions/mro/crism_summary_parameter_reference.pdf)

Three complete source bands (1,366,820 bytes each) were fetched with verified HTTP
206 byte ranges, avoiding the full 82,009,200-byte summary cube. Local SHA-256 hashes
identify the downloaded ranges; they are not a claim that the entire source-cube
archive checksum was verified.

The ENVI header declares 455 columns, 751 rows, 60 little-endian Float32 BSQ bands,
36 m projected pixel spacing and no-data value 65535. Its equirectangular CRS has
standard parallel 15° and radius 3,394,839.813316312 m. The source label declares
planetocentric latitude and east-positive longitude. This source sphere is **not**
silently replaced with the terrain's radius.

GDAL reads that georeference; PROJ maps the application's geographic positions into
it. Nearest source samples are selected for a 250 × 250 cell-centred local grid,
40 m per cell, spanning the existing 10 × 10 km frame centred at 18.46° N, 77.42° E.
No spatial smoothing or gap filling occurs. All three outputs have 60,931 valid cells
and 1,569 missing cells: **97.4896% valid output-cell coverage** after the relative registration correction described in science-mineral-audit.md.

Colour uses the 2nd–98th percentile of valid regional values for visibility only.
Values beyond the display range remain unchanged for inspection. NaNs are transparent.
The legend explicitly separates colour stretch from confidence and identifies the
historical observation date. Click terrain in either view to inspect a raw pixel;
Enter on the focused 2D map inspects its centre. Destination-picking mode retains
priority over inspection.

Both views use the same raster values and frame. The 3D texture uses nearest filtering,
no mipmaps and the existing terrain geometry, so zoom does not imply finer science
resolution. Opacity works in both views. Relative landmark registration has been checked and corrected; absolute survey accuracy
has not been established. The overlay does not modify route costs.

### Storage and validation

The three static binary files total **750,000 bytes**, hosted with the app, not added
to Supabase. Each file loads only on selection, with byte count, SHA-256 and valid-cell
count checked before rendering. Corruption produces an error, never a fabricated raster.

Independent direct projection equations checked all 187,500 output cells against the
selected original band values: **zero value mismatches, zero missing-mask mismatches**.
This establishes processing agreement, not mineral-identification or absolute-location
accuracy. See `orbital-mineral-validation.json`.

32 automated tests pass, including the new corruption, no-data, raw-value retention,
colour-stretch and pixel-boundary checks. Production build passes. Browser checks
cover raster selection, 2D/3D rendering, opacity controls, legends and pixel inspection.

Reproduce from `mars-explorer-web` with the existing numpy/rasterio/pyproj environment:

```powershell
scripts/.cache/elevation-validation-venv/Scripts/python.exe scripts/prepare-orbital-minerals.py --download
scripts/.cache/elevation-validation-venv/Scripts/python.exe scripts/check-orbital-minerals.py
npm test
npm run build
```

## Pending: orbital thermal raster

Official NASA PDS/ASU THEMIS and ODE metadata identify projected-brightness-temperature
candidate `I00921002PBT` (28 February 2002). The original file host resets HTTP/HTTPS
connections here; the mission browser download also failed. Numeric coverage,
temperature scaling, missing pixels and calibration suitability have not been verified.
No thermal area raster is displayed. Historical MEDA point observations remain available.

The requested original `.IMG` and PDS4 `.xml` label, links and download guidance are in
`mars-explorer-web/source-data/Orbital-THEMIS/README.md`. Once available, validate the
original values and georeference, then package only the zone's temperature pixels.

No push, cloud upload, deployment, routing-SOP implementation, or science-marker
registration change was performed in this step.
