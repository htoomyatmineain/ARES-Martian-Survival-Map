# Map integration completion

Branch: codex/science-map-integration. Based on catalogue branch and latest main e62f499. No push/deployment.

Added 14 Volume 1/3/4 optional sample destinations (16 sites total including original Skyland/Hazeltop). Existing science-sites.json coordinates and IDs unchanged. Separate additional-science-sites.json uses exact supplied sample coordinates and designations, NASA report/page links and provisional labels. MAP_SCIENCE_SITES combines lists for RegionalWorkspace, RegionalMap2D, Scene and ScienceSitePopup. Original SCIENCE_SITES export remains two established sites for legacy validation. Alternating label offsets do not move coordinates.

Popup shows proposed survey tasks/tools, provisional placement, NASA sources, unknown hazards and recorded graph-only access reasons/gaps from additional-science-access.json. No borrowed photos or invented hazard evidence. Existing destination selection triggers the unchanged routing worker and live native profile checks; existing mission logic still prevents science on approach-only routes. No routing, terrain, reducer, supplies or emergency changes. No new checklist UI. Corrected UTF-8 dash encoding in supplied data and regenerated relevant hashes; numerical coordinates unchanged.

Checks: 59 tests passed; production TypeScript/Vite/offline build passed (existing chunk-size warning). After final source-coordinate assertions, targeted science-site tests also passed. Edge headless browser confirmed 17 destination options (16 plus custom), 16 site rows, and selecting Montdenier updates source coordinates. No page errors. Cloud terrain returned Failed to fetch; local overview/native tiles are absent. Rendered 2D/3D markers and full live routing remain visually/end-to-end unverified. map-integration.png records failed terrain loading, not a successful map render. No fresh native-profile verification or independent optional PDF page audit claimed.

Use: merge this branch into main teammate branch (push/fetch first if another clone). It includes prior catalogue commits. Preserve teammate supplies/emergency changes when resolving map-component conflicts. Start mars-explorer-web, open Sites to inspect/locate a sample, then choose it in Mission destination to calculate current access. Marker inspection alone does not select a destination. Recorded access snapshot uses default habitat, slope priority and exclusion off; it does not authorize departure. Live native-profile verification must succeed. Approach-only remains unreached with zero site science; gaps are horizontal separation, not walking distance.

Finish browser checks with working cloud assets: 2D/3D markers, popup source/uncertainty, exact/approach/unreachable route behavior and mission return. Optional records remain provisional until coordinate linkage/absolute placement is verified. This adds the 14 optional Volume 1/3/4 records requested, not the seven other Volume 2 records. Runtime science data are project-supplied inventory records referencing NASA, not a NASA-issued JSON dataset.

## Follow-up validation — 14 November 2026

The earlier native-profile/browser limitations above are superseded by these new checks:

- Audited all 14 cited coordinate pages from local backup copies of NASA dossier Volumes 1/3/4. Sample names, designations, latitude and longitude match every added record. PDF hashes and per-page results: source-page-validation.json. Text extraction required joining spaces between digits and normalizing Unicode dashes; no coordinate value changed. Absolute geolocation, source latitude convention and datum compatibility remain unresolved. Backup PDF bytes were not independently compared to Drive/publisher hashes.
- Downloaded only needed original cloud files into ignored scripts/.cache/science-validation. RegionalTileStore's existing SHA-256 checks remained active. All 12 graph-reachable added samples pass dense native-profile validation; two have no graph route under unchanged rules. native-profile-validation.json records results, reasons, gaps and profile metrics. These optional samples are 12 exactly-reachable and 2 unreachable for the recorded default scenario. No approach-only optional sample in this scenario. Graph results for all 23 samples in the broader catalogue still include approach-only Volume 2 targets.
- Browser verification used exact original cloud bytes served through a Playwright transport interceptor because direct browser cloud fetch failed. App data hash checks were not bypassed. Confirmed 16 2D markers, 17 destination options, selecting Montdenier, live native profile approval, provisional popup and recorded access reason. 3D terrain/markers rendered with one canvas and no page errors; reviewed screenshot. Some dense labels overlap at this zoom; sidebar selection remains available and coordinates are not shifted.
- verified-map-2d.png and verified-map-3d.png capture successful rendering. browser-validation.json records browser evidence. This does not establish that the user's direct cloud network will work.
- Runtime snapshot profile labels updated to reflect new recorded verification. Current destination selection still recalculates and must pass live profile checks; no static JSON grants departure clearance.

Reproduce from mars-explorer-web:

```powershell
python scripts/audit-additional-science-pages.py --pdf-dir '<folder containing initial_reports_volume1.pdf, volume3.pdf, volume4.pdf>'
node --experimental-strip-types scripts/validate-additional-science-profiles.mjs
# Run Vite on port 5192 before the following browser check; Edge must be installed.
node scripts/verify-science-map-browser.mjs
npm test
npm run build
```

The profile validator reuses previously successful rows when retrying failures; remove native-profile-validation.json to force a full fresh route/profile run. Missing/corrupt downloads fail visibly. No large PDFs or cached terrain files are committed. Source uncertainty, unknown direct ground hazards and main-branch merge remain open; no source convention or soil-safety evidence was invented.
Final follow-up checks: npm test PASS (60 tests), npm run build PASS; unreachable destination diagnosis confirmed in browser. No routing, coordinate, terrain or supplies/emergency algorithms changed.
