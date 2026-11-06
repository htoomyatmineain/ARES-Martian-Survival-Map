"""Build the georeferenced Jezero Blender terrain and matching GLB."""
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

root = Path(__file__).resolve().parent.parent
terrain = json.loads((root/"assets"/"terrain.json").read_text(encoding="utf-8"))
detail=root/"data"/"hirise-zone-sampled-501.npz"
if detail.is_file():
    import numpy as np
    with np.load(detail) as source:
        values=source["heights"]
        center=terrain["center"]
        if values.shape!=(501,501) or not np.all(np.isfinite(values)&(np.abs(values)<100000)):
            raise ValueError("HiRISE detail grid contains missing or invalid elevations")
        if not np.allclose([source["lat"],source["lon"]],[center["lat"],center["lon"]],rtol=0,atol=1e-8):
            raise ValueError("HiRISE detail grid does not match the existing orthophoto extent")
        terrain["count"]=501
        terrain["heights"]=(values.astype("float64")-terrain["datumOffset"]).ravel().tolist()
        terrain.pop("tone",None)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = "Jezero | Western Delta"
scene.unit_settings.system = "METRIC"
scene["dataset"] = terrain["product"]
scene["source_url"] = terrain["productUrl"]
scene["planetocentric_latitude"] = terrain["center"]["lat"]
scene["east_longitude"] = terrain["center"]["lon"]
scene["absolute_elevation_offset_m"] = terrain["datumOffset"]
scene["vertical_datum"] = terrain["datum"]
scene["source_projection"] = json.dumps(terrain["projection"])
scene["terrain_grid_spacing_m"] = terrain["size"]/(terrain["count"]-1)
scene["terrain_source_sample_count"] = len(terrain["heights"])
scene["terrain_sampling"] = "Nearest valid HiRISE source pixel at each grid vertex"


