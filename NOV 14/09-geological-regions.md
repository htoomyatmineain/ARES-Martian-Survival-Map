# Phase 09 — Approximate geological regions

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: B prepares; A mounts. Prerequisites: 01,03.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Retrieve original SIM3464 database ZIP. Verify SHA256 a88bd53a5573743cc4a20036c10e585106d08a433ad2f34af269e9cea1529f87; a changed archive needs reassessment, not removal of its integrity pin.
- [ ] Read GDB/PRJ/raster/readme CRS: native central meridian 77.5 E, while pamphlet says77.3 E. Preserve conflict; use geometry's declared CRS and no Earth CRS substitute.
- [ ] Preserve source IDs, unit descriptions, holes and contact types. Densify <=100 m, transform and clip ±5000 m. Reject invalid topology rather than silently repair/simplify/fill.
- [ ] Compare original CTX base with controlled HiRISE in three regional windows; matching rejects outliers but applies no registration correction. Report actual raw separations and producer ~100–200 m offsets.
- [ ] Independently audit point membership, validity and coverage against original GDB. Pin released small output hash; ~349 MB raw archive stays ignored/local.
- [ ] A renders shared regions/contact styles/legend in both views with persistent approximate-context warning. No geology-to-soil-strength, extraction, reserve or route-safety conversion.
- [ ] Gate: source geometry/classification checks pass and offset limitations remain visible; no DEM/site/routing changes.
- [ ] Commands: python scripts/prepare-geology.py; python scripts/check-geology.py.
- [ ] References: REFERENCE/docs/reproduction/06-geological-context-layer.md; REFERENCE/docs/geology-validation/README.md.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-09/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

