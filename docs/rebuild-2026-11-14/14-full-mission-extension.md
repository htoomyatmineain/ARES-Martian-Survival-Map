# Phase 14 — Full Mission extension: supplies,tasks,emergencies

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: A UI/state;B task content/guards. Prerequisites: 13;07 science content.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] This is planned new work, not a current completed feature. Build header with mission/objective/phase/simulation, current-action progress, and smaller map with remaining distance/return ETA.
- [ ] Create separate oxygen,suit-battery,rover-battery models (rover only when used). Editable assumed capacity/endurance,initial fraction,consumption and reserve; document model units and no NASA-certified parameters.
- [ ] Oxygen equivalent remaining min=max(0,initialFraction×fullEndurance−accumulatedEquivalentUse). Percent=100×remaining/fullEndurance. Compare against modelled return demand+reserve; activity-dependent use integrates rate×time. Do not invent tank pressure/mass.
- [ ] Model battery independently as documented energy/power or explicit equivalent endurance; no fake Wh if only duration exists. State suit continuous load and rover travel/idle use. Reconcile percent,duration and return margin.
- [ ] Lock supplies/brief in snapshot. Pause freezes simulated use; delays consume configured supplies; depletion clamps0. Preflight includes outbound,task,return and reserve for each supply.
- [ ] B supplies stable proposed task IDs/references/pure guards; A owns checklist state/UI. Arrival means tasks pending. Exact-site science phase permits explicit crew confirmation with timestamp; timer alone never checks a sampling task.
- [ ] Low O2 and low suit/rover battery first: explicit injection,event,cause,recommendation,acknowledge/return controls. State recommended vs automatic policy. Trigger once without teleporting; NASA historical records are immutable.
- [ ] Rover failure and low visibility are separate subgates: unavailable rover stops rover motion; a walking return needs separately assessed time/resources/feasibility, otherwise report no assessed return/rescue required. Simulated visibility does not become a NASA storm reading.
- [ ] Debrief/export includes planned/actual time,intended vs actual endpoint,task confirmations vs timed work,supply use/remaining,model assumptions,events/responses,return outcome. Reset clears all scenario/task state.
- [ ] Test invalid/insufficient inputs,units,exact reserve boundaries,simultaneous alerts,pause/delay/reset,snapshot isolation,repeated injections,feasible/infeasible return,depletion and aborted/approach no-science. Browser normal and emergency flows.
- [ ] Gate G4: normal+low-resource missions and every implemented supply reconcile. Full phase completion additionally requires rover-failure/visibility,task/debrief integration; deferred subgates stay unchecked.
- [ ] Commands: npm test; npm run build.
- [ ] References: ../mission-parallel/MAIN-SAFETY-INTEGRATION.md; SOURCE-AND-DATA-CONTRACT.md.

## Interface acceptance by region

| Region | Required visible behavior | Source of values |
|---|---|---|
| Header | Mission name, phase, simulation indicator | Locked brief and mission state |
| Status strip | O2, suit battery, applicable rover battery, elapsed time | Documented demo resource models; unavailable values say unknown |
| Main area | Current action, progress and next decision | State machine; no automatic science success |
| Tasks | Objective, checklist, crew confirmations | Reviewed proposed tasks + explicit user events |
| Navigation | Small route map, position, remaining distance/return ETA | Same verified route/snapshot; actual progress |
| Alerts | Cause, recommendation, acknowledgement and response | Explicit simulated event + model margin |
| Debrief | Confirmed tasks, resources and return outcome | Recorded events, never invented sample results |

Suggested state shape for A/B to agree before phase 14 code:

```ts
type TaskConfirmation = { taskId: string; atMinutes: number; confirmed: boolean };
type SupplyModel = {
  id: 'oxygen' | 'suitBattery' | 'roverBattery';
  unit: 'equivalentMinutes' | 'Wh';
  fullCapacity: number;
  startingFraction: number;
  reserveFraction: number;
  // Rates must use capacity-units per simulated minute.
  usePerMinute: { travel: number; science: number; idle: number };
  assumption: string;
};
```

Do not mix percent, minutes and Wh in a calculation. No need for real suit telemetry, live sensors or a backend to run the local demonstration. If persistence/sharing is later added, define authorization and versioning separately; do not upload recordings by default. Keep all task guards pure and testable, with UI state owned by A. The previous teammate checklist-component assignment is superseded by this two-lane rebuild contract.

## Evidence and completion

- [ ] Write `docs/rebuild-evidence/phase-14/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

