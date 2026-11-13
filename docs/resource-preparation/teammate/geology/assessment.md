# Geological map assessment

**Decision: no suitable layer cleared for integration.** USGS SIM 3464 is a useful regional-context candidate, but no `geology-local.json` is delivered. Its source geometry was inspected for conditional coverage; it has not passed source-to-terrain registration checks. This is a blocked preparation result, not a claim that Jezero lacks mapped geology.

## Official candidates

| Candidate | Publication / scale / scope | Available source | Decision |
|---|---|---|---|
| Sun & Stack, 2020, USGS SIM 3464, DOI 10.3133/sim3464 | 1:75,000; 76.8–77.8 E, 17.7–18.7 N, Jezero and Nili Planum; NASA funded | [Official directory](https://pubs.usgs.gov/sim/3464/): sheet PDF, pamphlet, XML, readme and GIS ZIP; [USGS publisher's feature service](https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Jezero_FeatureServiceFromPro/FeatureServer) has units, contacts and boundary | Selected for assessment and source-unit catalogue; integration withheld |
| Tanaka and colleagues, 2014, USGS SIM 3292, DOI 10.3133/sim3292 | 1:20,000,000; global Mars | [Official publication](https://pubs.usgs.gov/sim/3292/): metadata, readme, map, database | Unsuitable detail for the 10 km zone; no 790 MB database downloaded. A 10 km span occupies only 0.5 mm at publication scale. Global context only, not a site layer |

Discovery began with the challenge's [USGS Mars hub](https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars). The challenge URL failed local certificate verification; TLS checks were not disabled. The [NASA Mars Trek viewer](https://trek.nasa.gov/mars/) is an independent comparison viewer, not a geological source accepted from its screen image. No third-party geological dataset was substituted.

## CRS, control and coverage evidence

Read `../evidence/sim3464_metadata.xml`, `sim3464_readme.txt`, `geology-service.json`, `geology-item.json` and the pamphlet's printed page 4 (PDF page 8). These are traceable official records, preserved with source hashes.

- GIS/readme/service: Mars 2000 sphere, both radii 3,396,190 m; transverse Mercator, central meridian **77.5 E**, origin latitude 0, scale 1, false easting/northing 0; metres. The pamphlet explicitly describes planetocentric latitude/east-increasing longitude, but states **77.3 E** for its central meridian. This unresolved publication-versus-release difference must not be silently ignored. On a sphere, geodetic and geocentric latitude coincide mathematically; that does not establish identical map control.
- Source XML/readme explicitly warn of **about 100–200 m random offsets** relative to the controlled surface-operations CTX mosaic. This is the producer's warning, not a measured correction or certified error range for our terrain. No shift or fit was applied.
- The map was digitized at 1:20,000 and published at 1:75,000. The pamphlet reports line smoothing with a 40 m tolerance. Neither 6 m CTX pixels nor the coordinate representation resolution establish metre-scale geological boundary accuracy.
- Conditional coverage uses the service's declared 77.5 E CRS, not an accepted app transform. The four projected footprint corners are tested against actual polygon unions, not just bounding boxes. Source boundary: 1 feature. Units: 40 features, all valid; union coverage fraction 1.0, uncovered area 0 in that conditional projected assessment. The seven intersecting unit IDs are 0, 2, 3, 7, 8, 10, 11. See `coverage-assessment.json` for limitations. No repaired or simplified geometry was used.
- The 56 queried contact features preserve source `TYPE` values in the ignored original response. Approximate, inferred, concealed and gradational contacts must remain distinct. Polygon edges alone do not encode that uncertainty.
- Source attributes and renderer supply 14 unit definitions in `units.json`, including source colours and any attribute variants. A source typo such as “Crater riim unit” is preserved as a variant instead of silently changing the original record.
- The USGS service item identifies the USGS account owner and says **“This map is for viewing purposes only.”** It directs users to the original PDF/GIS publication. That notice is retained; the web service is not promoted into an analysis-quality or safety product.

The app target would be custom local x-east/z-south metres, centre 18.46 N / 77.42 E, R=3,396,190 m, with x=R cos(lat0)(lon-lon0), z=-R(lat-lat0), angles in radians, and bounds ±5000 m. No Earth EPSG:4326 assignment, local clip, coordinate correction or CRS substitution was made.

## Ordered checklist

- [x] 1–2. Inventory official local/regional and global products; record publication, scale, area, formats, attributes, credit and links.
- [x] 3. Read original CRS and control metadata; report the central-meridian discrepancy.
- [x] 4. Test actual source polygon coverage in its declared frame; report conditional result and limitations.
- [x] 5–6. Assess scale; select SIM 3464 for context assessment, with no integration-ready layer cleared.
- [x] 7. Retrieve small official metadata and relevant feature-service responses; leave originals ignored. No GIS ZIP/raster archive downloaded.
- [ ] 8. App transformation withheld pending source-CRS reconciliation and registration review.
- [ ] 9. Local clipping not performed; original unit attributes are catalogued without claiming local feature placement.
- [x] 10. Queried unit geometries validated once in the source CRS; zero failures; no repair or simplification. Local-output validity is not applicable.
- [ ] 11. Three well-distributed source-map/terrain comparisons remain blocked; none are fabricated. Numerical round trips or coverage are not substitutes.
- [x] 12. Assessment, manifests, unit catalogue, validation and reproduction supplied; no empty-success local asset.

## Acceptance and exact next actions

- [x] Official traceability and meaningful conditional coverage established; scale and producer uncertainty stated.
- [x] Source and intended target conventions documented; no unverified transformed output claimed.
- [x] Source units/colours and variants retained; unknown metadata remain unknown.
- [x] Sizes/hashes and actual validation results recorded once.
- [ ] Local geometry and three-location registration acceptance: **not passed; no clip delivered**.
- [x] Future display label: **Geology**, separate from CRISM indicators and slope. No claims about mineable deposits, bearing strength, trafficability or astronaut safety.
- [x] Terrain, existing HiRISE files, coordinates, routes, app components and Supabase remain untouched.

Next: retrieve the original GIS ZIP to an ignored local directory; inspect its native feature-class CRS and compare documented landmarks to the original map sheet to establish whether the 77.3 figure describes an earlier working projection. Resolve the discrepancy from the released GIS and publisher clarification if necessary. Then compare at least three well-distributed landmarks/source contacts with the current controlled HiRISE frame, retaining coordinates/screenshots and the observed offsets. Decide whether the regional layer is acceptable **only as a visibly uncertain context overlay**. Do not invent a uniform registration shift. Once justified, transform through the documented Mars CRS, clip to ±5000 m, retain contact types and attributes, and validate finite coordinates, topology, coverage and source placement. Any projection/registration change invalidates the corresponding earlier assessment and requires checking the changed output.
