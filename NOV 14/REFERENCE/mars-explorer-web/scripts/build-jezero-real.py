"""Blender import of real NASA/USGS HiRISE and CTX data; no invented elevation."""
import bpy, os, json, math, array, random
from mathutils import Vector, noise
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'public','assets','mars')
with open(os.path.join(OUT,'field-site.json')) as f: field=json.load(f)
with open(os.path.join(ROOT,'public','data','terrain.json'),encoding='utf8') as f: ctx=json.load(f)
def floats(path):
    a=array.array('f')
    with open(path,'rb') as f:a.frombytes(f.read())
    return a
ctx_values=floats(os.path.join(ROOT,'public','data','terrain.bin'))
hi_values=floats(os.path.join(OUT,'hirise-heights.bin'))
base=field['elevationOrigin']; theta=math.radians(field['heading']); cs=math.cos(theta); sn=math.sin(theta)
def interpolate(a,w,h,u,v):
    u=max(0,min(w-1.00001,u));v=max(0,min(h-1.00001,v));x=int(u);y=int(v);fx=u-x;fy=v-y
    return (a[y*w+x]*(1-fx)+a[y*w+x+1]*fx)*(1-fy)+(a[(y+1)*w+x]*(1-fx)+a[(y+1)*w+x+1]*fx)*fy
def source(x,y):return (field['sourceOffset']['x']+x*cs+y*sn,field['sourceOffset']['z']+x*sn-y*cs)
def ctx_height(x,y):
    a,b=source(x,y)
    if abs(a)>5000 or abs(b)>5000:raise ValueError('Requested location outside scientific CTX coverage')
    return interpolate(ctx_values,ctx['width'],ctx['height'],(a/10000+.5)*500,(b/10000+.5)*500)
def height(x,y):
    original=ctx_height(x,y); edge=min(256-abs(x),256-abs(y))
    if edge<=0:return original-base
    hi=interpolate(hi_values,513,513,x+256,256-y)
    w=max(0,min(1,edge/20));w=w*w*(3-2*w)
    return original*(1-w)+hi*w-base

bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.name='Jezero — real HiRISE field site'
def pbr(name,color):
    m=bpy.data.materials.new(name);m.use_nodes=True
    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=.94
    return m
def terrain_material(name,path):
    m=pbr(name,(.45,.24,.14));ns=m.node_tree.nodes;ls=m.node_tree.links;bs=next(n for n in ns if n.type=='BSDF_PRINCIPLED')
    image=ns.new('ShaderNodeTexImage');image.image=bpy.data.images.load(path);image.extension='EXTEND'
    mix=ns.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(.68,.37,.24,1)
    ls.new(image.outputs['Color'],mix.inputs[1]);ls.new(mix.outputs[0],bs.inputs['Base Color'])
    return m
far_mat=terrain_material('CTX orbital image — presentation tint',os.path.join(ROOT,'public','data','ortho.jpg'))
near_mat=terrain_material('HiRISE 25cm orbital image — presentation tint',os.path.join(OUT,'hirise-ortho.jpg'))
def make_terrain(name,x0,x1,y0,y1,nx,ny,near=False):
    verts=[];faces=[];uvs=[]
    for j in range(ny):
        y=y0+(y1-y0)*j/(ny-1)
        for i in range(nx):
            x=x0+(x1-x0)*i/(nx-1);verts.append((x,y,height(x,y)))
            if near:uvs.append(((x+512)/1024,(y+512)/1024))
            else:
                a,b=source(x,y);uvs.append(((a+5000)/10000,(5000-b)/10000))
    for j in range(ny-1):
        for i in range(nx-1):
            a=j*nx+i;cx=(verts[a][0]+verts[a+nx+1][0])*.5;cy=(verts[a][1]+verts[a+nx+1][1])*.5
            if not near and abs(cx)<260 and abs(cy)<260:continue
            faces.append((a,a+1,a+nx+1,a+nx))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();uv=mesh.uv_layers.new(name='Orbital_image')
    for loop in mesh.loops:uv.data[loop.index].uv=uvs[loop.vertex_index]
    for p in mesh.polygons:p.use_smooth=True
    obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);obj.data.materials.append(near_mat if near else far_mat)
    obj['data_source']='NASA/MRO HiRISE 1m DTM with CTX 20m context' if near else 'NASA/MRO CTX 20m DEM'
    obj['vertical_exaggeration']=1.0
    return obj
far=make_terrain('Observed_CTX_context',-2200,2200,-1600,2000,221,181)
near=make_terrain('Observed_HiRISE_1m_surface',-280,280,-280,280,561,561,True)
def export(objects,name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name),export_format='GLB',use_selection=True,export_materials='NONE',export_yup=True)
export([far,near],'jezero-landscape.glb')
# Browser collision grid uses the same physical elevations, not an invented flat floor.
ground=array.array('f',[height(-2200+4400*i/220,-1600+3600*j/180) for j in range(181) for i in range(221)])
with open(os.path.join(OUT,'ground.bin'),'wb') as f:ground.tofile(f)
with open(os.path.join(OUT,'ground.json'),'w') as f:json.dump({'width':221,'height':181,'xmin':-2200,'xmax':2200,'ymin':-1600,'ymax':2000,'elevationOrigin':base,'center':field['center'],'heading':field['heading'],'detail':{'width':513,'height':513,'size':512,'file':'hirise-heights.bin'},'source':'NASA/MRO HiRISE + CTX','verticalExaggeration':1},f,indent=2)

