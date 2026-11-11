# JZ-01 Three.js runtime validation

**STEP 3 STATUS: PASS**

## Entry and data flow

Open **http://localhost:4173/?workspace=jz01** (production server running after the build). Development entry: http://localhost:5173/?workspace=jz01. Restart with `npm start` or `npm run dev` respectively. Existing exploration remains `/`; existing science remains `/?workspace=science`.

The existing React application chooses a lazy JZ-01 view from the query parameter, loads `/assets/mars/jz01/terrain.glb` through Drei/GLTFLoader, retains the complete GLB scene as a primitive, and renders one terrain mesh. No parent transforms are discarded. No extra rotation, scale, exaggeration, terrain reconstruction, or source-material override is applied. No backend/API/database is needed; Vite/Node serves the validated static GLB.

## Files created or modified

- `src/App.tsx (modified: lazy query-based entry only)`
- `src/jz01/JZ01Preview.tsx (created)`
- `src/jz01/jz01.css (created)`
- `scripts/jz01/test-runtime.mjs (created)`
- `docs/jz01/threejs_runtime_validation.md (created)`
- `docs/jz01/runtime-results.json (created)`
- `docs/jz01/screenshots/threejs_tactical_preview.png (created)`
- `docs/jz01/screenshots/threejs_tactical_mobile.png (created)`

Production verification also regenerated ignored build artifacts in `dist/` and `tsconfig.tsbuildinfo`. No package/dependency changes, existing scene-component changes, or source-data changes were made. This workspace has no `.git` directory, so this inventory records explicit edits rather than a Git diff.

