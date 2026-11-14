# Phase 13 — Baseline integration acceptance

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: A integrates;B audits. Prerequisites: 00–12.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Review B commits,schemas,citations,asset hashes,source audits and interpretation limits. Do not move real coordinates or relax rules to make integration look successful.
- [ ] Run only invalidated expensive checks, then one full suite/build. Historical54 tests is a reference, not a fixed required count or fresh result.
- [ ] Browser test cloud load,error/Retry,corrupt/missing assets,native image zoom,2D/3D agreement,layer selection,dates and unknown coverage. Record rendered WebGL evidence separately from DOM.
- [ ] Walk Map destination -> verified route -> Continue to Mission -> Brief -> Review -> simulation -> timed science milestone -> return -> report. Also test approach-only/no-science and failed-route/start rejection.
- [ ] Check snapshot/state across navigation and reset unlocking; no fabricated task/resource completion.
- [ ] Publish evidence and known limits. This gate is current-state reproduction; stop here if the requested scope is baseline only.
- [ ] Gate G3: source/layer/UI/mission integration checks recorded as passed,reused or blocked; do not claim full supply dashboard or live telemetry.
- [ ] Commands: npm test; npm run build.
- [ ] References: VALIDATION-POLICY.md; REFERENCE/docs/science-approach-validation.md.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-13/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

