# ARES Emergency Simulation — implementation and validation

Updated 14 November 2026 (Asia/Rangoon). Phases 1–4 are complete in implementation commit `5562d6a`. Status: **PASS for the tested hosted-terrain workflow**. This is educational simulation decision support, not operational EVA clearance.

## Current workflow

Open `/explorer` (or `?workspace=regional`). Map, Mission and Emergency are separate workspaces. Emergency configuration → outbound travel → arrival → decision and return-route comparison → Reset is implemented. Leaving Emergency ends its isolated simulation; Mission data and calculations are unchanged.

Select Low Oxygen / Oxygen Resource Assessment, choose arrival oxygen 75%, 45% or 10%, then select an emergency location on the existing 2D or Tactical 3D map. Both views use the same local east/south metre coordinates and routing engine. The simulated habitat is `{x:1900,z:1500}`. Start requires a complete terrain-profile-verified outbound route and locks configuration. Crew movement follows actual route geometry during clearly labeled 20-second accelerated playback. Playback time is not estimated EVA travel time.

At arrival, Mission context is refreshed from the existing Mission state and copied for assessment. Science time uses snapshot duration and available progress; absent or unrecoverable progress remains UNKNOWN, never zero by assumption. Return routes are independently searched from arrival to habitat, checked against native terrain/slope rules and verified with native elevation profiles. Outbound routes are not automatically accepted as return routes. Arrival switches to 2D for comparison.

## Explicit simulation assumptions and decision rules

- Oxygen endurance at 100%: **480 minutes**, constant consumption; walking: **2 km/h**; contingency reserve: **60 minutes**.
- Normal ≥60%; Caution 30–59%; Low <30%; Critical ≤10%. These thresholds are simulation choices, not NASA standards.
- Available oxygen time = arrival oxygen percent / 100 × 480. Do **not** deduct outbound travel again.
- Return requirement = verified return ETA + 60 minutes. Mission requirement adds remaining science time.
- Continuation may be considered only when the full requirement fits and critical-oxygen policy does not prohibit it.
- If science does not fit but return does, recommend aborting science and returning. If return plus reserve exceeds endurance, report CRITICAL: No feasible return under configured constraints.
- Missing science or failed verification produces INSUFFICIENT DATA. A known resource-feasible return can still be shown while science continuation is unknown.
- Blue means a verified return fits the resource model. Red requires a distinct, computed and verified alternative with terrain-warning or resource-risk evidence. Identical results appear once; no alternative is invented. Amber does not establish feasible return. No route is guaranteed safe.

## Final acceptance checklist — 8/8 verified

- [x] Emergency configuration → travel → arrival → decision → comparison → reset works end-to-end.
- [x] Mission time and oxygen calculations are consistent; unknown data is explicit and outbound is not double-counted.
- [x] Native-terrain routes, complete endpoints, slope rules, elevation coverage, distance and ETA are checked.
- [x] Existing 2D map location selection works.
- [x] Tactical 3D selection works and agrees with the same 2D coordinates; comparison remains in 2D.
- [x] ARES styling, desktop/tablet/phone layouts and prominent critical warnings were checked; metric overlap and narrow-header overflow were fixed.
- [x] Existing Mission and Map remain functional; Emergency does not alter Mission calculations. Reset, tab cleanup and missing-data failures were exercised.
- [x] TypeScript/build and focused Chromium browser validation completed.

## Validation evidence

- **34 targeted tests passed**, including Emergency, EVA Mission, native routing, science routing, travel estimation, regional tile-store and coordinate/navigation checks.
- `npm ci --no-audit --no-fund` succeeded with the existing lockfile; dependency versions were unchanged.
- `npm run build` passed TypeScript, Vite production compilation and offline-shell generation. `git diff --check` passed.
- `tests/emergency-smoke.mjs` passed in headless Chromium with software WebGL: actual NASA-derived terrain, all three oxygen presets at different valid locations, outbound locking/animation, independently verified returns, unknown-science and critical outcomes, Mission snapshot integration, reset/tab cleanup, 2D/3D agreement and injected missing-terrain/hazard errors.
- Responsive checks covered 1440, 1024, 700 and 390 px widths; follow-up checks verified prominent results, 14 px metrics and phone navigation for Map/Mission/Emergency.
- Browser data caching retains actual hosted bytes; application integrity verification remains active. Test fault responses are deliberately injected failures, not substitute terrain or fabricated routes.

From `mars-explorer-web`:

```powershell
npm ci --no-audit --no-fund
node --experimental-strip-types --test tests/emergency.test.ts tests/eva-mission.test.ts tests/native-routing.test.ts tests/science-routing.test.ts tests/travel-time.test.ts tests/regional-tile-store.test.ts tests/navigation-contract.test.ts
npm run build
npm run dev -- --host 127.0.0.1
# In another terminal, with the dev server running:
node tests/emergency-smoke.mjs
```

The smoke script needs an available Playwright Chromium executable. It uses an installed compatible browser, a cached Windows headless Chromium, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Screenshots and real terrain cache are generated under `scripts/.cache/emergency/`; they are not committed.

## Remaining limitations

- The local preview manifest references overview files absent from this checkout. `?mapSource=preview` is unavailable until that dataset is restored. The configured hosted dataset was tested successfully; network availability and download time remain external dependencies.
- The production build reports a large Three.js chunk warning. Software WebGL checks functionality, not hardware/mobile GPU performance.
- Return comparison is 2D; 3D selection is available before arrival. No rescue model, live suit telemetry, physiological validation or operational safety guarantee is implemented.
- The separate rebuild, deferred HUD and deployment acceptance checklists are not completed by this Emergency validation. A fresh deployed-visitor test was not performed in Phase 4.

## Implementation files

`mars-explorer-web/src/EmergencyWorkspace.tsx`, `emergency.ts`, `emergency.css`, `useEmergencyReturns.ts`; minimal integration in `RegionalWorkspace.tsx`, `RegionalMap2D.tsx`, `workspace-navigation.css`; tests in `tests/emergency.test.ts` and `tests/emergency-smoke.mjs`.