def mesh_grid(name, layer, is_context=False):
    size, n, values = layer["size"], layer["count"], layer["heights"]
    half, step = size/2, size/(n-1)
    coords = [i*step-half for i in range(n)]
    def elevation(i,j,x,south):
        if is_context and abs(max(abs(x),abs(south))-250)<.01:
            high_n=terrain["count"]
            cell=terrain["size"]/(high_n-1)
            hi=round((x+250)/cell)
            hj=round((south+250)/cell)
            return terrain["heights"][hj*high_n+hi]
        return values[j*n+i]
    verts = [(x,-south,elevation(i,j,x,south))
             for j,south in enumerate(coords) for i,x in enumerate(coords)]
    faces = [(j*n+i,j*n+i+n,j*n+i+n+1,j*n+i+1)
             for j in range(n-1) for i in range(n-1)
             if not is_context or not (-250<=coords[i]<250 and -250<=coords[j]<250)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj = bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(obj)
    tones=layer.get("tone")
    attr = mesh.color_attributes.new(name="RegolithTint",type="FLOAT_COLOR",domain="POINT")
    for i,p in enumerate(attr.data):
        tone=tones[i] if tones else .58+.07*math.sin(values[i]*.08)
        p.color=(.17+tone*.39,.05+tone*.17,.022+tone*.09,1)
    mat=bpy.data.materials.get("Regolith") or bpy.data.materials.new("Regolith")
    mat.use_nodes=True
    if not mat.node_tree.nodes.get("Vertex Color"):
        node=mat.node_tree.nodes.new("ShaderNodeVertexColor")
        node.layer_name=attr.name
        surface=mat.node_tree.nodes.get("Principled BSDF")
        surface.inputs["Roughness"].default_value=.87
        mat.node_tree.links.new(node.outputs["Color"],surface.inputs["Base Color"])
    texture=root/"assets"/"jezero-ortho-crop.png"
    if not is_context and terrain.get("texture") and texture.is_file():
        mat=mat.copy()
        mat.name="Registered HiRISE red-channel ortho"
        uv=mesh.uv_layers.new(name="HiRISE_500m_sector")
        for poly in mesh.polygons:
            for li in poly.loop_indices:
                co=mesh.vertices[mesh.loops[li].vertex_index].co
                uv.data[li].uv=(co.x/size+.5,co.y/size+.5)
        image=bpy.data.images.load(str(texture))
        image.pack()
        img=mat.node_tree.nodes.new("ShaderNodeTexImage")
        img.image=image
        shader=mat.node_tree.nodes["Principled BSDF"]
        mat.node_tree.links.new(img.outputs["Color"],shader.inputs["Base Color"])
        nodes=mat.node_tree.nodes
        links=mat.node_tree.links
        coord=nodes.new("ShaderNodeTexCoord")
        grit=nodes.new("ShaderNodeTexNoise")
        grit.inputs["Scale"].default_value=46
        grit.inputs["Detail"].default_value=4
        links.new(coord.outputs["Object"],grit.inputs["Vector"])
        relief=nodes.new("ShaderNodeBump")
        relief.inputs["Strength"].default_value=.38
        relief.inputs["Distance"].default_value=.024
        links.new(grit.outputs["Fac"],relief.inputs["Height"])
        drifts=nodes.new("ShaderNodeTexNoise")
        drifts.inputs["Scale"].default_value=2.4
        drifts.inputs["Roughness"].default_value=.72
        links.new(coord.outputs["Object"],drifts.inputs["Vector"])
        crust=nodes.new("ShaderNodeBump")
        crust.inputs["Strength"].default_value=.52
        crust.inputs["Distance"].default_value=.075
        links.new(drifts.outputs["Fac"],crust.inputs["Height"])
        links.new(relief.outputs["Normal"],crust.inputs["Normal"])
        links.new(crust.outputs["Normal"],shader.inputs["Normal"])
    mesh.materials.append(mat)
    for face in mesh.polygons:
        face.use_smooth=True
    return obj


main=mesh_grid("500 m walkable sector",terrain)
mesh_grid("CTX horizon | 3 km context",terrain["context"],True)
world=bpy.data.worlds.new("Martian dust sky")
scene.world=world
world.use_nodes=True
background=world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value=(.43,.22,.17,1)
background.inputs["Strength"].default_value=.55
nodes=world.node_tree.nodes
links=world.node_tree.links
coord=nodes.new("ShaderNodeTexCoord")
split=nodes.new("ShaderNodeSeparateXYZ")
links.new(coord.outputs["Normal"],split.inputs[0])
gradient=nodes.new("ShaderNodeValToRGB")
gradient.color_ramp.elements[0].color=(.77,.39,.28,1)
gradient.color_ramp.elements[1].position=.40
gradient.color_ramp.elements[1].color=(.18,.094,.094,1)
gradient.color_ramp.elements.new(.23).color=(.54,.26,.218,1)
absolute=nodes.new("ShaderNodeMath")
absolute.operation="ABSOLUTE"
links.new(split.outputs["Z"],absolute.inputs[0])
links.new(absolute.outputs[0],gradient.inputs[0])
sky=nodes.new("ShaderNodeBackground")
sky.inputs["Strength"].default_value=.9
links.new(gradient.outputs["Color"],sky.inputs["Color"])
rays=nodes.new("ShaderNodeLightPath")
mix=nodes.new("ShaderNodeMixShader")
links.new(rays.outputs["Is Camera Ray"],mix.inputs[0])
links.new(background.outputs[0],mix.inputs[1])
links.new(sky.outputs[0],mix.inputs[2])
links.new(mix.outputs[0],nodes.get("World Output").inputs["Surface"])

light=bpy.data.lights.new("Low sun","SUN")
light.energy=3
light.angle=.12
light.color=(1,.72,.56)
sun=bpy.data.objects.new("Low sun",light)
scene.collection.objects.link(sun)
sun.rotation_euler=Vector((-.42,.91,-.37)).to_track_quat('-Z','Y').to_euler()
light.color=(1,.65,.49)
light.energy=2.7

def camera(name,location,target):
    data=bpy.data.cameras.new(name)
    data.lens=35
    data.clip_end=5000
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location=location
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    return obj

scene.camera=camera("Jezero overview",(585,-610,440),(0,0,-3))
def ground_height(x,south):
    n=terrain["count"]
    d=terrain["size"]/(n-1)
    u,v=(x+250)/d,(south+250)/d
    i,j=int(u),int(v)
    a=j*n+i
    u,v=u-i,v-j
    samples=terrain["heights"]
    if u+v<=1:
        return samples[a]+u*(samples[a+1]-samples[a])+v*(samples[a+n]-samples[a])
    b=a+n+1
    return samples[b]+(1-u)*(samples[b-1]-samples[b])+(1-v)*(samples[b-n]-samples[b])

walk=Vector((160,-70,ground_height(160,70)+1.83))
hero=camera("Delta walking camera",walk,walk+Vector((math.sin(-1.22),math.cos(-1.22),.015))*100)
hero.data.lens=25
scene.camera=hero

layout=root/"assets"/"rock-layout.json"
if layout.exists():
    verts,faces,tints=[],[],[]
    for rock in json.loads(layout.read_text(encoding="utf-8")):
        x,z,h,r,angle,tint=(rock[k] for k in ("x","z","h","r","angle","tint"))
        y=ground_height(x,z)-h*.19
        sides=16 if r>1.2 else 11 if r>.6 else 7 if r>.16 else 5
        layers=[(.02,.88),(.22,.99),(.48,1),(.72,.81),(.96,.43)] if r>.55 else [(.02,.9),(.57,.8),(.94,.34)]
        offset=len(verts)
        first_face=len(faces)
        for band,(level,width) in enumerate(layers):
            for i in range(sides):
                a=angle+i*math.tau/sides+(band%2)*.19
                edge=.82+.19*math.sin(i*4.92+tint*14)+.11*math.cos(i*2.6+band*2.4)
                jag=.11*math.sin(i*7.7+band*1.9)
                verts.append((x+math.cos(a)*r*width*edge+level*r*.23,
                              -z-math.sin(a)*r*width*edge*.85+level*r*.17,
                              y+h*(level+jag)))
                tints.append(tint)
        tip=len(verts)
        verts.append((x+r*.2,-z+r*.2,y+h*1.06))
        tints.append(tint)
        for band in range(len(layers)-1):
            low=offset+band*sides
            high=low+sides
            for i in range(sides):
                j=(i+1)%sides
                faces.extend([(low+i,high+i,low+j),(low+j,high+i,high+j)])
        top=tip-sides
        faces.extend((top+(i+1)%sides,top+i,tip) for i in range(sides))
        if r>=.42:
            # Shared, displaced edge midpoints add fracture detail without altering the DTM.
            edges={}
            def fracture(a,b):
                key=tuple(sorted((a,b)))
                if key in edges:
                    return edges[key]
                p,q=Vector(verts[a]),Vector(verts[b])
                v=(p+q)*.5
                outward=Vector(((v.x-x-r*.13)/r,(v.y+z-r*.10)/r,(v.z-y-h*.45)/h)).normalized()
                ripple=math.sin(v.x*9.73+v.z*5.27-v.y*7.91+tint*32)
                edges[key]=len(verts)
                verts.append(v+outward*ripple*(p-q).length*.105)
                tints.append(tint)
                return edges[key]
            coarse=faces[first_face:]
            del faces[first_face:]
            for a,b,c in coarse:
                ab,bc,ca=fracture(a,b),fracture(b,c),fracture(c,a)
                faces.extend([(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)])

    mesh=bpy.data.meshes.new("Illustrative boulders and regolith")
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    rocks=bpy.data.objects.new("Regolith scatter | scenario geometry",mesh)
    scene.collection.objects.link(rocks)
    attr=mesh.color_attributes.new(name="RockTint",type="FLOAT_COLOR",domain="POINT")
    for i,item in enumerate(attr.data):
        t=tints[i]
        item.color=(.13+t*.17,.046+t*.07,.024+t*.04,1)
    mat=bpy.data.materials.new("Fractured basalt proxy")
    mat.use_nodes=True
    nodes=mat.node_tree.nodes
    links=mat.node_tree.links
    node=nodes.new("ShaderNodeVertexColor")
    node.layer_name=attr.name
    shader=nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value=.89
    links.new(node.outputs["Color"],shader.inputs["Base Color"])
    noise=nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value=25
    coords=nodes.new("ShaderNodeTexCoord")
    links.new(coords.outputs["Object"],noise.inputs["Vector"])
    bump=nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value=.49
    bump.inputs["Distance"].default_value=.023
    links.new(noise.outputs["Fac"],bump.inputs["Height"])
    bedding=nodes.new("ShaderNodeVectorMath")
    bedding.operation="MULTIPLY"
    bedding.inputs[1].default_value=(1.1,1.3,3.7)
    links.new(coords.outputs["Object"],bedding.inputs[0])
    joints=nodes.new("ShaderNodeTexVoronoi")
    joints.feature="DISTANCE_TO_EDGE"
    joints.inputs["Scale"].default_value=2.8
    links.new(bedding.outputs["Vector"],joints.inputs["Vector"])
    fissures=nodes.new("ShaderNodeValToRGB")
    fissures.color_ramp.elements[0].position=.014
    fissures.color_ramp.elements[0].color=(.57,.53,.49,1)
    fissures.color_ramp.elements[1].position=.059
    links.new(joints.outputs["Distance"],fissures.inputs[0])
    fracture_relief=nodes.new("ShaderNodeBump")
    fracture_relief.inputs["Strength"].default_value=.27
    fracture_relief.inputs["Distance"].default_value=.018
    links.new(fissures.outputs["Color"],fracture_relief.inputs["Height"])
    links.new(bump.outputs["Normal"],fracture_relief.inputs["Normal"])
    links.new(fracture_relief.outputs["Normal"],shader.inputs["Normal"])
    weathering=nodes.new("ShaderNodeTexNoise")
    weathering.inputs["Scale"].default_value=3.4
    weathering.inputs["Detail"].default_value=4
    links.new(coords.outputs["Object"],weathering.inputs["Vector"])
    ramp=nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color=(.37,.27,.23,1)
    ramp.color_ramp.elements[1].color=(1.15,1.03,.91,1)
    links.new(weathering.outputs["Fac"],ramp.inputs[0])
    variation=nodes.new("ShaderNodeMixRGB")
    variation.blend_type="MULTIPLY"
    variation.inputs[0].default_value=.6
    links.new(node.outputs["Color"],variation.inputs[1])
    links.new(ramp.outputs[0],variation.inputs[2])
    fracture_tint=nodes.new("ShaderNodeMixRGB")
    fracture_tint.blend_type="MULTIPLY"
    fracture_tint.inputs[0].default_value=.28
    links.new(variation.outputs[0],fracture_tint.inputs[1])
    links.new(fissures.outputs["Color"],fracture_tint.inputs[2])
    links.new(fracture_tint.outputs[0],shader.inputs["Base Color"])
    mesh.materials.append(mat)
    worn=rocks.modifiers.new("Weathered fracture edges","BEVEL")
    worn.width=.009
    worn.segments=1
    worn.limit_method="ANGLE"
    worn.angle_limit=.55
    mesh.polygons.foreach_set("use_smooth",[True]*len(mesh.polygons))
# Render-only mission guidance, on a separate collection from the terrain export.
from random import Random
presentation=bpy.data.collections.new("Presentation | simulated route and lighting")
scene.collection.children.link(presentation)

def presentation_mesh(name,vertices,faces,material):
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    mesh.materials.append(material)
    obj=bpy.data.objects.new(name,mesh)
    presentation.objects.link(obj)
    return obj

def emission(name,color,strength):
    material=bpy.data.materials.new(name)
    material.use_nodes=True
    nodes=material.node_tree.nodes
    output=nodes.get("Material Output")
    glow=nodes.new("ShaderNodeEmission")
    glow.inputs["Color"].default_value=(*color,1)
    glow.inputs["Strength"].default_value=strength
    material.node_tree.links.new(glow.outputs[0],output.inputs["Surface"])
    return material

path=root/"assets"/"hero-route.json"
if path.exists():
    route=json.loads(path.read_text(encoding="utf-8"))
    vertices,faces=[],[]
    gap=6.8
    for a,b in zip(route,route[1:]):
        dx,dz=b["x"]-a["x"],b["z"]-a["z"]
        length=math.hypot(dx,dz)
        if length<.001: continue
        dx,dz=dx/length,dz/length
        while gap<=length:
            x,z=a["x"]+dx*gap,a["z"]+dz*gap
            first=len(vertices)
            for side,forward in [(0,1),(-.87,-.49),(-.83,-.88),(0,.38),(.83,-.88),(.87,-.49)]:
                px,pz=x+dz*side+dx*forward,z-dx*side+dz*forward
                vertices.append((px,-pz,ground_height(px,pz)+.12))
            faces.extend([(first,first+1,first+3),(first+1,first+2,first+3),
                          (first,first+3,first+5),(first+3,first+4,first+5)])
            gap+=6.0
        gap-=length
    presentation_mesh("Mission guidance | illustrative",vertices,faces,
                      emission("Ice blue route",(.18,.75,1),3.3))
    destination=route[-1]
    x,z=destination["x"],destination["z"]
    point=Vector((x,-z,ground_height(x,z)+2.7))
    side=hero.rotation_euler.to_matrix()@Vector((1,0,0))
    up=hero.rotation_euler.to_matrix()@Vector((0,1,0))
    vertices=[]
    for radius in (.73,.58):
        for i in range(32):
            a=i*math.tau/32
            vertices.append(point+radius*(math.cos(a)*side+math.sin(a)*up))
    faces=[(i,(i+1)%32,(i+1)%32+32,i+32) for i in range(32)]
    presentation_mesh("Waypoint ring | illustrative",vertices,faces,emission("Amber waypoint",(1,.36,.05),4.5))

# Small surface fragments reinforce scale in the walking camera. Their placement is artistic.
rng=Random(152)
verts,faces=[],[]
for _ in range(5600):
    depth=1.5+83.5*rng.random()**1.45
    side=rng.uniform(-1,1)*(.8+.56*depth)
    x=160+math.sin(-1.22)*depth+math.cos(-1.22)*side
    z=70-math.cos(-1.22)*depth+math.sin(-1.22)*side
    if max(abs(x),abs(z))>=249: continue
    density=.64+.24*math.sin(x*.82+z*.38)+.12*math.cos(z*1.2)
    if rng.random()>density: continue
    radius=.012+.17*rng.random()**4.5
    base_height=ground_height(x,z)-radius*.15
    first=len(verts)
    spin=rng.uniform(0,math.tau)
    for i in range(5):
        angle=spin+i*math.tau/5
        spread=radius*rng.uniform(.66,1.15)
        verts.append((x+math.cos(angle)*spread,-z+math.sin(angle)*spread,base_height))
    height=radius*rng.uniform(.26,.78)
    for i in range(5):
        angle=spin+.17+i*math.tau/5
        spread=radius*rng.uniform(.38,.69)
        verts.append((x+math.cos(angle)*spread,-z+math.sin(angle)*spread,base_height+height*rng.uniform(.7,1)))
    for i in range(5):
        j=(i+1)%5
        faces.append((first+i,first+j,first+j+5,first+i+5))
    faces.append(tuple(first+5+i for i in range(5)))
gravel=bpy.data.materials.new("Surface gravel | visual proxy")
gravel.use_nodes=True
shader=gravel.node_tree.nodes.get("Principled BSDF")
shader.inputs["Base Color"].default_value=(.18,.063,.032,1)
shader.inputs["Roughness"].default_value=.91
fragments=presentation_mesh("Foreground surface fragments | visual proxy",verts,faces,gravel)
scene.collection.objects.link(fragments)
presentation.objects.unlink(fragments)

fill=bpy.data.lights.new("Cool sky bounce","SUN")
fill.energy=.39
fill.angle=.32
fill.color=(.68,.76,1)
bounce=bpy.data.objects.new(fill.name,fill)
presentation.objects.link(bounce)
bounce.rotation_euler=Vector((.64,-.22,-.75)).to_track_quat('-Z','Y').to_euler()
scene.world.node_tree.nodes.get("Background").inputs["Strength"].default_value=.74
scene.render.engine="CYCLES"
scene.cycles.samples=32
scene.cycles.adaptive_threshold=.045
scene.cycles.use_denoising=True
scene.cycles.max_bounces=5
scene.view_settings.view_transform="AgX"
scene.view_settings.look="AgX - Medium High Contrast"
scene.view_settings.exposure=.36
scene.render.resolution_x=1280
scene.render.resolution_y=720
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.filepath="//Jezero Blender Preview.png"
scene.view_layers[0].use_pass_mist=True
mist=scene.world.mist_settings
mist.start=20
mist.depth=530
mist.falloff="QUADRATIC"
compositor=bpy.data.node_groups.new("Depth haze and route bloom | presentation","CompositorNodeTree")
scene.compositing_node_group=compositor
compositor.interface.new_socket(name="Image",in_out="OUTPUT",socket_type="NodeSocketColor")
render=compositor.nodes.new("CompositorNodeRLayers")
glow=compositor.nodes.new("CompositorNodeGlare")
glow.inputs["Type"].default_value="Fog Glow"
glow.inputs["Threshold"].default_value=1.6
glow.inputs["Strength"].default_value=.5
glow.inputs["Size"].default_value=.22
result=compositor.nodes.new("NodeGroupOutput")
strength=compositor.nodes.new("ShaderNodeMath")
strength.operation="MULTIPLY"
strength.inputs[1].default_value=.44
compositor.links.new(render.outputs["Mist"],strength.inputs[0])
aerial=compositor.nodes.new("ShaderNodeMix")
aerial.data_type="RGBA"
aerial.inputs[7].default_value=(.74,.36,.27,1)
compositor.links.new(strength.outputs[0],aerial.inputs[0])
compositor.links.new(render.outputs["Image"],aerial.inputs[6])
compositor.links.new(aerial.outputs[2],glow.inputs["Image"])
strength.location=(-200,-180)
aerial.location=(10,-180)
compositor.links.new(glow.outputs["Image"],result.inputs["Image"])
render.location=(-350,0)
glow.location=(240,0)
result.location=(490,0)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=="VIEW_3D":
            area.spaces.active.region_3d.view_perspective="CAMERA"
            area.spaces.active.shading.color_type="MATERIAL"
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(root/"Jezero Terrain.blend"))
bpy.ops.object.select_all(action="DESELECT")
for obj in scene.objects:
    if obj.type=="MESH" and presentation not in obj.users_collection:
        obj.select_set(True)
# The interchange export uses the base rock tint. Blender retains the procedural weathering.
rock_material=bpy.data.materials.get("Fractured basalt proxy")
if rock_material:
    nodes=rock_material.node_tree.nodes
    color=nodes.get("Principled BSDF").inputs["Base Color"]
    previous=color.links[0].from_socket
    rock_material.node_tree.links.new(next(n for n in nodes if n.bl_idname=="ShaderNodeVertexColor").outputs["Color"],color)
bpy.ops.export_scene.gltf(filepath=str(root/"Jezero Terrain.glb"),export_format="GLB",use_selection=True,export_cameras=False,export_lights=False)
if rock_material:
    rock_material.node_tree.links.new(previous,color)
if "--preview" in __import__("sys").argv:
    scene.render.resolution_percentage=75
    bpy.ops.render.render(write_still=True)
