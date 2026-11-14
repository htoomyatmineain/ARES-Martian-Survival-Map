# Phase 2 — assess and prepare Jezero geological units

Read `TEAMMATE-START-HERE.md` first. Goal: determine whether a usable official geological-unit layer covers our zone, then prepare a small clipped dataset only if justified. Do not assume suitable detailed coverage exists.

## Inputs and starting sources

- Shared 10 × 10 km boundary, Mars sphere and coordinate conventions in the start guide.
- Official challenge link: https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars
- NASA Mars Trek comparison viewer: https://trek.nasa.gov/mars/
- Current NASA terrain metadata and validation documents in this repository, especially `docs/elevation-validation.md`.

Use linked USGS/NASA publication pages, map legends and original GIS packages. A map viewer alone is not sufficient source metadata. Preserve publication identity, authors, version and release date.

## Ordered steps

- [ ] 1. Inventory official candidate maps with actual Jezero coverage. Prefer a published regional/local geological map over a global map where its mapping scale supports this use.
- [ ] 2. For each candidate record publication/product title, URL, download/service URL, scale, mapped area, file formats, unit attributes, licence/credit and metadata URL.
- [ ] 3. Read the projection metadata: planetary body, latitude type, longitude direction/domain, radii, projection parameters and datum/control information. Do not infer these from filenames.
- [ ] 4. Establish whether the actual source features intersect our entire or partial footprint. Record coverage and gaps. Do not treat a bounding-box overlap as proof of valid mapped features everywhere.
- [ ] 5. Assess useful detail. A coarse global geological map can be contextual, but cannot establish metre-scale boundaries, slopes, bearing strength or route safety. Document this explicitly.
- [ ] 6. Select one useful candidate or report `no-suitable-layer`. Provide reasons. Selection of a coarse contextual map is acceptable if clearly labelled and worth displaying.
- [ ] 7. If useful vector data are available, retrieve only the required layer/area where the service permits, or download the smallest official package. Preserve metadata and record hashes. Do not scrape map screenshots into invented polygons.
- [ ] 8. Transform using the documented source Mars CRS into our app frame. Use QGIS/GDAL/PROJ or an equivalent reproducible GIS tool. Record exact tool versions, source/target definitions and commands. If a planetary transformation is unsupported or ambiguous, stop the transform and document the blocker instead of assigning Earth WGS84.
- [ ] 9. Clip to x/z bounds −5000 to +5000 m. Preserve original unit IDs, names, descriptions, references, contact types and mapped uncertainty where available. Do not turn inferred/approximate contacts into precise boundaries.
- [ ] 10. Check geometry validity, finite coordinates and footprint intersection; repair only with an explicit logged operation. Keep original features for comparison. Avoid aggressive simplification; record tolerance in metres if used.
- [ ] 11. Compare transformed feature placement against the source map and recognizable terrain context at at least three well-distributed locations where meaningful features exist. Record screenshots/coordinates and any discrepancies. Do not invent an accuracy tolerance unsupported by the map scale and metadata.
- [ ] 12. Prepare the small output and report below. If only a raster/PDF exists, report that limitation and processing options first; do not silently digitize uncertain boundaries.

## Output contract

Create `docs/resource-preparation/teammate/geology/`:

- `assessment.md`: candidate comparison, selected source or no-suitable-layer conclusion, scale/coverage/limitations, completed checklist.
- `source-manifest.json`: URLs, metadata, retrieval UTC, files, sizes and SHA-256.
- `units.json`: original unit codes, labels, descriptions, colours and source references. Use source colours when documented; record display choices otherwise.
- `reproduce.md`: exact download, transformation, clipping and verification steps and tool versions.
- `validation.json`: actual checks/results, feature counts, bounds, geometry failures, reference comparisons, output bytes and unresolved questions.
- If suitable data were successfully processed: `geology-local.json`.

Suggested local output structure:

```text
schemaVersion: 1
coordinateSpace: local-mars-metres
axes: x-east / z-south
centre: latitude 18.46 / longitude 77.42
sphereRadiusMetres: 3396190
source: publication, version, source CRS and URLs
features: original ID, unit code, properties, polygon/multipolygon rings
```

Coordinates in `geology-local.json` are explicitly custom local x/z metres. Do not label this file as standard geographic GeoJSON. If additionally delivering GeoJSON for GIS tools, use a separate file with the correct Mars coordinate conventions documented in a sidecar; do not imply it is Earth WGS84.

If no suitable source can be processed, deliver the assessment and manifest without fabricated empty-success assets. Name exact missing inputs and the next reproducible action.

## Acceptance checks

- [ ] Source is traceable to official USGS/NASA records and covers the selected area meaningfully.
- [ ] Map scale and geological uncertainty are stated; no invented numerical precision.
- [ ] Source and target Mars coordinate conventions are explicit and transformations reproducible.
- [ ] Processed features have finite coordinates, valid geometry and documented clipping bounds.
- [ ] Unit attributes match the original legend; unknown units remain unknown.
- [ ] Spatial comparison findings and output size/hashes are recorded once.
- [ ] Future UI label is “Geology”, separate from CRISM mineral indicators and terrain slope.
- [ ] Geological units are not used to infer mineable deposits, ground trafficability or astronaut safety.
- [ ] Existing HiRISE data, coordinates, routing and Supabase assets remain unchanged.

Future integration: the main agent will add an optional overlay, legend, unit inspection and source/scale notice using this output. Both 2D and 3D must share the same transform. This phase does not authorize that shared UI integration.
