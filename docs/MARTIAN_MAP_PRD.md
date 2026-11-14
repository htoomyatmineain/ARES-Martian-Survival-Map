# Interplanetary Survival Guide: Martian Map

> **Implementation status (15 November 2026):** expanded Emergency Phases 1–4 passed the [10/10 scoped acceptance checklist](emergency-simulation.md), with 48 targeted tests and focused live-browser verification. Configurable normalized resource budgets do not implement this broader PRD’s calibrated suit mass/energy, ingress, refuge, HUD or dynamic-hazard requirements. Those requirements and deployment acceptance are not certified by this work.

## Product requirements document

Version: 1.0 · 10 November 2026 · Implementation baseline with explicit data gates

Primary audience: product owner, data lead, terrain specialist, Codex implementation agent, and presentation team.

This PRD specifies an educational, interactive Mars EVA decision-support prototype. It is not a validated flight navigation, medical, or life-support system. All numerical engineering defaults below are **simulation parameters**, not NASA-approved astronaut limits. Exact NASA product identifiers, the final geographic boundary, and measurement uncertainties must be supplied through the data acceptance gate before the project claims a verified operational region.

## 1. Product intent

Help an astronaut plan and complete a walking Mars excursion in Jezero Crater by combining mission science data, terrain-derived routes, simulated suit resources, and changing hazards in one coherent system.

The product must demonstrate three challenge outcomes:

1. **Layered, integrated view:** selecting a location or route connects elevation, slope, imagery, science context, weather provenance, hazards, and resource consequences. Layer toggles alone do not satisfy this requirement.
2. **Multiple NASA science missions:** integrate MRO terrain/imagery, Mars 2020 environmental observations, and Mars Global Surveyor regional elevation context. Multiple instruments from MRO alone do not count as multiple missions.
3. **Quick and safe mission decisions:** compare time and resource tradeoffs, preserve return capability, and recompute guidance when conditions change. Never recommend a faster route that violates configured feasibility constraints.

Success statement: a viewer can see why a route was selected, observe a resource-threatening event, and understand how the revised guidance helps the astronaut return.

## 2. Confirmed scope and assumptions

### Confirmed by the product owner

- Geographic focus: Jezero western delta/ancient river area and western rim context. Final bounds remain open.
- One system, two presentations: helmet HUD with a forearm control terminal; full-screen tablet planning and viewing.
- HUD simulator allocates approximately 80% to first-person exploration and 20% to the wrist-terminal panel.
- Tablet uses one full viewport with orbit/view controls and the same features and data.
- Walking EVA is the first-release workflow. Rover and habitat functions support EVA decisions.
- Stack: React, shadcn/ui, Three.js integration, Supabase, deployment on Render.
- Terrain construction, NASA terrain filtering, uncertainty assessment, and Blender production belong to the terrain/data teammates. This document defines the application handoff contract, not the 3D production process.
- Five people: terrain specialist; application/documentation implementer using Codex; data lead/team coordinator; two presentation/support contributors.
- Video options: three minutes total with approximately 60 seconds of demo, or five minutes total with approximately two minutes of demo.

### Working defaults

- Single astronaut, one simulated habitat, one optional validated refuge, one science destination, and a walking return route per demonstration.
- A browser simulation stands in for helmet and wrist hardware. No physical visor, suit sensor, real astronaut localization, or live Mars communications integration is required.
- Offline operation begins only after the selected mission package has been downloaded and verified.
- English application copy first. Burmese presentation notes may be added separately.
- No runtime generative AI is required. “Agentic implementation” means a coding agent can build the specified system in verifiable increments. Safety decisions use deterministic software.

## 3. Release boundaries

### P0 — required demonstration

- Mission briefing; destination and habitat selection from verified points of interest.
- Two meaningful route candidates when terrain permits; explicit single-route/no-route states otherwise.
- Synchronized first-person route guidance, tablet view, and georeferenced 2D map.
- Elevation/slope, science context, resource reachability, and hazard overlays with provenance.
- Simulated oxygen, battery, suit pressure, ambient temperature/pressure, EVA elapsed time, remaining distance, return margin, crew name, and mission identity.
- Dust, low-oxygen, communications-loss, and blocked-route scenarios.
- Local route recalculation, return recommendation, alert acknowledgement, offline continuity, and mission debrief.
- One-click deterministic demo reset and two presentation timelines.

### P1 — supporting scenarios

- Rover status and failure marker with walking return/refuge options. No complete rover driving simulator.
- Habitat battery reserve, critical-load estimate, refuge availability, and simple water/food inventory. No complete habitat management simulator.
- Suit-pressure emergency and demonstration-only emergency checklist.
- Exportable mission summary and run log.

### Deferred

Multi-astronaut coordination, real helmet deployment, real suit hardware, real medical advice, predictive local Mars weather, certified geolocation, comprehensive rover dynamics, detailed life-support chemistry, and autonomous mission control.

## 4. Personas and core workflow

**Explorer:** needs a clear next action and enough information to preserve return capability while conducting science.

**Mission planner:** compares route cost, geological interest, hazard coverage, and resource feasibility before departure.

**Demo controller:** can inject a reproducible event, pause/reset simulation time, and explain the resulting decision.

**Data reviewer:** traces every measured or derived layer to its source and sees where coverage or confidence is insufficient.

Core sequence:

1. Open mission JZ-01, “Lost in the Dust.” Review astronaut, objective, local region, resource configuration, and the historical weather source.
2. Select a mapped science point. Inspect available layers and source coverage.
3. Compute alternatives. Compare duration, ground distance, ascent/descent, maximum slope, oxygen/battery demand, uncertainty, and return margin.
4. Select and confirm a feasible route. The system freezes the starting configuration and records a plan version.
5. Start EVA. Guidance tracks actual simulated movement. Pauses and science stops still consume resources according to activity.
6. Inject a dust event. Visibility/travel assumptions change, a warning appears, and routes and reserves are recalculated.
7. Trigger an oxygen leak or reserve reduction using an explicitly logged scenario event. The system recommends abort and presents the best feasible return option.
8. Lose communications. Local guidance continues; distress transmission is marked queued or unavailable rather than delivered.
9. Reach the simulated habitat airlock. Account for ingress time, terminate EVA, and show the evidence behind the outcome.

## 5. Geographic scope decision and data gate

