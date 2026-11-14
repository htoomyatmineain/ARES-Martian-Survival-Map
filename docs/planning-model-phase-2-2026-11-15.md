# Phase 2 — planning model update, 15 November 2026

Scope: Map and Mission planning only. EmergencyWorkspace, emergency.ts, useEmergencyReturns, emergency styles and shared emergency policies were not edited. Phase 3 remains pending by user instruction.

## Delivered

- Walking and crewed-rover slope settings and selected research profiles are now held separately in the Map workspace. Switching modes restores that mode's settings. Defaults remain the original team assumptions (18° along, 12° sideways, 28° ground), not invented hardware specifications. Load-adjusted walking limits continue to require a new verified route.
- Equipment load retains the documented baseline/light/heavy multipliers for speed and slope; no new physiological claim is added.
- Destination recovery time defaults to 10 min and is editable to zero or another non-negative duration in Review → Itinerary → Time budget & science stop. This is a team assumption, not a NASA-prescribed rest period. Approach-only plans omit this destination stop.
- Total time = outbound + separately verified return + documentation + recovery. Suit equivalent endurance continues to decrease during recovery. The simulated destination stop displays documentation versus recovery, and reports retain recovery duration.
- Endpoint rover-failure time estimate includes documentation and recovery before walk-back. It remains a warning-only endpoint scenario, not a route-wide or walking-terrain assessment.
- Review → Safety explains selected mode, load, recovery, equivalent endurance, unknown ground conditions and NASA research context. Geologic units are not treated as measured soil strength or traction.

## Evidence and assumptions

- NASA xEVA Concept of Operations (2020), lunar walking context (~2 km/h): https://www.nasa.gov/wp-content/uploads/2017/02/eva-exp-0042_xeva_system_con_ops_rev_b_final_dtd_10192020_ref_doc.pdf
- NASA spacesuit requirements: mobility and acceptable physical workload/fatigue are design requirements, not a universal Mars walking or slope constant: https://www.nasa.gov/reference/11-0-spacesuits-vol-2/
- NASA surface EVA health/performance research discusses workload and work/rest intervals; it does not prescribe ARES's 10 min stop: https://ntrs.nasa.gov/citations/20240005165
- Existing 480 min oxygen-equivalent and 420 min suit-power-equivalent defaults remain the previously documented different-system analogues, not a selected Mars hardware package. Existing editable 5 km/h crewed rover speed and all load multipliers remain team assumptions.

No oxygen mass-flow, tank pressure, metabolic rate, rover watt-hours, measured soil looseness, automatic geological hazard avoidance, fatigue model, travel rest stops or live telemetry is claimed. Validated specifications and independently mapped ground hazards still require data; they have not been fabricated to close a checklist.

## Checks performed

19 targeted mission/mobility/supply tests passed, including recovery budget, supply consumption, no automatic crew task evidence, invalid recovery rejection and excessive-duration blocking. Production build passed. These are implementation checks, not Phase 3's full integrated validation or hardware certification. Browser visual confirmation remains pending.

## Try it

1. Map → select walking, edit a slope limit, switch to rover: its original setting remains independent.
2. Switch back to walking: its edit is retained. Recalculate and wait for outbound/return verification.
3. Mission → Review → Itinerary → edit destination recovery. Total duration changes; departure confirmations reset.
4. Launch a valid simulation. At the destination begin the planned stop. After documentation time, the current action changes to recovery. Suit budgets keep decreasing; crew tasks are never auto-confirmed.
