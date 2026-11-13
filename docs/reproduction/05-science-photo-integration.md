# Phase 5 — integrate verified site photographs

Implemented 2026-11-13. Scope: merge the reviewed teammate preparation and display its two selected images. Geological-region integration remains separate.

## Inputs

- Teammate preparation commit `f530764` on `codex/science-resource-preparation`.
- `docs/resource-preparation/teammate/photos/photo-catalog.json` and its two thumbnails.
- Existing authoritative science IDs and the shared 2D/3D `ScienceSitePopup`.

## Ordered steps

1. Inspect the working tree and preserve unrelated work. Fetch and review the teammate diff before merging; it should be restricted to her preparation directory.
2. Read the completion, photo evidence and catalogue. Match site IDs against the application, and verify thumbnail bytes, SHA-256, decoded dimensions and explicit source association. These checks passed for both delivered images; no raw image archive download is required.
3. Merge the preparation branch without overwriting the latest app code. The actual local merge used `git merge --no-ff origin/codex/science-resource-preparation` and completed without conflicts.
4. Add `src/ScienceSitePhoto.tsx`. Import the original delivered catalogue and the two thumbnails through Vite so the build includes the assets automatically. Do not duplicate or rewrite the teammate's evidence catalogue.
5. Select by stable site ID. Render the full-frame image with native aspect ratio, useful alt text, lazy loading and a visible failed-load fallback. Key the component by site ID so a failed image state does not leak to another site.
6. Show title, NASA/JPL-Caltech credit, sol, published calendar date, camera and LMST. Label historical context and explain that caption association is not a mapped camera footprint.
7. Keep original caption, evidence explanation, UTC uncertainty, web asset ID and source limitations in expandable details. Retain NASA original-image and sample-catalogue links. Do not treat photo acquisition dates as coring/sealing dates or invent UTC instants.
8. Insert this component into the existing shared science popup. Both map views use that popup; no new coordinate transform, route rule or separate site state is necessary.
9. Build, confirm both WebP files exist in `dist/assets`, and compare emitted bytes/hashes with the delivered catalogue. Do not upload these tiny assets separately to Supabase.
10. Browser-check both sites, site switching, image decoding, displayed metadata, expandable source details and compact/desktop panel access. Save one proof screenshot.

## Commands

From `mars-explorer-web`:

```powershell
$env:RAYON_NUM_THREADS='1'
npm run build
```

Inspect built image files against `thumbnailSha256` using SHA-256. Both images together add **334,690 bytes** of image assets. The production build emits **77 offline-shell assets** at this revision. The existing large Three.js bundle warning is unrelated to these photos.

## Recorded checks

- [x] Two site IDs match the authoritative catalogue.
- [x] Original delivered thumbnail hashes, bytes and 960 × 723 dimensions verified.
- [x] Merged without application-code conflicts; latest routing and UI preserved.
- [x] TypeScript and production/offline build pass.
- [x] Both emitted WebP hashes exactly match the reviewed thumbnails.
- [x] Skyland browser image decodes at 960 × 723; sol 495, July 12, 2022, LMST 16:54:24 and Navcam displayed.
- [x] Hazeltop browser image decodes at 960 × 723; sol 509, July 26, 2022, LMST 16:17:10 and Navcam displayed.
- [x] NASA original link and expanded identification/uncertainty content checked.
- [x] Compact and desktop panels remain scrollable; image preserves full-frame aspect ratio.
- [x] Shared photo component does not change routes, resource calculations, coordinates or source rasters. No full terrain validation rerun is needed for this display-only change.

Proof: `docs/science-site-photo-preview.png`.

## Remaining work

Geology preparation was merged as research, not as an accepted map layer. The original GIS projection discrepancy and source-to-terrain alignment remain unresolved. Do not render guessed boundaries or use geological units to infer soft-soil safety.

The HUD plan is saved separately in `docs/HUD-PLAN.md` and remains deferred. The image integration is local until explicitly pushed; no deployment or Supabase change was performed.
