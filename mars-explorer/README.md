# Mars Explorer · Jezero Western Delta

## Run on a phone

Use **Expo Go for SDK 58**. Scan [Expo-Go-QR.png](Expo-Go-QR.png) with a phone on the same local network as the Windows computer. The QR targets `exp://192.168.99.69:8090`. Metro must remain running and the PC address must remain unchanged. If the QR goes stale, run:

```powershell
npm.cmd ci
npm.cmd start -- --lan --port 8090
```

Scan the QR printed by Expo. Use [http://localhost:8090](http://localhost:8090) to preview on the PC while Metro is running. For a static browser export, run `npx.cmd expo export --platform web` and serve the resulting `dist` folder over HTTP.

## Explore

- Tap **Free roam** to explore the sector without a route or suit drain. Hold **Walk** or hold the scene to go forward immediately. Drag the movement pad with a mouse or thumb to steer, or drag the scene to look. Tap **Enter exploration** or **Resume mission** to use the mission route. On desktop, WASD and arrows also walk, and E scans.
- Follow the cyan route to each amber survey beacon. Get within 9 m, scan all three stations, collect the two training samples, then return to base and scan again.
- Open **Map** for the overhead view and select **Elevation** or **Slope** to inspect the terrain. **Routes** recalculates the direct, gentle, and alternate paths where distinct routes are available.
- **Data** shows the elevation source, coordinates, local datum offset, and a separately labeled historical rover weather observation.

The walkable sector is 500 × 500 m, centered at **18.49200° N, 77.42480° E**. The source HiRISE posting is about **1.01 m**. The simulator samples the source into a **2.5 m** elevation grid and uses a **512 × 512** registered image crop. Surrounding relief comes from the USGS 20 m CTX DEM and provides a 3 km context view outside the walkable boundary. A stitched boundary joins the two sources. The source grid, planetocentric coordinates, projection parameters, elevation units, areoid datum, and local vertical offset are in `assets/terrain.json`.

The scenario uses invented stations, boulders, habitat and suit parameters. The historical instrument files below are reference material. They do not assign mineral composition to game rocks or represent current conditions at this sector. The published traverse contains no sampled vertices within the selected zone. The 2.5 m mobile grid cannot resolve all walking-scale hazards. The return-reserve estimate uses straight-line distance with a 25% margin.

## Source data retained locally

| Source | What this project retains |
| --- | --- |
| [NASA/JPL/UArizona HiRISE stereo DTM](https://www.uahirise.org/dtm/ESP_045994_1985) | Product `DTEEC_045994_1985_046060_1985_U01`. PDS header, validated byte ranges, and both sampled elevation grids (40,401 mobile vertices and 251,001 Blender vertices). |
| [HiRISE orthorectified imagery](https://www.uahirise.org/dtm/ESP_045994_1985) | Complete `ESP_046060_1985_RED_C_01_ORTHO.JP2`, its PDS label, and the registered 512 px playable crop. The app uses a stylized palette derived from red-channel brightness. |
| [USGS/JPL CTX context](https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic) | Source GeoTIFF header and 195 verified source rows used for 3 km context. |
| [NASA Perseverance location map](https://science.nasa.gov/mission/mars-2020-perseverance/location-map/) | Downloaded NASA traverse GeoJSON from the mission map feed. |
| [Mastcam-Z PIA24485](https://www.jpl.nasa.gov/images/pia24485-perseverance-view-of-the-delta-in-jezero-crater/) and [Ingenuity PIA26252](https://photojournal.jpl.nasa.gov/catalog/PIA26252) | Regional ground and aerial reference photographs. Ground image credit NASA/JPL-Caltech/ASU/MSSS. Aerial image credit NASA/JPL-Caltech. |
| [PDS CRISM archive](https://pds-geosciences.wustl.edu/missions/mro/crism.htm) | First 32 complete line-interleaved lines, 438 bands, and source label from `HRL000040FF_07_IF183L_TRR3`. Subset is instrument reference only and has no verified overlap with the playable sector. |
| [NASA MEDA](https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/) | NASA/JPL historical weather feed for sols 1127–1133. Missing values are preserved. The PDS calibrated time series was not included. |
| [PDS PIXL](https://pds-geosciences.wustl.edu/missions/mars2020/pixl.htm) and [PDS SuperCam](https://pds-geosciences.wustl.edu/missions/mars2020/supercam.htm) | A processed PIXL CSV from sol 463 and a calibrated SuperCam FITS spectrum from sol 466, with PDS XML labels. URLs and file sizes are in `data/science/downloads.json`. |

The selected products and subsets are included for this build. This folder is not a mirror of the full mission archives.

## Blender and interchange

Open **Jezero Terrain.blend** in Blender 5.2. The Blender export uses a 1 m local grid containing 251,001 samples from the nearest valid HiRISE source pixels. The app uses the lighter 2.5 m grid. The project includes the measured sector, CTX horizon, registered material, overview and walking cameras, illustrative boulders, and scene provenance properties. **Jezero Terrain.glb** contains the textured terrain surfaces and scenario boulders in metre units. The runtime collision and navigation grid is **assets/terrain.json**. The app renders this grid directly so walking, slope readings, and route calculation share the same terrain.

Rebuild the terrain with `python data/prepare_terrain.py --hirise` using NumPy, tifffile, and Pillow. Run `data/export_blender.py` with Blender's Python. If Blender fails to read a Windows path containing stylized Unicode characters, copy `data/export_blender.py`, `data/hirise-zone-sampled-501.npz`, `assets/terrain.json`, `assets/jezero-ortho-crop.png`, and `assets/rock-layout.json` and `assets/hero-route.json` into the same relative folders under a temporary ASCII path, run the export there, then copy the two terrain files back.
