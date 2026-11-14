# Phase 00 — Project foundation

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: A; B reads. Prerequisites: None.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Keep the existing demo intact. Rebuild in a separate repo/worktree; use the current code only as reference. Record reference commit and local-only changes.
- [ ] Scaffold React + TypeScript + Vite. Reference the existing package.json and lockfile; npm ci applies when reusing that lockfile. Record actual Node/Python versions rather than requesting latest versions blindly.
- [ ] Use existing Three.js/R3F/Drei, geotiff, sharp, lucide-react and fonts where needed. Do not recreate the retired Explorer/JZ-01 workspaces.
- [ ] A owns package/lock/config changes. Create codex/rebuild-core and codex/rebuild-science in separate checkouts; agree file ownership.
- [ ] Create Python environment with recorded NumPy, Rasterio/GDAL, PyProj/PROJ, OpenCV, Shapely and Pyogrio versions. MEDA scripts use stdlib where possible.
- [ ] Create ignored source/cache folders and new phase evidence folders. No secrets or large source archives in Git.
- [ ] Implement a loading/error shell and demonstrate dev server and minimal production build before downloading large assets.
- [ ] Gate: fresh checkout installs and builds; both agents accept the same contract and isolated ownership.
- [ ] Commands: npm ci; npm run dev -- --host 127.0.0.1 --port 4174 --strictPort; npm run build.
- [ ] References: REFERENCE/mars-explorer-web/package.json; REFERENCE/mars-explorer-web/package-lock.json.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-00/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

