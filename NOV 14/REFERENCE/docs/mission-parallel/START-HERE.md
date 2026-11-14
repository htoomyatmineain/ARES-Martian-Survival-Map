# ARES mission work split

Prepared 2026-11-13. This is the current assignment; the older resource-preparation assignment is completed.

## Shared objective

Demonstrate a Western Jezero EVA: understand a science objective, review a route and its limits, depart, respond to a clearly simulated safety event, and return. Keep observations, assumptions and simulations visibly distinct. Historical weather is allowed by the supplied challenge text; live weather, a HUD and every possible layer are not required.

## Ownership

| Owner | Work | Guide |
|---|---|---|
| Teammate | Science mission content, a reusable briefing/checklist component, tests | `TEAMMATE-SCIENCE.md` |
| Main agent / user | Oxygen demo model, return decision, integration into existing mission state/UI/report, final verification | `MAIN-SAFETY-INTEGRATION.md` |

Use separate clones/worktrees. Teammate branch: `codex/eva-science-brief`. Main branch for later implementation: `codex/eva-safety-integration`. Never switch branches underneath another agent in a shared checkout. Teammate changes only its listed files. Main agent owns all existing shared components and reducers. Exchange a commit SHA; merge the science branch before final integration checks. Do not deploy as part of this assignment.

## Fixed boundaries

- Preserve the validated terrain, coordinates, imagery, geology and historical MEDA subset. Do not download or upload large datasets for this work.
- Preserve current routing limits and profile checks. These are demo rules, not certified astronaut limits.
- The two named sites currently have approach-only routes, roughly 238–250 m short. Use the actual `route.approach` object; never hard-code those distances into behavior.
- Approach-only missions must have zero site science time and cannot complete sampling tasks. Final access remains unresolved. Never relocate a real science site to make a route succeed.
- Geological units do not prove loose soil, bearing strength or traversability. Do not create soil exclusions from geological colours.
- Mission time is simulated; historical MEDA measurements are not current crew conditions. No fabricated NASA safety limits or physiological accuracy claims.

## Merge acceptance

1. Read the mission purpose and tasks before departure.
2. Exact-target and approach-only behavior remain distinct in review, running state and export.
3. A low-oxygen demo displays the assumed model and a return recommendation; automatic behavior, if enabled, is explicitly labelled and tested.
4. Pausing freezes the simulation. Reset clears scenario state. No completed task is claimed when its conditions are unmet.
5. Source-row audit, relevant new tests, existing tests and build pass. Browser verifies normal and emergency flows. Repeat existing terrain validation only if those inputs or algorithms change.

Rover failure, dust/visibility simulation, equipment workload modelling and a HUD are later increments. Do not attempt all of them in the first merge. Real obstacle/soil validation and final science-site access remain documented research gaps, not solved by this demo.
