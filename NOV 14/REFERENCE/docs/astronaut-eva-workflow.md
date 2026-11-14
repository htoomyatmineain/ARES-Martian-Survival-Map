# Astronaut EVA workflow — simulation

Implemented 13 November 2026 in the Western Jezero regional workspace. This is a session-based mission demonstration using the existing native-terrain route planner, not live crew operations or operational EVA clearance.

## Workflow

| Stage | What the user does | What the system does |
|---|---|---|
| Prepare and review | Choose a custom map destination, Skinner Ridge or Wildcat Ridge; choose crewed rover or suited walking and speed; review route strategy; set science time, budget and reserve | Requires a verified native elevation profile, valid inputs and a round trip that fits the demo time budget |
| Travel out | Start the EVA simulation | Locks the selected route, destination, slope rules, exclusion setting and travel assumptions; moves a symbolic crew marker along the selected route in both views |
| At target | Begin the science task or return | Pauses the simulation clock at arrival for review |
| Science | Run the planned task time; record simulation notes | Counts simulated task time, then pauses at the return-review milestone; does not fabricate real science measurements |
| Return | Start return, or abort earlier from the current position | Retraces the verified outbound corridor in reverse; computes remaining return time from progress |
| Debrief | Review the event log and notes; download a JSON report | Distinguishes completed science, return without completing science, and aborted/returned simulations |

The time estimator and mission workflow share the same travel-mode and speed state. Default rover speed remains an illustrative 5 km/h; walking defaults to a 2 km/h lunar planning analogy. These are not validated Mars mobility parameters. See travel-time-estimates.md.

## Demo time review

Defaults: 20 minutes of science, an 8-hour total time budget, and 25% of that budget reserved for contingency. All three are editable demonstration assumptions. The reserve is **time**, not an oxygen or battery percentage.

```text
one-way travel = verified route distance / assumed average speed
planned activity = outbound travel + science time + return travel
reserved time = total time budget × reserve percentage / 100
usable time = total time budget − reserved time
start allowed for simulation only if planned activity ≤ usable time
```

For the current 10.052545 km slope-priority route:

- Rover at 5 km/h: about 4 h 22 min outbound + science + return; fits within 6 h usable time.
- Walking at 2 km/h: about 10 h 24 min; does not fit within 6 h usable time, so departure is blocked under these assumptions.

Times use unrounded route metrics; UI durations round upward to whole Earth minutes. Passing the time review does not mean the mission is safe or supplied with adequate life support.

## Execution and contingencies

- Default simulation acceleration is 600× (10 mission minutes per real second); 60× and 1× are also available. This changes playback rate, not the physical speed assumption or ETA.
- Pause freezes the simulation clock and movement. Arrival and science completion deliberately pause for user review. These review pauses do not represent real operational waiting time.
- Simulate a 30-minute delay to consume budget without moving the crew. Delay injection is explicitly fictional.
- Abort from an outbound or on-site position starts return from that position, not from the original target.
- Before advancing an outbound/science tick, the model limits advancement to the available return-plus-reserve margin. When remaining time reaches predicted return time plus reserve, it automatically starts an aborted return. A large injected delay can already consume reserve; that is reported rather than hidden.
- Returning after partial science does not mark the science task complete. A zero-duration science plan completes only when the user begins that zero-duration task.
- Return uses the same corridor and average speed under unchanged terrain/exclusion assumptions. Absolute slope limits are symmetric under direction reversal. It is not a new route around newly detected hazards, a rover-failure walking rescue, or a dynamic replan.
- Crew marker position follows horizontal polyline fraction, scaled by the native-profile travel duration. It is a symbolic simulation marker, not a measured astronaut location or full 3D kinematic model.
- Planning inputs and travel mode/speed remain locked after departure, including at debrief, until Reset simulation. Map layers, inspection and 2D/3D switching remain available.

## Records and limits

The downloadable JSON includes the frozen plan, route metrics and points, demo rules and assumptions, elapsed simulated time, task-completion state, notes, outcome and timestamped event log. Unused legacy oxygen/time/feasibility placeholder fields are excluded. No new Supabase objects or database records are written. Reloading the page clears the in-memory mission; download the report to retain a record.

There is no validated suit oxygen, rover battery/range, fatigue, soil slip, thermal/weather, communications or rescue model. NASA science-site coordinates do not certify astronaut access. Thermal and mineral layers remain contextual and do not affect route costs.

## Validation

Five new state-machine tests cover round-trip/reserve review, unverified/invalid inputs, normal outbound–science–return completion, pause, plan snapshot isolation, early abort from the current location, injected delay, exact automatic-return threshold, incomplete science, report contents and reset. All 48 automated tests and the production build pass. Browser checks cover rover/walking budget rejection, locked plans, crew markers in both views, normal mission stages, early return/abort, report download and responsive layout.

Relevant code: evaMission.ts, useEvaMission.ts and EvaMissionPanel.tsx. The native route hook also tags results by destination, strategy and rules so a previous verified route cannot be used for a newly selected plan while recalculation is pending.
