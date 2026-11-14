# Phase 15 — Deployment and demo acceptance

Prepared 2026-11-14. **Status: NOT STARTED in the rebuild.**

Owner: A deployment;B claims audit. Prerequisites: 13 baseline;14 full Mission.

Read README.md, SOURCE-AND-DATA-CONTRACT.md and VALIDATION-POLICY.md first. Existing scripts/modules are implementation references or reusable tools: port and review their dependencies/output paths before executing in an empty app. Commands run from `mars-explorer-web`; `python` means the actual configured Python environment executable. On Windows use `RAYON_NUM_THREADS=1` for constrained builds if needed. Do not execute validators without their source/cache prerequisites.

## Implementation and validation checklist

- [ ] Confirm target project/hosting and authorization before publication. Read current relevant platform skills/docs for mutations. Keep secrets server-side and raw archives out.
- [ ] Build reviewed revision; ship small layers and correct map/routing release URLs. Check base paths,MIME,CORS,hashes for native tile/profile fetches and all layer assets.
- [ ] Test clean visitor with no ZIP,local source route,privileged login or devserver: overview,native zoom,verified route and all included layers. App shell alone is not deployment success.
- [ ] Check slow/offline/error states,stale service worker/release identity,cancellation and missing assets. Offline shell does not mean uncached source data is available. Measure actual storage/transfer/startup.
- [ ] Verify public reads/team writes and no frontend secret. Run released normal/approach/emergency flow for the stated scope; don't demonstrate an untested capability.
- [ ] Prepare evidence-backed narrative: NASA local data -> science objective -> route constraints -> mission decision -> return. Link full validation instead of overstating precision.
- [ ] Recheck official submission rules before export. Previously discussed up-to30-second video/seven-slide alternative is not assumed unchanged.
- [ ] Archive deployed commit/URL/source versions,known limits and progress. Keep incomplete gates visible.
- [ ] Gate G5: clean visitor sees data and completes demonstrated flow without manual injection; submission claims match released behavior.
- [ ] Commands: npm run build; browser end-to-end on actual release.
- [ ] References: REFERENCE/docs/shared-map-handoff.md; VALIDATION-POLICY.md.

## Completion record

- [ ] Write `docs/rebuild-evidence/phase-15/README.md` with input/source hashes, code commit, tool versions, commands actually run, output paths/bytes/hashes, results, reused evidence, screenshots and unresolved limitations.
- [ ] Pass the gate before dependent integration; continue independent work if blocked.
- [ ] Update PROGRESS.md and README.md only after acceptance. Historical completed checks are not automatic new-build passes.

