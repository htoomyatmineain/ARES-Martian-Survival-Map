# Western Jezero 10 km HiRISE download

Download and verification complete. Total raster storage: 2,023,002,316 bytes (about 2.02 GB).

Open `elevation.vrt` or `imagery.vrt` in QGIS to load each dataset as one layer. Keep the GeoTIFF files in this folder alongside the VRT files. Both use Mars coordinates, not Earth coordinates. `verification-results.json` records the final checks.

About 99.80% of pixels in each downloaded bounding rectangle contain valid data. The remaining southwest/southern gap is preserved as no-data. These percentages include the small crop margins and are not an exact area measurement of the requested geographic polygon.

NASA MRO HiRISE data, processed and distributed by USGS Astrogeology.

Center: 18.46 N, 77.42 E. Requested region: 10,000 x 10,000 m in the existing app's local coordinate convention.

Elevation: 1 m source-grid spacing. Imagery: 0.25 m source pixels. Files are lossless GeoTIFF chunks with original projection metadata, not resampled app assets. Native-grid bounding rectangles include a small margin around the requested region. Missing source pixels are retained, not filled. Load the chunks together in QGIS; consult download-manifest.json for source URLs, per-file SHA-256 checksums, crop windows and full pixel coverage counts. Coverage counts describe the downloaded bounding rectangles, not an exact geographic polygon.

Every output pixel was decoded again and checked against the source crop. This verifies transfer/encoding, not the physical accuracy of the source measurements. Existing 20 m app terrain and teammate's JZ-01 files were not modified. App integration is a separate step.
