# Phase 6 — reproduce the approximate geological-context layer

Implemented 2026-11-13. This continues the teammate's blocked assessment with the original released USGS database, three regional comparisons, clipped geometry and explicit uncertainty. The teammate's source evidence remains unchanged.

## Source and eligibility decision

Source: Sun & Stack (2020), USGS Scientific Investigations Map 3464, *Geologic Map of Jezero Crater and the Nili Planum Region, Mars*, published at 1:75,000. NASA-funded USGS planetary geology is an official challenge resource.

- Publication: https://pubs.usgs.gov/sim/3464/
- DOI: https://doi.org/10.3133/sim3464
- Original GIS ZIP: https://pubs.usgs.gov/sim/3464/sim3464_database.zip
- Reviewed archive: **349,336,873 bytes**; SHA-256 `a88bd53a5573743cc4a20036c10e585106d08a433ad2f34af269e9cea1529f87`.

This is a contextual geological-unit map, not a soil-strength model, confirmed mineral deposit map or route-safety classification.

## Projection decision

The source pamphlet states 77.3° E, but the original ZIP's feature classes, projection file, reference raster and readme consistently declare transverse Mercator centred at **77.5° E**, on the 3,396,190 m Mars sphere. Use the native geometry's declared CRS to decode that geometry. Do not substitute the pamphlet number into the binary GIS definition or assign Earth WGS84.

This establishes the implementation's controlling CRS. It does not claim the publisher corrected the pamphlet or that map control is precise. Preserve the conflict in Sources/details.

## Ordered processing

1. Read the shared Mars frame and boundaries from `TEAMMATE-START-HERE.md` and the prior geology assessment.
2. Download the original ZIP to `mars-explorer-web/scripts/.cache/geology/sim3464_database.zip`. This ignored local archive must not be committed or uploaded to Supabase.
3. Verify the reviewed archive hash and extract the geodatabase, coordinate-system files and original `Nili_CTX_Mosaic_Beta01_Feb2018_MTM.tif`. The preparation script does this if the extracted GDB is absent and checks extraction paths stay inside the intended directory.
4. Inspect native `GeoUnits_v1`, `GeoContacts` and `MapBoundary` CRS definitions. Record the feature-class WKT and compare with the released PRJ/raster/readme.
5. Read the original units/contacts intersecting the source-projected footprint. Preserve source feature IDs, unit IDs and contact classifications.
6. Densify projected edges to at most 100 m before transforming through source geographic coordinates to app x-east/z-south metres. This adds points along existing lines; it does not discover new boundaries.
7. Clip to ±5000 m in the existing local frame. Reject invalid source or clipped geometries; do not silently repair, simplify or fill gaps.
8. Match original unit IDs to the teammate's preserved source legend, descriptions and colours. Do not translate geological names into trafficability or certainty values.
9. Reproject/resample the source CTX base onto a 10 m context-comparison grid and compare it with the controlled HiRISE overview at the same grid. These are verification images, not changes to the terrain source.
10. Use three fixed 4 × 4 km windows centred roughly northwest, centre and southeast. SIFT descriptors, ratio 0.65, then similarity RANSAC at 3 pixels exclude mismatches. Record the raw matched-point separations, not just fit residuals. The fit is used for rejection only; **no registration correction is applied**.
11. If comparisons do not identify the same terrain or are insufficient, stop integration and report the issue. Passing a coordinate round trip alone is not enough.
12. Given the measured offsets and producer warning, release only an **approximate regional-context overlay** with persistent uncertainty notice. Do not describe local boundaries as surveyed.
13. Independently compare 1,600 local-grid point classifications against the original GDB and verify clipped topology/coverage. Record mismatches and projection-roundtrip error separately from geographic accuracy.
14. Generate the web asset and a pinned byte-count/SHA-256 release descriptor. The frontend checks integrity before display; no replacement geology is invented on failure.

## Reproduction commands

Run from `mars-explorer-web`. The existing local validation Python environment was used, with Pyogrio 0.13.0 and Shapely 2.2.0 added to its existing NumPy, Rasterio, PyProj and OpenCV dependencies.

