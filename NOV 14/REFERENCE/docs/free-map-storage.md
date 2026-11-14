# Full-detail map storage

## Measured result — 2026-11-12

- Original raster chunks: 2,023,002,316 bytes.
- Lossless raster payload: 689,970,908 bytes.
- Upload set including manifest: 690,047,789 bytes (about 690 MB).
- Elevation payload: 152,450,972 bytes; imagery payload: 537,519,936 bytes.
- 120 tiles decoded and compared exactly with their original samples; all matched.
- 121 upload files passed stored SHA-256 and size preflight. Largest object: 8,015,803 bytes.
- Both packaged science-site elevations and image intensities reproduce the independent original-raster checks exactly.
- 26 tests passed, including projection, decoder, corruption detection, cache eviction and cancellation. TypeScript check passed.

This measured native-resolution package fits the proposed 700 MB map budget. Against a conservative decimal 1 GB quota, about 310 MB remains **before** existing bucket contents, overview levels, environmental rasters or other assets. It does not establish that all future layers fit or that download quotas are sufficient. The package is prepared locally; remote upload and deployment verification are pending the user's new project.

## What is prepared

Run from `mars-explorer-web`:

```powershell
node --max-old-space-size=512 scripts/pack-regional-map.mjs
node scripts/check-map-package.mjs
npm test
```

Output: `mars-explorer-web/source-data/Western-Jezero-Web-Lossless`.
Upload only `package-manifest.json` and the tile filenames listed in that manifest. Experimental PNGs, originals, handoff files and unrelated source folders are not part of this release.

Each elevation tile retains every Float32 sample, including the original nodata sentinel. Four byte lanes are compressed with zlib; `src/losslessElevation.ts` decodes them in a browser. Each imagery tile is a lossless WebP retaining every uint8 intensity. The packager decodes every output and compares it byte-for-byte with its source raster samples before marking it verified. Re-running reuses existing tiles only after the same exact comparison. Originals are never modified.

`src/regionalTileStore.ts` provides on-demand elevation sampling and imagery tile lookup using those native CRS parameters. It verifies SHA-256 before decoding elevation, returns null for nodata/outside coverage, supports cancellation, and limits its decoded cache to 64 MiB by default. Tests reproduce both science-site source pixel positions and exercise fetch, cache eviction, corruption and cancellation. This module is not yet wired into the regional workspace; it must not be presented as completed high-resolution rendering.

The manifest retains the NASA source URLs, native CRS parameters, source origin, pixel spacing, crop windows, tile dimensions and hashes. Elevation and imagery remain in their separate native projections. These files are not independently georeferenced GeoTIFFs; the manifest is essential. Original GeoTIFFs remain the archival/QGIS source.

## Hosting sequence

1. Confirm the target Supabase project (the user explicitly excluded “NASA heat map”). Check existing usage and available quota there.
2. Run the package preflight. Include the manifest, any display overviews and all planned environmental raster layers in the storage budget. No precision reduction is authorized.
3. Use a dedicated bucket for the public NASA map data with read access and no browser upload/update/delete permissions. Keep administrative credentials out of frontend variables and Git. Upload versioned objects and publish the manifest last; verify remote hashes before changing the app configuration.
4. Integrate on-demand requests with a bounded cache. Do not download or offline-precache the complete high-resolution dataset on initial load. Display overviews are navigation aids; full-resolution tiles remain available. Routing must use numeric elevation, not a downsampled display texture.
5. Verify the two science sites and 2D/3D alignment against the native coordinates. Latitude convention, vertical datums and quantitative registration remain unresolved; this package does not certify EVA safety.
6. Measure actual download traffic. Free Supabase currently provides 1 GB file storage, 500 MB database storage, 5 GB uncached egress and 5 GB cached egress. Database allowance is not spare object storage. Projects can pause after a week of inactivity.

If the complete release outgrows the free quota, retain Supabase for small records and select separate file hosting before uploading. Cloudflare R2 Standard has a free allowance, but it is a metered service with billable overages, not a guaranteed zero-cost plan. Do not enable billing or create a paid resource without the user's agreement.

Sources checked 2026-11-12:
- https://supabase.com/pricing
- https://supabase.com/docs/guides/storage/uploads/file-limits
- https://developers.cloudflare.com/r2/pricing/

## Current limits

The release is now uploaded to NASA final round practice and the regional workspace uses shared HiRISE data. See shared-map-handoff.md for the current release size, display resolutions, access rules and remaining validation limits. Hazard recognition and environmental layers are not implemented by this change.
