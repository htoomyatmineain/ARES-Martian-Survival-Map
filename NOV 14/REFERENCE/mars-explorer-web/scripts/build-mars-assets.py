"""Deterministic, isolated Blender asset build for the cinematic Mars Explorer.
The landscape is an artistic reconstruction; USGS science assets remain separate.
Run with blender --background --factory-startup --python scripts/build-mars-assets.py
"""
import bpy, math, random, os, json, array
from mathutils import Vector, noise

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'mars')
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(ROOT, 'blender'), exist_ok=True)
random.seed(2040)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.name = 'Mars Explorer — Jezero cinematic reconstruction'

def n(x, y, scale):
    return noise.noise_vector(Vector((x * scale, y * scale, 4.71)))[0]

def smooth(a):
    a = max(0, min(1, a))
    return a*a*(3-2*a)

def height(x, y):
    # Sculpted valley, layered mesa walls, ancient drainage channels.
    valley = 145 + max(y, 0) * .13 + 170*(1-smooth((y+40)/300)) + 20 * math.sin(y*.006)
    wall = smooth((abs(x + math.sin(y*.003)*28 + n(x,y,.022)*9) - valley) / 28)
    cap = 50 + 9*n(x,y,.008) + 4*n(x,y,.023)
    ledges = math.sin((wall * cap) * 1.35 + n(x,y,.013)*1.5) * wall * (1-wall) * 5
    ledges += (n(x,y,.11)*3+n(x,y,.24)*1.2)*wall
    low = 1.8*n(x,y,.014) + .65*n(x,y,.047) + .19*n(x,y,.14)
    channel = -1.5 * math.exp(-((x - math.sin(y*.009)*13)/24)**2)
    distant = smooth((y - 1000)/500) * (38+25*n(x,y,.003))
    return low + wall*cap + ledges + channel + distant

def material(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = .94
    return m

soil = material('Iron oxide regolith — weathered ochre', (.40, .14, .065))
nodes = soil.node_tree.nodes; links = soil.node_tree.links
bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
tex = nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = 3.4; tex.inputs['Detail'].default_value = 5
coord = nodes.new('ShaderNodeTexCoord'); links.new(coord.outputs['Generated'], tex.inputs['Vector'])
ramp = nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color=(.12,.035,.014,1); ramp.color_ramp.elements[1].color=(.57,.24,.115,1)
links.new(tex.outputs['Fac'], ramp.inputs[0]); links.new(ramp.outputs[0], bsdf.inputs['Base Color'])
bump=nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.35; bump.inputs['Distance'].default_value=.18
links.new(tex.outputs['Fac'],bump.inputs['Height']); links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])

def terrain_mesh(name, xmin, xmax, ymin, ymax, nx, ny, adaptive=False):
    verts=[]; colors=[]
    for j in range(ny):
        y=ymin+(ymax-ymin)*j/(ny-1)
        for i in range(nx):
            x=xmin+(xmax-xmin)*i/(nx-1)
            if adaptive:
                u=i/(nx-1)*2-1; v=abs(u); valley=145+max(y,0)*.13+170*(1-smooth((y+40)/300))+20*math.sin(y*.006)
                if v<.35: xx=v/.35*valley
                elif v<.55: xx=valley+(v-.35)/.2*65
                else: xx=valley+65+(v-.55)/.45*(1300-valley-65)
                x=xx*(1 if u>=0 else -1)-math.sin(y*.003)*28
            z=height(x,y)
            verts.append((x,y,z))
            shade=.80 + .14*n(x,y,.025) + .07*math.sin(z*1.1)
            colors.append((.55*shade,.255*shade,.14*shade,1))
    faces=[]
    for j in range(ny-1):
        for i in range(nx-1):
            a=j*nx+i
            if adaptive:
                cx=(verts[a][0]+verts[a+nx+1][0])*.5; cy=(verts[a][1]+verts[a+nx+1][1])*.5
                if -130<cx<130 and -110<cy<220: continue
            faces.append((a,a+1,a+nx+1,a+nx))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); scene.collection.objects.link(obj); obj.data.materials.append(soil)
    attr=mesh.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='POINT')
    for i,c in enumerate(colors): attr.data[i].color=c
    for p in mesh.polygons: p.use_smooth=True
    return obj

land=terrain_mesh('Jezero_cinematic_valley',-1300,1300,-180,2100,361,421,True)
# Fine foreground retains genuine geometry for rock shadows and camera movement.
near=terrain_mesh('Detailed_regolith_foreground',-140,140,-120,230,281,351)
with open(os.path.join(OUT,'ground.bin'),'wb') as f:
    array.array('f',[height(-1300+2600*i/360,-180+2280*j/420) for j in range(421) for i in range(361)]).tofile(f)
with open(os.path.join(OUT,'ground.json'),'w') as f:
    json.dump({'width':361,'height':421,'xmin':-1300,'xmax':1300,'ymin':-180,'ymax':2100},f)

def export(objects, filename):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,filename),export_format='GLB',use_selection=True,export_materials='EXPORT',export_yup=True)

