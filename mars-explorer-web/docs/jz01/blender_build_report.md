# JZ-01 Blender build report

## Final inspection of actual outputs

Both 960 × 540 previews were opened and visually inspected. Tactical framing includes the entire crop without clipping; the astronaut view shows the real surface from 1.75 m above a raycast hit. Close-range orbital imagery is visibly limited in resolution and contains pre-existing lighting. No detail or terrain was invented to conceal those limits. The previews are scientific asset previews, not a claim of final concept-art fidelity.

The saved `.blend` was independently reopened in a second Blender process: PASS. `DATA_Terrain` contains only `JZ01_Scientific_Terrain`; `SIM_Props` is empty; both named cameras and the sunlight are present. The saved mesh has 63,001 vertices and 125,000 triangles, meter unit scale, and a packed 2000 × 2000 texture. Blender stores 375,000 UV **loop corners**, corresponding to the source's 63,001 UV records; this is not a loss of UV registration. TacticalCamera is the saved active camera.

The GLB is 15,252,860 bytes. Its 374,356 exported vertices reflect flat-normal corner splitting, while all 125,000 oriented triangles remain equivalent. No simplification or shading smooth operation was applied. This is an uncompressed correctness baseline; target-device transfer/decode/GPU performance remains pending.

Additional exact verification command executed from the workspace (read-only):

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background generated/jz01/JZ01_terrain_scene.blend --python-expr "import bpy,json; s=bpy.context.scene; t=bpy.data.objects['JZ01_Scientific_Terrain']; result={'collections':{n:[o.name for o in bpy.data.collections[n].objects] for n in ['DATA_Terrain','SIM_Props','Cameras','Lights']},'vertices':len(t.data.vertices),'triangles':len(t.data.polygons),'uv_loops':len(t.data.uv_layers.active.data),'packed_images':[(i.name,list(i.size),bool(i.packed_file)) for i in bpy.data.images if i.name=='texture.png'],'unit_scale':s.unit_settings.scale_length,'active_camera':s.camera.name,'resolution':[s.render.resolution_x,s.render.resolution_y]}; assert len(t.data.vertices)==63001 and len(t.data.polygons)==125000; assert len(bpy.data.collections['SIM_Props'].objects)==0; assert len(bpy.data.collections['DATA_Terrain'].objects)==1; assert all(bpy.data.objects[n].type=='CAMERA' for n in ['TacticalCamera','AstronautPreviewCamera']); assert result['packed_images'][0][2]; print('SAVED_BLEND_VALIDATION',json.dumps(result))"
```

Nonblocking Blender notices: `Material.use_nodes` and `World.use_nodes` emitted future Blender 6.0 deprecation warnings. The requested Blender 5.2.3 build completed without errors. Existing React code and older terrain were not edited or rebuilt.

Blender: **5.2.3 LTS**

## Exact build command

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python scripts/jz01/build_scene.py
```

## Scientific preservation

Source: `source-data/JZ01_Codex_Handoff/`. 500 m raster footprint; 499 m mesh sample-center span. No resampling, deformation, smoothing, displacement, scale correction or simulated props. Warm sunlight and ambient illumination are illustrative, not calibrated Mars color.

Original UVs drive the original grayscale image directly through Principled BSDF; roughness 0.94, metallic 0. Packed editable texture and embedded GLB texture. Cameras and lights excluded from terrain GLB.

## Output paths

- `generated/jz01/JZ01_terrain_scene.blend`
- `public/assets/mars/jz01/terrain.glb`
- `docs/jz01/screenshots/tactical_preview.png`
- `docs/jz01/screenshots/astronaut_preview.png`
- `docs/jz01/validation.json` (complete input SHA-256 inventory and numerical results)

## Executed checks

### Blender version: PASS

```json
null
```

### Input integrity: PASS

```json
{
  "files": 17,
  "supplied_hashes": 15,
  "hashes": {
    "corridor_test.csv": "e6e592212c99df1ee640c1a4654217980bdc94a5fef4ad0b665d2ff62c8831b9",
    "data_provenance.json": "08b2dccc814adaf3cf9217c41e640bc18068bc0f042111c4e8b5c121762d30d0",
    "dtm_1m.tif": "1bdfdc8b199dcd099bd41109073b00cd43ad1ff6cdb1010ccb7010e635f7164c",
    "manifest.json": "62ebe28a27c2335979dd0b270470bc104effb8138877a6a00f3682d7395f23ef",
    "original_handoff_manifest.json": "8777bc5cbad0835f91e0d53aed13f6c2c97e44f914abbf271f864e721ea0f4f2",
    "orthomosaic_025m.tif": "eea80aca7413798da8a4a6d337d8bfffdfbc3b2ec10a4aad6d62b7fd87558610",
    "README.txt": "56aff0ec7ff25d3bb259ff9f49442d95888e00dc0e0c6e5f1f1fd3e497f5570f",
    "robustness.csv": "840fc615d746899e6970fe8e7ac7b9c9c43865eb7b00b721cde6c6f0f5ec16a5",
    "route_1m_validation.csv": "d9d5c453d98e012f72f2acd1d1064626a0c07c2796ea0c835e671f3897d6e1dc",
    "route_comparison.png": "e5141f80ff686e8a3227f97151df5251bc54ebf0e700519f766bfd1f98a8a4a6",
    "route_dijkstra.csv": "e931cd970915d0c878f40f0dc9070a19e84bbb98b86a6a93f09299342ff96c53",
    "route_metrics.csv": "d5bbfa5bdd2aea863e1dbf53744ee6035384e4b3315531d394cc0dd756d23a11",
    "route_slope_aware_astar.csv": "240fff90876e4b8f28f62dd4fbd5f33109db4182d10b137b8774d47c10149bcd",
    "slope_preliminary_deg.tif": "efb7c6f1fb357a2158d06c4f0212262ed804bee63040131af96f6fb565d58a1a",
    "terrain.obj": "55d567a78ccb8e3340a9c0ba2510d72e1027d7dd1353bc109072ca0d78c38df9",
    "texture.png": "b1dbd9deb8d772d73017c348fc4e58d98bb93da4cd4d0f039af621ba88a4876a",
    "threshold_test.csv": "01f4ba62db81074bc18e2da3ed1635380b546c55739f60d3f792ec3e60ca7207"
  }
}
```

