# Teammate: science mission briefing and checklist

Implement on `codex/eva-science-brief` after pulling the latest pushed main. Read `START-HERE.md` first. Work autonomously within this scope; do not edit existing app files.

## Owned files

- `mars-explorer-web/src/data/eva-science-missions.json`
- `mars-explorer-web/src/evaScience.ts`
- `mars-explorer-web/src/EvaScienceBrief.tsx`
- `mars-explorer-web/src/eva-science.css`
- `mars-explorer-web/tests/evaScience.test.ts`
- `docs/mission-parallel/science-completion.md`

Do not edit RegionalWorkspace, EvaMissionPanel, evaMission, useEvaMission, routing, site coordinates, map layers, package configuration or global styles. Main agent will mount your component. No Supabase changes. No push or external messages unless your user authorizes them.

## Implementation checklist

1. Read `src/data/science-sites.json`, `src/scienceSites.ts`, `src/evaMission.ts` and the existing science-source documents. Reuse exact existing site IDs. Review the linked NASA site evidence before writing new scientific factual claims. Cite original NASA URLs in the catalogue; distinguish real observed history from proposed human activities.
2. Create one proposed human mission brief for each existing science site: mission ID, site ID, concise title, scientific question, short purpose, proposed tasks, optional proposed tools, references and explicit simulation limitations. Never describe proposed astronaut work as an actual NASA mission or NASA-approved SOP. No invented measurements or successful sample results.
3. Tasks should have stable IDs and clear actions, such as document the outcrop or record a proposed sample observation. Keep them compact. Durations and equipment, if supplied, are editable demo assumptions; do not override the existing mission science duration.
4. Export a pure helper `getScienceBrief(siteId: string)` returning a matching brief or null. Export a pure completion guard that rejects site-task completion unless the target is reached exactly, the mission phase permits science and the relevant task conditions are met. A checkbox records a simulated action, not verified scientific success.
5. Export default `EvaScienceBrief` with this props contract (use `MissionPhase` from `evaMission.ts`):

```ts
type Props = {
  siteId: string | null;
  phase: MissionPhase;
  approachOnly: boolean;
  completedTaskIds: string[];
  onTaskChange: (taskId: string, completed: boolean) => void;
};
```

Show the purpose, proposed tasks, references and a proposed/simulated badge. Task toggles are enabled only during phase `science`, with a real matching brief and `approachOnly === false`. Planning is read-only. Approach-only shows the intended objective but explicitly says the site is unreached and sampling is unavailable. Custom targets show no invented science brief. Parent owns task state; do not create a second mission clock, route or persistent storage. Export must be safe to render outside a mounted app.
6. Use scoped CSS classes, existing fonts and accessible labels. Keep the component small enough for the left mission panel. No giant new card layout or independent navigation.
7. Add meaningful tests for exact catalogue matching, unknown/custom site, planning/approach/return completion rejection, allowed science-phase action, duplicate/unknown task handling and absence of false completion. Run relevant tests and build; do not rerun expensive terrain checks unless changed.
8. Write `science-completion.md`: changed files, source URLs, assumptions, test commands/results, component contract and unresolved issues. Commit only owned files. Give your user the commit SHA so main agent can merge. Do not claim app integration or browser testing if the component is not mounted yet.
