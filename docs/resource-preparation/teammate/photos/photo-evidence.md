# Photo association evidence

Prepared 2026-11-13. Selected: **2 photographs, one per site**. These are NASA web PNG products, not newly calibrated raw camera products. No independent raw-product-ID match is claimed.

The authoritative app catalogue was read before selection. Both IDs and coordinates exactly match the start guide: `skinner-ridge-skyland` (18.458931 N, 77.40617078 E) and `wildcat-ridge-hazeltop` (18.45863707 N, 77.40588851 E). No coordinate changes were made.

## Selected evidence

Source: [NASA Mars Rock Samples](https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/), Skyland and Hazeltop sections. A preserved caption excerpt is in `../evidence/rock-samples-excerpt.json`; the original HTML hash is in the retrieval manifest.

| Site | Explicit NASA evidence | Available acquisition metadata | Association |
|---|---|---|---|
| Skinner Ridge / Skyland | Skyland section names Skinner Ridge and links an image whose alt text identifies sample 11 after collection, including the two sample holes and abrasion patch | Left Navcam; sol 495; July 12, 2022; LMST 16:54:24 | exact-site, by caption association with the sampled outcrop |
| Wildcat Ridge / Hazeltop | Hazeltop section names Wildcat Ridge and links an image whose alt text identifies sample 12 after collection, with the drill hole and abrasion patch | Left Navcam; sol 509; July 26, 2022; LMST 16:17:10 | exact-site, by caption association with the sampled outcrop |

NASA also lists Hazeltop's sealing date as July 27, 2022, with sol 509. Acquisition and sealing are different fields. Their dates are retained exactly as published. No UTC conversion or invented reconciliation is supplied. `acquiredUtc` is null for both photographs.

The filenames in `photo-catalog.json` are NASA web asset identifiers. They are not claimed to be verified native PDS product identifiers. A captioned NASA image is the permitted fallback when the raw gallery cannot supply a verifiable match.

## Candidate and rejection log

- **Selected:** Skyland post-drilling Navcam PNG from the NASA sample section. Both holes and the abrasion patch remain readable in the full frame.
- **Selected:** Hazeltop post-drilling Navcam PNG from its NASA sample section. The hole, abrasion and surrounding rock remain readable.
- **Not selected:** [Two Perseverance Sampling Locations in Jezero's Delta](https://science.nasa.gov/resource/two-perseverance-sampling-locations-in-jezeros-delta/). Official contextual mosaic names both ridges, but a shared composite is unnecessary for this small first selection and does not identify each individual sample hole. It must not be presented as an unambiguous Hazeltop- or Skyland-only photograph.
- **Not selected:** Swift Run and Bearwallow sample images on the same NASA catalogue. They concern other cores from the parent outcrops; they must not be relabelled Skyland or Hazeltop.
- **Not selected:** [NASA raw gallery](https://mars.nasa.gov/mars2020/multimedia/raw-images/). Retrieved page requires JavaScript and exposes no sufficient product-detail metadata in its static response. Proximity/time alone was not used to select an image.
- **Not used:** search-engine thumbnails, third-party illustrations and generative reconstructions.

## Visual review and usage

Both downloaded 1296 Ãƒâ€” 976 originals and their 960 Ãƒâ€” 723 thumbnails were viewed once. Orientation, full-frame context, sample holes and abrasion patches agree. No cropping, rotation or generative editing was applied. The NASA webpage's CSS zoom is intentionally not reproduced. The two thumbnails total 334,690 bytes and meet the suggested per-image storage range.

Each selected source credits **NASA/JPL-Caltech**. Display that credit adjacent to each photo and retain the original-image link. The fetched [NASA images/media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/) permits factual educational/informational uses subject to its conditions; it does not grant third-party rights or imply NASA endorsement. No separate third-party copyright notice was found for these selected assets. This is historical outcrop context, not current conditions or a camera-position accuracy claim.

## PDS report cross-check

The current official Initial Reports Volume 2 was retrieved as a 104,818,942-byte reference PDF under ignored `raw/`. Relevant text extracts and full-source SHA-256 are in `../evidence/report-entries.json`. PDF pages 52 and 58 were rendered and visually checked once: Skyland is M2020-495-12, coring July 11, 2022, sealing sol 495; Hazeltop is M2020-509-14, coring July 25, 2022, sealing sol 509. Their coordinates match the app catalogue. PDF page 20 ties Swift Run and Skyland operations to Skinner Ridge; page 63 ties Hazeltop/Bearwallow to Wildcat Ridge. Report-page references 20 and 63 in the app are contextual figures, while coordinate entries are 52 and 58. No discrepancy was silently corrected.

The report's coring dates, NASA catalogue sealing dates and photograph dates represent different fields. They must not be substituted for one another. The PDS index describes these as preliminary field-report records that may be revised. Catalogue sample numbers and PDS designations also use different numbering conventions; NASA sample 11 Skyland is not PDS designation suffix 11. Native raw-product IDs remain unverified; the selected association rests on NASA's explicit photo captions.
