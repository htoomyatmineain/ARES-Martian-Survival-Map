# ARES parallel preparation: agent instructions

Prepared 2026-11-13. These are ordered execution guides, not a claim that the research has already been completed.

## Assignment

Prepare verified science-site photographs and a geology dataset assessment for the Western Jezero map. Complete the two companion guides in order. Work autonomously through reversible research and preparation; ask only when a required input or consequential choice blocks progress.

1. Read `01-science-site-photos.md` and complete its checklist.
2. Read `02-jezero-geology.md` and complete its checklist.
3. Return the evidence, catalogues, selected small assets, and completed checklists.

This work can run alongside the main agent's map, routing and mission UI implementation. Do not edit shared application components, change routing rules, move science coordinates, replace existing terrain, or upload to Supabase. Do not deploy or push unless separately instructed. Use a separate checkout/branch if available, named `codex/science-resource-preparation`. If working in a shared checkout, create only files in the assigned output directory and do not switch branches underneath another agent.

## Shared geographic contract

| Item | Value |
|---|---|
| Region | Western Jezero, Mars |
| Local footprint | 10,000 × 10,000 m |
| Centre | 18.46° N, 77.42° E |
| West / east bounds | 77.33107113608344° / 77.50892886391657° E |
| South / north bounds | 18.375646975709426° / 18.544353024290576° N |
| App latitude / longitude | Planetocentric; east-positive |
| Local reference sphere | Radius 3,396,190 m |
| Axes | x east-positive; z south-positive; metres |

Bounds describe the selected local-frame footprint, not a terrestrial WGS84 region. For conversions use radians:

```text
x = R × cos(lat0) × (lon − lon0)
z = −R × (lat − lat0)
```

Keep source CRS metadata. Do not assign EPSG:4326 to Mars data or treat different Mars datums as interchangeable.

## Authoritative site catalogue

Check these against `mars-explorer-web/src/data/science-sites.json` in the checkout before starting. If they differ, report the discrepancy instead of silently changing coordinates.

| ID | Place / sample | Latitude N | Longitude E |
|---|---|---:|---:|
| skinner-ridge-skyland | Skinner Ridge / Skyland | 18.458931 | 77.40617078 |
| wildcat-ridge-hazeltop | Wildcat Ridge / Hazeltop | 18.45863707 | 77.40588851 |

Reported sample locations are not automatically the camera position or the exact footprint of a photographed rock. Existing sub-metre report-image agreement is relative agreement, not absolute geographic accuracy.

## Resource roles

Official challenge resource list:
https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/?tab=resources

- Mars Trek: independent comparison viewer; main agent owns map checks.
- USGS–NASA geology: your geology assessment assignment.
- Perseverance raw images: your photograph assignment.
- Curiosity Mount Sharp example: route-presentation reference, not Jezero data.
- NASA Worldview: Earth interface reference, not a Martian environmental dataset.

The official list is a starting point. Follow linked official NASA, PDS and USGS sources as necessary. The user permits USGS–NASA material listed by the challenge; do not substitute unrelated third-party datasets.

## Output ownership and verification policy

Create `docs/resource-preparation/teammate/` with `photos/` and `geology/` subdirectories. Use repository-relative paths in catalogues so another machine can reproduce the work.

For each downloaded source record URL, original filename, retrieval UTC, size and SHA-256. Preserve original metadata. Keep raw large files outside tracked source; record how to retrieve them. Check `.gitignore` before committing anything. Do not commit credentials, source archives or large GIS rasters.

Validate a source once, record evidence and its hash, and reuse that result. Recheck only when the source, transformation or output changes, a check fails, or a new integration concern arises. Do not rerun the main project's terrain/routing validation for this research task.

Finish with `completion.md`: completed outputs, checks and results, total asset bytes, unresolved issues, and commands needed to regenerate assets. Report an unavailable or unsuitable source as such; never invent a successful match or force an unsuitable dataset into the map.

## Competition boundary

These are preparation instructions. Confirm event rules on reuse of pre-event research, processed assets and code before using outputs in the competition build. Do not represent preparation as work performed during the event.
