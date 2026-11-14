# Regional slope and route planning

Implemented and checked 12 November 2026. Applies to the Western Jezero regional workspace. Legacy planners in other workspaces are unchanged.

## What changed

The regional planner no longer compares just the endpoint elevations of 100 m edges. Its 20 m, eight-neighbour A* graph checks every 10 m hazard square touched by each complete edge, including exact start/end connectors, diagonal corner touches and square-boundary touches. No unchecked smoothing or waypoint replacement occurs. A segment-circle test handles the simulated exclusion over its full length.

The hazard squares contain conservative envelopes computed directly from all overlapping native 1 m HiRISE bilinear DEM cells. They retain gradient extrema rather than a mean slope. Any missing source corner blocks the square. At present 996,935 of 1,000,000 squares are valid; 3,065 are blocked by missing data or unavailable boundary interpolation. This larger exclusion mask is intentional and does not fill terrain gaps.

The 2D slope image displays these exact 10 m cells with nearest-pixel rendering. The 3D display colours its 10 m mesh vertices from the same native field, with visual interpolation between vertices. Routing reads the conservative field directly, independently of those display colours or mesh heights.

## Source and formulas

[NASA HiRISE DEM distributed through USGS/PDS](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif)

Product: JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40. The local source crop, georeference and SHA-256 hashes of its 20 TIFF strips are recorded in the routing catalogue. Source terrain is unchanged.

Frame: 10 × 10 km, centre 18.46° N, 77.42° E; planetocentric/east-positive Mars sphere, radius 3,396,190 m. Source equirectangular spacing is 1 m; in the application's fixed local frame, east-west spacing is cos(18.46°) = 0.9485449445 m and north-south spacing is 1 m. Actual east-west ground spacing varies by approximately 0.05% from the zone-centre convention across this zone. Height scale is 1×.

For a native cell with corner heights a (northwest), b (northeast), c (southwest), d (southeast), fractional coordinates u east and v south:

```text
h(u,v) = a(1-u)(1-v) + bu(1-v) + c(1-u)v + duv
gEast(v)  = [(b-a)(1-v) + (d-c)v] / dx
gSouth(u) = [(c-a)(1-u) + (d-b)u] / dy
```

The extrema of each component occur at cell edges. Each regional square stores min/max east and south components across every overlapping source cell, rounded outward when converted to Float32. For travel unit vector (tx,tz):

```text
along slope = atan(abs(gEast*tx + gSouth*tz))
sideways slope = atan(abs(-gEast*tz + gSouth*tx))
ground slope = atan(hypot(gEast,gSouth))
```

The maximum projection over the stored component rectangle bounds along and sideways slopes. Combining the largest absolute components bounds ground slope, even if those extrema came from different points. Consequently these bounds can exceed the actual maximum on the route and can exclude traversable ground. Angles displayed are degrees.

