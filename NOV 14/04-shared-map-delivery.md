# Phase 04 — Shared map delivery

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: A only. Prerequisites: 03.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Prefer reusing the existing immutable map release when its hash matches. Do not upload duplicate raw archives or regenerate valid source packages without changed inputs.
- [ ] Before new Supabase work read its skill/current official docs. Inspect actual usage, storage and egress constraints. Historical ~706 MB is not a current free-plan quota guarantee.
- [ ] Prepare only manifest-listed tiles and overview assets. Confirm actual target/access authorization before project mutations; visitor-read and authorized-team-write is the intended policy.
- [ ] Verify remote bytes/hashes and release identity. No service-role/secret keys in frontend, anonymous write/delete policies or stale upload helper. Do not blindly recreate historic temporary upload endpoints.
- [ ] Implement manifest/schema/hash checks, native tile cancellation and bounded cache, explicit load errors/Retry. No silent local/CTX/synthetic fallback.
- [ ] Keep small reviewed layer catalogues/output geometry in the frontend where practical; originals remain local. Budget incremental storage and visitor transfer separately.
- [ ] Gate: clean visitor can fetch manifest, overview and native tile with CORS and without local folders/login; authorized writes only.
- [ ] Commands: node scripts/check-map-package.mjs; inspect actual remote read/error responses.
- [ ] References: REFERENCE/docs/shared-map-handoff.md; REFERENCE/mars-explorer-web/src/sharedRegionalData.ts; REFERENCE/mars-explorer-web/src/regionalTileStore.ts.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-04/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

