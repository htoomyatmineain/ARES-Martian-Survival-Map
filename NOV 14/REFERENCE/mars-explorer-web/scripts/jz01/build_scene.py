"""Reproducible JZ-01 build. Run with Blender --background --factory-startup --python.

Only new JZ-01 outputs are written; the handoff is immutable. No mesh modifiers,
resampling, displacement, or axis corrections are applied after import.
"""
from pathlib import Path
from collections import Counter
import hashlib
import json
import math
import struct
import traceback
import bpy
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'source-data/JZ01_Codex_Handoff'
OUT = ROOT / 'generated/jz01'
DOC = ROOT / 'docs/jz01'
GLB = ROOT / 'public/assets/mars/jz01/terrain.glb'
BLEND = OUT / 'JZ01_terrain_scene.blend'
COMMAND = '& "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" --background --factory-startup --python scripts/jz01/build_scene.py'
RESULT = {'command': COMMAND, 'blender': bpy.app.version_string, 'checks': {}, 'errors': [],
          'pending': ['Three.js browser runtime orientation, controls and GPU performance',
                      'Independent reproduction of crop from upstream full mosaic',
                      'Exact concept screenshot comparison: original reference images not supplied']}


def check(name, condition, detail=None):
    RESULT['checks'][name] = {'status': 'PASS' if condition else 'FAIL', 'detail': detail}
    print('JZ01_CHECK', name, RESULT['checks'][name], flush=True)
    if not condition:
        raise RuntimeError(name + ': ' + str(detail))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_mesh():
    vertices, uvs, faces = [], [], []
    for line in (SOURCE / 'terrain.obj').read_text().splitlines():
        a = line.split()
        if not a:
            continue
        if a[0] == 'v':
            vertices.append(tuple(map(float, a[1:4])))
        elif a[0] == 'vt':
            uvs.append(tuple(map(float, a[1:3])))
        elif a[0] == 'f':
            faces.append([(int(t.split('/')[0])-1, int(t.split('/')[1])-1) for t in a[1:]])
    return np.array(vertices), np.array(uvs), faces


def cycle(ids):
    return min(tuple(ids[i:] + ids[:i]) for i in range(3))


def verify_geometry(name, positions, triangles, corner_uvs):
    """Match source sample IDs, oriented triangles and corner UVs, not vertex order."""
    ids = []
    max_error = 0.0
    for p in positions:
        key = (round(float(p[0])*1000), round(float(p[1])*1000))
        if key not in SOURCE_IDS:
            check(name, False, {'unmatched_xy': list(map(float, p))})
        idx = SOURCE_IDS[key]
        max_error = max(max_error, float(np.max(np.abs(p - VERTICES[idx]))))
        ids.append(idx)
    topology = Counter(cycle([ids[i] for i in tri]) for tri in triangles)
    max_uv = 0.0
    for tri, coords in zip(triangles, corner_uvs):
        for i, uv in zip(tri, coords):
            max_uv = max(max_uv, float(np.max(np.abs(np.asarray(uv)-UV_BY_VERTEX[ids[i]]))))
    detail = {'vertices': len(positions), 'triangles': len(triangles),
              'max_position_error_m': max_error, 'max_uv_error': max_uv,
              'bounds': np.array([np.min(positions, axis=0), np.max(positions, axis=0)]).tolist(),
              'oriented_topology_equal': topology == SOURCE_TOPOLOGY}
    check(name, max_error <= 0.00002 and max_uv <= 0.000002 and topology == SOURCE_TOPOLOGY
          and len(set(ids)) == len(VERTICES), detail)


def verify_blender(name, obj):
    mesh = obj.data
    check(name + ' structure', len(mesh.polygons) == 125000 and all(len(p.vertices)==3 for p in mesh.polygons)
          and not obj.modifiers and mesh.uv_layers.active is not None)
    positions = np.array([tuple(obj.matrix_world @ v.co) for v in mesh.vertices])
    triangles = [list(p.vertices) for p in mesh.polygons]
    coords = [[tuple(mesh.uv_layers.active.data[i].uv) for i in p.loop_indices] for p in mesh.polygons]
    verify_geometry(name, positions, triangles, coords)


