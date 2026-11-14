# Main agent: safety simulation and integration

Read `START-HERE.md`. Work after the latest main baseline on `codex/eva-safety-integration`; preserve teammate-owned files until merge.

## First increment: one understandable oxygen scenario

1. Inspect current mission reducer, hook, review and export. Preserve exact route/approach rules and existing time reserve behavior.
2. Implement a pure, configurable **demo oxygen budget**, not a spacesuit engineering or medical model. Use an explicitly assumed full-tank endurance in minutes, starting percentage and reserve percentage. Derive remaining equivalent minutes and percentage from simulated elapsed time; do not invent oxygen mass, pressure, metabolic consumption or NASA-certified limits. Reject nonfinite/negative settings. Mission reset and snapshot semantics must include these assumptions.
3. Compare remaining equivalent minutes against estimated return time plus the chosen oxygen reserve. Label the result a model-based demo margin, not guaranteed safe duration. A low-oxygen injection changes only simulated state, records an event and never modifies NASA MEDA observations. Preserve consistent resource accounting through pause, delay, return and reset.
4. Show an explicit warning and return recommendation. If automatic return is implemented, document that demo policy and trigger it once without teleporting or restarting a return already in progress. Existing walking/rover speed assumptions must remain visible. Do not claim rover-failure evacuation is solved by this model.
5. Add focused tests for boundary behavior, depletion/zero, invalid inputs, pause, delay, reset, snapshot isolation, no repeated trigger and no false science completion on an aborted or approach-only mission.

## Science integration after teammate delivery

6. Merge the teammate commit and inspect it. Main owns all changes to existing `EvaMissionPanel`, `evaMission`, `useEvaMission`, `RegionalWorkspace` and report exports. Mount `EvaScienceBrief` with the real selected site ID and actual approach status. Parent owns task completion state; clear it on new mission/reset and lock the brief to the started snapshot.
7. Keep timer-based science completion distinct from manually recorded task completion. Reports must state both; elapsed task time does not prove samples were collected. Include objective, recorded tasks, approach/final-access limitation, assumptions, scenario events and return outcome.
8. Test exact-target, approach-only and custom-target behavior. Use synthetic tests to exercise reachable site-task completion if real science sites remain unreachable. Do not silently relax slope rules or fabricate an accessible site.
9. Run historical source audit, relevant new tests, full application tests and build once final code is ready. Browser-test a normal mission and low-oxygen return, including pause/reset and source labels. Record evidence and limitations. Visual 3D confirmation needs WebGL hardware acceleration.

## Deferred gaps

Individual-rock/soft-soil detection, validated suit/equipment workload, rover-failure rescue, storm navigation, live weather and helmet HUD remain separate work. Document them. Complete the first integrated mission flow before expanding scope.
