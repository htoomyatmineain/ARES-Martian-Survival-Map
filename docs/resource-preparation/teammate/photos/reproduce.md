# Photo reproduction and completed checklist

Run from the repository root. All output paths are repository-relative.

```powershell
python -m pip install Pillow==12.2.0 pypdf==6.13.1
python docs/resource-preparation/teammate/retrieve.py "https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/" rock-samples.html
python docs/resource-preparation/teammate/retrieve.py "https://science.nasa.gov/wp-content/uploads/2024/03/mars-sample-11-nlf-0495-0710900102-755ecm-n0261004ncam00709-01-095j.png" skyland.png
python docs/resource-preparation/teammate/retrieve.py "https://science.nasa.gov/wp-content/uploads/2024/03/mars-sample-12-nlf-0509-0712140650-691ecm-n0261222ncam00709-01-095j.png" hazeltop.png
python docs/resource-preparation/teammate/read_report.py
# After fetching the geology metadata required by the shared catalogue builder:
python docs/resource-preparation/teammate/prepare_catalogues.py
python docs/resource-preparation/teammate/verify.py
```

Python/Pillow versions and exact dimensions, bytes and SHA-256 values are in `validation.json` and `photo-catalog.json`; original source hashes, final URLs and retrieval UTC are in `../evidence/retrieval-manifest.json`. Originals remain under ignored `../raw/`. The complete PDS reference PDF is also ignored; its checksum and relevant page extracts are recorded separately.

Exact conversion: Pillow `Image.open(source)`, `thumbnail((960,960), Image.Resampling.BICUBIC)`, `convert('RGB').save(output, quality=88, method=6)` to WebP, without crop or EXIF rotation. `prepare_catalogues.py` is the executable conversion implementation.

## Ordered workflow

- [x] 1. Read official NASA sample captions and PDS report entries; distinguish parent outcrop and sample names. Relevant report evidence is in `../evidence/report-entries.json`.
- [x] 2. Search official NASA sources using sol 495 / 509 context; prefer verified caption association over proximity.
- [x] 3. Open caption/resource pages and linked original PNGs. Camera, sol, published date, LMST and credit retained; native raw ID/UTC are not asserted.
- [x] 4. Associate through the NASA section and explicit image alt/caption, not rover location.
- [x] 5. Assign exact-site to sampled-outcrop association, with the limits documented.
- [x] 6. Select one verified image per site; candidate/rejection log provided.
- [x] 7. Retrieve the two selected images and metadata; record usage/credits.
- [x] 8. Produce full-frame, aspect-preserving thumbnails with Pillow.
- [x] 9. Stable NASA-asset-based filenames; sizes, dimensions, hashes and conversion implementation recorded.
- [x] 10. Visually compare each original and thumbnail once.
- [x] 11. Deliver catalogue, evidence and validation without frontend edits.

## Acceptance

- [x] Both selected images decode, have attribution and explicit association evidence.
- [x] Both IDs exist in the app catalogue; image identifiers are unique.
- [x] Available date/camera fields retained; unknown UTC/native-product fields are not invented.
- [x] JSON, local paths, actual bytes and hashes checked by `verify.py`.
- [x] Actual delivered count: two; no separate panoramic/context view delivered.
- [x] No large GIS archive, Supabase write, UI edit or deployment. The large PDS reference PDF is ignored, with retrieval instructions.

Validation is cached by input SHA-256. Reuse the recorded result when inputs are unchanged. Recheck if a source, thumbnail or transformation changes or a check fails.
