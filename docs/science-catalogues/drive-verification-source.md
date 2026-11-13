# Jezero Step 3 verification record

Overall: PARTIAL. This is a project evidence record, not scientific approval. Step 3 remains unticked.

Scope: Western Delta + Adjacent Crater Floor, 10 x 10 km. Bounds [west, south, east, north]: [77.33107113608344, 18.375646975709426, 77.50892886391657, 18.544353024290576]. Authority: supplied terrain(2).json.

## Results

| Check | Result | Evidence / limitation |
|---|---|---|
| Numeric boundary inclusion | PASS 23/23 | Coordinates in supplied inventory compared against supplied region bounds; assumes compatible coordinate frames. |
| CTX DEM finite/non-NoData support | CONDITIONAL PASS 23/23 | Earlier direct GDAL check of supplied M20_JezeroCrater_CTXDEM_20m.tif; all four source pixels in each bilinear neighbourhood finite and not nodata. |
| Raster coordinate conventions | Documented PASS | Supplied registration README records exact product-label checks. These were not independently rerun for this report. |
| Dossier sample-to-raster coordinate linkage | PENDING | Official-source search and explanatory notes did not establish a traceable localization product/version or latitude convention for these exact sample fields. |
| HiRISE native sample pixel support | CONDITIONAL PASS 23/23 elevation and 23/23 imagery | Direct checks of supplied tiles: four source pixels per sample, finite, non-NoData and GDAL mask-valid. Coordinate linkage remains assumed. |
| Vertical reference compatibility / accepted registration | PENDING | Existing registration README retains these dependencies. No datum conversion or acceptance threshold invented. |

## CTX check method already executed in this chat

GDAL opened the supplied 4456 x 5067 source raster with 20 m pixels and nodata -3.4028234663852886e+38. Each original inventory longitude/latitude was interpreted in the raster's geographic CRS, transformed to its projected CRS with traditional GIS axis order, and mapped through the inverse geotransform. For pixel-corner coordinates (column,row), the bilinear support starts at floor(column-0.5), floor(row-0.5). All four pixels were checked for finite/non-nodata values. This checks stored values, not an independent accuracy estimate or separately supplied quality mask.

Passing records: Roubion, Montdenier, Montagnac, Salette, Coulettes, Robine, Malay, Hahonih, Atsah, Swift Run, Skyland, Hazeltop, Bearwallow, Shuyak, Mageik, Kukaklek, Atmo Mountain, Crosswind Lake, Melyn, Otis Peak, Pilot Mountain, Pelican Point, Lefroy Bay.

The assumed sample convention is planetocentric latitude and east-positive longitude. It remains an assumption. Preserve original coordinate strings and reported elevations. Do not apply guessed shifts or substitute rover-centre coordinates.

## Official-source investigation

The following were inspected in this conversation:

- Archive README: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_dossier/readme.txt
- Document directory and release notes: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_dossier/document/
- Initial Reports explanatory notes: https://an.rsl.wustl.edu/help/Content/About%20the%20mission/M20/Return%20sample%20science/Initial%20Reports%20introduction.htm
- Archive overview: https://pds-geosciences.wustl.edu/missions/mars2020/returned_sample_science.htm

The inspected explanatory notes describe core orientation but did not close the coordinate-field linkage. A web fetch of Volume 2's XML label failed due to unsupported content type; it is not counted as newly inspected. Search failure does not prove authoritative evidence does not exist.

## Remaining work and handoff

1. Obtain an explicit producer definition or traceable sample-observation-to-localization-product/version chain. Keep linkage PENDING until obtained.
2. HiRISE sample pixel-support checks are now executed. Full-region gap handling and runtime placement remain separate integration work.
3. Retain datum and registration acceptance dependencies from the existing evidence. Do not merge CTX and HiRISE heights based on this report.

Provisional CTX marker data preparation may proceed with uncertainty retained. Verified geographic placement, astronaut route safety and completed scientific approval are not established.

Checklist: Steps 1-2 confirmed complete by user. Step 3 PARTIAL. Steps 4-6 not completed.


## HiRISE check update — 13 November 2026

All 16 requested original tiles were supplied. SHA-256 matches the supplied download manifest for 16/16 files. Each sample was transformed separately into the elevation and imagery CRS. The four native pixel centres needed for bilinear support were located across the supplied tiles; each value was tested for finiteness, declared nodata and GDAL validity mask. Elevation: 23/23 PASS. Imagery: 23/23 PASS. No missing support pixels. Detailed values and filenames are in Jezero_HiRISE_Sample_Checks.json.

These are conditional point-support results, not complete regional coverage, an independent accuracy assessment, accepted registration, or runtime marker tests. The broader HiRISE gaps previously documented remain relevant. Original rasters were read only; no filling, merging or offsets were applied. Step 3 remains PARTIAL because coordinate linkage and registration/datum dependencies remain unresolved.