def inspect_glb():
    data = GLB.read_bytes()
    magic, version, total = struct.unpack_from('<III', data)
    check('GLB container', magic == 0x46546C67 and version == 2 and total == len(data))
    jl, jt = struct.unpack_from('<II', data, 12)
    doc = json.loads(data[20:20+jl])
    offset = 20+jl
    bl, bt = struct.unpack_from('<II', data, offset)
    binary = data[offset+8:offset+8+bl]
    check('GLB terrain only', len(doc.get('meshes', [])) == 1 and not doc.get('cameras')
          and 'KHR_lights_punctual' not in doc.get('extensionsUsed', []))

    def accessor(index):
        a = doc['accessors'][index]; view = doc['bufferViews'][a['bufferView']]
        dtype = {5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
        n = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
        start = view.get('byteOffset',0)+a.get('byteOffset',0)
        item = np.dtype(dtype).itemsize
        return np.ndarray((a['count'],n), dtype=dtype, buffer=binary, offset=start,
                          strides=(view.get('byteStride',item*n),item)).copy()

    mesh_nodes = []
    def walk(i, parent):
        node = doc['nodes'][i]
        if 'matrix' in node:
            mat = Matrix(np.array(node['matrix']).reshape(4,4).T.tolist())
        else:
            r = node.get('rotation',[0,0,0,1])
            mat = Matrix.LocRotScale(Vector(node.get('translation',[0,0,0])),
                 Quaternion((r[3],r[0],r[1],r[2])),Vector(node.get('scale',[1,1,1])))
        world = parent @ mat
        if 'mesh' in node:
            mesh_nodes.append((node, world))
        for child in node.get('children',[]):
            walk(child,world)
    for i in doc['scenes'][doc.get('scene',0)]['nodes']:
        walk(i,Matrix.Identity(4))
    check('GLB single terrain instance', len(mesh_nodes)==1)
    node, world = mesh_nodes[0]
    primitives = doc['meshes'][node['mesh']]['primitives']
    check('GLB primitive',len(primitives)==1 and primitives[0].get('mode',4)==4)
    p = primitives[0]
    local = accessor(p['attributes']['POSITION'])
    world_positions = np.array([tuple(world @ Vector(v)) for v in local])
    # Invert expected glTF conversion only for source-space comparison.
    source_positions = world_positions[:,[0,2,1]].copy(); source_positions[:,1] *= -1
    indices = accessor(p['indices']).reshape(-1,3).tolist()
    uv = accessor(p['attributes']['TEXCOORD_0']); uv[:,1] = 1-uv[:,1]
    verify_geometry('Raw GLB Y-up coordinate and UV mapping',source_positions,indices,
                    [[uv[i] for i in tri] for tri in indices])
    mat = doc['materials'][p['material']]
    pbr = mat['pbrMetallicRoughness']
    texture = doc['textures'][pbr['baseColorTexture']['index']]
    im = doc['images'][texture['source']]
    view = doc['bufferViews'][im['bufferView']]
    embedded = binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
    check('Embedded texture unchanged',hashlib.sha256(embedded).hexdigest()==digest(SOURCE/'texture.png'),
          {'mime':im.get('mimeType'),'bytes':len(embedded)})
    check('GLB PBR material',mat['name']=='JZ01_Mars_Surface' and pbr.get('metallicFactor',1)==0
          and pbr.get('roughnessFactor',1)>=0.8 and not mat.get('normalTexture')
          and not pbr['baseColorTexture'].get('extensions'),pbr)
    RESULT['glb_bytes'] = len(data)


def camera(name, position, target, collection, lens):
    obj = bpy.data.objects.new(name,bpy.data.cameras.new(name)); collection.objects.link(obj)
    obj.location = position
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    obj.data.lens=lens; obj.data.clip_start=.05; obj.data.clip_end=5000
    return obj


def build():
    global VERTICES, UV_BY_VERTEX, SOURCE_IDS, SOURCE_TOPOLOGY
    check('Blender version', bpy.app.version[:3] == (5,2,3))
    manifest = json.loads((SOURCE/'manifest.json').read_text())
    before = {p.name:digest(p) for p in SOURCE.iterdir() if p.is_file()}
    check('Input integrity', len(before)==17 and all(before.get(k)==v for k,v in manifest['files_sha256'].items()),
          {'files':17,'supplied_hashes':len(manifest['files_sha256']),'hashes':before})
    VERTICES, uvs, faces = source_mesh()
    check('Source statistics', len(VERTICES)==63001 and len(uvs)==63001 and len(faces)==125000
          and all(len(f)==3 for f in faces), {'vertices':len(VERTICES),'uv_records':len(uvs),'triangles':len(faces)})
    UV_BY_VERTEX = {}; SOURCE_IDS = {(round(v[0]*1000),round(v[1]*1000)):i for i,v in enumerate(VERTICES)}
    for face in faces:
        for vi,ti in face:
            if vi in UV_BY_VERTEX:
                assert np.array_equal(UV_BY_VERTEX[vi],uvs[ti])
            UV_BY_VERTEX[vi]=uvs[ti]
    SOURCE_TOPOLOGY = Counter(cycle([v for v,t in f]) for f in faces)
    for folder in [OUT,DOC/'screenshots',GLB.parent]:
        folder.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene
    scene.unit_settings.system='METRIC'; scene.unit_settings.scale_length=1.0
    collections={n:bpy.data.collections.new(n) for n in ['DATA_Terrain','SIM_Props','Cameras','Lights']}
    for collection in collections.values(): scene.collection.children.link(collection)
    # Y forward, Z up maps this native Blender-oriented OBJ without a rotation.
    bpy.ops.wm.obj_import(filepath=str(SOURCE/'terrain.obj'),forward_axis='Y',up_axis='Z',global_scale=1.0,
                          use_split_objects=False,use_split_groups=False,validate_meshes=True)
    meshes=[o for o in scene.objects if o.type=='MESH']
    check('OBJ single mesh',len(meshes)==1)
    terrain=meshes[0];terrain.name='JZ01_Scientific_Terrain'
    for c in list(terrain.users_collection): c.objects.unlink(terrain)
    collections['DATA_Terrain'].objects.link(terrain)
    bpy.context.view_layer.update()
    verify_blender('Blender import',terrain)
    check('Identity terrain transform',np.allclose(np.array(terrain.matrix_world),np.eye(4),atol=1e-8))
    material=bpy.data.materials.new('JZ01_Mars_Surface');material.use_nodes=True
    nodes=material.node_tree.nodes; bsdf=nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value=0;bsdf.inputs['Roughness'].default_value=.94
    image=bpy.data.images.load(str(SOURCE/'texture.png'),check_existing=False)
    image.colorspace_settings.name='sRGB'
    tex=nodes.new('ShaderNodeTexImage');tex.image=image;tex.interpolation='Linear';tex.extension='EXTEND'
    uvnode=nodes.new('ShaderNodeUVMap');uvnode.uv_map=terrain.data.uv_layers.active.name
    material.node_tree.links.new(uvnode.outputs['UV'],tex.inputs['Vector'])
    material.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    terrain.data.materials.clear();terrain.data.materials.append(material)
    check('UV material setup',list(image.size)==[2000,2000] and len(material.node_tree.links)==3
          and not terrain.modifiers,{'texture':str(SOURCE/'texture.png'),'colorspace':'sRGB','roughness':.94,'metallic':0})
    terrain['source_doi']=manifest['source_doi']; terrain['source_sha256']=before['terrain.obj']
    terrain['coordinate_contract']='Blender X east, Y north, Z up; meters; glTF (x,z,-y)'
    terrain['elevation_offset_m']=manifest['elevation_offset_m']
    scene['presentation']='Warm light is illustrative. Original grayscale orbital image; no invented terrain or props.'
    world=bpy.data.worlds.new('Illustrative Mars ambient');world.use_nodes=True;scene.world=world
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.34,.24,.19,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
    light=bpy.data.lights.new('Illustrative warm sunlight','SUN');light.energy=2.8
    light.color=(1.0,.73,.51);light.angle=math.radians(3)
    sun=bpy.data.objects.new(light.name,light);collections['Lights'].objects.link(sun)
    sun.rotation_euler=Vector((-.6,.4,-.7)).to_track_quat('-Z','Y').to_euler()
    tactical=camera('TacticalCamera',(730,-860,760),(0,0,25),collections['Cameras'],42)
    origin=Vector((-170,-130,200))
    hit,loc,normal,idx=terrain.ray_cast(origin,Vector((0,0,-1)))
    check('Astronaut terrain raycast',hit,{'surface':list(loc),'eye_height_m':1.75})
    eye=loc+Vector((0,0,1.75))
    astronaut=camera('AstronautPreviewCamera',eye,(180,210,eye.z-8),collections['Cameras'],28)
    check('Astronaut clearance',abs(astronaut.location.z-loc.z-1.75)<1e-5)
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24
    scene.cycles.use_denoising=True
    scene.render.resolution_x=960;scene.render.resolution_y=540;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    scene.view_settings.view_transform='AgX'
    scene.camera=tactical
    bpy.context.view_layer.update()
    projections=[world_to_camera_view(scene,tactical,terrain.matrix_world@Vector(c)) for c in terrain.bound_box]
    check('Tactical complete framing',all(.025<p.x<.975 and .025<p.y<.975 and p.z>0 for p in projections),
          {'projected_bounds':[[float(min(p[i] for p in projections)),float(max(p[i] for p in projections))] for i in range(2)]})
    image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    check('Blender scene saved',BLEND.is_file(),str(BLEND.relative_to(ROOT)))
    bpy.ops.object.select_all(action='DESELECT');terrain.select_set(True);bpy.context.view_layer.objects.active=terrain
    bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',use_selection=True,export_yup=True,
                              export_materials='EXPORT',export_cameras=False,export_lights=False,
                              export_animations=False,export_extras=True)
    check('GLB exported',GLB.is_file(),str(GLB.relative_to(ROOT)))
    inspect_glb()
    for name,cam in [('tactical_preview',tactical),('astronaut_preview',astronaut)]:
        scene.camera=cam;scene.render.filepath=str(DOC/'screenshots'/f'{name}.png')
        bpy.ops.render.render(write_still=True)
        check(name,(DOC/'screenshots'/f'{name}.png').is_file(),scene.render.filepath)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(GLB))
    bpy.context.view_layer.update()
    imported=[o for o in bpy.context.scene.objects if o.type=='MESH']
    check('GLB re-import single mesh',len(imported)==1)
    verify_blender('GLB re-import',imported[0])
    imported_images=[n.image for m in imported[0].data.materials for n in m.node_tree.nodes
                     if n.type=='TEX_IMAGE' and n.image]
    check('Re-import texture',len(imported_images)==1 and list(imported_images[0].size)==[2000,2000])
    check('Inputs unchanged after build',before=={p.name:digest(p) for p in SOURCE.iterdir() if p.is_file()})


