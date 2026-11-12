# Science location integration handoff

Status: ready for provisional integration; scientific verification remains incomplete.
Prepared: 2026-11-12
Source: https://github.com/zakarizhai562-afk/Martian-Map/pull/1
Pinned commit: d81f7649777e9fde2ad7420f1e65691dd38df60c

Read docs/science-layer-handoff.md and docs/science-sites.md first. This package includes original documents, preview images, and four verification scripts. Raster datasets and a working app layer are not included.

## Agent implementation task

1. Inspect the target application and its coordinate transforms. Add two distinct clickable NASA Perseverance sampling-site markers, a Science Sites visibility toggle, and zoom-to-site navigation.
2. Use exact source coordinates. Display sample, PDS designation, geology, scientific interest, NASA source, and provisional status. Keep PDS and CTX DEM elevations separate.
3. Keep historical NASA sampling sites separate from proposed human EVA destinations. Do not certify astronaut-safe routes.
4. Inspect Western-Jezero-10km-HiRISE.zip in the parent Drive folder. Verify CRS, native pixel sizes, footprints, nodata, vertical datum, and coverage at BOTH sites before claiming high-resolution support. The ZIP has not been inspected during this handoff preparation.
5. Review script dependencies and paths before execution. Supply actual raster datasets and adjust local paths as necessary. Reproduce coverage and DEM checks.
6. Verify PDS latitude convention, PDS elevation datum, quantitative CTX-to-HiRISE registration, and high-resolution terrain coverage. Keep unresolved checks marked pending.
7. Test marker placement, popup content, layer visibility, zoom, and selecting the two nearby sites. Report validation and remaining uncertainties.

## Locations

- Skinner Ridge / Skyland: latitude 18.458931 N, longitude 77.40617078 E.
- Wildcat Ridge / Hazeltop: latitude 18.45863707 N, longitude 77.40588851 E.

Latitude convention remains pending verification. Do not silently assume Earth WGS84.

## Reported source results

These results were documented in the source package and were not rerun for this upload: regional imagery and DEM 121/121 samples valid each; both science-site pixels valid; original CTX DEM versus application terrain RMSE approximately 0.006 m; horizontal site separation approximately 23.57 m. The RMSE describes terrain reproduction, not absolute DEM accuracy or registration certification.

## Resolution claim

Science markers add location information; they do not increase raster resolution. Do not claim 60 times better resolution without comparing verified native pixel sizes for the same data type. For example, 6 m/pixel divided by 0.1 m/pixel is 60 times finer linear sampling. Resampling alone does not create additional source detail. Imagery and terrain DEM resolution must be assessed separately. The source package reports CTX imagery at 6 m/pixel and CTX DEM at 20 m/pixel. Replacement HiRISE pixel sizes and coverage remain unverified here.

Acceptance: provisionally usable science markers with clear uncertainty labels, verified coverage wherever claimed, and documented remaining checks. This package does not certify sub-meter geolocation or astronaut safety.
