# ARES: rebuild from scratch, two-person execution plan

Prepared **14 November 2026, Asia/Rangoon**. This is an executable rebuild specification with initially unchecked checklists, not a handoff claiming the new build is finished. Read this before any phase. Start from an empty application in a separate repository/worktree; use the existing repository as read-only implementation and evidence reference. Do not destroy the working demonstration.

## Two endpoints

**Baseline reproduction:** phases 00–13 reproduce the current system: NASA-derived Western Jezero terrain, connected 2D/3D, native slope-aware routes, contextual science layers, historical MEDA and basic EVA simulation, with separate Map/Mission controls.

**Full Mission extension:** phase 14 implements the requested supply strip, crew-confirmed checklist, emergencies and richer debrief. These are planned features, not currently validated or completed. Phase 15 verifies hosting and the final demo. HUD remains deferred; do not rebuild the retired JZ-01/Explorer demo screens.

Current reference revision: pushed `576c18a`. The local working tree also contains Map/Mission separation and corner view controls that are **not pushed at preparation time**. Before another machine uses those as its baseline, commit/share them or reconstruct them from phase 12. Never assume local changes exist on origin/main.

## Ownership

**A — you / main integration agent:** foundations, shared coordinate contract, terrain, hosting, 2D/3D renderer, native routing, EVA reducer, Map/Mission shell, integration and release.

**B — teammate / science-data agent:** verified site catalogue, proposed mission content, photos, spectral/geological/environmental preparation and source audits. B returns data and pure modules/components; A mounts them into the shared shell. B has the shared Google Drive science-location list; record its actual filename, revision and export hash when accessed. The list has not been verified by this plan.

Use separate clones/worktrees and branches `codex/rebuild-core` and `codex/rebuild-science`. A alone edits app routing, RegionalWorkspace, Scene, RegionalMap2D, global CSS, package configuration and the main EVA reducer. B owns its source catalogues, preparation scripts, pure layer modules/components and corresponding tests. If a shared contract changes, agree on its version first. Exchange commit SHAs; A reviews and merges at gates. Never switch branches underneath another agent in one checkout. Do not push another person's unfinished files.

Suggested new-build file boundaries: B writes `src/science/`, `src/layers/`, `public/data/context/`, `scripts/context/`, `tests/context/` and `docs/rebuild-evidence/context/`. A writes the app shell, terrain/routing/mission folders and adapters importing B's releases. Existing reference filenames can differ; map them explicitly rather than having both agents edit the old shared components. Before a merge B supplies: schema version, source URLs/hashes, output byte counts/hashes, test results, interpretation limits and commit SHA. A owns final shared manifest registration and UI mounting.

## New-build execution contract

The phase files specify dependencies, ordered implementation checklists and gates. Their reference commands are for reviewed/ported scripts from this repository; they are not an installation script for an empty directory. Agent A must first place the applicable script/modules/configuration and inputs in the new build. Cache-dependent validators also need their cited original labels, rasters and position tables. The foundation phase records exact environments and path substitutions. Do not run the legacy Blender/500 m demo pipeline to construct the final 10 km scientific map.

For each work session, update just the active phase and ledger with completed outputs and the next unchecked item. Do not mark a task done because an agent wrote code: its acceptance evidence must exist. Do not check off a whole phase whose required source is unavailable. Store each proposed task's real scientific source separately from its assumed human duration/equipment. Changes to capacity/rates or mission policy invalidate resource-model tests, not source DEM fidelity.

## Parallel schedule and merge gates

| Wave | A | B | Gate |
|---|---|---|---|
| 1 | 00 foundation → 01 frame contract → 02 terrain sources | Read 00–01; begin 07 site verification and 08–10 source discovery | G0: coordinate/schema contract agreed |
| 2 | 03 lossless package/validation → 04 shared hosting → 05 map → 06 routing | 07 science catalogue/photos; prepare 08 CRISM, 09 geology, 10 MEDA against the contract | G1: terrain/package validated; G2: native route verified |
| 3 | 11 baseline EVA and 12 interface separation | Deliver 07–10 datasets, tests and uncertainty notes; A integrates in phase 13 | G3: layer releases reviewed and registered |
| 4 | 14 supplies, alerts, state integration | 14 site-task content and pure completion guards in separate owned files | G4: one normal and one emergency mission pass |
| 5 | 15 hosting and final integration | Audit scientific claims/demo narrative; independently exercise site/task paths | G5: deployed visitor requires no ZIPs or local files |

