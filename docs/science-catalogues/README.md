# Science catalogue handoff — 14 November 2026

Branch: codex/science-site-catalogues. Base: origin/main 9be10df. Data-only delivery; no shared app files, routing rules, coordinates, terrain or UI changed. This supersedes the earlier checklist UI proposal for this assignment; do not merge that old branch to obtain these catalogues.

## Contents and results

- sites.json: existing two historical rover sampling outcrops, unchanged stable IDs/coordinates, source URLs/PDF pages, local zone positions, explicit absolute-location/vertical-datum uncertainty. This is not an exhaustive census of the 10 x 10 km zone.
- science-objectives.json: one proposed mission objective per site and a shared stable task template, proposed camera/notebook equipment, conditions and limitations. No collection, measurements or success is fabricated. No fixed time, equipment mass or supply consumption is invented.
- access-results.json: rerun existing planScienceRoute from habitat x=1900,z=1500, slope-priority, exclusion off, existing 18/12/28-degree rules and 250 m approach radius. Includes route points, endpoints, reasons, gaps and profile provenance.
- ground-hazards.json: DEM-derived containing-cell slope evidence linked to NASA HiRISE source; direct ground-hazard observation arrays empty. Soil strength, traction, loose sand and individual-rock obstacles explicitly unknown. No geological-colour hazard inference.
- validation.json: machine-readable checks, input/output hashes and limitations.
- scripts/build-science-catalogues.mjs: reproducible generator using existing application routing code read-only.
- tests/science-catalogues.test.ts: catalogue consistency, task restrictions, unknown hazards and artifact integrity.

Skinner Ridge: approach-only, 238.06439898917898 m horizontal gap. Exact destination conservative ground bound exceeds the configured 28-degree demo rule (31.7 degrees rounded in router diagnosis).
Wildcat Ridge: approach-only, 249.54724721691815 m horizontal gap. No connected search-grid route under existing rules; this does not establish physical impossibility.
Exactly reachable: 0; approach-only: 2; unreachable under recorded scenario: 0. Status enum supports all three; no invented site is added to demonstrate another status.

## Evidence and uncertainty

NASA context page reviewed online:
https://science.nasa.gov/resource/two-perseverance-sampling-locations-in-jezeros-delta/

Coordinates and relative registration reused from existing NASA PDS-backed catalogue and docs/science-registration-results.json:
https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_dossier/initial_reports/initial_reports_volume2.pdf

Relative marker agreement is not absolute survey error. Existing latitude interpretation and unresolved vertical datum remain explicit. No new direct site-specific ground observations were verified; missing evidence is not proof of safe ground. No broad soil/sand exclusion polygons were created.

## Validation

Run from mars-explorer-web:

```powershell
node --experimental-strip-types scripts/build-science-catalogues.mjs
npm test
npm run build
```

Generator PASS: source hazard binary hash verified, both existing sites within zone, exact existing router rerun, every route edge checked, prior approach metadata/bounds/sample counts matched. npm test PASS: 57 tests, zero failures (3 new).

IMPORTANT: native lossless elevation tile files are absent in this clone. Dense elevation profiles could not be rerun. profileStatus is therefore prior-recorded-evidence-not-rerun; distance/ascent are carried from docs/science-approach-results.json only after endpoint, requested coordinates, rules, gap, edge/sample counts and slope bounds agree with the new routing run. The generator fails on corrupt data and errors other than missing files. Existing source profile evidence is not presented as fresh verification. Restore the existing map package and rerun to obtain verified-current-run profile status. No new datasets were downloaded.

Build: PASS, including TypeScript, Vite and offline generation; existing Three.js chunk-size warning remains. No browser checks claimed for data-only work.

## Integration instructions

1. Merge this branch/commit into the main teammate branch. All additions are under docs/science-catalogues plus one new generator and one new test.
2. Load catalogue records keyed by siteId; never substitute display names for IDs. Join objectives via taskTemplateId to templates. Parent mission interface owns task state, supplies, emergency behavior and durations.
3. Display proposed-human-activity visibly; preserve source links and uncertainty. A task record means a simulated action, never verified scientific success.
4. Treat access-results as a recorded scenario snapshot, not live route clearance. Use the actual current/frozen route.approach to disable site science and keep its duration zero. Recompute after start, rules, strategy, terrain or exclusion changes. Require normal live native-profile approval before departure; these JSON route points do not bypass it.
5. For exactly-reachable routes, allow site tasks only after exact arrival and during the appropriate science phase. For approach-only or unreachable results, do not complete sampling/site tasks, draw or time the unresolved final leg, or relocate the target.
6. Display unknown hazards as unknown; do not use null/empty arrays to mean safe. DEM slope evidence is a derived bound, separate from direct observed ground hazards.
7. Main teammate performs integration, source-cache/profile revalidation and end-to-end UI/supplies/emergency testing. No app components or separate checklist UI are included here.
