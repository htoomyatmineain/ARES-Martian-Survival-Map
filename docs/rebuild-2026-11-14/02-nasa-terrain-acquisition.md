# Phase 02 — NASA terrain acquisition

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: A; B discovers independent sources. Prerequisites: 01.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Read exact HiRISE DEM/imagery URLs and labels in the source contract. DEM is equirectangular; imagery is orthographic. Crop the actual geographic zone in each native grid.
- [ ] Implement/reuse resumable HTTP byte-range retrieval with checked status/content-range/length, bounded concurrency and retries. Never turn a partial response into a completed product.
- [ ] Prepare 20 original elevation strips and 100 imagery tiles under source-data/Western-Jezero-10km-HiRISE, matching reviewed crop windows. Keep original samples immutable.
- [ ] Record source URL, retrieval date, WKT/geotransform, pixel windows, units/dtype/nodata, dimensions, bytes and SHA256 in download-manifest.json.
- [ ] Check all crops and quantify missing coverage. Keep missing pixels unknown; never fill the zone to force 100 percent coverage.
- [ ] Keep original georeferencing for QGIS/source review. Plan disk for original crops (~2.02 GB historical), compressed package and caches; measure actual usage.
- [ ] Gate: every required source crop verifies, incomplete products fail closed and resolution claims trace to NASA metadata.
- [ ] Commands: node scripts/download-regional-hirise.mjs; node scripts/verify-regional-hirise.mjs.
- [ ] References: ../../mars-explorer-web/scripts/download-regional-hirise.mjs; ../elevation-validation.md.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-02/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

