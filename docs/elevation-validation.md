# Elevation validation — 2026-11-12

Scope: step 2 only, for the existing 10×10 km Western Jezero regional workspace. This check does not implement or certify slope/routing rules, change the missing-data area, or fix the raised 3D route.

## Result

The stored source values, coordinate transformations and display-grid construction pass the checks performed. Display coarsening is measurable and must remain separate from the native 1 m data used for future terrain analysis. Absolute terrain accuracy is not independently certified.

The detailed machine-readable evidence is `elevation-validation-results.json` beside this file. Original public metadata/reference snapshots are in `elevation-validation-sources/`.

### Reference interpretation

Original NASA/USGS ISIS and PDS3 labels explicitly specify planetocentric latitude, east-positive longitude, a 3,396,190 m Mars sphere, equirectangular projection, zero standard parallel/central meridian, and 1 m native projected pixel spacing. Scaling factor is 1 and numeric offset is 0. These agree with the downloaded GeoTIFFs and app transforms. Earth WGS84 is not substituted.

The USGS product listing identifies elevation units as metres. MOLA/DeltaGeoid provenance is present in the product name. The supplied GeoTIFF/VRT does **not** contain a complete machine-readable vertical CRS/model-version definition. NASA PLACES documents MOLA-areoid-relative heights, but its documentation alone does not prove exact datum-version equivalence with every other Mars product. No guessed vertical shift was applied.

An independent GDAL/Rasterio + PROJ implementation checked 289 positions across the zone. Source pixel selection matched the app for both elevation and imagery, with zero pixel-index mismatches. This establishes correct interpretation of the declared coordinate systems, not independent landmark accuracy.

### Source and display checks

All 20 source elevation TIFF checksums and all compressed elevation checksums match their recorded release entries. GDAL decoded every original sample and independently compared it with the unpacked compressed Float32 data: **105,450,544 samples, zero bit mismatches**.

Every display node was independently transformed back into the original NASA raster and sampled: **1,002,001 nodes, zero height mismatches, zero missing-mask mismatches**. Thus the 10 m grid was constructed as documented, retaining the corresponding source samples without an arbitrary height offset.

### What 10 m display spacing leaves out

Every native pixel centre inside the selected zone was evaluated: 105,420,000 centres. For the bilinear app height sampler, 105,202,420 comparisons have valid source and display heights. Invalid source pixels and unavailable display predictions are counted separately, not included as zeros.

- Mean signed difference, display minus native: −0.00283 m.
- Root mean square difference: 0.19874 m.
- Median absolute difference: 0.068–0.069 m.
- 95th-percentile absolute difference: 0.375–0.376 m.
- 99th-percentile absolute difference: 0.781–0.782 m.
- Largest absolute difference: **6.75797 m**, at approximately 18.44126661° N, 77.40887245° E.

At that location the native sample is −2494.11401 m; the 10 m bilinear display estimate is −2500.87198 m. This is a difference introduced by the coarser viewing surface, not corruption of the retained native data and not a comparison against surveyed ground truth.

The ideal triangular 3D display mesh was also compared separately: RMS difference 0.20247 m, 95th-percentile absolute difference 0.382–0.383 m, and maximum absolute difference 6.70284 m. GPU Float32 rounding is excluded from this comparison; the separate step-1 geometry check found sampled vertical rounding below 0.001 m.

The bilinear sampler has 5,677 native-valid pixel centres where the display interpolation is unavailable near missing data. The triangular mesh has 5,354 such centres. These remain unavailable; this check does not fill them.

### External archive consistency

The NASA PDS PLACES `best_tactical.csv` snapshot contains 666 records. Of its rover records, 311 fall inside the selected zone and have valid raster samples; 267 are outside. SITE-frame rows are not mixed into the rover-height comparison.

For native DEM height minus the reported rover elevation:

- Mean difference: −0.00075 m.
- Median difference: −0.00105 m.
- RMS difference: 0.04748 m.
- 95th-percentile absolute difference: 0.09405 m.
- Largest absolute difference: 0.42157 m.

This is strong archive consistency, **not a 5 cm absolute-accuracy claim**. PLACES positions reference orbital maps; rover origins are virtual ground points and localization solutions can be updated. The controls therefore share dependencies with the terrain rather than supplying independent survey ground truth. No registration fit or accuracy acceptance threshold was applied to make these values smaller.

## Decision for the next step

The native dataset can proceed to step-3 slope validation as the measured source. Keep the 10 m mesh as a display product. Calculate fine terrain/slope/route costs from the retained native data and explicitly handle missing samples and uncertainty. The current 100 m routing grid and its demonstration limits are not validated by this elevation audit.

Independent survey/control evidence would be required for a stronger absolute-accuracy claim. The producer's metadata also cautions about quality issues in the far-western crater-rim component; no uniform fine-scale safety guarantee is inferred from pixel spacing.

## Reproduction

From `mars-explorer-web`, with the existing local source and lossless packages present:

1. Create an isolated Python environment under the ignored `scripts/.cache/elevation-validation-venv` directory.
2. Install `numpy==2.5.4`, `rasterio==1.5.2` and `pyproj==3.8.0` there. The run used GDAL 3.12.2 and PROJ 9.8.1.
3. Run `node --experimental-strip-types scripts/validate-elevation.mjs`.

On other platforms, set `ELEVATION_VALIDATION_PYTHON` to the environment's Python executable. The wrapper writes application control points into the ignored cache, then invokes `scripts/validate_elevation.py`. The latter writes the results JSON. No Supabase credentials, uploads or database changes are required.

## Sources

- Original product index and downloadable labels: https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/index.html
- USGS product metadata: https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hirise_dtm_mosaic
- NASA/JPL PLACES specification, sections 3.9 and 5.1.3: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rover_places/document/Mars2020_Rover_PLACES_PDS_SIS.pdf
- NASA PDS rover references: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rover_places/data_localizations/best_tactical.csv
- Producer processing description: https://www.hou.usra.edu/meetings/lpsc2020/pdf/2020.pdf
