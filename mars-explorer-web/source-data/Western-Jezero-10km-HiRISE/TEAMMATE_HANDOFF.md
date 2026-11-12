# Western Jezero high-resolution dataset handoff

NASA Mars Reconnaissance Orbiter / HiRISE data, processed and distributed by USGS Astrogeology. These are crops from the Mars 2020 TRN products, not the newer MSR westward-extension mosaic used for the separate JZ-01 handoff.

## 1 m elevation (DTM / DEM)

Original source filename: `JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif`

[Direct source GeoTIFF URL](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif)

Local dataset: **elevation.vrt**, referencing 20 GeoTIFF chunks named `elevation-<source-column>-<source-row>.tif`. Keep the VRT and its chunks together.

Downloaded crop geographic bounding box, approximately:

- West: 77.33105678 degrees E
- East: 77.50894044 degrees E
- South: 18.37563152 degrees N
- North: 18.54435444 degrees N

Exact projected crop outer bounds in metres: xmin 4583775; ymin 1089210; xmax 4594319; ymax 1099211.

Projection: Equirectangular; standard parallel 0 degrees; central meridian 0 degrees; false easting/northing 0 m. Native grid spacing: 1 m. Dimensions: 10544 columns x 10001 rows. No-data: -3.4028226550889045e38.

## 25 cm imagery

Original source filename: `JEZ_hirise_soc_007_orthoMosaic_25cm_Ortho_blend120.tif`

[Direct source GeoTIFF URL](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_007_orthoMosaic_25cm_Ortho_blend120.tif)

Local dataset: **imagery.vrt**, referencing 100 GeoTIFF chunks named `imagery-<source-column>-<source-row>.tif`. Keep the VRT and its chunks together.

Downloaded crop geographic bounding box, approximately:

- West: 77.33097354 degrees E
- East: 77.50900797 degrees E
- South: 18.37562020 degrees N
- North: 18.54438140 degrees N

Exact projected crop outer bounds in metres: xmin -5553.75; ymin -5373.5; xmax 4451.25; ymax 4628.25.

Projection: Orthographic; latitude of origin 18.4663 degrees N; central meridian 77.4298 degrees E; false easting/northing 0 m. Native pixel spacing: 0.25 m. Dimensions: 40020 columns x 40007 rows. Single-band grayscale. No-data: 0.

## Shared coordinate and boundary notes

Mars sphere radius: 3396190 m. Planetocentric latitude; east-positive longitude. These are planetary coordinate systems, not Earth WGS84 / EPSG:4326. The two products use different map projections: reproject into a shared Mars CRS before overlaying or calculating routes. The supplied VRTs retain each product's native CRS and geotransform.

Requested 10 x 10 km mission region: center 18.4600 degrees N, 77.4200 degrees E; west 77.33107113608344; south 18.375646975709426; east 77.50892886391657; north 18.544353024290576. Native rectangular crops retain small margins beyond this boundary. Geographic crop bounds above are enclosing latitude/longitude boxes, not exact valid-data footprints; imagery crop edges are curved when transformed to geographic coordinates. Bounds describe the downloaded crops, not the larger original source mosaics.

Valid pixels in downloaded bounding rectangles: elevation 99.79816984%; imagery 99.79808219%. A southwest/southern gap remains. A science-site coordinate must fall on valid pixels in BOTH datasets, not merely inside these bounding boxes.

Transfer checks passed: every saved tile was decoded and compared with its source crop; final checks verified SHA-256 checksums, dimensions, coordinate metadata, complete rectangular crop assembly and absence of duplicate/overlapping chunks. See `download-manifest.json` and `verification-results.json`.

Not yet established: intersections with verified NASA science-site coordinates; independent terrain-height accuracy; corrected alignment against rover control points; EVA traversability or routing safety. The data can serve as a terrain/imagery foundation for the tactical map and routing prototype, but those conclusions require further validation. No source pixels were interpolated, sculpted, colourized or filled during download.
