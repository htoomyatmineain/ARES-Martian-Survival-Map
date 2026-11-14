# NOV 14 — start here

Copy this entire folder into your new project workspace. Give both agents this folder. Read README.md for the ordered phases and the two agent prompts; use PROGRESS.md to track the new rebuild.

## Contents

- 16 numbered phase guides (00–15), each with implementation and validation checkboxes.
- Shared source/data contract and validation policy.
- REFERENCE/: current implementation source, preparation/check scripts, tests, configuration and supporting documentation. These files are reference material; do not edit or install this subfolder as though it were the new application.
- REFERENCE-MANIFEST.json: hashes of the copied reference files. Source snapshot includes current local UI improvements beyond the recorded pushed commit.

## What to tell your agent

Read START-HERE.md, README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md. Follow the appropriate A/B prompt in README.md. Create the actual application alongside this guide folder, preserve this reference snapshot, and complete phases in dependency order. Update phase checkboxes and PROGRESS.md only with evidence.

## Required data and tools

This folder is the guide plus a small source-reference snapshot, not the original multi-GB raster dataset. Original source-data, ignored processing caches, node_modules, compiled build files, credentials and full public runtime assets are not included. Reuse your team's existing validated source package if available, or retrieve it from the NASA URLs/shared manifest as the phases direct. Do not re-download unchanged validated data unnecessarily. Some source scripts require original labels/rasters and Python geospatial dependencies; stage those prerequisites before executing.

The source contract includes public source URLs and the existing shared map manifest. Google Drive science candidates remain in your team's shared Drive; Agent B records the actual source file/revision after access. Do not assume all candidate locations are verified. No secret keys are included.

The snapshot's scripts use paths relative to the application or docs tree. Port them with their dependency files into the new app before running. Guide links beginning REFERENCE/ refer to the preserved snapshot, not files already implemented in the new project.

All checklists are initially unchecked. Historical passing reports describe the earlier system and are not automatic passes for a changed rebuild. Baseline ends at phase 13; phase 14 is the planned full Mission extension, and phase 15 covers release/deployment after authorization.