# Small foreground rock props are explicit reconstruction, not claimed rover measurements.
random.seed(9051);rocks=[]
for i in range(12):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4,radius=1,location=(i*4,0,-500));rock=bpy.context.object;rock.name=f'basalt_{i:02d}'
    cuts=[(Vector((random.uniform(-1,1),random.uniform(-1,1),random.uniform(-1,1))).normalized(),random.uniform(.65,.94)) for _ in range(5)]
    for v in rock.data.vertices:
        q=v.co.copy();rough=noise.noise_vector(q*2.3+Vector((i*11,1,3)))[0];fine=noise.noise_vector(q*8.4+Vector((i*4,2,1)))[0]
        v.co*=1+rough*.19+fine*.045
        for normal,dist in cuts:
            excess=v.co.dot(normal)-dist
            if excess>0:v.co-=normal*excess
        v.co.x*=1.05+random.random()*.035;v.co.y*=.82;v.co.z*=.74+i*.012
        v.co.z=max(v.co.z,-.48)
    for poly in rock.data.polygons:poly.use_smooth=False
    mat=pbr('Reconstructed basalt patina',(.24,.11,.065));ns=mat.node_tree.nodes;ls=mat.node_tree.links;bs=next(n for n in ns if n.type=='BSDF_PRINCIPLED')
    tx=ns.new('ShaderNodeTexNoise');tx.inputs['Scale'].default_value=15;tx.inputs['Detail'].default_value=5
    ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.045,.026,.016,1);ramp.color_ramp.elements[1].color=(.32,.16,.075,1)
    ls.new(tx.outputs['Fac'],ramp.inputs[0]);ls.new(ramp.outputs[0],bs.inputs['Base Color'])
    bump=ns.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.28;bump.inputs['Distance'].default_value=.035
    ls.new(tx.outputs['Fac'],bump.inputs['Height']);ls.new(bump.outputs[0],bs.inputs['Normal'])
    rock.data.materials.append(mat);rocks.append(rock)
export(rocks,'basalt-library.glb')
hero=rocks[3].copy();hero.data=rocks[3].data.copy();scene.collection.objects.link(hero);hero.location=(0,0,2.3);hero.rotation_euler=(.4,.25,.3)
world=bpy.data.worlds.new('Dust-scattered daylight');world.use_nodes=True;scene.world=world
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.25,.17,.14,1);bg.inputs[1].default_value=.5
sun_data=bpy.data.lights.new('Sun','SUN');sun=bpy.data.objects.new('Sun',sun_data);scene.collection.objects.link(sun);sun.rotation_euler=(.65,-.4,-.8);sun_data.energy=3;sun_data.angle=.05
area_data=bpy.data.lights.new('Sky fill','AREA');area=bpy.data.objects.new('Sky fill',area_data);scene.collection.objects.link(area);area.location=(1,-4,6);area_data.energy=450;area_data.size=5
camera_data=bpy.data.cameras.new('Ground observer');camera=bpy.data.objects.new('Ground observer',camera_data);scene.collection.objects.link(camera);scene.camera=camera
def look(p):camera.rotation_euler=(Vector(p)-camera.location).to_track_quat('-Z','Y').to_euler()
try:scene.render.engine='CYCLES'
except TypeError:pass
scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
far.hide_render=True;near.hide_render=True;camera.location=(3,-4,4);look((0,0,2.3));camera_data.lens=52
scene.render.resolution_x=320;scene.render.resolution_y=320;scene.render.filepath=os.path.join(OUT,'basalt-preview.png');bpy.ops.render.render(write_still=True)
hero.hide_render=True;far.hide_render=False;near.hide_render=False;scene.render.film_transparent=False;camera.location=(0,-70,height(0,-70)+1.75);look((0,530,camera.location.z-75));camera_data.lens=28
scene.render.resolution_x=960;scene.render.resolution_y=540;scene.render.filepath=os.path.join(OUT,'mission-preview.png');bpy.ops.render.render(write_still=True)
scene.render.resolution_x=1920;scene.render.resolution_y=1080
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'blender','mars-explorer-real-jezero.blend'))
with open(os.path.join(OUT,'provenance.json'),'w') as f:json.dump({'generator':'Blender '+bpy.app.version_string,'scene':'Real Jezero HiRISE field site','scientific':True,'terrain':field,'verticalExaggeration':1,'reconstructed':['sub-resolution ground microtexture','foreground rock props and specimen mesh','illustrative sky and lighting'],'sources':[field['dtmUrl'],field['orthoUrl'],ctx['sourceUrl']],'source':'scripts/build-jezero-real.py'},f,indent=2)
print('REAL_JEZERO_ASSETS_READY')
