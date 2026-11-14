# Phase 06 — Native slopes and routing

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: A. Prerequisites: 03,05.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Derive bilinear-cell gradients from native 1 m DEM with actual local metric spacing. Store conservative east/south gradient min/max in 10 m analysis cells, outward-rounded Float32. Any missing source corner blocks the cell.
- [ ] Build 20 m eight-neighbour A* in a cancellable worker. Every entire edge, exact connector, diagonal corner and cell boundary touch must pass; no unchecked smoothing or gap jumping.
- [ ] Use configurable demo limits along 18°, sideways 12°, total 28°. Distance cost weight 0; slope weight 4: cost = horizontal length × (1 + weight × ((along/limit)^2 + (cross/limit)^2)). These are not NASA astronaut limits.
- [ ] Optional fictional exclusion: 800 m radius at x=100,z=300; check whole segment-circle intersection. Geological colours never prove traction/soil strength.
- [ ] Verify accepted path on hash-checked native height tiles at <=1 m profile spacing before exposing distance/ascent/ETA or allowing mission start. Surface length sums sqrt(dx²+dz²+dh²); ascent sums max(0,dh).
- [ ] Attempt exact science target first. Named-site approach fallback searches within 250 m with unchanged hard checks and h=max(0,distance-to-target-radius). Preserve requested target vs actual endpoint; custom targets do not auto-fallback.
- [ ] Approach gap is straight-line/unplanned, not a walking leg; no site science or invented final-leg ETA. Check no-data, disconnected graph, corrupt assets and stale searches fail closed.
- [ ] Test analytic planes, sideways slope, narrow ridges between equal-height endpoints, missing strips, diagonal touches and exclusions. Independently compare real route profiles with original raster samples.
- [ ] Gate G2: native profile and meaningful synthetic cases pass; preserve real coordinates, limits and approach semantics.
- [ ] Commands: python scripts/prepare-routing.py; node --experimental-strip-types scripts/check-native-routes.mjs; python scripts/check-route-profiles.py; node --experimental-strip-types scripts/check-science-approaches.mjs; npm test.
- [ ] References: REFERENCE/docs/slope-routing-validation.md; REFERENCE/docs/science-approach-validation.md; REFERENCE/docs/reproduction/04-science-approach-routing.md.

## Calculation contract

For native NW/NE/SW/SE heights a,b,c,d and fractional east/south u,v:

```text
h(u,v) = a(1-u)(1-v) + bu(1-v) + c(1-u)v + duv
gEast(v) = ((b-a)(1-v) + (d-c)v) / dx
gSouth(u) = ((c-a)(1-u) + (d-b)u) / dy
along = atan(abs(gEast*tx + gSouth*tz))
cross = atan(abs(-gEast*tz + gSouth*tx))
ground = atan(hypot(gEast,gSouth))
```

Use extrema over every overlapping native cell, not average gradients or endpoint height differences. Convert radians to degrees for limits. For travel direction (tx,tz), maximize projections over the stored component envelope. This is conservative: component extremes may come from different points. A 20 m graph can miss narrower feasible corridors; a no-path result is about this graph/rules, not physical impossibility. Red flags at 80% of a limit are warning segments, not probability or rule exceedance. Measured surface distance and ETA require the verified dense native profile; A* objective uses graph horizontal edge lengths.

## Evidence and completion

- [ ] Write `docs/rebuild-evidence/phase-06/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

