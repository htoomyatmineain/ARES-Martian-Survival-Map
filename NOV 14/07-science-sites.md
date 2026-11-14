# Phase 07 — Science sites and proposed missions

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: B; A integrates/access-tests. Prerequisites: 01; 03/05 for registration,06 for access.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Export shared Drive candidate list and record filename/revision/hash. Classify named rocks, stops, observation targets and actual sampling sites separately. Preserve original records.
- [ ] Verify coordinate conventions, source URLs, dates, bounds and duplicates. Keep uncertain/out-of-zone candidates separate; never snap into the zone or move a source point to get a route.
- [ ] Preserve skinner-ridge-skyland and wildcat-ridge-hazeltop IDs. Existing report coordinates: Skyland 18.458931 N,77.40617078 E; Hazeltop 18.45863707 N,77.40588851 E. Cross-check original reports and actual imagery landmarks.
- [ ] Prepare versioned proposed mission briefs: site ID, question, purpose, stable tasks, assumed tools/time and NASA references. Reuse templates for similar sites. Clearly distinguish proposed astronaut activities from real NASA robotic observations.
- [ ] Select NASA photos with source credit, instrument, sol/date, viewpoint/depicted-target distinction and position limits. Deliver only small reviewed web assets.
- [ ] Deliver machine-readable catalogue, pure lookups/schema tests and evidence to A. A owns marker search/filter/group rendering and shared-map integration.
- [ ] A runs batch exact/approach routing with pinned data/rules. B reviews science interpretation. Record reachable-under-demo-rules, approach-only or no connected route, not operationally safe/impossible.
- [ ] Gate: every integrated record has stable ID/type/citations/uncertainty; approach-only prohibits site tasks. Unverified hundreds do not become verified merely by rendering.
- [ ] Commands: node --experimental-strip-types scripts/verify-packaged-sites.mjs; python scripts/audit-science-registration.py; npm test.
- [ ] References: REFERENCE/docs/science-sites.md; REFERENCE/docs/science-mineral-audit.md; REFERENCE/docs/reproduction/01-science-site-photos.md; REFERENCE/docs/reproduction/05-science-photo-integration.md.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-07/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

