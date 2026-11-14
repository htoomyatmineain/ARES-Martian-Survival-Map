# Geological-context integration — 2026-11-13

**Decision: suitable as an explicitly approximate regional-context overlay.** Not accepted as a precise geological contact map, mineral deposit map or terrain-trafficability model.

This extends the teammate's initial blocked assessment. It does not modify or erase her original findings.

## Source and projection

The original USGS SIM 3464 GIS archive was downloaded and checked: 349,336,873 bytes, SHA-256 `a88bd53a5573743cc4a20036c10e585106d08a433ad2f34af269e9cea1529f87`. It remains local under ignored `mars-explorer-web/scripts/.cache/geology/`.

Actual feature classes, PRJ, reference CTX raster and released readme consistently specify Mars transverse Mercator centred on 77.5° E, radius 3,396,190 m. That definition governs decoding of the released geometry. The pamphlet's conflicting 77.3° statement is still disclosed, not claimed corrected by the publisher.

Original GIS and publication: https://pubs.usgs.gov/sim/3464/ ; https://doi.org/10.3133/sim3464 . Original archive: https://pubs.usgs.gov/sim/3464/sim3464_database.zip . Unit colours/descriptions were retained from the teammate's official-source legend catalogue.

## What passed

- Native geometry validity, source CRS interpretation and local clipping: 43 polygons, seven unit types, 61 contact parts. Contact categories remain certain/approximate; clipped footprint boundaries are not drawn as geological contacts.
- Three spatially separated image-feature comparisons between the original map's CTX base and controlled HiRISE. Median raw separations: 97.1 m northwest, 100.0 m centre, 107.2 m southeast. P95: 104.9, 108.7, 115.9 m. Counts: 256, 185, 118 consistent matches.
- These differences confirm that the original map is not precisely registered to our controlled imagery. No shift or fit was applied to geology. The producer's approximately 100–200 m warning remains visible.
- Independent original-GDB membership check: 1,600 points, zero class mismatches and zero invalid local polygons; complete mathematical polygon coverage. Numeric roundtrip maximum 2.95e-9 m is computational agreement, not ground accuracy.
- 54 automated tests passed. TypeScript and production/offline build passed; the existing Three.js bundle warning remains.
- Browser: loaded integrity-checked geometry, displayed region colours/names, inspected a named unit and map centre, changed opacity, switched to CRISM and back, and confirmed seven labels are passed into the 3D scene.

## Implementation

Layers → **Geological regions** enables the overlay. Its legend buttons and terrain inspection open the same contextual unit details. One area overlay is displayed at a time to avoid ambiguous blending. Routes, science positions, elevation values and native hazard masks are unchanged. The geometry is lazy-loaded with a pinned SHA-256/byte check; it ships as a 1,716,914-byte frontend asset, requiring no added Supabase object.

The 3D implementation draws the same local geometry to a texture and drapes it over the existing valid terrain triangles. Seven unit-label elements were observed. **Rendered 3D texture appearance remains unverified in the agent browser because WebGL is unavailable.** A hardware-accelerated visual check is still needed for this new overlay; the user's earlier route check is not relabelled as a geology check.

The unit description display cleans malformed degree-sign encoding while original evidence stays intact. Two-dimensional terrain clicking now invokes the existing inspector as intended, instead of allowing inspection only from the keyboard when no other overlay is selected.

## Evidence

- `results.json`: archive hash, native WKT, clipping counts, feature matches and raw relative separations.
- `independent-check.json`: source-to-output classification/topology checks.
- `source-ctx-local.png`, `controlled-hirise-local.png`: original-base comparison views.
- `app-overlay.png`: actual application screenshot.
- Reproduction: `docs/reproduction/06-geological-context-layer.md`.

Do not infer soil bearing capacity, friction, hazard exclusions, mineral reserves or astronaut clearance from geological unit names. No operational safety claim or absolute survey accuracy was established. No deployment or Supabase upload was performed.
