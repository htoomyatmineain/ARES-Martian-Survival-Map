# Rover battery planning model — 15 November 2026

## Why include it
A crewed rover plan should budget return energy as well as suit endurance. This is a planning demonstration, not a selected Mars vehicle specification.

## NASA reference versus assumptions
NASA Apollo 17 press kit, printed p. 72 (PDF p. 116): two non-rechargeable batteries, 36 V and 121 Ah each, normally used together. Nominal energy = 2 × 36 × 121 = 8,712 Wh. This is a lunar historical analogue; usable energy under Mars conditions is not established.
https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A17_PressKit.pdf#page=116

The press kit also distinguishes mobility power from navigation power during stops. ARES uses two illustrative constant-power rates rather than treating stopped consumption as zero. It does not copy the historical switching procedure or claim measured power.

Editable team assumptions: starting charge 100%, total driving power 1,000 W, stopped power 100 W, capacity reserve 20%. These power values and reserve are not NASA specifications. No motor-rated output is mistaken for total electrical input.

## Calculation
Energy Wh = power W × elapsed minutes / 60.
Planned energy = driving power × (outbound + verified return minutes) / 60 + stopped power × (science + recovery minutes) / 60.
Review requires planned energy + reserved Wh <= starting Wh. Walking mode does not use rover energy.

Mission clock updates driving consumption during outbound/return and idle consumption at destination and for injected stationary delays. Snapshot locks settings; pause freezes consumption. No recharge, regeneration, terrain-dependent draw, heating, cold derating, ageing, battery failure or detailed life-support load is inferred.

Reserve monitoring triggers the existing mission return action. Depletion stops the simulation and reports no assessed powered return; it never silently switches the crew to walking. Reports retain plan and remaining energy.

## Where to see it
Mission → Review → Supplies → Rover battery. Expand Rover energy assumptions to edit inputs and view the NASA source. Rover missions show remaining energy during execution and debrief. No Emergency UI/files or rover-failure controls were added.

## Checks
17 targeted mission/suit-supply tests passed. Added cases check W-min-to-Wh arithmetic, driving versus stationary draw, recovery use, invalid and insufficient-charge blocking, reserve-triggered return, depletion stopping movement, walking exclusion and report values. Production build passed. Browser visual verification remains pending.
