# Teammate assignment: HUD test preparation and current 3D validation

> **Status update, 14 November 2026:** [Emergency Simulation validation](emergency-simulation.md) is complete, including 2D/3D selection, oxygen endurance and independent return-route assessment. The statement below that regional oxygen/contingency models are unimplemented is historical. This does not complete the deferred shared-state HUD or the HUD-specific tests below; those checkboxes remain unchanged.

Requested 2026-11-13. **The planned Tablet/HUD mode switch and shared-state HUD have not been implemented.** Existing 3D Tactical and legacy first-person views are not evidence that the planned HUD is complete. Oxygen supply and contingency models are also not implemented in the regional mission workflow.

## Scope

Prepare the HUD acceptance tests and test the existing 3D foundations on a hardware-accelerated browser. Do not implement the deferred HUD, alter production code, change terrain/safety rules, deploy or write to Supabase under this testing assignment. Report blockers honestly. A separate instruction is required for HUD implementation.

## Start

1. Preserve existing work, fetch origin and create `codex/hud-validation` from latest `origin/main` in a separate checkout/worktree. Do not switch branches in a checkout another agent is using.
2. Read `docs/HUD-PLAN.md`, `docs/science-approach-validation.md`, `docs/geology-validation/README.md`, and `docs/astronaut-eva-workflow.md`. Later approach-routing documents supersede the original workflow's science-at-every-destination description.
3. Inspect current code so tests refer to actual behaviour and distinguish it from planned features. Start the frontend with its package scripts and open `?workspace=regional`. The shared terrain should load without local ZIP injection.

## Test now on the existing application

- [ ] Record browser/version, operating system and whether WebGL rendering works. Do not change browser security settings to bypass a failure; report it.
- [ ] Confirm 3D terrain, north orientation and scene controls work. Compare identifiable terrain/science markers against 2D using the same selected location; visual consistency is not absolute geolocation proof.
- [ ] Enable Geological regions: seven unit types and labels, same orientation/regions as 2D, opacity works, no obvious texture flip, no new ground across missing terrain. Keep the 1:75,000 and approximately 100–200 m source-offset notices visible/accessible.
- [ ] Select each science destination. Confirm the actual approach endpoint and ground-following route appear in 3D, while the original science marker remains distinct. Do not draw or interpret the final gap as a verified route.
- [ ] Switch 2D/3D during a simulation; route, position, elapsed time and locked plan persist. Pause and return work.
- [ ] Confirm approach-only arrival/return does not claim the science site was reached or sampled.
- [ ] Open both science-site photos from the shared details panel. Correct image, date/sol, camera and NASA/JPL-Caltech credit appear.
- [ ] Check failure behaviour if WebGL is unavailable using an available normal test environment, without disabling system protections. If not tested, mark not run.

Preserve screenshots and observations. Do not rerun expensive terrain conversion or full native-data audits for unchanged files. Existing automated results can be reused for unchanged inputs; run checks affected by any new failure or changed code.

## Prepare HUD tests for future implementation

Write cases with setup, action, expected result and evidence requirements for:

- Tablet → HUD → Tablet preserves one mission snapshot, route, endpoint, progress, clock, task state and simulated resources.
- Ground-level viewpoint stays above valid terrain, handles missing data and turns without unstable jumps.
- Navigation arrows follow checked route segments and stop at the actual endpoint; heading, next waypoint and remaining distance agree with route geometry.
- Camera/route alignment works in walking and hypothetical crewed-rover modes, without implying a detailed rock collision model exists.
- High-detail tile loading is bounded, cancellable and does not invent terrain or change coordinates when detail changes.
- Simulated oxygen shows supply rather than blood saturation; declared demo consumption, time remaining, return allowance and alerts remain numerically consistent.
- Injected oxygen loss, dust/visibility and rover-unavailable events are labelled simulated. Rover breakdown requires an assessment from current position; no invented walk-back guarantee.
- Pause, reset, return, view switches and exported reports stay consistent after each event. Distinguish elapsed simulation time from unmodelled real operations.

These future cases must be labelled **not run — feature not implemented** until the corresponding code is available. No invented passes, safety certification, measured weather or real-time tracking claims.

## Deliverables

Only write under `docs/hud-testing/` (small evidence images are allowed):

1. `current-3d-results.md`: environment, cases actually run, pass/fail/not-run, screenshots and reproducible issues.
2. `hud-acceptance-tests.md`: future cases and exact acceptance conditions, with unimplemented features clearly marked.
3. `readiness.md`: what is available, what must be built, practical technical risks and suggested implementation order.

Record any failed test's expected/actual behaviour, reproduction steps, severity and supporting screenshot. Do not silently fix shared production files in this branch. Commit scoped testing deliverables and report branch/hash. Do not merge or push without instruction.