Do not choose a large bounding box solely for dramatic scenery. The western rim and delta need not fit inside one short walking excursion. Use regional context plus one verified walkable corridor.

Candidate search: compare a western-delta front corridor, a delta-margin corridor, and an inner-rim approach. The existing repository documents a local origin of 18.4802447° N, 77.3808713° E and a 512 × 512 m HiRISE field; these are **existing project claims requiring verification**, not the approved mission area.

Proposed planning envelope: investigate approximately 2–5 km across for local planning, with a shorter 300–800 m one-way demonstration corridor if the verified terrain supports it. These are scope targets, not measured bounds. If data only supports a smaller area, publish the smaller boundary. A regional map can show the relationship to the rim and delta without claiming detailed walkability throughout.

Candidate selection scoring: coverage/completeness 35%, identifiable landforms and science context 25%, route tradeoff potential 25%, asset/runtime feasibility 15%. Require all of the following regardless of score:

- A continuous verified route and return corridor within the terrain coverage.
- Actual elevation variation and two topologically different paths where possible; do not sculpt or invent hazards to claim real terrain properties.
- A source-backed science point and a clearly fictional habitat placement.
- Terrain and imagery alignment within the data team's documented acceptance tolerance.
- No unresolved no-data cells on the certified demonstration paths.
- Verified MRO and Mars 2020 products and a geographically intersecting MGS context product, each with provenance.

Data lead signs a `region-manifest` containing bounds, Mars coordinate conventions, product IDs, source footprints, processing versions, quality summary, and approved corridor. Before sign-off the application must display “Candidate region — not validated.”

## 6. NASA inputs and what they support

### D1 — MRO HiRISE and CTX

Use verified stereo elevation and orthorectified imagery for terrain positions, gradients, elevation profiles, and regional visual context. CTX fills regional context only at its actual resolution. Small obstacles below source resolution require separate annotations or explicit simulated obstacle data. Imagery alone cannot certify footing or regolith strength.

