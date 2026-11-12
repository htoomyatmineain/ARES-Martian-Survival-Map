# 10 km HiRISE science-site verification and next handoff

Checked 2026-11-12 using the local C:/Users/USER/Downloads/Western-Jezero-10km-HiRISE.zip. Rasterio opened the imagery.vrt and elevation.vrt directly through GDAL /vsizip/, transformed both reported science coordinates into each native raster CRS, checked bounds, and sampled masked pixels. No extraction, resampling or application modification was required.

## Results

| Dataset | Native pixel spacing | CRS | Improvement over CTX linear pixel spacing |
|---|---|---|---|
| HiRISE imagery | 0.25 m | Mars 2000 sphere orthographic; origin 18.4663 N, 77.4298 E | 6 / 0.25 = 24x |
| HiRISE elevation | 1 m | Mars spherical equirectangular; standard parallel 0 | 20 / 1 = 20x |

Both CRSs use radius 3,396,190 m. Imagery and elevation have different projections; do not align their raw raster indices directly or interpret them as Earth WGS84.

| Site | Reported latitude N | Longitude E | Imagery pixel | Elevation pixel |
|---|---|---|---|---|
| Skinner Ridge / Skyland | 18.458931 | 77.40617078 | Inside, valid; DN 116 | Inside, valid; -2520.4683 m |
| Wildcat Ridge / Hazeltop | 18.45863707 | 77.40588851 | Inside, valid; DN 161 | Inside, valid; -2523.1245 m |

These checks provisionally treat the PDS sample latitudes as planetocentric on the Mars sphere. The PDS latitude convention still requires independent confirmation. The elevation samples are source raster values; their closeness to PDS elevations does not independently establish compatible vertical datums or absolute accuracy.

The local 500 m JZ-01 patch still does not cover either site. The separate 10 km package DOES contain valid pixels at both reported positions under the stated assumption. This resolves the previously uninspected 10 km package's pixel-size and provisional point-coverage questions.

No 60x resolution claim is supported. These ratios describe linear native pixel spacing, not guaranteed measurement accuracy, screen quality, or science-marker benefits. Adding markers does not itself change raster resolution.

## Scope limits

This task inspected VRT metadata, accompanying README/TEAMMATE_HANDOFF/verification-results, and actual pixels at the two sites. It did not recompute every tile checksum, validate every mosaic pixel, independently verify NASA source publications, establish quantitative CTX–HiRISE registration, or certify walking hazards. Existing package claims of approximately 99.80% overall valid rectangular coverage were read, not independently reproduced here. No-data areas must remain masked.

## Agent next steps

1. Use the 10 km package for the Western Jezero science-site workspace, retaining the separate JZ-01 view. Keep each VRT beside its referenced TIFF chunks after extraction.
2. Use an explicit common Mars coordinate transform to prepare application terrain and imagery. Preserve source pixel sizes/provenance and no-data masks; document any resampling. Display improvements as imagery 24x and elevation grid 20x relative to the stated CTX baselines.
3. Integrate the two provisional NASA sampling markers from science-layer-handoff.md, with individual popups, Science Sites visibility toggle, zoom-to-site, and selection of both nearby sites.
4. Confirm PDS coordinate convention and vertical datum; perform quantitative registration before precise placement/accuracy claims.
5. Test the actual application for marker placement, source/uncertainty labels, popup content, toggle, zoom and close-site selection. Report implementation and verification separately.

Read this update together with START-HERE-Science-Location-Agent-Handoff.md and Science-Checklist-Audit-2026-11-12.md. Their earlier statement that the 10 km archive was uninspected is superseded only for the metadata and conditional two-site pixel checks reported here. App integration remains pending.
