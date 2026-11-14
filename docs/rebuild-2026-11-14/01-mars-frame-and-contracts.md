# Phase 01 — Mars frame and contracts

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: A defines; B accepts. Prerequisites: 00.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Read SOURCE-AND-DATA-CONTRACT.md. Implement pure local/geographic inverse transforms with the declared Mars sphere, latitude convention and axes.
- [ ] Create explicit zone configuration before download scripts: centre, size, bounds, reference radius and nodata. Existing public/data/terrain.json includes legacy CTX preview heights: use its zone metadata only, not those 20 m heights as final terrain.
- [ ] Agree versioned Site, Layer, MissionBrief, Route and Mission schemas. Preserve existing two site IDs. A coordinates contract changes before B changes data shape.
- [ ] Test centre/corners, north/east directions, local 10,000 m side lengths, roundtrips and out-of-zone rejection.
- [ ] Retain per-source CRS, dtype, units and vertical datum metadata. Never assign Earth WGS84 or substitute a different source sphere silently.
- [ ] Gate G0: A/B agree the frame and data contracts; coordinate tests pass. Visible coordinate grid is distinct from 20 m search graph and 10 m analysis cells.
- [ ] Commands: npm test.
- [ ] References: ../../mars-explorer-web/src/terrain.ts; SOURCE-AND-DATA-CONTRACT.md.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-01/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

