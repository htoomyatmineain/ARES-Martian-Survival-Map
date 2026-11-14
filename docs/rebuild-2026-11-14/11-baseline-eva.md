# Phase 11 — Baseline EVA simulation

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: A. Prerequisites: 06;07 content when ready.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Implement pure review/reducer with planning,outbound,arrived,science,ready-return,returning,complete. Separate mutable plan from immutable started snapshot.
- [ ] Demo defaults: crewed rover5 km/h,walking2 km/h,science20 min,total8 h,reserve25%. These are assumptions, not Perseverance speed or validated Mars EVA limits.
- [ ] ETA min=distance metres/(speed km/h×1000)×60. Required=2×one-way+science. Usable=budget−reserve. Reject invalid input, unverified profile and insufficient time.
- [ ] Lock selected route,destination,mode,speed,limits,approach at start. Simulate marker progress at1×/60×/600×; pause freezes clock; milestones wait for user.
- [ ] Approach arrival goes directly to return review with zero site science. Exact arrival permits a timed task, whose elapsed duration does not prove collected samples.
- [ ] Return retraces travelled corridor from current progress; delay consumes time without teleporting. Abort/reserve trigger must log once and keep actual position.
- [ ] Export route/snapshot/approach gap,times,notes,events and return/aborted/science-duration result. Reset clears session; reload persistence must be stated rather than implied.
- [ ] Gate: normal/pause/delay/abort/reserve-boundary/reset/approach tests pass. No oxygen/battery/live telemetry claim in this baseline.
- [ ] Commands: npm test.
- [ ] References: ../../mars-explorer-web/src/evaMission.ts; ../../mars-explorer-web/src/useEvaMission.ts; ../astronaut-eva-workflow.md; ../travel-time-estimates.md.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-11/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

