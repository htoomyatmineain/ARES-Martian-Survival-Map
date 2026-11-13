# Science approach routing — validation evidence

Checked 2026-11-13. Reproduction instructions: `docs/reproduction/04-science-approach-routing.md`. Machine results: `docs/science-approach-results.json`.

## Results

- Full automated suite: **52 tests passed**. Four new cases cover exact/custom behaviour, missing barriers and full-edge checks, diagnostics/bounded fallback, and approach-only mission/report semantics.
- Real NASA-source fixture: both named sites yield approach routes within the 250 m demonstration search radius. All 168 edges in each route pass unchanged 18° along, 12° sideways and 28° total rules. Native profiles contain 3653 and 3644 samples with no missing-height failure.
- Skinner Ridge: 3629.751 m surface route, 238.064 m horizontal straight-line gap. Actual endpoint 18.456457172979796° N, 77.40950639405784° E.
- Wildcat Ridge: 3621.452 m surface route, 249.547 m gap. Actual endpoint 18.455782348785473° N, 77.40915067860219° E.
- TypeScript and production/offline build passed. The existing Three.js chunk-size warning remains.

## Browser checks performed

- Skinner Ridge selected from Mission destination: native profile completed; destination ground bound 31.7° > 28° shown, approach endpoint rendered separately, route and endpoint-height labels changed to approach.
- Mission Review: actual-route ETA 44 min each way, remaining-gap notice, zero science and approach itinerary shown. Individually rounded legs can sum differently from the total calculated with unrounded values.
- Started Skinner Ridge approach-only simulation. Arrival paused at Return review; Begin science action was absent. Return completed to Debrief without science completion. Unit tests additionally confirm the report outcome is `returned-without-science` and retains requested/approach coordinates.
- Switched to Wildcat Ridge: old route approval cleared while searching. Native profile completed for its new endpoint; no-connected-path diagnosis and 250 m rounded gap appeared.
- Changed between 2D and 3D: 3D approach label was present. WebGL was unavailable in the agent's test browser, so rendered terrain/endpoint appearance was not visually verified there. The user subsequently confirmed on 2026-11-13 that the updated feature also works in 3D on their computer. This is a user-reported visual check, not an independent geometric accuracy measurement.
- Desktop and compact layouts expose the explicit approach-only review and mission controls. Screenshot: `docs/science-approach-preview.png`.

## Interpretation

No remaining leg to either science site is planned, checked, drawn or timed. No slope limit, source mask, target coordinate or DEM sample was relaxed. The 250 m radius is an engineering demonstration setting; it is not an operational safety clearance or guaranteed landing/parking zone.

The fallback chooses the lowest selected graph objective to a node within the radius, not necessarily the geographically nearest reachable node. Accepted route bounds and source-value checks establish calculation consistency under current assumptions, not astronaut safety or independent absolute ground accuracy. Custom targets never receive automatic fallback.

Source files: `src/scienceRouting.ts`, `src/nativeRouting.ts`, `src/nativeRouting.worker.ts`, `src/useNativeRoute.ts`, `src/RegionalWorkspace.tsx`, `src/RegionalMap2D.tsx`, `src/Scene.tsx`, `src/EvaMissionPanel.tsx`, `src/evaMission.ts` under `mars-explorer-web`.
