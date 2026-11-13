# Reproduce geology assessment

From repository root, use Python and the exact versions recorded in `validation.json`.

```powershell
python -m pip install --target docs/resource-preparation/teammate/raw/python-libs pyproj==3.8.0 shapely==2.2.0
python docs/resource-preparation/teammate/retrieve.py "https://pubs.usgs.gov/sim/3464/sim3464_metadata.xml" sim3464_metadata.xml
python docs/resource-preparation/teammate/retrieve.py "https://pubs.usgs.gov/sim/3464/sim3464_readme.txt" sim3464_readme.txt
python docs/resource-preparation/teammate/retrieve.py "https://pubs.usgs.gov/sim/3464/sim3464_pamphlet.pdf" sim3464_pamphlet.pdf
```

Other exact requests are in `source-manifest.json` and the shared `../evidence/retrieval-manifest.json`. Replay successful records with their recorded `requestedUrl` and basename of `path` via `retrieve.py`; failed requests are evidence, not mandatory retries. The script reuses an already successful cached URL. Preserve manifest metadata when moving caches. On a fresh machine, retrieve anew and record the new timestamps/hashes rather than copying the old retrieval claims.

```powershell
python docs/resource-preparation/teammate/assess_coverage.py
python docs/resource-preparation/teammate/prepare_catalogues.py
python docs/resource-preparation/teammate/verify.py
```

`assess_coverage.py` queries boundary 0, units 8 and contacts 5 in the native service CRS. Its request envelope is the four target-footprint corners projected with the released 77.5 E definition plus a 10 m query margin. The 10 m is a query margin, not an accuracy tolerance. Full original returned features are cached, not clipped. ESRI clockwise shells and counter-clockwise holes are reconstructed without repair; union coverage is measured against the projected four-corner polygon. Edges are not densified, so this is explicitly a conditional source-frame coverage assessment.

The current assessment result is reused; do not rerun unchanged sources just to repeat a successful check. The prepared unit catalogue retains descriptions, interpretations, original symbols, colours and attribute variants. No `geology-local.json` should exist at this stage.

PDF evidence can be rendered without authoring a new map:

```powershell
pdftoppm -f 8 -l 8 -scale-to 1400 -png -singlefile docs/resource-preparation/teammate/raw/sim3464_pamphlet.pdf docs/resource-preparation/teammate/raw/pamphlet-page8
```

Original source WKT is preserved in `source-manifest.json`. Proposed target definitions and blockers are in `assessment.md`. **There is no accepted transformation/clipping command yet.** Do not interpret the assessment's provisional projection as clearance to align this layer with the app terrain.

Large retrieval, only when resolving the blocker: `https://pubs.usgs.gov/sim/3464/sim3464_database.zip` (333M directory label / 349.3 MB publication label). Save under the ignored `raw/`, record actual bytes/SHA-256, and inspect the native geodatabase and coordinate-system files. No checksum is invented for an archive not downloaded. Preserve metadata notices, credit Sun & Stack (2020), USGS SIM 3464, NASA-funded, DOI 10.3133/sim3464; observe the service viewing-only notice.
