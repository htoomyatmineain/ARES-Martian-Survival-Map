# Phase 08 — Spectral and reported-mineral context

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: B prepares; A mounts. Prerequisites: 01;03/05 for alignment.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Read exact CRISM product/header/label and parameter definitions in SOURCE-AND-DATA-CONTRACT.md. Retain source 36 m spacing, different sphere, nodata 65535 and ENVI BSQ layout.
- [ ] Fetch reviewed OLINDEX3/D2300/BD2500_2 bands with checked HTTP206 ranges, lengths and hashes. Three band-range hashes do not verify the full source cube checksum.
- [ ] Transform local positions into source CRS, selecting nearest source values on 250×250,40 m output cells. Preserve negative values and missing mask; no smoothing, invented threshold or gap fill.
- [ ] Deliver pinned small rasters and legends: spectral indicators, not confirmed minerals, abundance, confidence or mineable deposit boundaries. Keep rover-reported point detections distinct.
- [ ] Independently audit samples, projections and coverage; wait for actual overview before image-registration checks.
- [ ] A integrates exclusive orbital overlay choices, opacity and source/coverage inspection in both views. Do not change route costs.
- [ ] Gate: source sample/mask audit passes and measured coverage is disclosed; colour stretch is not a mineral detection rule.
- [ ] Commands: python scripts/prepare-orbital-minerals.py --download; python scripts/check-orbital-minerals.py; python scripts/audit-mineral-registration.py.
- [ ] References: ../orbital-area-layers.md; ../mineral-registration-results.json.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-08/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