Source entry points: [MRO PDS archive](https://pds-geosciences.wustl.edu/missions/mro/default.htm), [HiRISE DTM catalog](https://hirise.lpl.arizona.edu/dtm/), and [Mars 2020 landing-site data](https://murray-lab.caltech.edu/Mars2020/). Catalog availability does not establish coverage of the final corridor; the manifest must identify downloaded products.

### D2 — Mars 2020 Perseverance MEDA

Use quality-screened archived air temperature and atmospheric pressure, with optional wind/radiative observations if suitable products exist. MEDA provides point observations at the rover, not a live weather grid over every part of Jezero. Include rover observation location, sol, timestamp, sensor/product field, units, quality flag, and source product ID.

Select one coherent historical time window rather than combining unrelated extrema. Historical playback is allowed. Without a verified pressure series, show unavailable or use a clearly marked synthetic scenario value; do not infer pressure from a temperature news report.

Sources: [MEDA archive and instrument description](https://atmos.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html), [PDS MEDA bundle](https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn%3Anasa%3Apds%3Amars2020_meda&version=1.0), and [Mars 2020 archive](https://pds-geosciences.wustl.edu/missions/mars2020/index.htm).

### D3 — Mars Global Surveyor MOLA

Use MOLA elevation as regional context and an independent coarse-scale reference. It must not determine meter-scale foot placement or replace missing local terrain in a walking corridor. Record vertical datum differences before comparison. If no intersecting validated MOLA product is packaged, the third-mission integration remains incomplete.

Source: [MGS PDS archive](https://pds-geosciences.wustl.edu/missions/mgs/index.htm).

### D4 — science context

Attach source-backed geological descriptions and mission observations to verified POIs. MRO CRISM mineral context is optional where valid coverage exists. Describe spectral interpretation as evidence with limitations; no pixel-level claim of certain mineral identity, accessible water, or life. A reconstructed rock scan cannot become a measured Jezero sample result.

### Data classes visible in the application

- **Observed:** values directly read from a documented NASA product.
- **Derived:** slope, profiles, route distance, or other computations from observed data; show model/version.
- **Simulated:** suit telemetry, habitat placement, resource rates, injected dust/leaks, and position.
- **Unavailable:** absent, rejected, stale beyond permitted use, or outside coverage.

Every value carries a class. A derived route can depend on both measured terrain and simulated resource assumptions; show both. Never label NASA archive updates as current astronaut telemetry.

## 7. Connected data and calculation model

### 7.1 Authoritative state

One deterministic mission engine owns simulation time, position, activity, telemetry, hazards, route version, alerts, and mission phase. HUD, wrist terminal, tablet, and 2D map subscribe to the same state revision. Rendering frames never directly drain resources.

At each fixed one-second simulation step: apply ordered events; update movement/activity; integrate resources; update environmental playback; evaluate hazards and sensor health; recalculate return feasibility; evaluate alert rules; publish a new revision. Use finer substeps for fast pressure faults if necessary. Rendering interpolates between states.

Time acceleration multiplies simulation time consistently for movement, resource consumption, environmental events, and mission timing. Camera orbit and free-look do not move the astronaut. Pausing the simulation freezes consumption; opening a panel during active EVA does not.

### 7.2 Terrain and edge quantities

Application calculations use meters, seconds, kilograms, pascals, and watt-hours; UI may show kPa, °C, minutes, and percentages.

For an edge with horizontal distance `dh` and elevation change `dz`:

```text
ds = sqrt(dh² + dz²)
grade = dz / dh
slope_angle = atan(abs(grade))
travel_seconds = ds / walking_speed_mps
```

Reject zero-horizontal-length malformed edges. Compute ascent and descent separately. Direction matters: the reverse edge has different grade and may have different time/oxygen costs. Rendered visual exaggeration must never change these quantities.

Initial demonstrator speed model, configurable and unvalidated:

```text
v = clamp(0.8 * terrain_factor * visibility_factor /
          (1 + 3*max(grade,0) + 1.5*max(-grade,0)), 0.15, 0.8) m/s
terrain_factor: firm=1.0, rough=0.7, loose=0.5
visibility_factor: normal=1.0, dust=0.6
```

All terrain class factors require documented annotations or must be marked simulated. This model is intentionally simple; it is not a calibrated suited-human Mars walking model.

### 7.3 Oxygen reserve and duration

Model usable carried oxygen mass, not ambient oxygen and not blood oxygen saturation.

```text
oxygen_mass_next = max(0, oxygen_mass - (activity_rate + leak_rate)*dt_minutes)
oxygen_percent = 100 * oxygen_mass / usable_capacity
duration_at_current_rate = oxygen_mass / (activity_rate + leak_rate)
```

Initial fixture: usable capacity 0.60 kg; stationary rate 0.0010 kg/min; level walking rate 0.0015 kg/min. Walking rate multiplier: `1 + 2*max(grade,0) + roughness_penalty`, where roughness penalty is 0, 0.2, or 0.4 for the configured classes. Leak rate is a separately logged scenario parameter, initially zero. These are demonstration constants, not a suit specification.

Compute route oxygen by integrating each edge's activity and leak rate plus scheduled science stops and ingress. Do not estimate all travel from the current instantaneous rate. Forecasts assume the currently declared fault rate persists until a logged repair event.

### 7.4 Battery and other endurance limits

```text
battery_Wh_next = max(0, battery_Wh - load_W*dt_seconds/3600)
battery_duration_min = 60*battery_Wh/load_W
```

Fixture: usable suit battery 600 Wh, base load 120 W, walking increment 30 W, dust thermal/visibility-support increment 20 W. These increments are scenario assumptions. Ambient temperature does not become an arbitrary direct oxygen penalty. A thermal-load model may be introduced only with a documented formula and parameters.

If CO₂ scrubbing or cooling endurance is not modeled, display “Not modeled” in details and qualify the result as “Modeled O₂/battery return margin.” Do not imply those two resources prove total suit safety.

### 7.5 Return reserve and decision

Evaluate the return path from the astronaut's current position to every currently operational, reachable refuge. Include final ingress, configured stops, edge uncertainty, resource demand, and refuge acceptance conditions.

Default ingress 5 minutes. Default protected reserve 15 minutes. Route-duration uncertainty allowance 20%, pending a better data-backed bound. These are conservative **scenario allowances**, not statistical confidence intervals.

For each candidate return route, use upper-bound edge demand/time, apply ingress, then compute remaining resource duration using a declared reference return activity rate:

```text
post_return_O2_min = (remaining_O2 - upper_return_O2_demand) / reference_O2_rate
post_return_battery_min = (remaining_Wh - upper_return_Wh_demand) /
                         (reference_load_W/60)
return_margin_min = min(post_return_O2_min, post_return_battery_min) - 15
```

Upper demand includes the 20% travel allowance and scenario faults. Ingress has its own activity/load. A negative remaining mass or energy makes the route infeasible. Label the limiting resource and reference rates alongside detailed results. Positive margin means the configured model preserves the selected reserve, not a guarantee of real safety.

For initial planning, apply this test after the outbound path and science dwell, then the independently computed return path. A destination is not feasible merely because the astronaut can reach it.

### 7.6 Pressure, temperature, and weather

- **Ambient pressure:** MEDA historical replay in Pa. It is distinct from internal suit pressure in kPa.
- **Suit pressure:** simulated telemetry, initial 30 kPa. A leak event can drive `P_next = max(0, P - leak_kPa_per_min*dt_minutes)` for the demo. Do not infer an oxygen mass leak from this pressure decay; they are separately configured fixture parameters unless a validated gas-volume model replaces them.
- **Air temperature:** historical MEDA sensor reading with date, time, and location. It is not suit interior temperature or a forecast for the selected rim cell.
- **Weather transfer:** default is a contextual rover observation card. Optional altitude-adjusted pressure must be explicitly modeled, identify reference altitude, and use `P(z)=P0*exp[-g*(z-z0)/(R_CO2*T)]`, `g=3.71 m/s²`, `R_CO2=188.9 J/(kg·K)`, T in kelvin. This simplified isothermal estimate is not a local observation. Do not invent a fine-resolution temperature field.
- **Dust:** a controlled scenario changes visibility and optionally modeled irradiance. If opacity is used, `direct_irradiance_ratio=exp[-(tau-tau0)/mu]` for `mu>0`, clamped to [0,1]; this is a simplified direct-beam model, not total array power. Prefer a declared scenario power multiplier for P0. Never subtract power from a suit battery merely because habitat solar input falls.

### 7.7 Worked arithmetic fixture

This fixture tests calculations and UI consistency; it is not a measured Jezero route. Two outbound candidates to the same destination:

- A: 720 m, 18 min, 45 m ascent, 0.0020 kg/min route-average O₂ → 0.0360 kg.
- B: 900 m, 22 min, 15 m ascent, 0.0015 kg/min route-average O₂ → 0.0330 kg.

Thus the longer route can consume less oxygen. These durations/rates are test inputs; production summaries must come from edge integration, not these fixed numbers.

Return-only fixture: current O₂ 0.090 kg; current battery 90 Wh; travel estimate 20 min; upper travel 24 min; ingress 5 min. For this isolated fixture use 0.002 kg/min and 150 W during both travel and ingress, and the same reference rates.

```text
upper return duration = 24 + 5 = 29 min
O2 demand = 29*0.002 = 0.058 kg
energy demand = 150*29/60 = 72.5 Wh
post-return O2 endurance = (0.090-0.058)/0.002 = 16 min
post-return battery endurance = 60*(90-72.5)/150 = 7 min
modeled return margin = min(16,7)-15 = -8 min
```

Result: reserve breach; battery is limiting even though oxygen remains. Recommend return and show the breach, rather than a reassuring O₂ percentage.

## 8. Routing requirements

**RTE-01:** Build a directed graph over accepted terrain cells or navmesh polygons, independent of decorative objects. Graph resolution must match supported terrain detail; finer interpolation does not improve source accuracy.

**RTE-02:** Before cost optimization, exclude no-data, outside-boundary, blocked, unsupported crossing, and configured unsafe slope cells. Initial demonstration policy: caution above 12°; prohibit above 20°. These are unvalidated policy choices, configurable per mobility profile. Dilate cliff/obstacle exclusions by localization uncertainty plus a configured body/clearance buffer. Prevent diagonal corner cutting.

**RTE-03:** Use A* with nonnegative costs and an admissible heuristic for each optimization. For time use straight-line horizontal distance divided by the maximum allowed speed; for oxygen use distance times a proven minimum oxygen-per-meter lower bound, or use zero heuristic. Dijkstra is A* with zero heuristic and serves as the small-graph oracle. Algorithm selection does not make the underlying map more precise.

**RTE-04:** Candidate A minimizes travel time among feasible routes. Candidate B minimizes modeled oxygen demand among feasible routes; break near ties by lower maximum slope and then duration. Compare Pareto tradeoffs and reject dominated or practically duplicate candidates. If identical, show “One distinct feasible route” rather than manufacturing a second. “Most reserve” is permitted only when the objective explicitly maximizes the minimum modeled resource reserve.

**RTE-05:** Constrained feasibility includes total outbound, task dwell, return, ingress, and reserve. Use resource-aware labels/Pareto search or a documented bounded-candidate approach; do not claim the globally best feasible path if only one unconstrained path was checked. For P0, bounded candidate search is acceptable with the label “Best evaluated feasible option.”

**RTE-06:** On destination selection, calculate the current best return plan too. Refuges are eligible only if operational, reachable, and able to support the astronaut; a rover or habitat icon alone is not evidence of shelter.

**RTE-07:** Replan when an intersecting hazard changes, a resource fault occurs, an active refuge fails, position deviates beyond `max(10m,2*position_uncertainty)`, or predicted margin changes by at least 2 minutes. Refresh resource predictions every simulation second. Debounce continuous position replans to at most once per 2 simulation seconds; emergency events bypass this delay.

**RTE-08:** During replan, retain the previous path only if it remains valid. Mark it stale and suspend directional instructions into newly blocked terrain. Apply results only when input revision, graph version, and resource model version still match. Discard late worker responses.

**RTE-09:** Normal route changes require confirmation. A clearly labeled emergency mode may immediately emphasize return guidance and stop outbound instructions, while preserving the user's ability to inspect the decision. No automatic physical movement.

**RTE-10:** No feasible route produces “No modeled safe return route,” current coordinates, remaining resources, applicable offline procedure, and distress controls. Never draw a straight shortcut through prohibited terrain.

## 9. Navigation and integrated layers

The first-person simulation supplies position and heading. Map coordinates use the data manifest's Mars frame. No Earth GPS claim. A future sensor adapter may supply uncertain localization, but P0 must label position “Simulation.”

**NAV-01:** World trail, route line on the 2D map, destination marker, remaining distance, and elevation profile derive from one versioned route polyline. Remaining distance is along route, not straight-line range. Distinguish the two if both are shown.

**NAV-02:** Project the astronaut onto a locally continuous route segment using previous progress and heading to prevent snapping between nearby switchbacks. Repeated path sections must not silently skip waypoints.

**NAV-03:** Use a compass, next maneuver, distance, and off-screen target indicator. If the map is heading-up, retain a north indicator and scale. Tablet supports north-up and heading-up.

**NAV-04:** Destination arrival requires proximity within `max(5m, position_uncertainty)`, reaching the final route section, and confirmation. Crossing the radius alone cannot complete the science task. Habitat return completes only after ingress.

Required layer set:

- Base imagery and terrain elevation: coverage boundary, scale, and source detail.
- Slope/traversability: caution/prohibited areas and the rule that caused exclusion.
- Route analysis: A/B route geometry, profile, distance, and return feasibility.
- Science POIs: observation/source, scientific interest, planned dwell, and sample-task state.
- Hazards: scenario footprint, onset, severity, effect on graph/model, and expiry if known.
- Resource reachability: cells reachable while preserving a modeled return reserve; no-data stays visibly unknown.
- Weather context: selected MEDA observation and its location, age, and applicability; not a fabricated spatial weather surface.

Layer inspection at a route segment must answer: “What source says this?”, “How old/coarse is it?”, “What did we calculate?”, and “How does it change this route?” Default to base imagery, active route, and urgent hazards. Only one dense thematic fill at a time; blend opacity without hiding critical warnings. A 2D map remains available throughout navigation, expanded through the wrist terminal in HUD mode.

## 10. Information architecture and presentation

### Helmet and wrist mode

At landscape desktop sizes, approximately 80% of width is the visor simulation and 20% is a docked wrist-terminal representation. The wrist panel can expand temporarily and return to its prior state. A physical wrist device is a presentation metaphor.

Persistent visor information: next maneuver and distance; destination; compact 2D map; oxygen with modeled duration; battery; limiting return margin; highest-priority active warning. Keep the central 50% of viewport width and central 40% of height free of persistent panels. World route markers may occupy that region but must not cover hazards.

Mission name, astronaut name, and elapsed time remain in a quiet header. Full mission summary, exact ambient/suit pressure, historical temperature context, detailed timing, and source provenance are available in one wrist action. An abnormal suit-pressure value is promoted immediately to the visor. “Always available” does not mean every datum must be expanded at all times.

Wrist sections:

1. Navigate: destination, A/B comparison, 2D map, profile, route acceptance, return action.
2. Suit: oxygen mass/percent/duration, battery, suit pressure, activity, modeled limitations.
3. Environment: ambient temperature/pressure, historical observation time/location, dust scenario.
4. Mission: name, astronaut, summary, elapsed time, science checklist and dwell.
5. Layers: coverage, legend, visibility, opacity, source details.
6. Emergency: active alert stack, acknowledgement, return/refuge choices, local checklist, distress queue status.

Demo controller is a separate operator drawer with clear “Scenario controls” labeling, never confused with astronaut life-support controls.

### Tablet mode

One full-width application viewport. Mission header, survival strip, collapsible planning drawer, expandable 2D map, and the orbitable 3D region form one surface. Do not render a separate wrist screen. Both modes support the same planning, inspection, emergency, and debrief functions. Switching modes preserves position, time, task state, route, alerts, and resources. Tablet orbit changes the camera only.

### Visual system

- Use DM Sans for readable UI and IBM Plex Mono for instrument numerals, units, coordinates, and timestamps; tabular numerals prevent shifting values. A restrained condensed typeface may label missions, never small safety text.
- Base charcoal `#151419`, instrument white `#F3EEE8`, warm panel `#30221F`, active path cyan `#8FE8FF`, selection amber `#FFB14A`, warning yellow `#FFD166`, emergency red `#FF5C5C`. Colors are design tokens pending contrast checks.
- Cyan means active navigation, amber means selection, yellow means caution, red means emergency. Pair color with text/icon/pattern. Do not encode data provenance through color alone.
- Use opaque-enough instrument backplates over terrain. Target WCAG 2.2 AA contrast, 44 × 44 CSS-pixel controls, keyboard navigation, visible focus, and reduced motion. No strobing warning or continuous decorative animation.
- Primary readouts at least 18 px on target tablet viewport; detailed text at least 14 px. Avoid tiny futuristic typography, long all-caps instructions, and glow that blurs digits.
- Keep routine panels collapsed during walking; urgent alerts show one action and consequence first. Audio is optional and accompanied by visual text. Muting sound does not acknowledge a warning.
- At narrow widths, preserve data hierarchy using a single viewport and bottom-sheet controls. The 80/20 layout is a landscape simulator requirement, not a reason to make a 200 px wrist panel illegible.

The attached reference is visual inspiration. Its fixed route times, oxygen percentage, rock identification, and return margin are not accepted measurements or calculation fixtures.

## 11. Emergency rules and response

Severity order: critical suit fault or resource exhaustion; no feasible return; reserve breach; caution; informational communication/source status. Multiple active emergencies remain visible in the wrist list; the visor shows the highest priority.

Rule defaults:

- Advisory: modeled return margin at or below +10 minutes.
- Return required: margin at or below 0 minutes or planned destination no longer preserves reserve.
- Critical: O₂ or battery predicted insufficient for every operational return/refuge option; suit pressure below 25 kPa; or scenario distress event.
- Pressure caution: below 28 kPa or loss faster than 1 kPa/min over a configured stable sampling window.
- Numerical thresholds above are demo parameters. Show them in configuration and never call them NASA flight limits.

Latch return/critical alerts until acknowledged and the underlying condition clears. Acknowledgement records awareness only. For margin recovery, require more than +3 minutes for 10 simulation seconds before resolving a reserve-breach alert; critical pressure remains latched until the fault is cleared and pressure remains above the configured recovery threshold. Do not oscillate alerts around boundaries.

### E1 — dust event, P0

Trigger: controller-created hazard with a footprint and declared visibility severity. Effects: visibility factor changes, route travel/resource forecasts update, and solar-dependent habitat/rover generation changes only if configured. Response: show “Dust event — return time increased,” compare operational destinations, and recommend return if reserve is breached. Dust does not automatically deplete suit oxygen or create Earth-like high-wind damage.

### E2 — low oxygen, P0

Trigger: modeled reserve breach or injected oxygen leak/depletion event. Response: cancel new science task starts, stop outbound guidance, recompute walking return/refuge paths under the ongoing leak, show limiting quantity and estimate, and request route acknowledgement. The scenario log explains any sudden telemetry change; a countdown may not change merely to fit the video.

### E3 — rover failure, P1

Trigger: rover unavailable, battery depleted, or explicitly injected fault. Response: mark its location and operational state, remove it as an eligible transport/refuge if appropriate, and evaluate walking alternatives. A failed unpressurized rover is not a refuge. “Request assistance” records a simulated request with actual communication state.

### E4 — communications loss, P0

Track Earth link, local relay, and application cloud connectivity separately. Earth-link loss does not disable the local map, route engine, or suit simulation. Loss of Supabase/network connectivity uses the local event queue. Distress messages remain queued until a simulated appropriate link is available; cloud upload is not proof Earth received a message. No immediate Earth rescue claim.

### E5 — terrain blockage, P0

Trigger: an injected blocked polygon intersects the active corridor. Response: invalidate affected edges, suppress arrows into the blockage, calculate an alternative, and show changed duration/margin. Unknown terrain cannot be silently treated as a bypass.

### E6 — habitat power failure, P1

Trigger: simulated battery or critical-load endurance falls below configuration. Calculate `endurance_h = usable_Wh/critical_W` and, if modeled, integrate generation minus loads over time. Mark refuge availability from explicit support capability, not a battery icon alone. Response: reprioritize critical loads in a demonstration-only checklist and evaluate another approved refuge. Water/food use remains a separate inventory calculation, not a fabricated instantaneous EVA effect.

### E7 — suit/medical distress, P1

Trigger: manual distress or configured suit-pressure fault. Response: prominent emergency alert, coordinates, telemetry, eligible refuge/return options, and clearly labeled simulation checklist. No diagnosis or invented clinical instructions. Do not advise that walking is suitable for every medical event; the demo may display “Stop and follow mission emergency procedure.”

## 12. State machine and mission tasks

Mission phases: `briefing → planning → ready → outbound → science → returning → ingress → completed`. A user can abort from ready/outbound/science into returning. Terminal outcomes include `completed`, `aborted_safe`, and `failed_simulation`.

Hazard severity, communications status, source health, and pause state are orthogonal to phase. “Offline” must not overwrite “returning,” and acknowledging a warning must not advance the mission.

Science task states: locked, available, in progress, complete, aborted. Reach site, inspect source-backed context, perform timed simulated scan/sample, and return. Sample collection is a mission task; a rendered specimen does not produce a new real scientific measurement.

Every state-changing event includes simulation time, wall-clock time, actor, payload, reason, previous revision, and idempotency key. Reset creates a new run rather than erasing a prior outcome. Replaying the same package, configuration, seed, and events reproduces the same decisions within numerical tolerance.

## 13. Implementation architecture

### Client

React + TypeScript + Vite; shadcn/ui components for drawers, tabs, dialogs, sliders, forms, and tooltips; Three.js integration through the existing renderer adapter. Use a small centralized state store with pure selectors. Keep the mission engine and calculation model independent from React.

Modules: `mission-engine`, `resource-model`, `route-worker`, `hazard-rules`, `geo-adapter`, `data-catalog`, `offline-package`, `sync-outbox`, `hud-shell`, `tablet-shell`, `demo-controller`, and `debrief`.

Route and reachability calculations execute in a Web Worker. Typed contracts connect rendering to application state. The application uses accepted terrain/collision/nav data; the teammate owns how those assets are produced.

### Supabase

Use Postgres for mission/configuration versions, run metadata, events, science task results, and source catalog records; Storage for immutable versioned mission packages and optional exports; Auth for team/operator accounts. A public judge demo may run locally without sign-in and use a restricted server endpoint for optional result submission. Do not grant unauthenticated write access to operational configuration.

Realtime is optional for a later separate controller, not a dependency of local navigation. Browser connectivity and cloud uptime must not govern suit resource integration.

Enable RLS on every exposed table, authorize ownership/team membership per row, and restrict package publication to operator roles. Never ship service-role or secret keys in frontend variables. Public read access applies only to approved published package metadata/assets. A user cannot edit another run by guessing its ID. Views use invoker security or are not publicly exposed. See [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

### Render

Deploy the frontend as a Render Static Site with a pinned lockfile, `npm ci && npm run build`, and `dist` publish directory. Configure SPA fallback for application routes, HTTPS, cache headers, and versioned immutable asset URLs. If submission validation or secret-bearing integrations are needed, add a Render Web Service or appropriately secured Supabase function; no dedicated backend is necessary for the offline mission engine. See [Render Static Sites](https://render.com/docs/static-sites).

The current repository includes a Node server and offline build script; audit their behavior before replacing them with static hosting. Keep service-worker URLs and asset paths compatible with Render. This PRD does not authorize deploying or changing remote infrastructure.

## 14. Data contracts

### Mission package

Required fields: `package_id`, `version`, `sha256_manifest`, `region_bounds`, `coordinate_frame`, `origin`, `axis_mapping`, `vertical_datum`, `meters_per_unit`, `terrain_uri`, `routing_graph_uri`, `coverage_masks`, `source_catalog`, `poi_catalog`, `weather_series`, `simulation_config`, `emergency_procedures`, `created_at`, and `data_review_status`.

Each package is immutable. A run pins one package and model version. Do not change a graph or threshold halfway through a run except through an explicit scenario event.

### Terrain-team handoff

Supply bounding polygon; planetary body; planetocentric/planetographic latitude convention; longitude direction/range; projection definition and reference radius/ellipsoid; vertical datum; local origin; world-axis orientation; unit scale; georeferenced elevations; routing cells/adjacency or elevation raster; no-data/quality masks; annotated obstacles; source footprints; source product metadata; and documented uncertainty metrics. Provide at least three known control points for bidirectional map/world coordinate tests. Coordinate conversions must be centralized.

If the rendered terrain uses Y-up while projected data uses northing/easting/up, the adapter explicitly maps those axes. No module may assume browser world coordinates are latitude/longitude.

### Source and telemetry envelopes

Every data item includes:

```ts
type ProvenanceClass = 'observed' | 'derived' | 'simulated' | 'unavailable';
type Quality = 'accepted' | 'suspect' | 'rejected' | 'missing';
interface Reading {
  id: string;
  quantity: string;
  value: number | null;
  unit: string;
  provenanceClass: ProvenanceClass;
  quality: Quality;
  observedAt?: string;
  simulationTimeSeconds?: number;
  sourceProductIds: string[];
  modelVersion?: string;
  spatialApplicability: string;
  uncertainty?: { value: number; unit: string; method: string };
}
```

Null means unavailable, never zero. Precision and rounding follow uncertainty and source resolution. No displayed “±” value without a defined method.

Route request: position, destination, mobility profile, resource snapshot, graph/hazard/config versions, task dwell, refuge status, and request revision. Route result: geometry, ordered edges, summary metrics, cost objective, assumptions, feasibility/rejection reasons, source coverage, confidence limitations, and matching revision.

### Suggested persistence entities

- `mission_packages`: immutable package metadata and review/publication state.
- `source_products`: mission, instrument, product ID/version, URL, observation time, footprint, resolution, uncertainty method, processing hash, credits.
- `missions`: package, objective, astronaut display identity, owner/team, configuration version.
- `mission_runs`: mission, seed, start/end, outcome, model version, selected presentation.
- `mission_events`: run, sequence, idempotency key, simulation time, actor, type, payload.
- `route_plans`: run, input revision, graph/model versions, alternatives, selected route, decision explanation.
- `telemetry_checkpoints`: run/revision, resource state, position, activity, health; checkpoint every 10 simulation seconds and on critical events.
- `science_tasks`: run, POI, planned dwell, state, timestamps.

Add unique constraints on `(run_id, sequence)` and `(run_id, idempotency_key)`. Reference IDs must belong to the same authorized run/team. Avoid collecting personal health information; astronaut identity can be a fictional display name.

## 15. Offline behavior and synchronization

Before departure, display package readiness including asset availability, source validity, graph readiness, and emergency procedure availability. “Offline ready” requires integrity checks and complete required local storage, not just a successful page load.

Cache application shell and the selected mission package with a service worker; persist state/checkpoints and outbox in IndexedDB. Large regional assets can use a lower-detail accepted fallback; display that downgrade. Never silently mix package versions after an update. Offer reload/update between runs.

Write events locally before cloud upload. Retry idempotently with bounded backoff. The run's controlling client owns event order; a viewer is read-only. Optional remote controller support needs an explicit lease and conflict policy before implementation. On reconnection, append missing events and verify sequence continuity. Cloud state cannot rewind an active local run.

No first-load offline promise. If required assets are missing, block mission start with the specific missing package component and allow a briefing-only view. Test offline reload, not just offline navigation in a tab that already holds all resources in memory.

## 16. Data quality and uncertainty requirements

The data team owns validation; the application must enforce its outputs.

- Record horizontal alignment, elevation bias/RMSE where independent references exist, sample size, spatial distribution, no-data rate, and processing method. “Error rate” is not one universal percentage.
- Distinguish source posting interval, spatial resolution, interpolation, and accuracy.
- A coarse MOLA comparison can reveal broad consistency issues, not validate centimeter-scale terrain.
- Slope uncertainty near the configured exclusion threshold must produce conservative exclusion or “uncertain,” using a documented bound. No arbitrary confidence percentage.
- Temporal uncertainty and spatial representativeness of MEDA remain separate from instrument precision.
- If the source lacks quantified error, report “Unquantified” and retain a conservative policy allowance. Do not turn the 20% route allowance into a purported measured error.
- No fabricated radiation, ice-abundance, ground-bearing-strength, or local meteorology layers.
- Source updates are reviewed and repackaged; live catalog downloads cannot silently alter a judge demo.

## 17. Demonstration design

### 60-second application segment in a three-minute video

- 0–10 s: tablet overview; show MRO terrain, Mars 2020 weather context, MGS context, destination, and A/B comparison. Confirm a route.
- 10–22 s: switch to visor/wrist mode; walk with active arrows, 2D progress, and modeled O₂/return margin.
- 22–34 s: inject dust; show the cause and increased return forecast.
- 34–46 s: inject a logged oxygen leak; show reserve breach, limiting resource, and revised return route.
- 46–53 s: Earth-link loss; show offline guidance continuing and distress queued.
- 53–60 s: explicit “Demo jump — simulation time advanced” to near habitat, complete ingress, show safe-abort debrief.

### Two-minute application segment in a five-minute video

- 0–25 s: briefing, layered inspection, source details, route comparison, and selection.
- 25–50 s: first-person movement and science POI inspection; switch to tablet briefly to prove shared state.
- 50–75 s: dust event and changed route/resource forecast.
- 75–95 s: low oxygen, return recommendation, and alternate-path confirmation.
- 95–110 s: communications loss and cached map/queued-message status.
- 110–120 s: labeled time advance, ingress, and evidence-based debrief.

These are presentation timings, not traversal estimates. Pre-recorded clips or deterministic checkpoints are permitted only with clear time-advance labeling. Resource changes must follow simulated elapsed time and logged events. A demo preset must pass the complete run and end with positive remaining resources while preserving the intended reserve policy or explicitly explain any reserve breach. Do not hard-code a success screen independent of the state.

The four P0 emergencies need not all be in the short video. Keep blockage and no-feasible-route as reproducible extra cases for judging. Display team and challenge context outside the application demo segment.

## 18. Performance and usability acceptance targets

Proposed targets to measure on a declared reference laptop and tablet; hardware remains to be selected:

- At least 30 FPS during the accepted region's normal traversal at the chosen quality setting.
- Local input feedback within 100 ms; telemetry updates each simulation second.
- Critical alert visible within one simulation step plus 250 ms rendering time.
- Route replan p95 under 2 seconds for the approved graph; map/controls remain responsive meanwhile.
- Core ready screen within 5 seconds after package assets are locally available; first package download has separate size/progress reporting.
- Report graph size, asset download size, peak memory, and test hardware with results. Agree the package budget after the terrain handoff, before accepting performance claims.
- A new viewer can identify destination, return action, limiting resource, and current highest-priority warning within 5 seconds in a moderated check.
- Mode switching preserves mission state exactly, apart from continued elapsed simulation time.

If a device cannot render 3D, offer the operational 2D planning/guidance view and clearly identify reduced presentation capability.

## 19. Verification and release gates

### G1 — calculation and routing

- Resource integration is independent of rendering frame rate and matches analytical constant-rate fixtures.
- The worked arithmetic fixture produces −8 min return margin and identifies battery as limiting.
- A longer but smoother route can use less oxygen; reverse paths account for grade direction.
- A* matches Dijkstra cost on small deterministic graphs with the declared admissible heuristic.
- No route crosses blocked/no-data cells, cuts diagonal corners, leaves accepted coverage, or violates configured exclusions.
- Test destination unreachable, insufficient outbound-plus-return reserve, duplicate alternatives, no feasible refuge, and conflicting simultaneous faults.
- Property checks: increasing leak rate cannot improve the same route's oxygen demand; adding blocked cells cannot create a shorter optimal path under unchanged costs; resources remain finite and nonnegative.

### G2 — data and coordinates

- Three control points round-trip map/world conversion within the manifest's specified numerical tolerance.
- 2D and 3D route positions match the same coordinates; visual overlays do not alter distance calculations.
- All P0 measured/derived values have traceable source/model metadata.
- Historical weather includes time/location; suit and ambient pressure cannot be confused in labels or units.
- Rejected/absent data becomes unavailable; it never becomes zero or an unlabeled synthetic observation.
- The data lead signs final bounds and source/uncertainty manifest.

### G3 — emergencies and offline

- Dust changes configured visibility/forecast inputs and only relevant power systems.
- Oxygen fault triggers return analysis and a reason, even when nominal O₂ percentage looks high.
- Communications loss preserves local navigation and labels undelivered messages accurately.
- Blockage invalidates affected arrows immediately; stale worker responses cannot restore unsafe guidance.
- Acknowledgement does not resolve an active fault; hysteresis prevents warning chatter.
- After online package preparation, disable all network access, reload, complete the mission, reconnect, and verify exactly-once event ingestion.
- A missing or corrupt package blocks departure; simulation restore is deterministic.

### G4 — interface, security, and demonstration

- Exercise both presentations with mouse, keyboard, and tablet touch; wrist tabs are usable without obstructing the central visor.
- Validate contrast and focus states and inspect critical warnings against bright and dark terrain scenes.
- Verify owner/team RLS denies access to another run and unauthorized package/config changes.
- Inspect built frontend assets for secrets; anonymous judge mode cannot become an operator.
- Run build/type checks and targeted engine, routing, component, and end-to-end tests. Tests must exercise behavior rather than mirror implementation.
- Both demo scripts complete from reset with consistent telemetry, no manual hidden state edits, and a debrief generated from actual events.

Definition of done: all P0 requirements and G1–G4 pass, provenance and scientific limitations are visible, Render build instructions are reproducible, and the data and product owners accept the final region and scenario configuration.

## 20. Agent implementation work packages

Perform these in order. Each package ends with reviewable files, checks, and a short report. The agent reads repository instructions, checks the working tree, and preserves unrelated changes before editing. Do not rebuild the terrain pipeline under this PRD.

1. **Repository audit and contracts:** identify reusable explorer, state, route, offline, and source components; reconcile duplicate apps; document gaps. Deliver typed package/reading/route/event interfaces and a dependency map. Acceptance: existing app still builds; no scene or data regeneration.
2. **Deterministic engine:** implement time, phases, event reducer, activity, O₂, battery, pressure fixtures, alerts, and model configuration. Acceptance: G1 arithmetic/resource cases and replay pass without React or WebGL.
3. **Mission package integration:** consume the signed terrain/data handoff, perform schema/hash/coverage checks, and centralize coordinate conversion. Acceptance: G2 and missing-package behavior pass.
4. **Route service:** implement graph constraints, A*, candidate comparison, return feasibility, worker revision handling, and 2D route output. Acceptance: oracle/blocked-route/unreachable tests pass; no invented second option.
5. **Shared interface:** implement HUD/wrist and tablet shells using one state store, survival strip, route comparison, source inspection, and science tasks. Acceptance: mode switching and route/position consistency pass.
6. **Scenario response:** add controller, dust, oxygen fault, link states, blockage, return workflow, and deterministic checkpoints. Acceptance: G3 emergency cases and both scripted demo paths pass.
7. **Offline and persistence:** implement versioned cache, IndexedDB events/checkpoints, authorized Supabase schema/policies, and idempotent synchronization. Acceptance: full network-off reload/finish/reconnect plus RLS checks pass.
8. **Release and handoff:** verify accessibility/performance, prepare Render configuration, publish runbook and source credits, generate debrief/export, and rehearse both video lengths. Acceptance: G4 and final sign-off. Deploy only when requested.

For each coding-agent task provide objective, allowed files, dependencies, exact acceptance checks, and non-goals. Require evidence of test results and list unresolved assumptions. Agents must not invent NASA product IDs, silently alter thresholds to make a demo pass, turn placeholder measurements into observed data, or modify the teammate's Blender assets. Parallel agent execution is optional and requires explicit coordination; the default is sequential work packages.

Suggested internal structure, adapted to the existing repository rather than imposed blindly:

```text
src/domain/{mission,resources,alerts,events,config}
src/navigation/{graph,planner,feasibility,worker,geo}
src/data/{catalog,schemas,package-loader,provenance}
src/offline/{cache,checkpoints,outbox}
src/features/{planning,navigation,suit,layers,emergency,debrief,demo}
src/presentation/{hud,wrist,tablet,shared}
docs/{PRD,data-manifest,model-assumptions,demo-runbook,release-checks}
```

## 21. Team responsibilities and milestone plan

Milestones have exit criteria rather than invented dates. The team lead can assign dates once the delivery deadline is known.

- **Data lead / coordinator:** owns candidate comparison, product retrieval/provenance, weather-window selection, uncertainty report, model assumption register, and G2 sign-off. Coordinates geographic scope with the terrain specialist.
- **Terrain specialist:** supplies the accepted region package and coordinate/control-point contract, performance-ready assets, collision/nav inputs, and source-aligned coverage. Owns 3D production outside this PRD.
- **Application/documentation implementer with Codex:** owns engine, routing, UI, integration, Supabase/offline, verification, deployment preparation, and living technical documents.
- **Presentation contributor 1:** owns challenge narrative, visual explanation of the three mission inputs, video storyboard, captions, and source credits.
- **Presentation/support contributor 2:** owns scenario rehearsal, adverse-case testing, judge Q&A, screenshots/video capture, and independent usability checks.

Milestone A: scope/manifest contracts and deterministic calculation fixtures agreed. Milestone B: a data-backed plan-to-return vertical slice works on one route. Milestone C: both modes and alternate routing work. Milestone D: emergencies/offline/debrief work. Milestone E: final region sign-off, verification, and video rehearsal.

If schedule compresses, cut P1 scenarios, decorative animation, optional live cloud control, and broad geographic extent first. Preserve the connected calculations, source truth, return feasibility, offline behavior, and one complete P0 journey.

## 22. Existing repository considerations

Inspection on 10 November 2026 found `mars-explorer` and `mars-explorer-web`, with React/Three.js code and documentation claiming HiRISE/CTX terrain, historical MEDA context, and offline support. These capabilities were not independently tested while writing this PRD.

The existing MEDA JSON summarizes historical temperature extrema for sols 43–44 and a wind gust; it is not a time-resolved pressure/temperature product. It cannot satisfy the full weather contract without additional verified data.

There are already uncommitted source/CSS changes in `mars-explorer-web`. Preserve them. This document adds requirements only and does not certify or replace that implementation.

## 23. Open decisions and release blockers

1. **Final corridor/bounds and NASA product IDs:** data lead + terrain specialist; blocks verified-route claims and geographic release.
2. **Exact historical MEDA window, rover location, and accepted fields:** data lead; blocks observed weather playback, but a clearly labeled synthetic fixture can support engine development.
3. **Quantified uncertainty and alignment tolerances:** data lead; blocks precision/accuracy claims. Software numerical tolerances alone do not validate terrain.
4. **Simulation suit/resource defaults and refuge capabilities:** product owner + data lead; current defaults support implementation fixtures only. Freeze the demo configuration before final rehearsal.
5. **Delivery deadline, reference devices, and package size budget:** team coordinator; needed for scheduling and performance acceptance.
6. **Final 3-minute or 5-minute video:** presentation team; both demo scripts are supported.
7. **Public guest persistence versus local-only guest sessions:** application owner; default local-only judge runs with optional explicit export.

These decisions do not block building the engine, contracts, fixture routing, or interface. They do block presenting provisional values as measured mission facts.

## 24. Source and evidence register

The following are primary-source discovery/documentation references checked while drafting. They are not substitutes for final product-level manifests.

- NASA PDS MRO archive — available instrument archives and access to orbital products: https://pds-geosciences.wustl.edu/missions/mro/default.htm
- University of Arizona HiRISE DTM catalog — stereo terrain product discovery: https://hirise.lpl.arizona.edu/dtm/
- Caltech/JPL Mars 2020 landing-site data — candidate regional products: https://murray-lab.caltech.edu/Mars2020/
- NASA PDS Mars 2020 archive — Perseverance instrument data access: https://pds-geosciences.wustl.edu/missions/mars2020/index.htm
- NASA PDS MEDA archive description — measured environmental quantities and archive access: https://atmos.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html
- NASA PDS MEDA bundle — product documentation entry point: https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn%3Anasa%3Apds%3Amars2020_meda&version=1.0
- NASA PDS MGS archive — MOLA regional elevation context: https://pds-geosciences.wustl.edu/missions/mgs/index.htm
- NASA Jezero rim context map — orbital mapping and regional presentation reference: https://science.nasa.gov/photojournal/perseverances-location-at-the-base-of-jezero-craters-rim/
- Supabase RLS documentation — database authorization design: https://supabase.com/docs/guides/database/postgres/row-level-security
- Render Static Sites documentation — frontend hosting architecture: https://render.com/docs/static-sites

The supplied four images provide layout, normal-operation, emergency-case, and demo-story references. Their contents are reference material; the product owner's written request and subsequent scope answers determine this PRD's requirements.