This bilinear derivative method deliberately avoids smoothing short steep changes. A conventional smoothed local-plane slope is a different quantity; [GDAL's slope documentation](https://gdal.org/en/stable/programs/gdaldem.html) also distinguishes algorithms, horizontal scaling and missing-data treatment.

## Demo rules and objective

Defaults: along-route bound ≤18°, sideways bound ≤12°, ground-slope bound ≤28°. These are engineering demonstration choices, **not published NASA astronaut/suit limits**. All three are configurable from 1° to 45° in the workbench; no operational SOP is implied. The same hard limits apply to both strategies.

Each edge cost is horizontal length multiplied by:

```text
1 + weight * [(alongBound / alongLimit)^2 + (crossBound / crossLimit)^2]
```

Distance priority uses weight 0; slope priority uses 4. Euclidean distance to the exact destination is an admissible heuristic. Distance priority minimizes graph horizontal length under these rules, not the exact continuous surface shortest path. A 20 m graph may miss narrower passable corridors. Red segments reach 80% of at least one configured bound; they have not exceeded the hard limit. Flag count depends on graph segmentation and is not a risk probability.

Search runs in a worker. Changing destination, strategy or rules aborts native profile requests and terminates the previous search. Missing/corrupt slope files, failed tile downloads and missing profile heights produce an explicit failure; no synthetic route or elevation fallback is substituted.

## Native route profiles and display grounding

After search, the selected path is sampled at intervals no greater than 1 m using bilinear interpolation of original, hash-verified, losslessly compressed elevation tiles, including across tile seams. Only required tiles are fetched; three requests may run concurrently, with a 64 MiB retained tile cache. Tile verification progress is shown. Distance and climb remain unavailable until this profile succeeds.

```text
surface distance ≈ sum sqrt(dx² + dz² + dh²)
uphill climb ≈ sum max(0, dh)
```

These are sampled DEM-profile metrics, not exact physical walking distance or energy consumption. They include DEM-scale variability and cannot describe subpixel rocks or loose ground. The search does not derive oxygen or EVA feasibility. A separate estimate added on 13 November divides verified route distance by an editable assumed rover/walking average speed; see travel-time-estimates.md. It does not change this route model or its slope rules.

The visible 3D route uses the actual display triangles. It is split at every crossed mesh grid line and diagonal, then lifted 0.20 m solely for visibility; flagged lines use 0.30 m. Physical calculations do not use those display offsets. This replaces the previous 18 m route lift. Tactical route annotations use a dark outline and draw over the terrain so a screen-width line does not disappear into it; this is not a line-of-sight or occlusion simulation.

## Results for the default demonstration endpoints

Start local E +1900 m, S +1500 m; destination E −1850 m, S −1100 m. Exclusion is off except in the third row.

| Strategy | Native-profile distance | Uphill climb | Along bound | Sideways bound | Flagged segments |
|---|---:|---:|---:|---:|---:|
| Distance priority | 8.264 km | 270.28 m | 17.93° | 11.99° | 181 |
| Slope priority | 10.053 km | 231.14 m | 17.74° | 11.86° | 25 |
| Distance + simulated exclusion | 8.300 km | 276.66 m | 17.93° | 11.98° | 188 |

Slope priority reduces the integrated slope penalty; it does not guarantee that every individual slope statistic is lower. The 80%-threshold flag count is descriptive only.

## Checks performed

- Known planes at 0°, 5.7106°, 11.3099°, 12.6044° and 45°; a 1 m-wide ridge between equal-height endpoints; missing native corners.
- Independent scalar native-cell differences checked 662 regional squares containing 83,875 native cells: zero gradient-envelope or missing-mask failures. Maximum outward Float32 gradient rounding difference: 1.75×10⁻⁷.
- A separate least-squares 3×3 plane method checked 599 real-terrain controls. Its smoothed slope is below the conservative square bound in every case. Bound minus fitted slope: median 5.24°, P95 22.02°. These differences reflect smoothing and footprint, not measured elevation error.
- Independent Python TIFF sampling checked all 26,768 native profile points across three real routes against the JavaScript compressed-tile sampler. Largest height difference: 2.28×10⁻¹⁰ m. This is numerical agreement, not Mars terrain accuracy. Sampled native directional derivatives never exceeded the conservative route bounds.
- The three real display polylines were checked inside every split interval against the display triangle surface: zero computational grounding error before the stated visibility offset. All 1,000,000 hazard squares were also checked: none accepted by the native mask overlaps an unavailable display quad.
- Tests cover sideways slopes, equal-height hidden obstacles, full missing strips, diagonal and boundary touches, exact endpoint connectors, simulated exclusions, corrupt packages, native tile seams, invalid profiles and twisted display triangles.
- 41 automated tests and production build pass. Browser checks verify cloud-backed native profiles, strategy changes, rejection under an overly strict rule, native slope display and 2D/3D rendering.

Machine-readable evidence: routing-validation-results.json, native-route-results.json and native-profile-validation.json.

## Storage and reproduction

The native gradient package is 12,245,168 bytes (gzip-compressed binary served as .bin); decoded data is 20,000,000 bytes. It is shipped with the app, requiring no additional Supabase storage. Original elevation tiles already in Supabase supply selected-route profiles. Initial profile loading uses network bandwidth; tile caching reduces repeated requests. Source imagery is not needed for the slope arithmetic.

From mars-explorer-web:

```powershell
scripts/.cache/elevation-validation-venv/Scripts/python.exe scripts/prepare-routing.py
scripts/.cache/elevation-validation-venv/Scripts/python.exe scripts/check-routing.py
node --experimental-strip-types scripts/check-native-routes.mjs
scripts/.cache/elevation-validation-venv/Scripts/python.exe scripts/check-route-profiles.py
npm test
npm run build
```

The Python checks require numpy and rasterio in the existing validation environment. This work does not establish absolute DEM accuracy, soil strength, slip probability, suit mobility, fatigue, communications coverage or operational astronaut safety. Thermal and mineral layers do not currently alter route costs.
