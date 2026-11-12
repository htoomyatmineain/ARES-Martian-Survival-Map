# Shared NASA regional map — 2026-11-12

Project: **NASA final round practice** (`qcgpyoegjwqfhvzvuhdl`).
Bucket: **jezero-map**. Release prefix: **western-jezero-v1**.

Manifest: https://qcgpyoegjwqfhvzvuhdl.supabase.co/storage/v1/object/public/jezero-map/western-jezero-v1/package-manifest.json

## Uploaded and verified

124 objects, **705,735,614 bytes** including overviews and manifest. Every uploaded object's SHA-256 was checked against its local release entry. The database object count and total size agree. Release evidence is in `mars-explorer-web/src/data/shared-map-release.json`.

The source-resolution payload remains 20 compressed Float32 elevation tiles at 1 m spacing and 100 lossless WebP imagery tiles at 25 cm spacing. All decoded source samples were compared exactly with the original NASA raster samples. Original GeoTIFFs remain unchanged locally.

The additional display assets are a 1001×1001 elevation grid at 10 m spacing and a 4096×4096 image at about 2.44 m/pixel. Both are reprojected/sampled into the same 10×10 km local Mars sphere frame. These overview products are explicitly coarser than the retained sources.

## App behavior

The regional workspace now loads the Supabase manifest, verifies overview hashes and uses the shared elevation/image in 2D and 3D. There is no silent CTX fallback. A failure shows an error and Retry control. No frontend secret key, local source directory, ZIP import or Supabase login is required for visitors.

At 8× zoom and above, 2D requests the intersecting original-resolution image tiles. Maximum zoom is now 64×. Orthographic image patches are transformed into the same local frame as the equirectangular elevation. Science popups can request a native 1 m elevation tile and verify its hash independently of the overview height.

The 3D mesh remains a **10 m display mesh**, using the same overview image and heights as 2D; it is not a full 1 m mesh. The demo router remains a **100 m planning grid sampled from that 10 m height grid**. It does not detect rocks or loose sand in imagery. Missing heights are preserved, marked in 2D, omitted from 3D surface triangles and rejected along route edges.

## Access

The user's final preference is: **anyone can view; team edits only**. The NASA map bucket is publicly readable. Row-level security is enabled on storage objects and no public INSERT, UPDATE or DELETE policies exist. Team changes require authorized project/dashboard access. The app has no public editing API.

The temporary upload helper was replaced with a closed HTTP 410 handler, with gateway JWT verification enabled. Its upload capability is disabled; previously signed create-only URLs cannot replace existing release objects. Local temporary upload credentials are removed after completion.

## Alignment evidence and limits

- Both reported science-site coordinates reproduce the independently checked native raster pixel positions.
- Packaged samples match the original checks: Skyland elevation −2520.46826171875 m / image DN 116; Hazeltop elevation −2523.12451171875 m / image DN 161.
- Orthographic inverse/forward roundtrips pass across all 100 image tiles.
- Tested SVG triangle approximation error is at most **0.0043977109 m**. This is numerical projection error, **not absolute geolocation accuracy**.
- The PDS Initial Reports Volume 2 confirms the transcribed coordinates. The source latitude convention, report-height datum compatibility and independent landmark registration remain unconfirmed. No arbitrary height or location offset has been applied.
- The test browser has no WebGL support. Shared 3D data wiring is built, but visual 3D validation needs a hardware-accelerated browser.
- 28 tests and the production/offline build pass.
- Production preview on port 4175 loaded the Supabase overview with no local source-data route. Both native science-site height readouts matched and passed hash verification. Detailed 2D imagery rendered from cloud URLs. Proof: `mars-explorer-web/test-results/supabase-shared-map.png`.
- Public manifest read returned HTTP 200 with CORS enabled; the closed upload helper returned HTTP 401 without authorization.

The security advisor also flagged the project's pre-existing `public.rls_auto_enable()` SECURITY DEFINER event-trigger function. It was inspected and left unchanged; it is unrelated to the map release and is not an app editing endpoint. No storage object write policies were added.

NASA PDS coordinate source: https://pds-geosciences.wustl.edu/missions/mars2020/Mars%202020%20Initial%20Reports%20Volume%202%20Release%202.pdf

The website itself has not been publicly deployed or pushed by this work. Environmental layers remain out of scope until supplied. The current object payload leaves about 294 MB against a conservative decimal 1 GB storage allowance; future layers and download traffic still need their own budget.
