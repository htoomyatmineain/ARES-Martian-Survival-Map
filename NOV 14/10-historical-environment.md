# Phase 10 — Historical environmental observations

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: B prepares; A mounts. Prerequisites: 01;03 for spatial checks.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Prepare selected TIRS ground readings on MEDA sols477/502 with source row/time/uncertainty and eligible quality flags; unknown flags remain unknown.
- [ ] Use same-sol PLACES anchor plus MEDA ancillary displacement, ancillary matching <=2s, for approximate rover position. Preserve unknown sensor footprint and product UTC range vs exact sample time.
- [ ] Discover calibrated ATS/derived PS CSV/XML filenames in NASA directories. Verify label bytes, MD5, records and SHA256.
- [ ] Match actual ATS/PS samples within30 spacecraft-clock seconds of reference TIRS. Keep individual times and signed offsets, no interpolation/average/simultaneity claim.
- [ ] Retain five local ATS detector temperatures, not corrected ambient air average. Celsius=kelvin−273.15. Pressure is Pa; pressure-uncertainty label says kelvin, so preserve inconsistency and invent no Pa error bar.
- [ ] One missing pressure remains unavailable. No wind product in checked sol directories means unavailable, not zero or no wind data anywhere.
- [ ] A exposes one Environmental Observations control covering ground/air/pressure/day/time/detector/source details. No duplicated thermal toggle, live weather, zone-wide heatmap or simulated crew condition claim.
- [ ] Gate: audit every exported row/value/time/match/missing flag. Historical reference:43 ground selections,43 air records,42 pressure; investigate differences honestly.
- [ ] Commands: python scripts/prepare-environment.py --download; python scripts/check-environment-source.py; python scripts/prepare-historical-weather.py --download; python scripts/check-historical-weather.py.
- [ ] References: REFERENCE/docs/historical-weather/README.md; REFERENCE/docs/reproduction/07-historical-environment.md; REFERENCE/docs/environmental-observation-layers.md.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-10/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

