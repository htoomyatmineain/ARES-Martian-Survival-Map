# Mars Explorer — real Jezero terrain

The main ground-level scene now uses actual NASA/MRO HiRISE stereo elevation and orbital imagery, imported through Blender and rendered interactively with Three.js. The supplied reference controls the orange HUD, glass panels, cyan trail and survival-instrument layout.

**Open:** http://localhost:4173/ after `npm run build` and `npm start`.

## Explore freely

- Choose **Enter Exploration** or press WASD to enter free roam. There is no automatic camera movement in this mode.
- Drag the mouse to look; use **Lock mouse** for continuous mouse look (Esc unlocks).
- WASD or arrow keys move relative to where you look. Shift moves faster; the mouse wheel zooms.
- The left movement joystick and right look touchpad work simultaneously on touch devices. Releasing either stops its input. Two fingers on the terrain pinch to zoom.
- **Guided trail** is an explicit optional mode. Manual movement switches back to free roam.
- The camera follows actual ground height with a 1.75 m eye height and stays inside the loaded field region. Steep steps are blocked by a simplified slope rule; this is not a validated traversability system.
- E or Scan analyzes a reconstructed specimen. Space pauses/resumes; R recenters your view. Top-down mode preserves your ground position.

## Scientific surface data

- Field origin: **18.4802447° N, 77.3808713° E**, near the western Jezero region.
- **HiRISE:** 512 × 512 m local elevation grid, 1 m post spacing, with a 1024 × 1024 m orbital image sampled at 25 cm/pixel. Post spacing is not a claim of sub-meter vertical accuracy.
- **CTX:** 20 m elevation context and 6 m imagery across the surrounding region.
- The terrain has **1× vertical scale**. No sculpted mountains or invented terrain heights are used. HiRISE blends to CTX across a 20 m boundary to avoid dataset-edge seams.
- Grayscale orbital imagery receives a presentation color tint. Small foreground rocks, sub-resolution surface texture, sky and lighting are reconstructed visual detail.
- The temperature gauge uses NASA's **historical MEDA observations from 3–4 April 2021 (sols 43–44): −83°C to −22°C**. It is not a live feed.
- Ionizing radiation dose and water abundance are unavailable. The app does not fabricate spatial maps for these layers. Crew resources, dust scenarios and mineral classification are simulated.

