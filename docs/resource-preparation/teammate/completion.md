# Preparation completion â€” 2026-11-13

Branch: `codex/science-resource-preparation`. Base: latest fetched `origin/main`, `c55539e`. This work was performed in a separate worktree; the original checkout's untracked root `.gitignore` and two Blender backups were preserved. No merge, push or deployment was performed.

## Delivered

- **Photos:** two verified NASA-captioned outcrop photographs, one each for Skinner Ridge/Skyland and Wildcat Ridge/Hazeltop; full-frame WebP thumbnails, catalogue, attribution, candidate/rejection evidence, completed checklist and reproduction commands. Total selected thumbnail bytes: **334,690**. Acquisition UTC remains unknown. Web asset IDs are not misrepresented as verified native PDS product IDs.
- **Geology:** comparison of official USGS SIM 3464 and SIM 3292; source metadata, 14-unit catalogue with original colours/attribute variants, conditional footprint-coverage assessment, validation, reproduction instructions and completed/blocked checklist.
- **Integrity:** `deliverable-manifest.json` records each tracked deliverable's bytes and SHA-256, aggregate bytes excluding that self-referential manifest, and acceptance results. `evidence/retrieval-manifest.json` records successful and failed requests, canonical URLs, original filenames, timestamps, original sizes/hashes and cache paths. `evidence/source-validation.json` caches once-per-source-hash validation. Raw originals and installed GIS dependencies are ignored under `raw/`.

## Results and limits

Both thumbnails decode, have valid app site IDs and explicit official association evidence, and passed a visual comparison with their originals. PDS PDF pages 52/58 confirm site coordinates and sample designations; 20/63 provide parent-outcrop context. Coring dates, sealing dates, photo dates and different sample-number systems are preserved distinctly. The full 104,818,942-byte PDS reference PDF is untracked, with its checksum and retrieval script supplied. No large GIS source archive/raster was downloaded.

The geological source has meaningful coverage: one boundary feature and 40 valid unit features cover the footprint in the declared GIS frame, with no gap in that conditional test. Source contacts were retrieved separately to retain contact categories. This is not evidence of accurate app placement.

**No clipped geological layer was emitted.** The source pamphlet's 77.3 E central meridian conflicts with the released GIS/service's 77.5 E metadata. The producer also warns of roughly 100â€“200 m random offsets from controlled operations imagery. Three well-distributed comparisons against current terrain remain outstanding. These are explicit blockers; no empty `geology-local.json`, guessed registration correction or metre-scale accuracy claim was produced. SIM 3292 at 1:20,000,000 is unsuitable for site-scale detail.

## Exact next actions

1. For photo UI integration, use `photos/photo-catalog.json`, preserve association labels, dates/sols, credits, original links and limitations. Integration itself was not authorized here and was not performed.
2. Resolve geology using the original USGS GIS ZIP and sheet at the URLs in `geology/source-manifest.json`; save originals under ignored `raw/`, record hashes, inspect native CRS and reconcile the central-meridian discrepancy. Do not infer an Earth CRS.
3. Compare source-map contacts/recognizable landmarks with current controlled HiRISE at at least three well-distributed locations; retain screenshots, coordinates and discrepancies. Determine whether an uncertain regional **Geology** overlay is useful. It must stay separate from CRISM, terrain slope and routing safety.
4. Only after those checks, transform through the documented Mars definitions, clip to x/z Â±5000 m, preserve source IDs/attributes/contact uncertainty, then check finite coordinates, topology, coverage and source placement. Do not invent a uniform offset or ground-safety inference.
5. Confirm competition rules on reuse of pre-event research/assets before including these preparation outputs in an event build. The challenge page failed local TLS verification during this run; no claim about event reuse permission was made.

## Reproduce and validate

Read `photos/reproduce.md`, then `geology/reproduce.md`. Use `retrieve.py` for exact requests from the retrieval manifest, `read_report.py` for the PDS reference and page extracts, `prepare_catalogues.py` for image/catalogue generation, and `assess_coverage.py` for conditional source-frame coverage. `verify.py` validates the delivered JSON, site IDs, thumbnail paths/bytes/hashes, source integrity and scoped changes. Tool versions are recorded in the two validation JSON files. Each unchanged source's successful validation is reused; repeat only for changed inputs/outputs, failure or a new concern.

No application components, terrain, coordinates, routing, Supabase objects or shared existing resources were edited. No terrain/routing validation was rerun. Only this output directory is committed. The scoped `.gitattributes` preserves exact evidence and deliverable bytes across checkouts; publisher whitespace in original snapshots is retained intentionally.
