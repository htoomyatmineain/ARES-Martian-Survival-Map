# Rebuild progress ledger

## Existing application — expanded Emergency completion

Updated 15 November 2026 (Asia/Rangoon). Current Emergency changes: compact orange setup title with 18 px space below it, unnumbered fields, readable oxygen/EVA values, concise messages, recommended action first and state-aware banner. The guide and top speed controls are removed. Speed up 2× sits directly below Start Simulation; stages take 12 seconds normally or 6 seconds at 2×, without changing resource budgets.

Planned routes use the same default rules as Map/Mission. Wildcat Ridge reaches the exact site under those rules. Walking return is independently checked using selected equipment; a planned outbound route does not guarantee a permitted walking return. Local development automatically serves cached real map data through /local-map-preview and fetches missing assets server-side with integrity checks. Uncached files still need network access; production cloud loading is unchanged.

Current evidence: 112 unit tests, TypeScript/build and both current Emergency browser scripts passed. See the [current checklist](../emergency-simulation.md). These checks do not certify the separate clean-rebuild gates below.

Prepared 2026-11-14. All entries refer to the new rebuild, not historical work.

| Phase | Owner | Status | Commit / hashes | Evidence or blocked reason |
|---|---|---|---|---|
| 00 Project foundation | A; B reads | NOT STARTED | — | — |
| 01 Mars frame and contracts | A defines; B accepts | NOT STARTED | — | — |
| 02 NASA terrain acquisition | A; B discovers independent sources | NOT STARTED | — | — |
| 03 Lossless package and terrain validation | A; B waits for overview for registration | NOT STARTED | — | — |
| 04 Shared map delivery | A only | NOT STARTED | — | — |
| 05 Connected 2D and 3D | A | NOT STARTED | — | — |
| 06 Native slopes and routing | A | NOT STARTED | — | — |
| 07 Science sites and proposed missions | B; A integrates/access-tests | NOT STARTED | — | — |
| 08 Spectral and reported-mineral context | B prepares; A mounts | NOT STARTED | — | — |
| 09 Approximate geological regions | B prepares; A mounts | NOT STARTED | — | — |
| 10 Historical environmental observations | B prepares; A mounts | NOT STARTED | — | — |
| 11 Baseline EVA simulation | A | NOT STARTED | — | — |
| 12 Map and Mission interface separation | A;B supplies content | NOT STARTED | — | — |
| 13 Baseline integration acceptance | A integrates;B audits | NOT STARTED | — | — |
| 14 Full Mission extension: supplies,tasks,emergencies | A UI/state;B task content/guards | NOT STARTED | — | — |
| 15 Deployment and demo acceptance | A deployment;B claims audit | NOT STARTED | — | — |

Statuses: NOT STARTED, RUNNING, BLOCKED, PASSED. Reuse validated unchanged inputs with their original evidence/date. A blocked phase does not stop independent work in the other lane.

## Integration gates

- [ ] G0 — frame/schemas
- [ ] G1 — source package/terrain validation
- [ ] G2 — verified native routing
- [ ] G3 — baseline integrated system
- [ ] G4 — full Mission extension
- [ ] G5 — clean deployed visitor test

## Next actions

- A: start 00 and 01, then give B the agreed contract.
- B: read 01 and start Drive catalogue/source discovery; wait for validated overview before registration.