def report():
    DOC.mkdir(parents=True,exist_ok=True)
    (DOC/'validation.json').write_text(json.dumps(RESULT,indent=2),encoding='utf-8')
    checks=RESULT['checks']
    status=lambda key: checks.get(key,{}).get('status','NOT RUN')
    lines=['# JZ-01 Blender build report','',f"Blender: **{RESULT['blender']}**",'',
           '## Exact build command','', '```powershell',COMMAND,'```','',
           '## Scientific preservation','',
           'Source: `source-data/JZ01_Codex_Handoff/`. 500 m raster footprint; 499 m mesh sample-center span. '
           'No resampling, deformation, smoothing, displacement, scale correction or simulated props. '
           'Warm sunlight and ambient illumination are illustrative, not calibrated Mars color.', '',
           'Original UVs drive the original grayscale image directly through Principled BSDF; roughness 0.94, metallic 0. '
           'Packed editable texture and embedded GLB texture. Cameras and lights excluded from terrain GLB.', '',
           '## Output paths','',f'- `{BLEND.relative_to(ROOT).as_posix()}`',f'- `{GLB.relative_to(ROOT).as_posix()}`',
           '- `docs/jz01/screenshots/tactical_preview.png`','- `docs/jz01/screenshots/astronaut_preview.png`',
           '- `docs/jz01/validation.json` (complete input SHA-256 inventory and numerical results)','',
           '## Executed checks','']
    for name,result in checks.items():
        lines += [f"### {name}: {result['status']}",'','```json',json.dumps(result['detail'],indent=2),'```','']
    lines += ['## Errors and unresolved checks','']
    lines += ['- '+e for e in RESULT['errors']] if RESULT['errors'] else ['No build errors recorded.']
    lines += ['']+['- PENDING: '+x for x in RESULT['pending']]
    lines += ['', 'Raw GLB world-space positions were compared using `(obj.x, obj.z, -obj.y)`. '
              'Blender re-import was compared in Blender Z-up world space. Topology comparisons tolerate '
              'vertex reordering/splitting and preserve triangle winding. UV checks account for the glTF V convention. '
              'Embedded image SHA-256 must equal the original PNG; no mirror/flip transform is allowed. '
              'This does not independently prove browser runtime orientation.', '',
              '| Validation | Status |','|---|---|']
    rows=[('Input integrity','Input integrity'),('Blender import','Blender import'),
          ('Source geometry preserved','Blender import'),('UV/material setup','UV material setup'),
          ('Blender scene saved','Blender scene saved'),('GLB exported','GLB exported'),
          ('GLB re-import','GLB re-import'),('Coordinate alignment (asset space)','Raw GLB Y-up coordinate and UV mapping'),
          ('Tactical preview','tactical_preview'),('Astronaut preview','astronaut_preview')]
    lines += [f'| {label} | {status(key)} |' for label,key in rows]
    lines += ['| Coordinate alignment (Three.js browser runtime) | PENDING |','']
    (DOC/'blender_build_report.md').write_text('\n'.join(lines),encoding='utf-8')


if __name__=='__main__':
    try:
        build()
    except Exception:
        RESULT['errors'].append(traceback.format_exc())
        raise
    finally:
        report()
