# ARES mission gaps and landing page — 14 November 2026

## Checklist
- [x] Audit existing photos: 14 additional local image files plus Skyland and Hazeltop imagery cover all 16 listed sites. Historical captions and association limits retained.
- [x] Show proposed science goal in Brief and Review. Wildcat Ridge has specific context; other sites retain a shared documentation goal and their existing descriptions.
- [x] Historical conditions card, with exact-site association and no nearest-site substitution.
- [x] Gale radiation duration reference, with no Jezero forecast or safety threshold.
- [x] Baseline / Light / Heavy walking equipment presets and route re-verification.
- [x] Rover failure time-only walk-back diagnostic, warning by default.
- [x] Optional user-triggered DONKI SEP catalogue lookup, separate from departure/return decisions.
- [x] Root landing page, desktop/mobile layout, section scrolling, reveal animations, reduced-motion support and working explorer entry.
- [x] Mission report includes conditions, load and walk-back; assumptions are retained in its limitations.
- [x] Full suite: 64 passed, 0 failed. Production build passed.

## Baseline and real file mapping
The pre-change suite passed 55 tests. Dependencies were already installed; npm ci was not rerun. No pre-change browser export was retained, so a byte-for-byte historical export comparison is not claimed. Existing mission tests and a new export/snapshot regression fixture passed.

| Responsibility | Files under mars-explorer-web/src |
|---|---|
| Speed and time | travelTime.ts, TravelEstimate.tsx |
| Mission review, state, locked snapshot and report | evaMission.ts, EvaMissionPanel.tsx |
| Routing and recomputation | nativeRouting.ts, useNativeRoute.ts, RegionalWorkspace.tsx |
| Sites and existing measurements | scienceSites.ts, environmentObservations.ts, data/thermal-observations.json |
| Historical sealing estimates and radiation | missionConditions.ts, ConditionsCard.tsx |
| Equipment assumptions | mobility.ts |
| Rover failure check | walkBack.ts |
| Solar catalogue lookup | spaceWeather.ts, SpaceWeatherCheck.tsx |
| Landing and entry | LandingPage.tsx, landing.css, App.tsx, index.html |

The existing thermal dataset is near-rover MEDA ground/air observations for other times. The new four sample-sealing estimates are a different product and quantity, so they are separately identified rather than merged as equivalent ground-temperature observations. Existing routing algorithms, DEM, imagery, map layers and supply capacities were not changed.

## Sources and calculations
### Historical atmosphere
NASA PDS Mars 2020 Initial Reports Volume 2 Release 2:
https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf

Verified reported estimates: Swift Run 817 Pa / 208 K; Skyland 808 Pa / 210 K; Hazeltop 800 Pa / 212 K; Bearwallow 797 Pa / 214 K. The report explains that MEDA data may be estimated from closest sols and uses the minimum of low-mounted ATS 4/5 sensors. These are historical estimated ambient atmosphere values, not ground-temperature maps. Celsius = Kelvin − 273.15. They are mapped to Skinner/Wildcat site contexts only, not all 16 destinations. Approach-only plans explicitly do not reach those sites.

### Radiation
NASA Curiosity RAD release confirms the 0.67 mSv/day reference for Gale, August 2012–June 2013:
https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/
Related instrument explanation: https://science.nasa.gov/resource/radiation-measurements-on-mars/

Dose reference = 0.67 × (outbound + science + return minutes) / 1440.
Also shown: the same reference multiplied by the full budget. That is a duration scenario, not a physical upper bound. No current Jezero radiation, shielding, solar-event contribution or medical clearance is computed. Invalid or unverified route duration is unavailable.

### Equipment assumptions
Baseline: speed ×1, slope limits ×1. Light: speed ×0.90, slope ×0.90. Heavy: speed ×0.75, slope ×0.80. All are team demonstration assumptions, not NASA values. Baseline walking is 2 km/h; defaults become 1.8 and 1.5 km/h. All three slope limits change, while the warning fraction remains 0.8. Rover mode disables load effects. User base values are preserved; repeated changes cannot compound multipliers. A stale route checked under different limits cannot depart. Load selection is available in Map and Mission Brief, and is locked into the start snapshot.

