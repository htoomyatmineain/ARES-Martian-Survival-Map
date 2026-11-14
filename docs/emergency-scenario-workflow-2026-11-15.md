# Emergency scenario workflow and self-test — 15 November 2026

## Workflow

Emergency is isolated from Mission: choose event → choose trigger stage and factors → select science destination/custom point → wait for verified route → Start Simulation → observe event at the selected route position → review the calculated options → return, shorten/perform permitted science, or simulate contacting base/contingency → download report/reset.

An existing Mission is optional context only. No Mission state, notes, supplies or real tracking are changed by Emergency.

## Scenarios

- Low oxygen: configured oxygen at the event; normal resource and critical-oxygen checks apply.
- Rover failure: rover is unavailable at the event; assess a walking return using carried equipment and walking terrain limits. Science is suspended. No repair, rescue or automatic transfer of the Mission rover battery is simulated.
- Reduced visibility: manually supplied visibility and retained walking-speed percentage. Below 20 m, all movement guidance is held and science is blocked; contact/contingency is offered. At 20 m or above, assess walking return at the configured reduced speed. This is a demonstration policy, not a NASA threshold, sensor reading, storm forecast or guarantee of navigation safety. No shelter location is asserted.

## Trigger timing

- Outbound: 5–95% of the selected verified outbound corridor; default 50%. Science target has not been reached, so site science is blocked.
- On site: event occurs at the selected destination before the simulated science activity. Science/shortening is permitted only if the configured resource constraints pass.
- Returning: 5–95% of the separately verified planned return corridor, default 50%. User must acknowledge simulated pre-event science completion before Start is enabled. Pre-event science is an acknowledged setup condition, not newly measured or automatically evidenced activity.

The pre-event path is assembled from verified outbound/return corridor sections. It never substitutes a straight line. A separate native-profile checked walking return is searched from the actual trigger point. Missing/failed verification never creates a safe-return claim.

## Resource rules

Oxygen and EVA minutes are explicit values **at the event**. Pre-event animation is not deducted a second time. These are normalized simulation inputs, not telemetry.

Defaults retained from the existing model:
- Full oxygen reference: 480 reference minutes.
- Walking: 2 km/h baseline; light/heavy kit uses the existing 0.9/0.75 speed and 0.9/0.8 slope multipliers.
- Oxygen load multipliers: light 1.1, heavy 1.25, baseline 1. Task workload comes from the selected mock task.
- Walking/task/reserve rate multipliers: 1 before task/load effects.
- Reserve: 60 minutes; <=10% event/current oxygen blocks science under the critical demonstration policy.
- Starting terrain limits: 18° along, 12° cross, 28° ground, adjusted for walking load. These are team settings, not certified Mars limits.

Reference oxygen rate = 100 / reference minutes percentage points/minute.
Task oxygen = task minutes × reference rate × task rate × task workload × load multiplier.
Return oxygen = verified walking-return minutes × reference rate × walking rate × load multiplier.
Reserve oxygen = reserve minutes × reference rate × reserve rate.
Science requires task + return + reserve to fit both oxygen and remaining EVA time. Return requires return + reserve to fit. Shorten uses only the explicitly predefined partial task, not an arbitrary optimistic duration. Task equipment mismatch blocks science but does not by itself block return.

Missing evidence yields Insufficient Data. A failed route search is not equivalent to proof that every possible route is impossible. The UI compares only the two evaluated strategies, prioritizing permitted actions; distinct higher-risk alternatives retain actual checked slope warnings/resource evidence.

## Execution and evidence

Pre-event travel, science and return each use 20-second accelerated playback. Progress on screen is separate from calculated EVA minutes. Science consumes its selected estimated oxygen/time during playback; finishing the clock does not create science evidence. A separate crew confirmation records simulated task observations. Science cannot be started repeatedly to reset its budget. It can be interrupted by a permitted return.

Return uses the chosen verified corridor. The displayed end-of-return oxygen and EVA minutes subtract both simulated science and return use. Contact Base is a local request counter only; it sends no message. Contingency does not establish rescue feasibility. Reports include scenario, location, event inputs, assumptions, assessments, simulation progress and crew confirmation.

## Test it yourself

Start with a nearby custom point near the simulated habitat, so long return distance does not dominate the demonstration. Browser tests used local E +2200 m, S +1600 m; the habitat is E +1900 m, S +1500 m. You can click near the habitat and read the local-coordinate field.

1. **On-site normal-resource control:** Low oxygen scenario, On site, oxygen 75%, EVA 240 min, nearby point, light kit. Start after verification. At the event, Continue Mission should be enabled if all displayed margins pass. Run science, confirm the observation record, then Initiate Return. Check oxygen/time changed and return reached habitat. Download report.
2. **Outbound critical oxygen:** Reset; Before reaching destination, progress 50%, oxygen 5%, EVA 240 min. Start. Marker should stop before the destination; science is blocked. Return is enabled only if return + reserve fits; otherwise contingency/contact is offered. A critical value does not magically guarantee a return.
3. **Rover failure on return:** Reset; Rover failure, Returning after science, progress 50%, oxygen 75%, EVA 240 min, nearby point. Start remains disabled until the pre-event science checkbox is acknowledged and routes verify. At event science is blocked. Return is walking, not powered-rover travel. Initiate it if permitted.
4. **Severe visibility:** Reset; Reduced visibility, On site, visibility 10 m, retained walking speed 50%, oxygen 75%, EVA 240 min. At event, science and Initiate Return are blocked. Contact Base increments a local counter; Emergency Contingency records a simulated hold/request decision. No movement or rescue is invented.
5. **Reduced but nonzero visibility:** Repeat at 100 m and 50% retained speed. Return estimate should be slower than baseline (same route/load and otherwise same inputs). It still must pass oxygen/EVA reserves.
6. **Shortened science:** Choose a task with a predefined partial version. Lower event oxygen or EVA time until the full activity fails but the partial version plus return/reserve fits. Only then Shorten Mission is permitted. Its playback uses the shorter duration.
7. **Views/reset:** Switch 2D/3D during an event; event position and assessment remain the same. Reset clears event, progress, science confirmation, request count and factors. Mission remains unchanged.

## Verification evidence

- Full unit suite: 111 tests passed, including all 3 scenario × 3 timing policy combinations, geometry at intermediate trigger points, invalid/unsupported return evidence, acknowledgement gating, science consumption and duplicate-start prevention.
- Real-data Chromium browser: on-site science/confirmation/return without active Mission; outbound critical oxygen; acknowledged return-leg rover failure with walking return; severe visibility hold/contact/contingency; 3D mounting; no JavaScript page errors.
- Final focused browser rerun: science-completion → return-review → habitat passed after the recommendation fix.
- Production build passed.
- Local browser test: `node tests/emergency-scenario-smoke.mjs` from mars-explorer-web, with a reachable dev server. Defaults to localhost:4181/explorer; override ARES_TEST_URL if needed. Uses locally cached source files when present, not fabricated terrain.

## Remaining limits

Suit battery, CO2 removal, cooling, radiation, medical injury, real communications/repair/rescue, hardware traction, visibility-based obstacle sensing and Mars weather are not assessed by these emergency decisions. This is an isolated decision-support demonstration using real terrain and simulated status, not operational astronaut clearance. Destination access remains conditional on reported coordinates; zero gap in a route does not certify a field approach.
