# Mission supply model — research and implementation

Reviewed 14 November 2026. This is an endurance-analogue simulation, not a Mars suit specification, medical prediction or operational EVA clearance.

## NASA sources

1. [Exploration EVA System Concept of Operations, revision B, 19 October 2020](https://www.nasa.gov/wp-content/uploads/2017/02/eva-exp-0042_xeva_system_con_ops_rev_b_final_dtd_10192020_ref_doc.pdf), section 9.1.2, printed page 124. Lunar rescue planning describes eight hours of primary consumables plus a separate hour of contingency consumables. Mars operations are described as still under development (section 4.1.4.4). This does not provide a flight-qualified Mars oxygen tank size, leakage model or consumption rate. We borrow **480 equivalent primary minutes** for a configurable planning analogue; we do not add a fictional secondary oxygen pack.

2. [NASA JSC, Energy Goals & Safety Challenges for Future Space Exploration, September 2014](https://ntrs.nasa.gov/api/citations/20140012761/downloads/20140012761.pdf), slide 5, zero-based PDF page 4. The current-suit battery list gives an EMU reference of 20.5 V, minimum 26.6 Ah and seven-hour EVA. This historical ISS reference is not the same suit as the exploration concept and is not a demonstrated Mars battery lifetime. We borrow **420 equivalent minutes** for a configurable suit-power analogue. We do not derive constant watts or usable Wh from nominal voltage/capacity alone.

## ARES choices, not NASA requirements

- Starting equivalent budgets are full. Both decrease by one equivalent minute per simulated minute, independent of activity, vehicle mode, temperature and workload. Percent = 100 × remaining / configured endurance. At defaults that is ~0.2083 percentage points/min for oxygen and ~0.2381 for suit power. These are model arithmetic, not measured oxygen mass flow or battery discharge curves.
- A **60-minute reserve inside each configured primary budget** is ARES's editable policy. It is not the additional NASA contingency supply, and is separate from the existing 25% mission-time reserve.
- Preflight checks travel + science + return + supply reserve against both capacities. Return triggers at the first time-budget or supply-budget boundary. Constant-rate return demand uses the currently locked mode/speed/corridor. It does not assess soil, rescue, physiological stress or alternate paths.
- Loss buttons remove 60 equivalent minutes per click, cumulatively; this is a scenario input, not a leak/short-circuit mechanism. Position is unchanged. Exhaustion pauses movement and blocks resume/return; the UI states that self-return is unassessed and assistance required. No teleport or fabricated rescue.
- Rover battery is **not modelled**, because no selected crewed vehicle capacity/load profile has been established. No Perseverance electrical specification is transferred to a crewed rover.
- Three generic proposed documentation actions can be explicitly crew-confirmed during exact-target science. They are not site-specific sampling instructions; named-site approach routes cannot confirm science. Timer completion and crew confirmation are exported separately.

## Validation

Production build passed and all 59 tests passed, including five new resource tests: unit/capacity/depletion arithmetic, insufficient preflight, pause/reset/snapshot isolation, injection/return/depletion blocking, task gating and duplicate confirmation, delay accounting, report separation and exact reserve-boundary handling with a large tick. UI checks are recorded separately; code tests are not evidence of physical suit accuracy.

Not implemented by this increment: hardware-specific O2 metabolic/leak modelling, temperature-dependent battery degradation, crewed rover power, actual site science instructions, reduced-visibility traversal or rover-failure rescue. Do not present these as finished.

Browser verification: on port 4176 (4174 belongs to the separate rebuild), a 120-minute O2 setting blocked Start; restoring 480 enabled it. Start locked inputs; pause froze readings; a 60-minute injection changed oxygen from 100% to 87.5%; reset restored 100%. Source links and limits were inspected. Screenshot: mission-supply-panel.png. Site-specific task integration and rover/visibility scenarios remain pending.