```powershell
New-Item -ItemType Directory -Force scripts/.cache/geology | Out-Null
curl.exe --fail --location --output scripts/.cache/geology/sim3464_database.zip https://pubs.usgs.gov/sim/3464/sim3464_database.zip
& scripts/.cache/elevation-validation-venv/Scripts/python.exe scripts/prepare-geology.py
& scripts/.cache/elevation-validation-venv/Scripts/python.exe scripts/check-geology.py
```

Install missing packages only into a local validation environment. Do not disable certificate verification. If source bytes change, reassess and version them instead of overriding the pinned hash.

After an intentionally accepted regenerated asset, regenerate the release descriptor from its actual bytes:

```javascript
// Run this code with Node from mars-explorer-web.
const fs = require('fs'), crypto = require('crypto');
const bytes = fs.readFileSync('public/data/geology/jezero-sim3464.json');
const data = JSON.parse(bytes);
fs.writeFileSync('src/data/geology-catalog.json', JSON.stringify({
  url: '/data/geology/jezero-sim3464.json', bytes: bytes.length,
  sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  features: data.features.length
}, null, 2) + '\n');
```

Then `npm test` and `npm run build`. Reuse results when source/transformation/output hashes have not changed; repeat only checks affected by a change, failure or new concern.

## Rendering and interaction

- `src/geology.ts`: shared point-in-polygon inspection, canvas drawing and integrity-checked lazy load.
- `src/RegionalMap2D.tsx`: filled SVG regions, source contact styles and names; holes stay holes. Memoize static paths so mission ticks do not rebuild long path strings.
- `src/Scene.tsx`: same geometry rendered into a texture, draped onto the existing valid terrain mesh, with shared names and opacity. Canvas resolution is a display choice, not geological resolution.
- `src/GeologyPanel.tsx`: unit descriptions, scale, offset findings, sources and explicit interpretation limits. Display cleans malformed degree-sign encoding in source text; the original catalogue remains unchanged.
- `src/RegionalWorkspace.tsx`: Layers toggle, unit legend/buttons, mutually exclusive terrain/orbital area overlays, and one detail panel at a time.
- Use the same existing Mars frame. Never modify terrain heights, masks, route costs or science-site coordinates.
- In inspection, boundary placement is uncertain by far more than the displayed coordinate precision. Coordinates describe the cursor, not a precise geological contact.

## Recorded acceptance results

- Original native CRS agrees across GDB, PRJ, CTX raster and readme at 77.5° E. Conflicting pamphlet prose is disclosed.
- Three image comparisons: median separation **97.1 m northwest / 100.0 m centre / 107.2 m southeast**, with respective P95 **104.9 / 108.7 / 115.9 m**. The producer's approximately 100–200 m warning remains, and these selected comparisons are not an everywhere error bound.
- Output: **43 polygon features**, **7 unit types**, **61 clipped contact parts**, full mathematical footprint coverage; no source-value or boundary correction.
- Independent 1,600-point membership check: **zero mismatches**, zero invalid output polygons. Maximum numeric projection-roundtrip error about 2.95e-9 m, not ground accuracy.
- Full suite **54 tests passed**; TypeScript/production build passed.
- Browser: 2D coloured regions, region descriptions, keyboard centre inspection, opacity, layer switching and seven 3D labels checked.
- The agent browser has no working WebGL; rendered 3D texture appearance needs a hardware-accelerated visual check. Do not mark that visual check passed based on DOM labels.

Evidence: `docs/geology-validation/results.json`, `independent-check.json`, original-base comparison PNGs and `app-overlay.png`. Runtime asset: `public/data/geology/jezero-sim3464.json` (**1,716,914 bytes** at this revision). The small output ships with the frontend; the 349 MB archive remains local.

## Limits

Geological labels describe mapped formations and interpretation, not guaranteed softness, friction, bearing capacity or mineral reserves. Eolian bedforms may be relevant to later hazard research but are not silently converted into exclusions. Routing remains based on the existing native elevation rules. No independent ground-survey accuracy, safe parking area or astronaut operating limit is established.
