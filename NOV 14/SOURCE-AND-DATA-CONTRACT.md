# Fixed source and data contract

## Mars frame

Western Jezero: **10,000 × 10,000 m**, centre **18.46° N, 77.42° E**. Planetocentric latitude, east-positive longitude; local sphere radius **3,396,190 m**. Local x east-positive, z south-positive, height metres at **1×** scale. Bounds W 77.33107113608344°, E 77.50892886391657°, S 18.375646975709426°, N 18.544353024290576°. Bounds represent this local footprint, not an Earth rectangle.

With angles in radians: `x = R cos(lat0)(lon−lon0)`, `z = −R(lat−lat0)`. Invert these formulas for map positions. Project each source using its own declared Mars CRS. Never assign EPSG:4326/WGS84 to Mars geometry or replace a different source sphere silently.

## Source ledger

| Role | Authoritative source / exact product | Contract |
|---|---|---|
| Native height | https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif | Equirectangular; 1 m projected pixel spacing, heights metres; spacing is not absolute accuracy |
| Native imagery | https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_007_orthoMosaic_25cm_Ortho_blend120.tif | Orthographic, 0.25 m native pixel spacing; retain DN values |
| Spectral indicators | https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/mtrdr/2007/2007_029/hrl000040ff/ | HRL000040FF_07_SU183J_MTR3; OLINDEX3 band 14, D2300 band 40, BD2500_2 band 46; source 36 m, output 40 m; indicators, not deposits |
| Geology | https://pubs.usgs.gov/sim/3464/ and https://pubs.usgs.gov/sim/3464/sim3464_database.zip | NASA-funded USGS SIM 3464, 1:75,000; context with ~100–200 m producer offsets |
| Historical environment | https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda | MEDA sols 477 and 502; exact CSV/XML links in `REFERENCE/docs/historical-weather/source-manifest.json`; no live or zone-wide weather claim |
| Science | `src/data/science-sites.json`, original PDS reports and NASA pages cited per record; teammate's Drive list is candidate input | Require type, coordinates, source and uncertainty per site; named targets are not all sampling sites |

NASA-only policy includes these official NASA-funded USGS/PDS distributors accepted for this project. No unrelated third-party Mars substitutes. Mars Trek is comparison/context; Worldview is an Earth interface reference, not a Mars layer. Curiosity Mount Sharp imagery is presentation inspiration, not Jezero terrain.

## Resolution and fidelity

Retain native DEM and imagery losslessly. Display uses 1001² nodes at 10 m and 4096² imagery (~2.44 m/pixel), with native image tiles on zoom. A 10 m display mesh does not become a 1 m mesh because the source is 1 m. Native source equirectangular east-west local spacing near the centre is ~0.948545 m; use the actual transform for analysis. Negative heights are relative to a Mars reference surface, not depth below a local flat floor.

Preserve all missing values and masks. No interpolation across missing data, no invented terrain, no arbitrary vertical/registration shift. Document incomplete vertical-datum metadata. A processing roundtrip, source consistency or shared-map comparison is not independent absolute geolocation validation.

## Runtime contracts

- `Site`: stable id, name, siteType, latitude, longitude, positionStatus, sourceUrls, observation time where known, proposedMissionId. Preserve `skinner-ridge-skyland` and `wildcat-ridge-hazeltop`. New proposed schema fields must be versioned; adapt existing readers rather than silently breaking them.
- `Layer`: id, source products/URLs/hashes, native CRS/units/resolution, observed time, geographic coverage, nodata rule, processing lineage, uncertainty and interpretation limits.
- `MissionBrief`: stable mission/site IDs, scientific question, proposed tasks with stable IDs, source references, assumed equipment/durations and proposed/simulated flag. These are not NASA-approved human Mars mission instructions.
- `Route`: requested destination separate from actual endpoint, verified native profile status, full polyline, distance/ascent, limits, objective and optional approach metadata. Use existing `NativeRoute` as baseline; coordinate versions before changing.
- `Mission`: immutable started route/settings snapshot, phase, simulated time, position/progress, events, task confirmations and later supply state. Historical environmental records must never be mutated by simulated emergencies.

Simulated habitat is local x=1900, z=1500 m; label it simulated. Current exact science targets can fail demo rules. A named-site fallback may end within 250 m; that gap is not a verified walking leg. No site science on approach-only routes.

## Storage and secrets

Use original sources locally for processing; deploy only manifest-listed tiles, overview, routing package and small reviewed layer assets. Existing release reference: `https://qcgpyoegjwqfhvzvuhdl.supabase.co/storage/v1/object/public/jezero-map/western-jezero-v1/package-manifest.json`. Recorded size 705,735,614 bytes/124 objects is historical, not a current quota audit. Visitors read; authorized team edits. No secret/service-role key in the client. Do not recreate old upload helpers blindly. Deployment and project mutation require the user's authorization for the actual destination.
