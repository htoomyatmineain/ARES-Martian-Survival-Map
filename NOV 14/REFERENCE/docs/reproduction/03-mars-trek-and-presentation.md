# Phase 3 — Mars Trek source checks and presentation references

Main-agent assignment; separate from the teammate's photos and geology work. Execute once per changed input and preserve evidence. This guide reproduces the checks performed on 2026-11-13; it is not an absolute-accuracy certification.

## Inputs

- Geographic contract in `TEAMMATE-START-HERE.md`.
- App manifest: `mars-explorer-web/source-data/Western-Jezero-Web-Lossless/package-manifest.json`.
- App sites: `mars-explorer-web/src/data/science-sites.json`.
- Existing elevation/science audits; do not redo their full source processing for an unchanged dataset.
- https://trek.nasa.gov/mars/
- https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars
- https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/
- https://worldview.earthdata.nasa.gov/

## A. Catalogue and footprint check

- [ ] Open Mars Trek, allow startup to complete and dismiss the optional tutorial.
- [ ] Open Search, enter `Jezero`, and inspect `MRO HiRISE, Jezero DEM, Controlled`.
- [ ] Record its product label, bounding box, instrument and mission; open View Metadata and preserve the returned document with retrieval date and URL.
- [ ] Compare its exact DEM product label against the local release's original source filename.
- [ ] Inspect `MRO HiRISE, Jezero Mosaic, Controlled`; preserve the UI metadata and layer identifier.
- [ ] Compare imagery version and projection against the original app source filename. Record differences explicitly; do not silently replace a newer local product with the viewer product.
- [ ] Check that all four zone bounds and both site coordinates lie inside the catalogue footprint. This is a bounding-box check, not a missing-pixel check.
- [ ] Add the imagery layer, Fly To its footprint, then use coordinate entry (placeholder `Lat, Lon`, submit Enter) to examine the science-site neighbourhood.
- [ ] Save a context screenshot and the actual viewer URL. Catalogue entries and screenshot alone do not supply a quantitative registration residual.
- [ ] For a numerical landmark check, require matched control points in both products, a declared transform, independent held-out points and pixel-to-metre residuals. If these were not measured, mark this part unperformed. Reuse the existing report-image registration audit as separate evidence; do not relabel it as a Trek test.

For the saved 2026-11-13 evidence, run from `mars-explorer-web`:

```powershell
node scripts/check-trek-reference.mjs
```

Expected: seven true checks and a result JSON in `docs/resource-preparation/main-agent/`. The script needs the original local manifest; it does not download or modify source rasters. Compare hashes in the result when deciding whether previous evidence can be reused.

## B. Apply references to the app

- [ ] Add Mars Trek and its API catalogue to Sources, with a same-source/accuracy limitation.
- [ ] Link original DEM and imagery products so source provenance is inspectable.
- [ ] Use Curiosity's example to present a named science destination and its purpose. Preserve our single-destination workflow: base → destination/task → base. Do not imply multi-stop optimization exists.
- [ ] Show outbound, task and return stages in mission review using the existing selected route and planned task time. No extra terrain or mission rules are introduced by this display.
- [ ] Retain explicit sol, LMST, historical date and missing-coverage labels for MEDA. Worldview is an interaction reference only; do not ingest Earth layers or imply it supplies Mars weather.
- [ ] Verify Sources links, mission review and thermal date controls in the browser once. Run TypeScript/build; run domain tests when changing calculation behaviour.

## Actual findings to preserve

- Trek DEM: `JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40` — same product as our original DEM.
- Trek imagery: `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd`.
- App imagery: `JEZ_hirise_soc_007_orthoMosaic_25cm_Ortho_blend120` — different version/projection; no pixel-equality claim.
- Trek catalogue bbox: west 77.2229331, south 18.3067994, east 77.583964, north 18.669315 degrees. Both sites and the complete selected bounding box fit inside it.
- No new numerical landmark-offset result or independent ground-survey accuracy is established by this check.

## Finish

Deliver the captured evidence, hash/check report, implemented source references and a short completion note. Keep pending numerical checks explicit. Do not modify the teammate's owned output directory or claim photos/geology have been integrated before their evidence arrives.
