# Phase 05 — Connected 2D and 3D

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: A. Prerequisites: 01,03; 04 for cloud visitor check.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Implement 2D pan/zoom, coordinate labels and native image patches on demand (reference: at 8× zoom, max 64×). Retain imagery's original projection during local-frame rendering.
- [ ] Implement true-scale 3D with a 10 m display mesh, valid triangles only and the same imagery/height frame. No exaggerated relief, invented rocks or gap filling.
- [ ] Share destination, scientific positions and route coordinates across both views. Drape visual routes onto actual mesh triangles; native analysis remains independent of display heights.
- [ ] Show missing terrain as unknown in 2D and absent triangles in 3D. Route analysis must also block gaps.
- [ ] Top-right groups view switch/Reset 3D; bottom-right zone name/area. Compass is north-up in 2D only; never show a fake fixed north arrow for an orbiting 3D camera.
- [ ] Check centre, edges, scale, north, corresponding landmarks, marker placement and route grounding. If simulated habitat/rover geometry is added use documented metre-scale dimensions.
- [ ] Gate: geometry/transform checks pass plus actual WebGL visual confirmation; DOM labels or a fallback are not a rendered-3D pass.
- [ ] Commands: node --experimental-strip-types scripts/check-regional-geometry.mjs; npm test.
- [ ] References: ../../mars-explorer-web/src/RegionalMap2D.tsx; ../../mars-explorer-web/src/Scene.tsx; ../LIVE_MAP.md.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-05/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

