# Martian Map

Explore a measured sector of Jezero Crater in a first-person suitcam. Follow the cyan route to Delta Outlook. Hold **Walk**, use the joystick, or press **WASD** to move. Drag the scene to look around.

```sh
cd mars-explorer
npm ci
npm run web
```

The [simulator directory](mars-explorer/) includes the Expo app, HiRISE-derived terrain and NASA MEDA readings, and the editable Jezero Blender scene. See the [data and Blender notes](mars-explorer/README.md) for source attribution.

## Original Mars Zone / Ares-07 diorama

Mars Zone is a fictional Martian field station presented as an editable terrain
diorama. The 54 × 42 m terrain tile includes an impact basin, exposed strata,
two pressurized habitat modules, a solar array, a landing apron, and a
six-wheel survey rover. The terrain and materials are generated in Blender;
the project does not use satellite elevation data.

Open **Mars Zone.blend** in Blender 5.2 or newer. It opens in the diorama camera; press
**F12** to render. The Outliner separates geology, the outpost, the solar
field, the survey route, lighting/cameras, and presentation graphics. The
**Survey map** camera gives a north-up overhead view (+Y up); the
**Outpost detail** camera frames the habitat. To use either camera, select it
and press **Ctrl + Numpad 0**. Hide **06 / Presentation graphics** in the
Outliner to render the diorama without the title and footer.

To regenerate the scene, run from this folder with Blender 5.2:

```powershell
blender -b --python-exit-code 1 -P build_mars_zone.py -- --render
```

Omit `--render` to build only the project. Regeneration overwrites
`Mars Zone.blend` and, with rendering enabled, `Mars Zone.png`.
