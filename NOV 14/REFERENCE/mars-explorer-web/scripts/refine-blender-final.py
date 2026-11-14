"""Refine the existing observed terrain scene with an independently credited CC0 scan."""
import bpy,os,json,math,array
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'public','assets','mars')
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'blender','mars-explorer-real-jezero.blend'))
scene=bpy.context.scene
observed=[o for o in scene.objects if o.name.startswith('Observed_')]
signatures={o.name:(len(o.data.vertices),sum(v.co.z for v in o.data.vertices)) for o in observed}
for o in scene.objects:
    if o.type=='MESH' and not o.name.startswith('Observed_'):o.hide_render=True
before=set(bpy.data.objects)
raw_scan=os.path.join(ROOT,'scripts','.cache','photoscan','namaqualand_boulder_02_2k.gltf')
bpy.ops.import_scene.gltf(filepath=raw_scan if os.path.isfile(raw_scan) else os.path.join(OUT,'rock-photoscan.glb'))
parts=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
parts.sort(key=lambda o:len(o.data.polygons),reverse=True)
# Keep only the highest-resolution scan if a source includes coincident LOD variants.
for extra in parts[1:]:bpy.data.objects.remove(extra,do_unlink=True)
parts=parts[:1]
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
if len(parts)>1:bpy.ops.object.join()
rock=bpy.context.object;rock.name='Photo_scanned_rock_visual_reconstruction'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
coords=[v.co.copy() for v in rock.data.vertices]
lo=Vector(tuple(min(v[i] for v in coords) for i in range(3)));hi=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
scale=2/max(hi.x-lo.x,hi.y-lo.y,hi.z-lo.z)
for v in rock.data.vertices:v.co=(v.co-Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z)))*scale
for m in rock.data.materials:
    if not m.use_nodes:continue
    bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if bs:bs.inputs['Metallic'].default_value=0
rock['asset_source']='Poly Haven namaqualand_boulder_02, CC0';rock['scientific_status']='visual reconstruction; not a NASA specimen'
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'rock-photoscan.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT',export_yup=True)
for o in observed:
    assert signatures[o.name]==(len(o.data.vertices),sum(v.co.z for v in o.data.vertices)),'Observed geometry changed'

camera=scene.camera;camera.location=(3.1,-4.1,2.8);camera.rotation_euler=(Vector((0,0,.65))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=52
for o in observed:o.hide_render=True
rock.hide_render=False;rock.location=(0,0,0);rock.rotation_euler=(.1,.2,.2)
scene.render.film_transparent=True;scene.render.resolution_x=480;scene.render.resolution_y=480;scene.cycles.samples=48
scene.render.filepath=os.path.join(OUT,'basalt-preview.png');bpy.ops.render.render(write_still=True)
rock.hide_render=True
for o in observed:o.hide_render=False
scene.render.film_transparent=False
# Lay out photo-scanned hero stones on the exact observed surface, with a ground raycast.
positions=[(-3.2,66.5,1.05),(4.1,63,.7),(-6.2,58,1.25),(7.5,50,.75),(-10,42,1.1),(11,22,.9)]
deps=bpy.context.evaluated_depsgraph_get()
for i,(x,z,s) in enumerate(positions):
    hit,loc,*_=scene.ray_cast(deps,Vector((x,-z,500)),Vector((0,0,-1)))
    obj=rock.copy();obj.data=rock.data;scene.collection.objects.link(obj);obj.name=f'Surface_scan_prop_{i:02d}';obj.hide_render=False;obj.location=(x,-z,loc.z if hit else 0);obj.scale=(s,s,s);obj.rotation_euler=(0,0,i*.83)
field=json.load(open(os.path.join(OUT,'field-site.json')))
meta=json.load(open(os.path.join(OUT,'ground.json')))
a=array.array('f');a.frombytes(open(os.path.join(OUT,'hirise-heights.bin'),'rb').read())
eye=a[(70+256)*513+256]-meta['elevationOrigin']+1.75
camera.location=(0,-70,eye);camera.rotation_euler=(Vector((0,530,eye-57))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=28
scene.render.resolution_x=960;scene.render.resolution_y=540;scene.cycles.samples=32;scene.render.filepath=os.path.join(OUT,'mission-preview.png');bpy.ops.render.render(write_still=True)
scene.render.resolution_x=1920;scene.render.resolution_y=1080
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'blender','mars-explorer-final.blend'))
p=json.load(open(os.path.join(OUT,'provenance.json')));p['visualDetailSources']=json.load(open(os.path.join(OUT,'pbr-credits.json')));p['refinement']='Photo-scanned PBR detail. Observed terrain vertex count and coordinate sums verified unchanged.'
json.dump(p,open(os.path.join(OUT,'provenance.json'),'w'),indent=2)
print('FINAL_BLENDER_ASSETS_READY; OBSERVED_TERRAIN_UNCHANGED')
