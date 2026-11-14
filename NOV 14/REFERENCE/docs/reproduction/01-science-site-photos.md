# Phase 1 — reproduce a verified science-site photo catalogue

Read `TEAMMATE-START-HERE.md` first. Goal: find a few real ground-level photographs that help an astronaut understand the two science destinations. Prepare data and thumbnails; the main agent will integrate the UI.

## Inputs and starting sources

- The shared geographic contract and two site IDs from the start guide.
- Existing `mars-explorer-web/src/data/science-sites.json`.
- Official raw-image gallery: https://mars.nasa.gov/mars2020/multimedia/raw-images/
- NASA site-identification resource: https://science.nasa.gov/resource/two-perseverance-sampling-locations-in-jezeros-delta/
- NASA PDS sample reports: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_dossier/initial_reports/initial_reports_volume2.pdf
- PDS archive index: https://pds-geosciences.wustl.edu/missions/mars2020/returned_sample_science.htm

If a URL redirects, record the final canonical URL. If blocked, try the official archive index or an official NASA captioned image; record the limitation. Do not use a search-result thumbnail as source evidence.

## Ordered steps

- [ ] 1. Read NASA captions and the relevant report entries to identify place names, sample names and observation periods. Skinner Ridge, Skyland, Wildcat Ridge and Hazeltop are related labels, not interchangeable image identifiers.
- [ ] 2. Search the NASA gallery or linked NASA mission resources for each location, using the documented time window to narrow results. Prefer a contextual outcrop view and, if useful, one detail view per site.
- [ ] 3. Open each original product/detail page. Record image ID, camera, exact available acquisition-time fields, caption, credit and original image URL. Preserve a sol number when provided; do not invent an Earth date conversion.
- [ ] 4. Establish association using an explicit official caption/product/report match. A rover being near a site does not establish what its camera was looking at.
- [ ] 5. Assign `exact-site`, `nearby`, or `regional-context`. Include a written reason and evidence URL. If no defensible site association exists, exclude it from the selected set and explain why.
- [ ] 6. Select approximately 1–2 useful photos per site. A smaller verified selection is preferable to filling a quota with uncertain images. Keep a candidate/rejection log.
- [ ] 7. Download only selected images and their needed metadata. Retain original URLs and hashes. Check usage/credit requirements on the source, including any partner-owned content.
- [ ] 8. Produce local thumbnails with a standard image tool, preserving aspect ratio and without generative edits. Suggested maximum long edge: 960 px. Target about 50–200 KB each where readable; these are storage targets, not reasons to sacrifice necessary detail.
- [ ] 9. Give thumbnails stable filenames based on image IDs. Record source and thumbnail dimensions, byte sizes, SHA-256 and the exact conversion command/tool version.
- [ ] 10. Visually inspect each thumbnail against its source once. Check subject readability, aspect ratio, orientation, attribution and that no misleading crop removes context.
- [ ] 11. Write the catalogue and validation report below. Do not edit map coordinates or frontend components.

## Deliverables

Under `docs/resource-preparation/teammate/photos/`:

1. `photo-catalog.json` — selected records only.
2. `photo-evidence.md` — association evidence, uncertainties and rejected candidates.
3. `thumbnails/` — selected small images.
4. `reproduce.md` — retrieval and thumbnail commands, tool versions, manifest of hashes and bytes, completed checklist.

Catalogue shape (replace placeholders with verified values; use null for unavailable metadata):

```json
{
  "schemaVersion": 1,
  "photos": [{
    "siteId": "skinner-ridge-skyland",
    "imageId": "verified-original-id",
    "title": "Verified descriptive title",
    "association": "exact-site",
    "associationReason": "Explain the official evidence",
    "evidenceUrls": ["https://official-source.example/product"],
    "sourcePageUrl": "https://official-source.example/product",
    "originalImageUrl": "https://official-source.example/original.jpg",
    "camera": null,
    "sol": null,
    "acquiredUtc": null,
    "credit": "Exact source credit",
    "thumbnailPath": "thumbnails/original-id.webp",
    "thumbnailBytes": 0,
    "thumbnailSha256": "replace-with-real-hash",
    "originalSha256": "replace-with-real-hash",
    "retrievedUtc": "replace-with-retrieval-time",
    "limitations": ["Historical image; not current conditions"]
  }]
}
```

The example domains above are schema placeholders, not real sources. Do not retain placeholder values in final output.

## Acceptance checks

- [ ] Every selected photo opens, has source attribution and a defensible association category.
- [ ] Every site ID exists in the app catalogue; no duplicate image IDs unless intentionally reused and explained.
- [ ] Dates and camera fields match original metadata; unknown fields remain null.
- [ ] All local thumbnail paths exist, JSON parses and byte counts/hashes match.
- [ ] Exact-site claims have explicit official evidence; otherwise use a weaker category or exclude.
- [ ] Report actual delivered count and missing coverage honestly. No photos found is a valid research outcome, not a reason to invent a match.
- [ ] No large archive downloads, Supabase writes or shared UI edits occurred.

Future integration: show the thumbnail in the site's right-side details panel, with association label, date/sol, camera, credit and an original-image link. It must not modify routing safety decisions.
