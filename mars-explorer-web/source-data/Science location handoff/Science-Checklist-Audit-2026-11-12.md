# Science checklist audit — 2026-11-12

Scope: inspected D:/Github project/Mars Map, the separate Martian-Map-github clone, source raster headers and samples, science documents and preview images, handoff ZIP, and GitHub PR #1. This is an evidence audit, not a certification of all 60 historical checklist actions.

## Reproduced results

| Check | Observed result |
|---|---|
| Original CTX imagery retained | TIFF exists; 5322 x 5040; 6 m/pixel; nodata 0; projected Mars CRS |
| Original CTX DEM retained | TIFF exists; 4456 x 5067; 20 m/pixel; nodata approximately -3.402823e38; Mars spherical equirectangular CRS |
| Regional extent | terrain.json records 10 km extent, center 18.46 N / 77.42 E, and checklist bounds |
| Regional raster coverage | Both coverage checks True |
| Regional sampled pixels | Imagery 121/121; DEM 121/121 valid |
| Science-site pixels | Both sites inside both CTX rasters with valid samples, under the provisional latitude interpretation |
| CTX DEM at Skyland | -2517.2578 m |
| CTX DEM at Hazeltop | -2520.4834 m |
| Site separation | 23.5674635 m using radius 3,396,190 m |
| App terrain comparison | 501 x 501; 251001 valid comparisons; RMSE 0.006 m, MAE 0.004 m, maximum 0.063 m |
| Flip checks | Vertical RMSE 61.699 m; horizontal 132.790 m; both 142.050 m; stored orientation has lowest error |
| Four verification scripts | All exist and were read; coverage, pixel and DEM comparison scripts rerun successfully |
| Two science documents | Both exist and contain site details, provenance links, pending checks and integration requirements |
| Two preview images | Both exist and were opened; site preview labels provisional coordinates; visual overlays do not prove quantitative registration |
| Handoff archive | ZIP integrity check passed; eight source science files plus START-HERE.md and manifest.json |
| GitHub contribution | PR #1 is MERGED; exactly eight science files, no TIFFs or application-source changes; merge commit d81f7649777e9fde2ad7420f1e65691dd38df60c |
| Separate repository clone | Martian-Map-github exists with science commit 1c8cdc8; clean status when checked |

## Important new finding: local JZ-01 does not cover these science sites

Inspected source-data/JZ01_Codex_Handoff/dtm_1m.tif and orthomosaic_025m.tif directly. Both cover a 500 x 500 m footprint, projected bounds (4583750, 1091750, 4584250, 1092250). Skyland and Hazeltop both fall OUTSIDE this footprint after transformation from the provisional Mars spherical coordinates.

Native JZ-01 pixel sizes are 1 m DTM and 0.25 m orthomosaic. Relative to 20 m CTX DEM and 6 m CTX imagery, these are 20x and 24x finer linear pixel spacing, respectively. They do not support a blanket 60x claim, and they do not supply high-resolution terrain at the two science sites. This finding concerns the local JZ-01 patch only; it does not establish coverage of the separate 1.31 GB Western-Jezero-10km-HiRISE.zip on Drive, which was not inspected in this audit.

## Still pending or not independently established

- No Skyland/Hazeltop/Skinner Ridge/Wildcat Ridge identifiers were found in the local src TypeScript/TSX files. The two-site application integration is not evidenced. No browser interaction test of that integration was performed.
- PDS latitude convention and elevation datum remain unverified. Transformations and location checks above are conditional on the same provisional Mars spherical interpretation as the scripts.
- Quantitative CTX-to-HiRISE registration remains pending.
- NASA source PDFs and geology/date claims are documented in the local science files, but were not independently rechecked against the original NASA publications in this audit.
- 121 samples establish validity at the sampled positions, not an exhaustive absence of nodata or hazards throughout the full region.
- The terrain RMSE is reproduction agreement using the script's assumed grid/projection contract; it is not an absolute accuracy estimate or independent validation of that contract.
- Historical claims such as the original folder remaining unchanged, exact past staging actions and past research workflow cannot be fully proved from current files alone. The resulting eight-file GitHub change is verified.
- Drive uploads were verified by folder listing in the preceding handoff task. They were not downloaded again in this local audit.
- docs/science-sites.md contains earlier unchecked raster/coverage items alongside later successful checks; these should be reconciled before presenting a single final checklist status.

## Conclusion

The main local CTX verification results and science deliverables are substantiated. Research and delivery are usable at a provisional integration level. Do not describe all 60 items as independently scientifically verified, or the science sites as covered by the local JZ-01 high-resolution patch. Application integration and final geospatial validation remain open.

Commands reproduced: python scripts/check_ctx_coverage.py <imagery> <DEM>; python scripts/check_ctx_pixels.py <imagery> <DEM>; python scripts/verify_ctx_dem.py. Additional read-only rasterio checks inspected headers, transformed and sampled both sites, inspected local JZ-01 footprints, and calculated spherical separation. ZIP testzip returned None.