### Walk-back
Precedent only: NASA-hosted Apollo 15 planning memorandum, 1970:
https://www.nasa.gov/wp-content/uploads/static/history/alsj/19790073512_1979073512.pdf

Worst-case duration = outbound drive + science stop + walking return over the outbound route length. Uses the user's baseline walking speed, leaving equipment at the rover. Approach plans use zero science minutes. OK means within the usable time budget; USES RESERVE means within the total budget; FAIL means over the total budget. UNAVAILABLE means invalid inputs. The check waits for a verified route profile. The default MOBILITY_POLICY.walkBackBlocksReview is false; its blocking behavior is unit tested. It does not re-assess the corridor for a suited walker, consumables, fatigue, changing conditions or rescue. No rover failure movement simulation is added.

### DONKI
https://api.nasa.gov/ and https://ccmc.gsfc.nasa.gov/tools/DONKI/

User-triggered SEP query from seven days ago through today's UTC date, with shared DEMO_KEY. No API key setup is needed for the demo, but rate limits apply. Only SEP records are checked; not all solar-event types. Empty results are not a safe-Mars status. Invalid, unavailable and rate-limited responses show unknown conditions. No automatic return or clearance. Lookup is not included in the mission export (stated in the UI).

## Verification evidence
- Baseline: 55/55 tests. Final: 64/64. See mission-gap-tests-2026-11-14.txt.
- New tests: radiation duration/invalid values; exact-site association; load timings, limits and stale-route blocking; a 16-degree hillside pass at baseline/fail under heavy limits; locked snapshot and export fields; walk-back status boundaries and optional blocking; invalid solar-catalogue responses and trusted event links.
- Known calculations: 2 km walking round trip +20 min = 140 / 153.33 / 180 min for Baseline / Light / Heavy. A 12 km rover plan takes 308 min nominally but 524 min with walking return, so its walk-back fails although nominal time fits.
- Browser: heavy kit displayed 1.50 km/h; rover review displayed walk-back; conditions card present. User-triggered live DONKI request returned no SEP records for Nov 7–14 UTC and disclosed that this does not mean safe conditions.
- Browser: default rover mission started and paused. Downloaded JSON was parsed: phase outbound, load baseline, walkBack USES RESERVE, conditions present, rover speed 5 km/h.
- Landing: desktop 1440×900 and phone 390×844 inspected; image assets loaded; no horizontal overflow; section link scrolled to Mission; Enter explorer reached the app; ARES home returned to the landing page. Reduced-motion behavior is implemented in CSS and the observer, but not browser-emulated in this session.
- Production TypeScript/Vite build passed. Existing large Three.js chunk warning remains.

## Landing design and assets
Mobbin references were inspected, not copied. Grok supplied the example of spacious hero typography; Joby Aviation supplied the image-led hero example. Sunday was inspected but not used as an anchor.
- https://mobbin.com/sites/sections/6857a406-9c8b-4b57-8247-c96e015c140b
- https://mobbin.com/sites/sections/19d5fe19-8d63-414a-a799-aef1911d2ec9

Hero asset: Perseverance view of Jezero delta, acquired February 22, 2021; NASA/JPL-Caltech/ASU/MSSS. It is a historical contextual photograph, not a live view or a route camera rendering.
https://science.nasa.gov/resource/perseverance-view-of-the-delta-in-jezero-crater/
Stored locally: public/images/landing/jezero-delta.jpg (~391 KB). Other landing images reuse existing project assets. No paid service or new package dependency added. Root / is the landing; /?workspace=regional and /explorer open the simulator. Existing workspace query links remain supported. The header logo links home.

## Remaining limits and skipped work
- No 16 individually researched EVA task packages: Wildcat is tailored; others use the shared goal plus existing catalogue context.
- No live Jezero weather, Mars radiation forecast or operational space-weather go/no-go.
- No soil strength, rock-scale obstacle, traction, shielding, fatigue or real suit performance validation.
- Approach-only science-site gaps remain unresolved and cannot be presented as arrival at the outcrop.
- Photo assets exist for all sites; inherited NASA caption inconsistencies have not all been independently resolved.
- This work does not add a full mission-control screen redesign, dynamic rover-failure walking simulation or storm simulation.
- Deployment was not performed, as requested earlier; changes are pushed to the existing ARES repository.
