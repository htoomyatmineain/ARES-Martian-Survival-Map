# Phase 4 — diagnose science-site failures and route to an approach point

Implemented 2026-11-13. Keep the existing terrain, science coordinates, native masks and slope limits. This feature must not silently claim the science destination was reached.

## Inputs and fixed contract

- Existing 1 m source-derived conservative 10 m hazard envelopes and 20 m search graph.
- Existing along-route 18°, sideways 12° and overall ground-slope 28° demo limits.
- Existing start habitat x=1900, z=1500 m and science-site catalogue.
- Configured approach search radius: 250 m. This is a demonstration search neighbourhood, not a NASA-approved safety distance.

## Ordered implementation

- [x] Try the exact requested destination first using unchanged complete-edge checks.
- [x] If it fails, check the habitat and destination cells. Preserve outside-map, missing-native-data and simulated-exclusion reasons. Report the measured conservative ground-slope bound when the cell exceeds the overall limit.
- [x] If both endpoint cells pass but search fails, report no connected graph path under the configured rules. Do not call the destination physically unreachable or attribute the failure to one specific intervening obstacle without evidence.
- [x] Enable fallback only for selected named science destinations. Custom destination failures remain failures.
- [x] Search the same graph for a reachable node inside the 250 m disk around the requested science coordinate. Use the same objective and hard checks for every edge and exact habitat connector.
- [x] Use admissible heuristic `max(0, distance_to_requested_site − radius)`. The first popped candidate minimizes the graph cost to the candidate set under the selected strategy; it need not be the closest geographic point to the science site.
- [x] Preserve the requested site coordinate separately. Store the actual endpoint, radius, diagnosis and horizontal straight-line separation with the route.
- [x] Stop the polyline at the approach endpoint. Do not append, draw or time the unverified final leg.
- [x] Verify the accepted approach route with the existing dense 1 m native height profile and fail closed on missing/corrupt native data.
- [x] Include fallback mode in the request identity. Cancel stale workers/profile fetches when destination, strategy, limits or exclusion change.
- [x] Show the original science marker and a separate approach endpoint in 2D; use the same actual route endpoint in 3D with an explicit approach label.
- [x] Label the route, endpoint height, remaining gap and mission review as approach-only.
- [x] For an approach-only simulation, force science time to zero, reject nonzero science settings, pause at return review on arrival and never mark science completed. The remaining gap is outside travel-time and mission coverage.
- [x] Preserve approach metadata and the unreached target in downloaded reports; completion outcome is returned-without-science.

## Calculation details

```text
gap = hypot(approach.x − requested.x, approach.z − requested.z)
h(node) = max(0, hypot(node.x − requested.x, node.z − requested.z) − 250)
```

Gap is horizontal straight-line separation, not a known traversable distance. Do not infer walking time from it. Surface-route distance and ascent still come from the original native DEM profile.

## Reproduce validation

From `mars-explorer-web`:

```powershell
npm test
node --experimental-strip-types scripts/check-science-approaches.mjs
$env:RAYON_NUM_THREADS='1'
npm run build
```

The synthetic tests cover exact-route precedence, no custom fallback, full missing-data barriers, edge validation, destination slope diagnostics, blocked habitats, bounded search and approach-only mission/report semantics. Existing terrain/routing tests remain in the suite.

The real-data script writes `docs/science-approach-results.json`, verifies every accepted edge and samples only the accepted corridor against the source elevation tiles. It does not certify the omitted final leg.

## Recorded real-data results: slope-priority, exclusion off

| Requested site | Exact-route failure | Actual route distance | Straight-line gap | Approach endpoint x/z |
|---|---|---:|---:|---|
| Skinner Ridge | Destination ground bound 31.7° > 28° | 3629.751 m | 238.064 m | −590 / +210 m |
| Wildcat Ridge | No connected graph path under all limits | 3621.452 m | 249.547 m | −610 / +250 m |

Both accepted routes contain 168 checked edges. Maximum along bound is 11.617°, sideways 10.834°, overall 12.227°. Profiles contain 3653 and 3644 samples respectively. These are algorithm/source-derived figures, not an absolute safety assessment. Changing strategy, exclusions, limits or source data can change these results.

## Browser acceptance checklist

- [ ] Choose each named site: exact failure reason and checked approach appear, with a separate endpoint and no drawn final leg.
- [ ] Review: approach-only label, gap, zero science and correct actual-route ETA.
- [ ] Run approach-only simulation: no Begin science action; arrival pauses at return review; returning completes without science.
- [ ] Changing destinations/strategy clears stale route approval while a new route is checked.
- [ ] Custom destinations do not receive automatic approach fallback.
- [ ] Check the 3D endpoint label if WebGL is supported; otherwise record the limitation.

See the implementation evidence note beside `science-approach-results.json` for the actual browser checks, rather than treating unchecked items above as already completed.
