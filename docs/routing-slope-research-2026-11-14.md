# Slope rules and routing research — 14 November 2026

## Result
The avoidable limitation was partly the search lattice, not simply the slope cutoff. A 20 m search can miss an admissible corridor represented by 10 m hazard cells. We added a 10 m retry after an exact 20 m search fails, before attempting an approach route. Every edge still passes the same full-cell gradient bounds, no-data blocking and exclusion checks. No heights are filled, slopes smoothed away or limits relaxed by this fallback.

At default original project rules (18° along, 12° cross, 28° ground), exclusion off, habitat E1900/S1500:
- Before: 12 of 16 exact-coordinate routes on the 20 m graph.
- After: 14 exact-coordinate routes using 20 m plus the 10 m retry.
- Two remain approach-only: Skinner Ridge and Pelican Point (provisional coordinate).
- Wildcat/Hazeltop and Lefroy Bay gained exact-coordinate graph routes through the finer retry.
- Browser: Wildcat route subsequently passed the native 1 m height-profile pipeline, with 10 m search spacing and original limits. It was not labelled approach-only.
- These figures concern the selected coordinates, including provisional positions. They do not establish rover access, suit accessibility, absolute location accuracy or safety at the outcrop.

Raw per-site graph results: routing-search-audit-2026-11-14.json. Reproduce with `node --experimental-strip-types scripts/audit-routing-research.ts` from mars-explorer-web. This audit does not fetch new native profiles for all 16 sites.

## NASA evidence: three different systems
### Perseverance: a robotic Mars rover
NASA rover components page distinguishes 45° design tilt survival from drivers avoiding tilts over 30°. These are body-tilt statements, not an instruction to allow every 30° ground cell. It does not carry astronauts.
https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/

NASA JPL reports a 20° Jezero climb on slippery ground required special driving strategies. A slope number alone therefore does not establish traversability or traction.
https://www.jpl.nasa.gov/news/nasas-perseverance-rover-looks-back-while-climbing-slippery-slope/

### Crewed lunar rover research
NASA/TM-20240001217 (January 2024), section 4.2: a notional simulated LTV was modelled to traverse ±20° up/down/cross slope. This is a lunar study model, not a tested Mars crew rover.
https://ntrs.nasa.gov/api/citations/20240001217/downloads/LTV%20Teleops%20Study.pdf

NASA-hosted mobility test best practices (2025), section 1.3, describes LTV soft-soil up/down 20° requirements and separately discusses obstacles, soil and test conditions. It expressly says the paper is not itself a standard.
https://ntrs.nasa.gov/api/citations/20250003470/downloads/Mobility%20Test%20Best%20Practices%20-%20STRIVES%20July2025.pdf

### Suited walking research
ICES-2025-129, NASA-funded CSRM traverse model paper, section IV/V, excludes terrain outside ±20° in its example and discusses the need to adapt terrestrial metabolic models to reduced gravity and suit constraints. It is not a validated Mars spacesuit maximum slope.
https://ntrs.nasa.gov/api/citations/20250001829/downloads/ICES%202025%20TraverseModel.pdf

## What the app now provides
- Original project limits stay the default, explicitly identified as team assumptions.
- Optional `20° lunar research comparison` applies a 20° cap to along, cross and total bounds. Sources and limitations are shown next to the selector and in Mission Review.
- Rover comparison cites the 2024 LTV study. Walking comparison cites the 2025 traverse study.
- Applying the 20° study context to all three conservative ARES bounds, especially total ground bound and walking cross slope, is disclosed as our project interpretation. No claim of NASA Mars certification is made.
- Equipment multipliers still apply to walking and remain assumptions. Warning fraction remains 80%.
- Editing a number changes the basis to Custom project limits; it no longer claims a source-backed preset.
- Profile ID, name, source, caveat, effective rules and actual search spacing are carried on the route and therefore into its locked snapshot/report.
- Switching a profile or travel mode invalidates the previous request and re-runs the worker and native profile checks. Neither profile bypasses missing data.
- The time-estimate explanation was corrected: walking equipment can affect routing as well as estimated time.

## Why some areas remain excluded
Skinner Ridge's endpoint cell has a conservative ground-gradient bound around 31.7°, above the original 28° setting; the 20° comparison does not resolve that. It is a 10 m envelope of native derivatives, not a direct vehicle tilt measurement at the exact marker. Max derivative components may occur at different points in a cell, making this conservative. Pelican Point's cell passes the point check but no exact connected path was found on either lattice with the original limits.

A missing hazard cell can also represent any missing native input needed to form its derivative envelope. The conservative routing mask must not be equated with the raw DEM's missing-pixel percentage.

The current 10 m hazard envelopes still cannot resolve every narrow 1 m corridor. The search lacks vehicle footprint, steering radius, wheel/soil mechanics, real rock detection and validated suited-human stability. A finer search grid does not create finer observations or prove physical safety.

## Verification
- Full suite: 66 passed / 0 failed; see routing-research-tests-2026-11-14.txt.
- New narrow-corridor test: 20 m search fails, 10 m retry succeeds, all segments pass identical rules; a missing strip then blocks both.
- Existing gap, diagonal corner, exclusion, obstacle, endpoint, profile and real released-hazard tests pass.
- New evidence test: correct mode-specific source, custom values have no source claim, equipment scaling preserves provenance and warning fraction.
- TypeScript/Vite production build passed.
- Browser: source-profile selector works; NASA source/caveat present; Wildcat exact route native-height profile checked with original rules and 10 m search.

## Needed for operational rules
1. A selected, engineered crewed Mars rover and suit configuration, with mass/load, wheelbase, centre of mass, clearance and steering limits.
2. Test-derived traction, slip/sinkage and stability envelopes on relevant soil and slopes, including cross slope, uphill/downhill, speed and stopping.
3. Local terrain roughness/rocks, soil and elevation uncertainty at appropriate footprint scales; field inspection where orbital data is insufficient.
4. Validated human workload, fatigue, suit mobility and emergency return/assistance constraints.
5. Independent end-to-end verification and operational approval.

Until those exist, these remain transparent planning profiles and calculated routes—not flawless astronaut-safe clearance. No numeric limit from a different vehicle or environment can substitute for that evidence.
