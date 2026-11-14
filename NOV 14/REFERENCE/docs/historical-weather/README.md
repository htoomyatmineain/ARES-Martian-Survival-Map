# Historical MEDA environment subset

Implemented 2026-11-13. This is historical near-rover context, not current weather, a zone-wide raster, a forecast or an astronaut safety model.

## Sources and selection

NASA PDS Atmospheres Mars 2020 MEDA archive, calibrated ATS local detector temperatures and derived PS pressure, sols 477 and 502. Exact original CSV/XML URLs, record counts, file sizes, MD5 and SHA256 hashes are in [source-manifest.json](source-manifest.json). Original products remain in the ignored local download cache. The small application JSON ships with the website and needs no separate Supabase upload.

Reuse the existing 43 hourly-selected TIRS ground observations as reference times. Choose the nearest actual ATS and PS sample within **30 spacecraft-clock seconds**, independently for each instrument. No interpolation or averaging. Preserve native LMST, LTST, source line and signed time offset. A source product's UTC coverage is not the exact UTC time of a sample.

Results: sol 477 has 22 air and 21 pressure records; sol 502 has 21 air and 21 pressure records. Five ATS detectors are retained separately. No wind product is listed in the checked calibrated/derived directories for these two sols. Wind remains unavailable; this does not establish availability elsewhere in the archive.

## Interpretation and limits

- Celsius = kelvin − 273.15. ATS values are local detector temperatures, not corrected ambient air estimates. No invented detector average or best-sensor selection.
- Pressure is in Pa. Selected pressure labels declare kelvin for pressure uncertainty, a dimensional inconsistency. Raw uncertainty is retained if present; no Pa uncertainty is invented or displayed.
- These ATS/PS products supply no per-row quality flags. Retain unknown flags and review-required status. Source checksum agreement verifies faithful ingestion, not physical accuracy or astronaut safety.
- Numerical ingestion bounds (0–500 K, 0–3000 Pa, exclusive endpoints) reject invalid values; they are not hazard thresholds.
- The marker uses the reference ground observation's approximate rover position. Individual ATS/PS positions use same-sol NASA PLACES anchors plus MEDA ancillary displacement within two seconds, using the existing spherical Mars frame. Position and sensor footprint accuracy are not independently established. No weather is assigned to the simulated crew or entire route.
- Missing pressure at `thermal-477-709288060` stays unavailable. No zero or fabricated reading replaces it.
- Simulated storms, oxygen, rover failures and live weather are not implemented by this panel.

## Verification

`scripts/check-historical-weather.py` passed: all four source CSV hashes, sizes and row counts; every exported detector/pressure value against its recorded source line; source clock/time strings; globally nearest time matching within 30 seconds; missing pressure outside that window; unknown quality flags and ancillary timing bounds.

Production build passed. All 54 existing application tests passed. Browser checks passed for layer activation, both days, time switching, ATS 1/5 switching and the unavailable-pressure case. New marker shares the existing geographic transform in 2D and 3D; visual 3D rendering still requires a WebGL-capable browser.

Use **Layers → Environmental observations**. Details include original NASA links, per-instrument times and limitations. Existing ground-temperature and mineral panels remain separate.