Source discovery can start immediately. B's spatial registration checks wait for the actual phase-03 overview and cannot be marked complete against a placeholder map. A can build baseline EVA with clearly labelled custom/demo objectives; verified science content is merged later without moving real locations.

## Phase files and progress

Check a phase here only after its own acceptance and evidence are complete. Historical reports are comparison references, not automatic passes in the rebuild.

- [ ] [00 — project foundation](00-project-foundation.md)
- [ ] [01 — Mars frame and schemas](01-mars-frame-and-contracts.md)
- [ ] [02 — NASA terrain acquisition](02-nasa-terrain-acquisition.md)
- [ ] [03 — lossless package and terrain validation](03-package-and-terrain-validation.md)
- [ ] [04 — shared map delivery](04-shared-map-delivery.md)
- [ ] [05 — connected 2D and 3D](05-connected-map.md)
- [ ] [06 — native slopes and routing](06-native-routing.md)
- [ ] [07 — verified science sites and objectives](07-science-sites.md)
- [ ] [08 — spectral/mineral context](08-spectral-context.md)
- [ ] [09 — geological regions](09-geological-regions.md)
- [ ] [10 — historical environment](10-historical-environment.md)
- [ ] [11 — baseline EVA simulation](11-baseline-eva.md)
- [ ] [12 — Map/Mission interface separation](12-interface-separation.md)
- [ ] [13 — baseline integration acceptance](13-baseline-integration.md)
- [ ] [14 — full Mission interface extension](14-full-mission-extension.md)
- [ ] [15 — deployment and demo acceptance](15-deployment-and-demo.md)

Every phase ends with an evidence record. Put new reports in `docs/rebuild-evidence/phase-NN/`; do not overwrite historical evidence. Track progress in [PROGRESS.md](PROGRESS.md). Use [VALIDATION-POLICY.md](VALIDATION-POLICY.md) to avoid repetitive checking. Use [SOURCE-AND-DATA-CONTRACT.md](SOURCE-AND-DATA-CONTRACT.md) in every agent context.

## Prompt for A

```text
Read docs/rebuild-2026-11-14/README.md, SOURCE-AND-DATA-CONTRACT.md,
VALIDATION-POLICY.md and the current phase file. You are Agent A.
Build in a separate clean application; keep the existing demo intact.
Execute your ownership lane and integrate B at the stated gates.
Complete the implementation and checks before marking a checklist item.
Record commands, outputs, hashes and limits in phase evidence and PROGRESS.md.
Do not rerun unchanged expensive validation. Do not claim historical reports
are fresh results. Ask only for missing required input. Stop at a failed gate,
record the cause and continue independent work. No HUD, no invented safety claim.
```

## Prompt for B

```text
Read docs/rebuild-2026-11-14/README.md, SOURCE-AND-DATA-CONTRACT.md,
VALIDATION-POLICY.md and phases 07–10. You are Agent B.
Use the science-location list shared on Google Drive; record its version/hash.
Prepare verified in-zone sites, proposed science tasks, photos and contextual
spectral/geology/environment datasets. Respect file ownership. Do not edit
the app shell, renderer, main EVA reducer, routing rules or real coordinates.
Use existing scripts/evidence as references, with new output evidence.
Await A's validated terrain for spatial registration; do independent work meanwhile.
Deliver machine-readable catalogues, pure layer modules, meaningful tests,
uncertainty notes and commit SHAs for A to merge. Do not deploy or upload raw archives.
In phase 14 supply task content/guards only; A owns execution UI and state integration.
```
