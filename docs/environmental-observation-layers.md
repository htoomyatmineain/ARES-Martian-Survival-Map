# Thermal and mineral observation layers

Implemented locally on 12 November 2026 for the 10 × 10 km regional workspace (`?workspace=regional`). Routing SOP work remains deferred. Existing science positions remain provisional.

## Thermal

Actual NASA PDS MEDA/TIRS calibrated **ground brightness temperature** readings, not air temperature or live weather. Two selected historical sols near the existing science sites:

| Sol | Product UTC coverage | Source temperature rows | Rejected by ingestion filters | Selected actual readings |
|---|---|---:|---:|---:|
| 477 | 2022-06-23 07:07:31.610Z – 2022-06-24 07:06:33.291Z | 30,956 | 3,699 | 22 |
| 502 | 2022-07-18 23:37:13.105Z – 2022-07-19 23:20:48.779Z | 39,432 | 5,769 | 21 |

The 43 selected records are at most one eligible real sample per available local mean solar hour, nearest half-hour. They are not hourly averages. Rejected counts exclude records removed only by hourly selection. Missing hours are not filled.

Each reading retains original kelvin temperature, standard-deviation uncertainty, SCLK, LMST, LTST, quality flags, source filename and CSV line. Celsius = kelvin − 273.15. The displayed UTC interval is product coverage, not an invented per-row UTC conversion.

Filters require finite positive temperature, finite nonnegative uncertainty, a stationary rover, low tilt, unshadowed ground, no known wheel obstruction, a nearby ancillary timestamp and a position inside the selected zone. Ingestion numerical bounds are sanity checks, not EVA safety limits. Missing flags are null and displayed as unknown; selected readings remain “Review required” when flags are missing. Sky-facing flags are retained for context and are not represented as proof of ground-measurement validity.

Rover positions use a same-sol NASA PLACES planetocentric anchor plus MEDA M2020_TOPO relative displacement. Ancillary timestamps must be within 2 seconds. M2020_TOPO +X is north and +Y west; north displacement adds latitude and negative Y displacement adds east longitude on the declared Mars sphere. This approximate translation is not independent geolocation validation. The sensor ground footprint has not been reconstructed. A marker locates the rover, not an exactly geolocated patch.

Users select the sol and actual recorded local Mars time. A single selected-time marker appears in either 2D or 3D; no temporal or spatial heatmap interpolation occurs.

## Minerals

One initial NASA-reported observation: **sulfate minerals at Wildcat Ridge**, reported from Perseverance SHERLOC analysis in NASA release 22-096 (15 September 2022). The observation campaign is July 2022; the publication date is not labelled as the acquisition date. No exact measurement timestamp, concentration or numerical confidence is invented.

The existing provisional Hazeltop coordinate (18.45863707° N, 77.40588851° E) is reused as an outcrop locator. It is not the precise Berry Hollow SHERLOC scan footprint. Independent landmark registration remains pending. The layer is a point-observation catalogue, not a CRISM mineral raster, full-zone inventory or deposit map.

The UI explicitly states that mineral detections do not prove usable or mineable deposits. Unobserved areas are unknown, not mineral-free.

## Delivery and storage

Small checked JSON subsets are imported into the application bundle, so visitors need no ZIP files and the new layers require no additional Supabase objects or credentials. The formatted thermal JSON is 53,369 bytes; mineral metadata is approximately 1.5 KB. Native downloaded CSVs remain in ignored local audit cache, outside the web build. No deployment or push was performed for this implementation.

## Reproduction

From `mars-explorer-web`, Python standard library only:

```powershell
python scripts/prepare-environment.py --download
python scripts/check-environment-source.py
npm test
npm run build
```

The downloader verifies each CSV against the NASA XML label's byte count, MD5 and record count before processing. SHA-256 source fingerprints are retained in `src/data/thermal-observations.json`. Reproduction also needs the checked PLACES snapshot in `docs/elevation-validation-sources/best_tactical.csv`. No cloud writes occur.

## Validation results

- Four used source CSVs passed NASA label byte-count, MD5 and record-count checks.
- Independent read-back of all 43 selected readings found **zero temperature, uncertainty, time or quality-flag mismatches** against source rows.
- Relative local displacement versus spherical distance differed by at most 0.000000372 m in the tested small offsets. This is numerical processing agreement, not absolute geolocation accuracy.
- Automated tests cover unit conversion, one selected thermal point, coordinate round trips, historical hour uniqueness, unknown flags, source linkage and mineral-marker reuse without fabricated coverage.
- Browser verification covers day/time changes, displayed values and source links, layer switching, point location, 2D and 3D markers, and mobile/desktop layouts.

## NASA sources

- [PDS MEDA calibrated collection](https://pds.nasa.gov/ds-view/pds/viewCollection.jsp?identifier=urn:nasa:pds:mars2020_meda:data_calibrated_env)
- [PDS MEDA archive](https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/)
- [Sol 477 calibrated temperature product](https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_calibrated_env/sol_0420_0539/sol_0477/WE__0477___________CAL_TIRS________________P01.CSV)
- [Sol 502 calibrated temperature product](https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_calibrated_env/sol_0420_0539/sol_0502/WE__0502___________CAL_TIRS________________P01.CSV)
- [NASA PLACES rover-localization reference](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_rover_places/data_localizations/best_tactical.csv)
- [NASA release 22-096: Wildcat Ridge mineral findings](https://www.nasa.gov/news-release/nasas-perseverance-rover-investigates-geologically-rich-mars-terrain/)
- [NASA outcrop and abrasion-patch context](https://science.nasa.gov/resource/two-abrasion-patches-from-perseverance-at-jezero-delta/)
