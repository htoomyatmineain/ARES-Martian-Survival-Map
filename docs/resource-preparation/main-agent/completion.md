# Main-agent resource work — 2026-11-13

## Completed

- Opened NASA Mars Trek and inspected the controlled Jezero DEM and imagery catalogue entries.
- Confirmed the DEM's exact product label matches the original source in the ARES release manifest.
- Checked catalogue bounding-box containment for our complete selected zone and both science sites.
- Recorded that Trek's soc_006 equirectangular imagery is a different product/version/projection from ARES's soc_007 orthographic imagery. No data were replaced or realigned based on this viewer check.
- Rendered the reference imagery around the science-site neighbourhood. Preserved a context screenshot, metadata snapshot and catalogue snapshot.
- Added official viewer/catalogue links, original raster links, version differences and interpretation limits to ARES Sources.
- Added a numbered base → destination/science purpose → return itinerary in Mission Review. It reads the existing calculation; no new route or speed rule was introduced.
- Reused and checked the existing historical MEDA day/LMST controls and explicit missing/unknown coverage descriptions. No Worldview Earth data were ingested.
- Added `docs/reproduction/03-mars-trek-and-presentation.md` with reproducible steps and a bounded evidence-check script.

## Evidence and commands

From `mars-explorer-web`:

```powershell
node scripts/check-trek-reference.mjs
$env:RAYON_NUM_THREADS='1'
npm run build
```

The reference command passed seven checks. The result JSON records snapshot SHA-256 values and sizes. Production build and TypeScript passed. Existing full terrain processing and source decoding were not rerun: this work does not change those inputs or calculations.

Browser checks:

- Sources panel exposes NASA links and same-source/imagery-version caveats.
- Default verified-route review displayed 2 h 1 min outbound, 20 min science, and 2 h 1 min return. Individual legs are rounded upward separately; the round-trip total uses unrounded times.
- Skinner Ridge review displayed its science purpose, no verified-route travel time, and a disabled Start action.
- Thermal day selection changed to sol 502, displaying its actual LMST samples; missing hours remained absent.

The browser proof image for the current Sources panel is `sources-panel.png` beside this file.

## Scope limits and remaining work

This is a source identity, catalogue footprint and presentation check. It does not provide a new numerical landmark-registration residual, prove valid pixels throughout a catalogue bounding box, or independently certify absolute location/elevation accuracy. The existing elevation, source-pixel coverage and report-image registration audits remain separate evidence. A new quantitative soc_006-versus-soc_007 landmark comparison was not performed; do not mark that as passed.

The Trek screenshot is a regional context view, not proof that both sample rocks are resolved. The coordinate-entry interface places a symbolic marker and can round/animate its displayed map centre. Do not use its centre as a replacement site coordinate.

Curiosity's Mount Sharp example supplies a presentation reference only. The app still has one destination and one retraced return corridor; it does not implement multi-stop route optimization.

The teammate owns verified rover photographs and geology assessment. Neither has been claimed integrated. No new area-wide thermal raster, ground-survey control, geological unit layer, photo catalogue or astronaut-certified safety model was added.

No Supabase upload, deployment, source-data replacement or routing-limit change was performed. These changes are local until explicitly pushed.

## Source links

- https://trek.nasa.gov/mars/
- https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars
- https://trek.nasa.gov/mars/TrekWS/rest/cat/metadata/fgdc/html?label=JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40
- https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/
- https://worldview.earthdata.nasa.gov/
