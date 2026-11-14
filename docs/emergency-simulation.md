# ARES Emergency Simulation — implementation and final validation

Updated **15 November 2026 (Asia/Rangoon)**. Expanded Emergency Phases 1–4 are complete in the local working tree. **PASS for the tested hosted-terrain demo workflow**, subject to the limitations below. The earlier MVP commit `5562d6a` is historical; it does not contain this expanded implementation. This update does not claim deployment or GitHub publication of the pending work.

## Latest selection and DSS usability update

Before Start, choose a named science destination or keep free-pick mode active for repeated 2D/3D terrain clicks. Each selection shows a destination pin and a dashed, verified planned outbound route; invalid/unverified routes are not reused as previews. Science labels do not intercept free-pick clicks. The same selected coordinates drive task eligibility, planning return verification and resource/DSS calculations.

Start locks the plan, removes the planned preview and moves the cyan helmet marker from habitat along the actual route with a solid trail only behind it. The completed outbound trail remains visible at arrival. Mission details and technical sources/assumptions are collapsed by default. Alerts distinguish Low Oxygen, EVA Time Exceeded, No Verified Return Route and Insufficient Data using actual calculated evidence; planning alerts are explicitly previews.

Validation for this update: **51 targeted tests passed**, TypeScript/build/diff checks passed, and a production-port browser test verified named destinations, repeated picks, 2D/3D coordinate agreement, preview-to-trail transition, collapsed evidence and critical alerts. Browser test: `node tests/emergency-selection-smoke.mjs` with the production server on port 4173.

## Current scope and workflow

Open `/explorer` or `?workspace=regional`. Emergency is isolated from existing Mission/Map state and calculations. Flow: select a location on 2D or Tactical 3D → choose an eligible proposed science task → set arrival oxygen using the **0–100%, 1% step slider only** → choose equipment/activity assumptions → start → outbound travel → arrival → severity-aware alert → Decision Support / Route Comparison → simulated action or Reset.

- Multiple eligible tasks include description, objective, steps, equipment, estimated duration, provenance and predefined shortened variants where available. Task durations and human EVA assignments are simulated, not NASA-published astronaut tasks.
- USGS geology is approximate (100–200 m registration uncertainty). Locations near uncertain contacts or without sufficient context fall back to generic simulated documentation. Valid CRISM pixels alone never establish mineral detection, abundance or exact rock chemistry. Primary rover-site proximity is contextual, not proof of exact outcrop access.
- None/Light/Heavy equipment reuses existing mobility/slope assumptions. Walking is modeled; Running is visibly unavailable because no supported speed/workload model exists.
- Start requires a complete verified outbound route from simulated Ares Basecamp `{x:1900,z:1500}` and locks configuration. The colored traveled trail grows only behind the astronaut; no completed colored outbound path appears before departure. Each leg uses clearly labeled 20-second accelerated visual playback, independent of calculated EVA time.
- Arrival captures a read-only copy of the actual Mission snapshot and `max(0, budgetMinutes - elapsed)`. Missing EVA context stays Unknown. The selected Emergency task replaces the legacy science-duration assumption; it is not added to it. Mission calculations are unchanged.
- Independent return searches verify endpoints, terrain/slope constraints and native elevation profiles. Both 2D and Tactical 3D consume the same route results and metrics. No second route is fabricated.
- Continue, Shorten, Return and Emergency Contingency expose allowed/blocked/unknown state with reasons. Shorten requires a predefined partial task. Selecting a science plan is a simulated planning action, not a claim that science has been performed.
- Initiate Return to Base animates the crew along a locked verified return route and models travel consumption. Contact Base records a local **SIMULATED** request; it sends no real message and claims no acknowledgement. Reset/tab exit cleans up independent simulation state.

## Resource and decision model

All coefficients are configurable **simulation assumptions**, not NASA-certified Mars suit performance. Defaults: full normalized capacity calibrated to **480 reference-activity minutes**, base walking **2 km/h**, reserve **60 minutes**, walking/task/reserve rate multipliers **1**, Light consumption multiplier **1.1**, Heavy **1.25**. Existing mobility applies Light/Heavy speed factors **0.9/0.75** and slope factors **0.9/0.8**. Task-specific workload multiplies science consumption. Reference capacity does not mean universal 480-minute endurance under every activity or load.

```text
referenceRate = 100 / referenceMinutes                  # percentage points/min
availableOxygen = oxygen selected at emergency arrival
scienceCost = selectedTaskMinutes × referenceRate × taskRate × taskWorkload × load
returnETA = actual verified return surface distance / effective walking speed
returnCost = returnETA × referenceRate × walkRate × load
reserveCost = reserveMinutes × referenceRate × reserveRate
oxygenMargin = availableOxygen - scienceCost - returnCost - reserveCost
EVAMargin = capturedRemainingEVA - selectedTaskMinutes - returnETA - reserveMinutes
```

Outbound travel is not deducted again. Return-only margins omit the science task. Reserve is a protected allowance, not automatically deducted as actual travel consumption. Unknown inputs never become zero. Continue/Shorten require both oxygen and EVA margins to fit; Return is assessed independently of task equipment eligibility. The default critical policy (oxygen ≤10%) blocks science even when arithmetic fits. Failed or missing route verification cannot produce a Model-Feasible route.

Normal ≥60%, Caution 30–59%, Low <30% and Critical ≤10% are warning labels, not sole decision criteria or NASA standards. CO₂ removal, cooling, battery, physiology, absolute geolocation and rescue remain **Not assessed**.