### Source statistics: PASS

```json
{
  "vertices": 63001,
  "uv_records": 63001,
  "triangles": 125000
}
```

### OBJ single mesh: PASS

```json
null
```

### Blender import structure: PASS

```json
null
```

### Blender import: PASS

```json
{
  "vertices": 63001,
  "triangles": 125000,
  "max_position_error_m": 4.999999987376214e-07,
  "max_uv_error": 2.95639037695139e-08,
  "bounds": [
    [
      -249.5,
      -249.5,
      0.0
    ],
    [
      249.5,
      249.5,
      58.42236328125
    ]
  ],
  "oriented_topology_equal": true
}
```

### Identity terrain transform: PASS

```json
null
```

### UV material setup: PASS

```json
{
  "texture": "D:\\Github project\\Mars Map\\source-data\\JZ01_Codex_Handoff\\texture.png",
  "colorspace": "sRGB",
  "roughness": 0.94,
  "metallic": 0
}
```

### Astronaut terrain raycast: PASS

```json
{
  "surface": [
    -170.0,
    -130.0,
    44.601318359375
  ],
  "eye_height_m": 1.75
}
```

### Astronaut clearance: PASS

```json
null
```

### Tactical complete framing: PASS

```json
{
  "projected_bounds": [
    [
      0.1853737086057663,
      0.8034158945083618
    ],
    [
      0.08547192811965942,
      0.7811628580093384
    ]
  ]
}
```

### Blender scene saved: PASS

```json
"generated\\jz01\\JZ01_terrain_scene.blend"
```

### GLB exported: PASS

```json
"public\\assets\\mars\\jz01\\terrain.glb"
```

### GLB container: PASS

```json
null
```

### GLB terrain only: PASS

```json
null
```

### GLB single terrain instance: PASS

```json
null
```

### GLB primitive: PASS

```json
null
```

### Raw GLB Y-up coordinate and UV mapping: PASS

```json
{
  "vertices": 374356,
  "triangles": 125000,
  "max_position_error_m": 4.999999987376214e-07,
  "max_uv_error": 4.3869018528930326e-08,
  "bounds": [
    [
      -249.5,
      -249.5,
      0.0
    ],
    [
      249.5,
      249.5,
      58.42236328125
    ]
  ],
  "oriented_topology_equal": true
}
```

### Embedded texture unchanged: PASS

```json
{
  "mime": "image/png",
  "bytes": 1771688
}
```

### GLB PBR material: PASS

```json
{
  "baseColorTexture": {
    "index": 0
  },
  "metallicFactor": 0,
  "roughnessFactor": 0.9399999976158142
}
```

### tactical_preview: PASS

```json
"D:\\Github project\\Mars Map\\docs\\jz01\\screenshots\\tactical_preview.png"
```

### astronaut_preview: PASS

```json
"D:\\Github project\\Mars Map\\docs\\jz01\\screenshots\\astronaut_preview.png"
```

### GLB re-import single mesh: PASS

```json
null
```

### GLB re-import structure: PASS

```json
null
```

### GLB re-import: PASS

```json
{
  "vertices": 374356,
  "triangles": 125000,
  "max_position_error_m": 4.999999987376214e-07,
  "max_uv_error": 4.3869018528930326e-08,
  "bounds": [
    [
      -249.5,
      -249.5,
      0.0
    ],
    [
      249.5,
      249.5,
      58.42236328125
    ]
  ],
  "oriented_topology_equal": true
}
```

### Re-import texture: PASS

```json
null
```

### Inputs unchanged after build: PASS

```json
null
```

## Errors and unresolved checks

No build errors recorded.

- PENDING: Three.js browser runtime orientation, controls and GPU performance
- PENDING: Independent reproduction of crop from upstream full mosaic
- PENDING: Exact concept screenshot comparison: original reference images not supplied

Raw GLB world-space positions were compared using `(obj.x, obj.z, -obj.y)`. Blender re-import was compared in Blender Z-up world space. Topology comparisons tolerate vertex reordering/splitting and preserve triangle winding. UV checks account for the glTF V convention. Embedded image SHA-256 must equal the original PNG; no mirror/flip transform is allowed. This does not independently prove browser runtime orientation.

| Validation | Status |
|---|---|
| Input integrity | PASS |
| Blender import | PASS |
| Source geometry preserved | PASS |
| UV/material setup | PASS |
| Blender scene saved | PASS |
| GLB exported | PASS |
| GLB re-import | PASS |
| Coordinate alignment (asset space) | PASS |
| Tactical preview | PASS |
| Astronaut preview | PASS |
| Coordinate alignment (Three.js browser runtime) | PENDING |
