# Phase 12 — Map and Mission interface separation

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: A;B supplies content. Prerequisites: 05,06,11.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Map answers where to go/what is there: Layers,Sites,Sources,Route plan. Destination,travel settings,slope rules,strategy and collapsible route data live here. No mission clock/review/start controls on Map.
- [ ] Mission answers what to do/how to return: read-only selected-route brief,task/time budget,review,phase,pause/return,log/report. Edit-route link returns to Map; current mission remains locked.
- [ ] Maintain one shared route and mounted mission state. Navigation preserves notes,settings,phase and selection. Avoid duplicate IDs/controls even in hidden views.
- [ ] Retain sources/uncertainty in Map and essential simulation/approach limitations in Mission. Do not duplicate historical ground temperatures as a second thermal toggle.
- [ ] Solid dark top bar: ARES,Map,Mission; remove Shared NASA Data badge. IBM Plex Mono headings/numbers, restrained readable type and contrast; no giant value that crowds controls.
- [ ] Route data is collapsible in left panel, closed initially, never over terrain. View switch/Reset3D grouped top-right; zone label bottom-right; compass north-up only in2D.
- [ ] Ordinary map clicks do not open Selected ground point. Preserve explicit destination selection,science markers and enabled geology/spectral inspection. Context popups stay in Map.
- [ ] Test desktop,narrow and short viewports,long values,form scrolling,keyboard focus,state preservation,hidden duplicate IDs and action visibility. Keep both2D/3D unobstructed.
- [ ] Gate: no second route editor in Mission, no EVA editor in Map, and navigation retains shared data. Record screenshots.
- [ ] Commands: npm run build.
- [ ] References: ../../mars-explorer-web/src/RegionalWorkspace.tsx; ../../mars-explorer-web/src/EvaMissionPanel.tsx; ../../mars-explorer-web/src/readability.css.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-12/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