export([land,near], 'jezero-landscape.glb')
rocks=[]
for i in range(12):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4,radius=1,location=(i*4,0,-200))
    rock=bpy.context.object; rock.name=f'basalt_{i:02d}'
    for v in rock.data.vertices:
        q=v.co.copy(); rough=noise.noise_vector(q*3.7+Vector((i*11.7,1,3)))[0]
        layered=math.sin(q.z*28+i+q.x*3)*.045
        fine=noise.noise_vector(q*12+Vector((i*3.4,1,3)))[0]*.065
        v.co *= 1 + rough*.35 + layered + fine
        v.co.x *= 1.25 + random.random()*.08
        v.co.y *= .8
        v.co.z *= .62 + i*.023
        if v.co.z < -.38: v.co.z = -.38 + (v.co.z+.38)*.15
    rock.data.update()
    for p in rock.data.polygons: p.use_smooth = False
    mat=material(f'Basalt patina {i:02d}',(.31+i*.008,.105+i*.003,.045+i*.002))
    rock.data.materials.append(mat)
    ns=mat.node_tree.nodes; ls=mat.node_tree.links
    bs=next(node for node in ns if node.type=='BSDF_PRINCIPLED')
    tx=ns.new('ShaderNodeTexNoise'); tx.inputs['Scale'].default_value=7; tx.inputs['Detail'].default_value=6
    cr=ns.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].position=.2; cr.color_ramp.elements[0].color=(.035,.009,.003,1); cr.color_ramp.elements[1].position=.8; cr.color_ramp.elements[1].color=(.37,.12,.035,1)
    ls.new(tx.outputs['Fac'],cr.inputs[0]); ls.new(cr.outputs[0],bs.inputs['Base Color'])
    bp=ns.new('ShaderNodeBump'); bp.inputs['Strength'].default_value=.5; bp.inputs['Distance'].default_value=.13
    ls.new(tx.outputs['Fac'],bp.inputs['Height']); ls.new(bp.outputs[0],bs.inputs['Normal'])
    rocks.append(rock)
export(rocks,'basalt-library.glb')

# A separately rendered specimen thumbnail uses the very same exported geometry.
hero=rocks[3].copy(); hero.data=rocks[3].data.copy(); scene.collection.objects.link(hero)
hero.name='Basaltic specimen — scan target'; hero.location=(0,0,2.3); hero.rotation_euler=(.4,.25,.3)
scene.world.color=(.10,.06,.045)
world=bpy.data.worlds.new('Dust-lit Martian sky'); world.use_nodes=True; scene.world=world
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND'); bg.inputs[0].default_value=(.32,.14,.08,1); bg.inputs[1].default_value=.3
sun_data=bpy.data.lights.new('Low afternoon sun','SUN'); sun=bpy.data.objects.new('Low afternoon sun',sun_data); scene.collection.objects.link(sun)
sun.rotation_euler=(math.radians(38),math.radians(-22),math.radians(-42)); sun_data.energy=3; sun_data.angle=.09
area_data=bpy.data.lights.new('Sky fill','AREA'); area=bpy.data.objects.new('Sky fill',area_data); scene.collection.objects.link(area); area.location=(1,-4,6); area_data.energy=550; area_data.shape='DISK'; area_data.size=5
camera_data=bpy.data.cameras.new('Cinematic ground camera'); camera=bpy.data.objects.new('Cinematic ground camera',camera_data); scene.collection.objects.link(camera); scene.camera=camera
def look_at(obj, p): obj.rotation_euler=(Vector(p)-obj.location).to_track_quat('-Z','Y').to_euler()
try: scene.render.engine='CYCLES'
except TypeError: pass
scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.render.image_settings.file_format='PNG'
scene.render.resolution_percentage=100
scene.render.film_transparent=True
land.hide_render=True; near.hide_render=True
camera.location=(3,-4,4); look_at(camera,(0,0,2.3)); camera_data.lens=52
scene.render.resolution_x=320; scene.render.resolution_y=320
scene.render.filepath=os.path.join(OUT,'basalt-preview.png'); bpy.ops.render.render(write_still=True)
hero.hide_render=True; land.hide_render=False; near.hide_render=False
scene.render.film_transparent=False
camera.location=(0,-70,5.8); look_at(camera,(0,400,25)); camera_data.lens=28
scene.render.resolution_x=960; scene.render.resolution_y=540
scene.render.filepath=os.path.join(OUT,'mission-preview.png'); bpy.ops.render.render(write_still=True)
scene.render.resolution_x=1920; scene.render.resolution_y=1080
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'blender','mars-explorer.blend'))
with open(os.path.join(OUT,'provenance.json'),'w') as f:
    json.dump({'generator':'Blender '+bpy.app.version_string,'scene':'Jezero cinematic reconstruction','scientific':False,'seed':2040,'note':'Artistically sculpted terrain and basalt assets matching the user visual reference. Scientific CTX data is preserved in the separate mission workspace.','source':'scripts/build-mars-assets.py'},f,indent=2)
print('MARS_ASSETS_READY',OUT)
