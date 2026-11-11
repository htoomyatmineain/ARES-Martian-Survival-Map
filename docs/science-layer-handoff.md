# Western Jezero Delta — Science Location Layer Handoff

## Purpose

Provide NASA-documented science-site locations for integration into the Martian Map interactive regional map.

**Status:** Ready for provisional integration. Final coordinate reference and vertical datum verification remain pending.

## Study Region

- Region: Western Jezero Delta + Adjacent Crater Floor
- Center: 18.460000° N, 77.420000° E
- Extent: 10 km × 10 km
- Latitude bounds: 18.375647° to 18.544353° N
- Longitude bounds: 77.331071° to 77.508929° E

## Science Site A — Skinner Ridge / Skyland

- Site ID: `skinner-ridge-skyland`
- NASA mission: Mars 2020 Perseverance
- Sample: Skyland
- PDS designation: M2020-495-12
- Latitude: 18.458931° N
- Longitude: 77.40617078° E
- PDS elevation: −2520.185 m
- Sampled CTX DEM elevation: −2517.258 m
- Lithology: Fine-to-medium-grained sandstone
- Geological interest: Sedimentary layering, sediment provenance, mineralogy, and aqueous alteration
- Original CTX imagery pixel: Valid
- Original CTX DEM pixel: Valid
- NASA reference: Initial Reports Volume 2, PDF page 20, Figure 2

## Science Site B — Wildcat Ridge / Hazeltop

- Site ID: `wildcat-ridge-hazeltop`
- NASA mission: Mars 2020 Perseverance
- Sample: Hazeltop
- PDS designation: M2020-509-14
- Latitude: 18.45863707° N
- Longitude: 77.40588851° E
- PDS elevation: −2523.0974 m
- Sampled CTX DEM elevation: −2520.483 m
- Lithology: Sulfate-bearing coarse mudstone
- Geological interest: Ancient lacustrine deposition, sulfate minerals, clay minerals, and water-rock interaction
- Original CTX imagery pixel: Valid
- Original CTX DEM pixel: Valid
- NASA reference: Initial Reports Volume 2, PDF pages 58–63, Figure 2 on page 63

## Relationship Between Sites

- Approximate horizontal separation: 23.57 m, calculated from the reported coordinates using a Mars spherical model
- Hazeltop is approximately 3 m below Skyland according to PDS elevations
- The two sites offer complementary sedimentary targets for comparative geological investigation
- Horizontal separation is not a walking-route distance

## CTX Raster Verification

- Original CTX imagery: 6 m/pixel
- Original CTX DEM: 20 m/pixel
- Regional imagery coverage: PASS
- Regional DEM coverage: PASS
- Regional imagery samples: 121/121 valid
- Regional DEM samples: 121/121 valid
- Both science-site imagery pixels: Valid
- Both science-site DEM pixels: Valid
- Science-site preview: `docs/science-site-map-check.png`
- Original raster verification scripts: `scripts/check_ctx_coverage.py`, `scripts/check_ctx_pixels.py`, `scripts/plot_science_sites.py`

## Required App Integration

1. Display two distinct NASA science-site markers.
2. Add a Science Sites layer visibility toggle.
3. Make markers clickable.
4. Display sample name, PDS designation, geology, scientific interest, and NASA source.
5. Support zoom-to-site navigation.
6. Label locations as NASA Perseverance sampling sites.
7. Keep proposed human EVA destinations separate from historical NASA sampling sites.
8. Show appropriate data-resolution and coordinate uncertainty notes.

## Scientific Limitations

- The PDS sample-coordinate latitude convention requires independent confirmation.
- The PDS elevation vertical datum requires independent confirmation.
- PDS elevations and CTX DEM elevations must remain separate values until their reference systems are reconciled.
- The CTX–PDS elevation differences must not be presented as DEM accuracy errors.
- Plotting coordinates on CTX imagery does not prove sub-meter registration.
- The 20 m CTX DEM cannot resolve meter-scale astronaut walking hazards.
- High-resolution HiRISE DTM coverage at both science sites has not yet been verified.
- No proposed EVA route is certified safe for astronauts.

## NASA Source

Mars 2020 Initial Reports, Volume 2, Release 2:

https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf

Mars 2020 Sample Dossier Archive:

https://pds-geosciences.wustl.edu/missions/mars2020/returned_sample_science.htm

## Remaining Verification

- [ ] Confirm PDS sample latitude reference convention
- [ ] Confirm PDS sample elevation vertical datum
- [ ] Quantitatively register CTX and HiRISE landmarks
- [ ] Verify teammate's high-resolution dataset footprint at both sites
- [ ] Test the integrated interactive Science Sites layer

**Integration decision:** The two sites may be added as provisional science markers with documented limitations. They must not be represented as sub-meter geolocation-certified or astronaut-safety-certified destinations.