## Executed commands

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173
node_modules\.bin\tsc.cmd --noEmit
npm.cmd test
node scripts/jz01/test-runtime.mjs
npm.cmd run build
node server.mjs
$env:TEST_URL = 'http://localhost:4173'; node scripts/jz01/test-runtime.mjs
```

TypeScript: PASS. Existing unit tests: 9/9 PASS. Final production browser suite: 19/19 PASS. Both original view entries loaded and rendered their terrain canvas; this is a regression smoke check, not a re-certification of every existing simulation feature.

## Actual browser geometry and orientation

Every loaded vertex was transformed by its actual mesh `matrixWorld` and compared to the original OBJ contract: `three = (obj.x, obj.z, -obj.y)`. All source samples and all oriented triangles were compared, tolerating exported corner splits/reordering. UVs were checked per mapped sample using the glTF V convention.

| Axis | Minimum (m) | Maximum (m) |
|---|---:|---:|
| X | -249.5 | 249.5 |
| Y | 0 | 58.42236328125 |
| Z | -249.5 | 249.5 |

- Loaded meshes: 1; exported vertices: 374356; unique source samples: 63001; triangles: 125000.
- Maximum world-space position error: 4.999999987e-07 m. Oriented topology equivalent: True.
- Maximum UV error: 4.386901853e-08. Original material: JZ01_Mars_Surface, sRGB, 2000 × 2000 image, flipY=false, metallic=0, roughness≈0.94.
- Pixel-center mesh dimensions remain 499 × 499 m inside the 500 × 500 m raster footprint. Meter scale is unchanged.

| Sample | Original OBJ XYZ (m) | Loaded Three.js XYZ (m) |
|---|---|---|
| NW | [-249.5, 249.5, 58.420898] | [-249.5, 58.4208984375, -249.5] |
| NE | [249.5, 249.5, 1.572021] | [249.5, 1.5720210075378418, -249.5] |
| SW | [-249.5, -249.5, 54.569824] | [-249.5, 54.56982421875, 249.5] |
| SE | [249.5, -249.5, 6.937256] | [249.5, 6.937255859375, 249.5] |

NW is negative X/negative Z; NE is positive X/negative Z; SW is negative X/positive Z. Orientation PASS is based on these numerical comparisons and full topology verification, not visual appearance.

## Camera, lighting and visuals

Pointer drag orbit, wheel zoom, accessible zoom buttons, reset, damping, demand-render settling and mobile resize: PASS. Camera uses 35° vertical FOV, 0.5–4000 m clipping planes, 180–2400 m orbit distance, polar-angle limits that prevent an underside view, and a fixed terrain-centered target. Panning is disabled to keep the crop discoverable. Mobile resize adjusts camera distance rather than scaling terrain.

Neutral charcoal background, soft ambient fill and one warm directional light provide illustrative presentation. The scientific grayscale image and material are unmodified. Dynamic shadows and postprocessing are disabled for this validation baseline; source orbital imagery already contains illumination/shadows. No additional terrain or simulated objects were added.

Desktop and mobile screenshots were opened and visually inspected after the final build. Full crop framing, original texture detail and readable controls are visible. An inherited global heading style and mobile crop clipping were resolved in scoped JZ-01 CSS/camera framing before final verification.

## Browser performance

Chrome 157.0.8103.39, headless, actual renderer: **ANGLE (Intel, Intel(R) UHD Graphics (0x00004626) Direct3D11 vs_5_0 ps_5_0, D3D11)**.

- Method: Headless Chrome, six seconds of warmed continuous OrbitControls auto-rotation; CPU-observed rendered frame intervals, not GPU timer queries.
- Viewport [1280, 800]; drawing buffer [1280, 655]; actual DPR 1; configured DPR cap 1.5.
- 856 measured frame intervals; average **142.36 FPS**, mean **7.024 ms**, median **6.900 ms**, p95 **7.400 ms**.
- Renderer counters: 1 draw call, 125000 triangles, 1 geometry, 2 renderer texture allocations; dynamic shadows disabled.
- The measured headless run exceeded 30 FPS. This is not a display-presented FPS guarantee, RTX 2050 measurement, mobile benchmark, GPU timer measurement or sustained thermal test. Chrome selected Intel UHD despite the high-performance preference. RTX 2050 behavior remains NOT VERIFIED.
- Startup/download/decode/compilation were excluded from the warmed orbit sample; no cold-start timing claim is made. Demand rendering settles when idle rather than continuously drawing unused frames.
- Cache ownership: GLTFLoader owns the shared immutable asset cache; `dispose={null}` prevents R3F from disposing that shared scene on unmount. No per-frame mesh clones or allocations for movement are made. Event listeners, the readiness animation callback and diagnostic reference are removed on cleanup. Full navigation releases the browser context; no long-duration memory-leak claim is made.

## Console, errors and preservation

Final successful-flow browser console errors: **0**. Missing/failed requests: **0**. Texture decode and original UV registration: PASS. Intentional failed-asset testing was isolated in a separate page: the error boundary displayed a retry action, and retry loaded the actual GLB successfully.

Nonblocking warnings: Service Worker registration blocked by Playwright; THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.; THREE.WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead..

Service workers were deliberately blocked by Playwright to prevent offline cache interception from invalidating the failed-request test; offline behavior is outside this step. THREE.Clock and the old view shadow-map warning originate in the installed stack/existing views; no dependency upgrade or unrelated refactor was performed. Development-only Strict Mode cancellations from existing effects are tracked separately from genuine request failures.

The first test harness incorrectly required two rendered frames even after demand rendering had settled; readiness now waits for a completed first frame. A prior development run also classified Strict Mode cleanup aborts as failures. Both test-harness issues were corrected; the final production suite has no failures.

All 17 handoff files were checked against the Step 2 hash inventory. The validated GLB and Blender scene hashes remain unchanged. Full machine-readable evidence is in `runtime-results.json`. Older scene assets were not replaced.

## Screenshot paths

- `docs/jz01/screenshots/threejs_tactical_preview.png` (1280 × 800)
- `docs/jz01/screenshots/threejs_tactical_mobile.png` (390 × 844)

## Remaining limits

No Step 3 blocker remains. Final cinematic styling, routes and first-person navigation are intentionally absent pending approval. Exact concept screenshot matching, source-product crop reproduction, mission safety validation, cold-load profiling, RTX-specific profiling, mobile GPU performance and long-duration lifecycle profiling are not claimed. The existing shared Three.js production chunk is approximately 1.06 MB minified; Vite emits a nonblocking size warning.

| Test | Status |
|---|---|
| React application starts | PASS |
| JZ-01 GLB loads | PASS |
| Texture displays | PASS |
| Geometry and scale preserved | PASS |
| Three.js orientation verified | PASS |
| Orbit and zoom work | PASS |
| Existing views preserved | PASS |
| Browser screenshot captured | PASS |
| Performance measured | PASS |
