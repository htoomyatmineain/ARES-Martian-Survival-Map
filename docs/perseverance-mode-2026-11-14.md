# Separate Perseverance robotic planning mode

## Entry
Map → Route → Travel mode → Perseverance · robotic. The top Mission entry becomes Robot review. Crewed rover and suited walking remain available with their own stored speeds and rule selection. Mode changes are disabled while an astronaut mission is locked; reset that mission first.

## Behavior
- Default 0.11 km/h (110 m/hour), from NASA/JPL's approximate autonomous-driving reference. Constant-rate moving time = checked route distance / assumed rate. It is not elapsed mission duration or a daily driving schedule.
- Positive rates up to 0.15 km/h can be entered. This is a conservative rounded cap based on the approximately 150 m/hour wheel-speed reference, not a promise of driving performance.
- Dedicated fixed robotic terrain screen: 30° along, sideways and total conservative DEM bounds. NASA guidance says drivers avoid rover body tilts over 30°; equating a DEM ground-slope bound to this number is explicitly an ARES screening proxy, NOT an actual body-pose or traction computation. The 45° design tilt is not used.
- Switching mode changes route metadata and triggers the normal worker plus native-height profile verification. Robot review/export refuses a stale profile tagged for crew planning.
- Walking equipment multipliers do not apply to the robot.
- Robot review shows moving-time estimate, source links, terrain-screen limitations and any unplanned approach gap. It offers an edit action and separate `ares-perseverance-route-study.json` download.
- No crew oxygen/suit power, astronaut task confirmations, EVA start/pause or walk-back model. Astronaut Emergency navigation is disabled in this mode. No robotic drive playback, real rover commands, power forecast or actual rover localization is implemented.
- Scenario start remains the existing hypothetical base coordinate. It is labelled as a scenario, not Perseverance's actual current position. No operational command plan is asserted.
- The existing crew mission reducer independently rejects the robotic mode. Robot export removes legacy oxygen/minutes/feasible fields from the route and uses a distinct report type.

## Sources
NASA/JPL mobility: https://robotics.jpl.nasa.gov/what-we-do/flight-projects/mars-2020-rover/m2020mobility/
NASA rover components and tilt guidance: https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/

## Checks
- Full suite: 79 passed, 0 failed. See perseverance-mode-tests-2026-11-14.txt.
- Tests: 110 m at default rate yields 60 min; invalid/over-reference rates and stale/unverified routes do not yield a ready estimate; no crew supplies in robotic report; crew reducer cannot start robot mission; walking load does not alter robotic limits; crew defaults remain 5/2 km/h.
- Production build passes.
- Browser checks: robotic option and 0.11 speed shown; Robot review replaces astronaut mission controls; Emergency disabled; source/rule information present; switching back restores crew settings. See perseverance-mode-preview.png.

## Limits
This is comparative robotic route planning on real terrain data, not a Perseverance digital twin or a verified drivable path. Rocks, soil mechanics, wheel slip, suspension pose, power, communications and operating schedules remain unmodelled.
