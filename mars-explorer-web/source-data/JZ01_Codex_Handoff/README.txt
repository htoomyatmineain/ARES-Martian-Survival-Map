MARTIAN MAP — JZ-01 CODEX HANDOFF

DATA SOURCE
NASA MRO HiRISE / USGS MSR TRN v003
DOI: 10.5066/P13CPYYU

ZONE
500 x 500 meters, Mars equirectangular coordinates.
Do not call this area Western Delta without verification.

TERRAIN
terrain.obj: 2m-spaced mesh, 63,001 vertices.
dtm_1m.tif: original 1m elevation grid.
texture.png: HiRISE-derived texture.
orthomosaic_025m.tif: georeferenced optical source.

COORDINATES
Mesh X = east_m - 250
Mesh Y = 250 - south_m
Mesh Z = elevation_m - (-2425.92626953125)

OBJ uses Z-up.
Preserve 1:1 horizontal and vertical meter scale.
Convert axes carefully for Three.js / glTF.

ROUTING
route_dijkstra.csv: shortest-distance demonstration.
route_slope_aware_astar.csv: slope-aware demonstration.
Both routes use east_m, south_m, elevation_m.
Use the 1m DTM for routing and terrain-height queries.
The 2m mesh is the visual representation.

IMPORTANT SCIENCE LIMITATIONS
Slope thresholds are simulation assumptions.
Routes are not NASA-certified astronaut-safe paths.
Visual terrain alone cannot establish actual EVA safety.
Optical and topographic data are two data categories;
additional mission data are needed for broader integration.

Use manifest.json for checksums and metadata.
