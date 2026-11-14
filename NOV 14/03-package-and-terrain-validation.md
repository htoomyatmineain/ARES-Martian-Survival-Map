# Phase 03 — Lossless package and terrain validation

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: A; B waits for overview for registration. Prerequisites: 02.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Pack native Float32 DEM losslessly, retaining nodata and signed numerical values. Use lossless grayscale WebP for original imagery. Decode and compare every output sample against original raster data.
- [ ] Build 1001×1001 height overview at 10 m and 4096×4096 imagery (~2.44 m/pixel). Sample/reproject into the shared local frame; retain native tiles independently.
- [ ] Emit manifest-listed native and overview assets, CRS/geotransforms, lineage, byte counts and hashes. No experimental assets in the release.
- [ ] Stage original labels and PLACES best_tactical.csv required by the independent validator; pin their hashes. Missing local metadata is a prerequisite to retrieve, not an excuse to invent a pass.
- [ ] Use independent Rasterio/GDAL and PyProj/PROJ to check source pixel selection, all decoded values, overview heights/masks and native-vs-display error distribution. PLACES comparison is archive consistency.
- [ ] Record fidelity separately from sampling resolution, display approximation and independent absolute accuracy. Preserve missing-data and vertical-datum limitations.
- [ ] Gate G1: independent comparisons pass and exact source/config/code/output hashes are recorded; deliver validated overview to B.
- [ ] Commands: node --max-old-space-size=512 scripts/pack-regional-map.mjs; node --experimental-strip-types scripts/prepare-shared-overview.mjs; node scripts/check-map-package.mjs; node --experimental-strip-types scripts/validate-elevation.mjs.
- [ ] References: REFERENCE/docs/elevation-validation.md; REFERENCE/docs/free-map-storage.md; REFERENCE/mars-explorer-web/scripts/validate_elevation.py.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-03/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