## Route presentation

Cyan means a verified return is **Model-Feasible under configured oxygen and EVA constraints**. A red dashed alternative must be distinct, independently verified and supported by greater actual terrain-warning bounds or resource/EVA failure relative to a feasible primary. When both routes fail the budget, comparative risk wording cites the terrain evidence rather than treating their shared budget failure as a unique risk. Unknown/blocked candidates are not cyan.

Helmet/habitat icons and return-direction arrows use actual coordinates. Magenta marks actual slope-bound warning segments; no decorative danger zones or inferred loose-soil hazards are drawn. Emergency routes have no black casing and dashed gaps are transparent. Decision Support is separate from the floating Route Comparison card. Mobile results reserve space below the map so the comparison does not cover the route viewport. Existing Mission/Map rendering remains unchanged.

## Final acceptance checklist — 10/10 verified

- [x] Live browser: complete Emergency workflow, including arrival, decisions, actions and Reset.
- [x] Multiple eligible location-based missions, descriptions, provenance and generic uncertainty fallback.
- [x] Oxygen slider supports 0–100%; no oxygen presets or quick buttons.
- [x] Resource-based decisions respond to mission, workload, equipment, oxygen and EVA budget; critical restrictions hold.
- [x] Prominent severity-aware emergency alert follows reference hierarchy; critical styling is red.
- [x] Progressive route trail follows the astronaut; habitat/helmet icons and return directions are present.
- [x] Verified cyan/red return results are shared between 2D and Tactical 3D; no invented alternative.
- [x] Floating comparison shows real distance, ETA, consumption and slope evidence; mobile overlap was corrected.
- [x] Return to Base and Contact Base work through truthful simulated UI actions.
- [x] Missing data, desktop/mobile layouts and existing Mission/Map regression checks pass.

## Validation evidence and commands

**48 targeted tests passed** across decision, task/resource, Emergency, EVA Mission, mobility, native routing, map-layer and navigation contracts. TypeScript, production build, JavaScript smoke-script syntax and `git diff --check` passed. No new dependencies or version changes were introduced.

Live Chromium browser checks were completed across focused runs using actual hosted NASA-derived terrain bytes with application integrity checks intact. The live hosted manifest returned HTTP 200 and matched the browser-tested release hash. Checks covered **5%, 30%, 60%, 90%**, slider endpoints 0/100, multiple tasks, None/Light/Heavy equipment, unsupported Running, predefined partial tasks, workload-driven recommendation changes, critical policy, progressive travel, 2D/3D coordinate/metric agreement, simulated return/contact, reset/tab cleanup, missing terrain/hazards and 1440/1024/700/390 px layouts.

Browser harness corrections: read marker/trail atomically during animation; do not expect multiple missions at uncertainty-boundary locations; expand assumptions before editing; allow normal asynchronous 3D startup. Production polish: emergency-heading specificity, comparative-risk wording and mobile map/card separation. Evidence screenshots/logs are generated under `mars-explorer-web/scripts/.cache/emergency/` and are not committed.

From `mars-explorer-web`:

```powershell
node --experimental-strip-types --test tests/emergency-decisions.test.ts tests/emergency-planning.test.ts tests/emergency.test.ts tests/eva-mission.test.ts tests/mobility.test.ts tests/native-routing.test.ts tests/regional-layers.test.ts tests/navigation-contract.test.ts
npm run build
npm run dev -- --host 127.0.0.1
# Another terminal, with the dev server running and an existing Chromium available:
node tests/emergency-smoke.mjs
# Optional focused continuation of the Mission/action/failure checks:
$env:ARES_SMOKE_MISSION_ONLY='1'
node tests/emergency-smoke.mjs
Remove-Item Env:ARES_SMOKE_MISSION_ONLY
```

The browser script uses an available compatible Playwright Chromium, a cached Windows headless Chromium, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Cached terrain bytes are actual source data, not fabricated fixtures. Failure-response injection is limited to explicit missing-data tests.

## Remaining limitations / not certified

- Hosted terrain requires network availability. Local preview overview files and packed elevation/imagery tiles are absent from this checkout; complete offline terrain readiness is not claimed.
- Software WebGL verified normal 3D functionality. An additional zoomed screenshot timed out; intensive zoom and hardware/mobile GPU performance remain unverified.
- The production build retains a large Three.js chunk warning.
- No live suit telemetry, actual base communication, physical actuation, rescue assessment, physiological calibration or operational safety guarantee.
- No fresh deployed-visitor acceptance was performed. Separate clean-rebuild, deferred HUD and wider PRD/deployment checklists remain uncompleted by this work.

## Implementation files

Emergency: `EmergencyWorkspace.tsx`, `EmergencySciencePanel.tsx`, `emergencyTasks.ts`, `emergencyResources.ts`, `emergency.ts`, `useEmergencyReturns.ts`, `emergency.css`, `EmergencyRoute2D.tsx`, `EmergencyRoute3D.tsx` under `mars-explorer-web/src/`. Minimal shared integration: `RegionalWorkspace.tsx`, `RegionalMap2D.tsx`, `Scene.tsx`, `workspace-navigation.css`. Focused tests: `emergency-decisions.test.ts`, `emergency-planning.test.ts`, `emergency.test.ts`, `emergency-smoke.mjs` under `mars-explorer-web/tests/`.
