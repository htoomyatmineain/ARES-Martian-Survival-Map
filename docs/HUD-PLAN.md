# Deferred plan: Tablet and HUD modes

> **Current scope note, 14 November 2026:** the separate [Emergency Simulation](emergency-simulation.md) has passed its Phase 4 acceptance checks. This is not implementation or acceptance of the deferred HUD plan; HUD-specific checklist items retain their original status.

Recorded 2026-11-13 at the user's request. **Deferred; do not implement until requested.**

## Intended experience

- Tablet: existing map, mission briefing/review, data layers, destination selection and route planning.
- HUD: execute the same simulated mission from a ground-level astronaut/rover view, with route guidance and concise status/alerts.
- Switching views must preserve one shared route, mission progress, task state and simulated resource state. HUD must not run a separate mission clock or recalculate a different route silently.

## Existing data and renderer

- Reuse Three.js / React Three Fiber already present in the application.
- Retain NASA HiRISE native 1 m elevation and 25 cm/pixel imagery as the source; same Mars frame and missing-data handling as Tablet.
- Start with the existing 10 m display terrain and imagery overview.
- Later load higher-detail terrain/imagery tiles near the observer, keeping distant terrain coarse, with bounded memory and cancellation of obsolete requests.
- Overhead imagery and a height field do not reconstruct every rock, vertical face, cave or overhang. Do not present procedural/decorative geometry as measured NASA obstacles.

## Ordered future implementation

1. Add explicit Tablet/HUD switching and a shared frozen mission contract.
2. Add a terrain-grounded viewpoint following the simulated astronaut or rover, with stable heading, eye-height handling, camera clearance and pause/reset behaviour.
3. Add ground-following route arrows, next waypoint, heading, remaining route distance and return estimate.
4. Preserve science-site versus approach-point distinctions. Stop guidance at the actual verified endpoint; never append the unplanned final gap.
5. Add simulated oxygen supply/endurance and rule-based, explained return recommendations. Oxygen supply is not blood saturation; rates/capacity are demo assumptions, not a certified suit model.
6. Add clearly labelled injected contingencies: oxygen loss, dust/poor visibility and rover unavailability.
7. Handle predeparture rover unavailability by reassessing walking. A breakdown during travel requires separate return assessment from the current position; never imply a valid walk-back automatically exists.

## Verification when implemented

- Same geographic location, route, endpoint and clock across both views.
- Camera and arrows follow the valid terrain without crossing missing areas or adding unchecked route segments.
- Tile detail changes do not change science/routing coordinates or invent terrain.
- Resource estimates, recommendations and mission reports share the same simulation state and declared assumptions.
- Time to return plus reserve is considered, without implying oxygen alone proves safe endurance.
- Test normal travel, pause/resume, early return, reset, approach-only arrival and each injected event.
- Verify actual WebGL rendering on hardware acceleration and fall back gracefully when unavailable.

## Boundaries

Build in stages: navigation HUD first, oxygen/alerts second, contingency handling third. This is a prototype simulation, not live astronaut tracking, validated suit/vehicle performance, real-time Martian weather or operational EVA clearance. No completion date or performance guarantee has been established.