Sources: [HiRISE elevation product](https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hirise_dtm_mosaic), [HiRISE orthographic image mosaic](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_007_orthoMosaic_25cm_Ortho_blend120.tif), [NASA MEDA historical report](https://www.nasa.gov/directorates/stmd/nasas-first-weather-report-from-jezero-crater-on-mars/).

Image/data credit: **NASA/JPL-Caltech/University of Arizona/USGS**. The NASA insignia follows the user's reference; this independent educational prototype is not an official NASA product.

## Editable assets and repeatable builds

Final editable Blender scene: `blender/mars-explorer-final.blend`. The unchanged observed-terrain import is also retained in `blender/mars-explorer-real-jezero.blend`.

The final realism pass uses photo-scanned soil and rock PBR, a generated sky-light environment, camera-following near-field shadows, and terrain-conforming navigation arrows. The materials use color, normal and roughness maps with separate color-space handling. Close-range rock and soil detail is a visual reconstruction, credited separately from the NASA elevation and orbital data in `public/assets/mars/pbr-credits.json`.

Detail assets: [Namaqualand Boulder 02](https://polyhaven.com/a/namaqualand_boulder_02) and [Dry Ground Rocks](https://polyhaven.com/a/dry_ground_rocks), from Poly Haven under [CC0](https://polyhaven.com/license). These are not measured Jezero specimens. The Blender refinement verifies observed terrain vertex counts and coordinate sums are unchanged.

- `scripts/prepare-jezero-surface.mjs`: downloads only required HiRISE rows/tiles, reads each projection independently, and produces the observed field assets and provenance.
- `scripts/build-jezero-real.py`: imports actual elevation into Blender, creates the glTF terrain, collision heights and clearly identified rock props.
- `scripts/build-regolith-textures.mjs`: builds seamless microdetail texture maps without changing any terrain elevation.
- `scripts/prepare-final-pbr.mjs`: downloads the credited CC0 detail assets for rebuilding.
- `scripts/refine-blender-final.py`: processes the scan in Blender, generates specimen/mission previews and saves the final editable scene.
- `public/assets/mars/field-site.json` and `provenance.json`: source URLs, coordinates, resolution and processing.

```powershell
# The prepared assets are included; running the application needs no NASA download.
npm install
npm run dev

# Production, including offline cache:
npm run build
npm start

# Optional scientific asset regeneration (network needed for HiRISE):
npm run prepare:hirise
npm run prepare:pbr
npm run build:blender
node scripts/build-regolith-textures.mjs
npm run build

# Checks:
npm test
npm run test:browser
```

The browser suite verifies observed-data labels, free-roam movement, camera-relative controls, mouse look, position-preserving view changes, simultaneous native touch input, scanning, provenance, mobile layout and offline reload. Software WebGL confirms function; it is not a mobile GPU benchmark.

The former artistic canyon remains only in the archived `scripts/build-mars-assets.py` and `blender/mars-explorer.blend`; current npm build commands use the real-data pipeline.

## Preserved scientific workspace

A complete local Node.js / React / Three.js application for exploring a scientifically derived 10 × 10 km region of Jezero Crater, planning traverses, and demonstrating astronaut resource and emergency scenarios.

## Run

Requires Node.js 22.12+ (developed on Node 24).

```powershell
npm install
npm run dev
```

Development: http://localhost:5173

For the production build, including the offline cache:

```powershell
npm run build
npm start
```

Production: http://localhost:4173. Change the port with the `PORT` environment variable. The built-in Node HTTP server serves the application without external services, API keys, or a database. Offline reload requires one successful online load of the production build and service-worker installation, on localhost or HTTPS.

## What works

- Orbit, pan, zoom, reset, top-down view, fullscreen, and keyboard shortcuts.
- Full-crater context map, derived from the scientific DEM, with a georeferenced mission-zone outline.
- Real CTX terrain and georeferenced orbital imagery; elevation and slope layers; contour lines; display exaggeration from 1× to 8×.
- Landmark selection and custom destinations by picking the actual terrain surface.
- A* routing on a 100 m grid, with slope-sensitive safer / distance-priority alternatives and simulated terrain exclusions.
- Route distance, ascent, grades, elevation profile, mission duration and round-trip oxygen feasibility.
- Simulated oxygen, water and power monitoring, timeline and JSON mission export.
- Dust, low-oxygen, communication-loss and blocked-terrain scenarios.
- “Lost in the Dust”: an 80-second accelerated scripted demonstration. Dust at 16 s, low oxygen and return at 32 s, communication loss at 48 s, safe return at 80 s. Pause/resume and reset supported.
- Local emergency procedures and offline terrain/application reload in the production build.
- Responsive mobile controls, semantic HTML actions, keyboard navigation, dialog focus containment, reduced-motion styling, loading errors and WebGL fallback.

## Scientific data and provenance

No procedural or invented elevation is used. Prepared, compact scientific assets are already included in `public/data`, so large source downloads are not needed to run the application.

1. **Elevation:** [USGS / JPL Mars 2020 Science Investigation CTX DEM Mosaic](https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic), 20 m source elevation. [Source GeoTIFF](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif).
2. **Orbital image:** USGS Mars 2020 Terrain Relative Navigation CTX orthoimage mosaic, 6 m. [Source GeoTIFF](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif). The grayscale image receives an artistic Mars color palette in the renderer; this is not a true-color photograph.
3. **Landing site:** Perseverance's published 18.4446° N, 77.4509° E location. [NASA mission](https://science.nasa.gov/mission/mars-2020-perseverance/).
4. **Environmental reference:** [MEDA PDS archive](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html). The current app does **not** ingest MEDA readings. All displayed weather, crew resources, proposed habitat/science targets and emergency events are explicitly simulated.

The mission region is centered at 18.460° N, 77.420° E. The DEM's embedded equirectangular standard parallel is **18.4663°**, while the orthoimage's is **0°**. Preparation reads each GeoTIFF's projection parameters independently, accounts for pixel centers, and resamples both into the same local east/north coordinate system (Mars 2000 sphere, radius 3,396,190 m). The terrain binary contains 501 × 501 float32 heights, spanning approximately −2649.56 m to −2266.80 m. Metadata records original source URLs and processing details.

The entire-crater overview is a 55 × 55 km DEM hillshade centered at approximately 18.38° N, 77.58° E; the 10 × 10 km mission boundary is proposed, not an official NASA zone. The main display uses 1 scene unit per kilometer, with a local height origin. Exaggeration only affects rendering; elevation, distance, slope and route budgets use original meters.

## Rebuild scientific assets

Download the two source GeoTIFFs above to a local directory. Then:

```powershell
node scripts/prepare-terrain.mjs "C:\path\M20_JezeroCrater_CTXDEM_20m.tif"
node scripts/prepare-imagery.mjs "C:\path\jezero-ortho.tif"
node scripts/prepare-overview.mjs "C:\path\M20_JezeroCrater_CTXDEM_20m.tif"
npm run build
```

Preparation rejects missing / invalid scientific values rather than substituting invented terrain. Scripts default to the filenames used above in the operating system's temporary directory.

## Simulation assumptions and limits

Walking speed 45 m/min plus an ascent time allowance (1 minute per 12 m ascent); oxygen 0.25%/minute; 25% reserve; 20-minute science stop. Mission feasibility includes outbound travel, return and science-stop oxygen. Safer routes reject average edge grades above 18° and penalize slope. Shorter routes allow up to 28°. Routes use an eight-neighbor 100 m grid, not a validated mission traversability system. Small rocks, edge-scale hazards, real suit physiology, ionizing radiation, actual dust forecasts, food inventory and medical response are not modeled. There is no NASA-certified safety threshold or operational guidance in this prototype.

## Verification

```powershell
npm test
npm run build
npm start
# In another terminal:
npm run test:browser
```

Browser tests use installed Google Chrome through Playwright with software WebGL, save desktop/mobile/layer screenshots and verify rendering, route strategies, destinations and export, terrain picking, scenarios, scripted return, dialogs, offline reload and responsive controls. `TEST_URL` can target a different running origin. Software rendering confirms functional WebGL behavior; it is not a mobile GPU performance benchmark.

## Structure

- `src/Scene.tsx`: terrain mesh, imagery, shader contour styling, camera controls, georeferenced markers and route rendering.
- `src/terrain.ts`: scientific sampling, coordinate transforms and metric A* routing.
- `src/App.tsx`: mission UI and simulation state.
- `src/Overview.tsx`: full-crater context viewer.
- `scripts/prepare-*.mjs`: reproducible scientific asset preparation.
- `server.mjs`: production Node.js static server.
- `scripts/build-offline.mjs`: build-specific offline asset manifest / service worker.

## Installed skills

All 24 skills from the requested [cesartevisual/threejs-skills](https://github.com/cesartevisual/threejs-skills) collection were installed under `C:\Users\USER\.codex\skills`. They include `threejs-web`, `threejs-r3f`, `threejs-shaders`, `threejs-spatial-data`, asset/performance/testing skills and the other collection modules. They are available to Codex starting with the next turn.


The reference color pass uses a rust-red ground palette and peach haze over NASA orbital grayscale. This is presentation color, not calibrated natural color; the Data panel, provenance JSON and exported exploration report disclose the distinction. NASA elevations and georeferenced orbital brightness remain unchanged.
