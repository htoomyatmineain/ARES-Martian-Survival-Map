# Science locations and mineral overlay audit

Checked 12 November 2026. Scope: relative science-marker placement, CRISM alignment, source-value preservation and honest interpretation. This does not certify astronaut routing.

## Science locations

The current [NASA PDS initial reports, volume 2](https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_dossier/initial_reports/initial_reports_volume2.pdf) reproduce our Skyland and Hazeltop coordinates on PDF pages 52 and 58. Context maps are on pages 20 and 63. File SHA-256 and detailed controls are recorded in science-registration-results.json.

For each map, unique SIFT image matches relate the NASA map to native HiRISE imagery. A seeded 75% subset fits a similarity transform; 25% is held out. The drawn red target is excluded from fitting and then compared to our marker's containing pixel centre.

| Site | Marker versus report target | Held-out matches within 0.5 m | Held-out P95 |
|---|---:|---:|---:|
| Skinner Ridge / Skyland | 0.274 m | 235 / 237 | 0.303 m |
| Wildcat Ridge / Hazeltop | 0.107 m | 227 / 230 | 0.291 m |

No marker coordinates were moved. These figures measure consistency within shared imagery, including annotation and pixel-centre uncertainty. Shared image ancestry prevents treating them as independent absolute ground-survey accuracy. Vertical datum compatibility remains unverified.

## Mineral area overlays

NASA PDS CRISM product HRL000040FF_07_SU183J_MTR3 contains the retained OLINDEX3, D2300 and BD2500_2 bands. The existing layer documentation links the original product and parameter definitions.

Direct projection alone left visible terrain structure displaced. An infrared R1330 image was matched to the HiRISE overview on a 40 m grid. A visible R770 image independently reproduced the shift within 5.53 m; high-pass phase correlation confirmed its direction and approximate magnitude.

The accepted similarity model maps original regional pixel indices to reference pixel indices:

```text
u = 0.992431538898064*c + 0.004520564328578655*r - 5.043151269661449
v = -0.004520564328578655*c + 0.992431538898064*r - 3.509890862279594
```

Indices start at the first cell centre. At the zone centre, the correction is 216.9 m west and 200.6 m north, approximately 295 m total. The model includes a small scale and rotation adjustment. Preparation applies its inverse to each target cell before the source projection and nearest-pixel lookup. Original NASA files and measurements are unchanged.

The infrared fit used 58 training inliers. All 22 held-out matches fall within the stated 80 m gate: median residual 21.7 m and P95 47.0 m. The separate visible-band fit has 28 of 30 held-out matches within that gate; its gated median is 26.2 m and P95 68.6 m. These are sparse image-feature residuals, not a guarantee for every pixel or absolute geographic accuracy. Full matrices, counts, phase-correlation checks and hashes are in mineral-registration-results.json.

Each corrected output has 60,931 valid and 1,569 missing cells: 97.4896% coverage. The three binary files total 750,000 bytes. Missing areas stay transparent. An independent implementation using explicit inverse-transform and equirectangular equations checked all 187,500 output cells: zero value or missing-mask mismatches. See orbital-mineral-validation.json.

## Mineral interpretation limit

OLINDEX3 is olivine-sensitive; D2300 indicates Fe/Mg-OH-related spectral structure; BD2500_2 is carbonate-sensitive. None alone proves a mineral species, abundance or usable deposit. The NASA sample reports independently describe mineral groups at the two sampling outcrops, but those findings cannot classify every orbital pixel. Full reflectance-spectrum confirmation, quality screening and a validated classification model remain unfinished. The app therefore retains spectral-indicator labels and explicit uncertainty; no confirmed mineral polygons or numerical confidence were created.

## Reproduction and application checks

From mars-explorer-web, run audit-science-registration.py and audit-mineral-registration.py with the cached NASA source files using the elevation-validation Python environment (numpy, rasterio, pyproj, OpenCV and PyMuPDF). Then run prepare-orbital-minerals.py followed by check-orbital-minerals.py. Preparation requires the accepted audit model and matching HiRISE reference hash. Run npm test and npm run build.

The application checks raster byte counts, SHA-256 and valid-cell counts before display. Both 2D and 3D consume the same corrected rasters. Automated tests and the production build pass. Thermal area data remains deferred; routing and slope safety validation are separate work.
