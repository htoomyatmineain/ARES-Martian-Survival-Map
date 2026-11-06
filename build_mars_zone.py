"""Build Mars Zone in Blender. CLI: blender -b --python-exit-code 1 -P build_mars_zone.py -- --render"""
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector, noise

OUT = Path(__file__).resolve().parent
rng = random.Random(701)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = "Mars Zone | Ares-07"
scene.unit_settings.system = 'METRIC'


def group(name):
    col = bpy.data.collections.new(name)
    scene.collection.children.link(col)
    return col


land = group("01  /  Geology")
station = group("02  /  Ares-07 outpost")
power = group("03  /  Solar field")
survey = group("04  /  Survey route")
rig = group("05  /  Cameras and lighting")
layout = group("06  /  Presentation graphics")


def move(obj, col, name, material=None):
    for src in list(obj.users_collection):
        src.objects.unlink(obj)
    col.objects.link(obj)
    obj.name = name
    if material:
        obj.data.materials.append(material)
    return obj


def material(name, color, rough=.6, metal=0, glow=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if glow:
        bsdf.inputs["Emission Color"].default_value = (*color, 1)
        bsdf.inputs["Emission Strength"].default_value = glow
    return mat


def soil(name, colors, scale):
    mat = material(name, colors[1], .89)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    xyz = nodes.new("ShaderNodeTexCoord")
    tex = nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = scale
    tex.inputs["Detail"].default_value = 5
    links.new(xyz.outputs["Object"], tex.inputs["Vector"])
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = .24
    ramp.color_ramp.elements[0].color = (*colors[0], 1)
    ramp.color_ramp.elements[1].position = .78
    ramp.color_ramp.elements[1].color = (*colors[2], 1)
    ramp.color_ramp.elements.new(.52).color = (*colors[1], 1)
    links.new(tex.outputs["Fac"], ramp.inputs[0])
    links.new(ramp.outputs[0], bsdf.inputs["Base Color"])
    micro = nodes.new("ShaderNodeTexNoise")
    micro.inputs["Scale"].default_value = 12
    links.new(xyz.outputs["Object"], micro.inputs["Vector"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = .34
    bump.inputs["Distance"].default_value = .12
    links.new(micro.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs[0], bsdf.inputs["Normal"])
    return mat


dust = soil("Regolith | iron oxide", [(0.12,.027,.012),(.32,.094,.038),(.59,.24,.092)], .38)
stone = soil("Basalt | dusty fracture", [(.07,.015,.009),(.20,.052,.027),(.40,.13,.06)], 1.3)
strata = [soil("Stratum %02d" % i, [tuple(v * s for v in color) for s in (.64,1,1.28)], 1.6)
          for i, color in enumerate([(.21,.069,.036),(.10,.032,.024),(.28,.093,.051),(.13,.041,.027),(.065,.024,.020)])]
ink = material("Gunmetal", (.026,.034,.042), .49, .54)
white = material("Ceramic | bone", (.72,.68,.56), .36, .15)
orange = material("Safety orange", (.83,.19,.027), .46, .18)
panel = material("Solar cells | midnight blue", (.026,.087,.17), .25, .63)
glass = material("Window | blue", (.024,.15,.21), .25, .43, .24)
beacon = material("Beacon | warm amber", (1,.26,.047), .28, 0, 2.4)
mark = material("Paint | pale sandstone", (.73,.46,.24), .82)
deck = material("Landing pad | graphite", (.082,.074,.069), .76, .2)


def mesh(name, verts, faces, col, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    col.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def box(name, loc, dims, mat, col, bevel=.05, rot=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = move(bpy.context.object, col, name, mat)
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler.z = rot
    if bevel:
        mod = obj.modifiers.new("Edge radius", 'BEVEL')
        mod.width, mod.segments = bevel, 2
        obj.modifiers.new("Corner normals", 'WEIGHTED_NORMAL')
    return obj


def cylinder(name, loc, radius, depth, mat, col, vertices=24, axis='Z'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = move(bpy.context.object, col, name, mat)
    if axis == 'X':
        obj.rotation_euler.y = math.pi / 2
    elif axis == 'Y':
        obj.rotation_euler.x = math.pi / 2
    for p in obj.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    return obj


def beam(name, a, b, radius, mat, col):
    vec = Vector(b) - Vector(a)
    obj = cylinder(name, (Vector(a) + Vector(b)) / 2, radius, vec.length, mat, col, 12)
    obj.rotation_euler = vec.to_track_quat('Z', 'Y').to_euler()
    return obj


def height(x, y):
    def n(s, z):
        return noise.noise_vector(Vector((x*s, y*s, z)))[0]
    value = .88*n(.095, 7) + .40*n(.24, 3) + .12*n(.78, 9)
    value += 2.8*math.exp(-((x+19)/7)**2-((y-13)/5)**2) * (1+.45*n(.4, 8))
    for cx, cy, radius, depth in [(12, 11, 8.3, 2.8), (-20, -9, 4.8, 1.28), (22, -4, 2.7, .67)]:
        d = math.hypot(x-cx, y-cy)/radius + .062*n(.24, 1)
        value += -depth*max(0, 1-d*d)**1.4 + .43*depth*math.exp(-((d-.91)/.155)**2)
    for cx, cy, rx, ry in [(-3, 1, 9, 5), (9, -9, 6, 5), (-14, 4, 5, 4)]:
        d = math.hypot((x-cx)/rx, (y-cy)/ry)
        k = min(1, max(0, (d-.72)/.55))
        value *= k*k*(3-2*k)
    return value


nx, ny = 200, 156
verts = []
for j in range(ny+1):
    for i in range(nx+1):
        x, y = -27+54*i/nx, -21+42*j/ny
        verts.append((x, y, height(x, y)))
row = nx+1
faces = [(j*row+i,j*row+i+1,(j+1)*row+i+1,(j+1)*row+i) for j in range(ny) for i in range(nx)]
terrain = mesh("Ares basin | sculpted surface", verts, faces, land, dust)
for p in terrain.data.polygons:
    p.use_smooth = True
edge = ([i for i in range(row)] + [j*row+nx for j in range(1,ny+1)] +
        [ny*row+i for i in range(nx-1,-1,-1)] + [j*row for j in range(ny-1,0,-1)])
rings = [[verts[i] for i in edge]]
for j, base in enumerate((-.95,-1.52,-2.14,-2.78,-3.55)):
    rings.append([(x,y,base + (.22 if j < 4 else 0)*math.sin(.43*x+.22*y+j*.57) +
                   (.08 if j < 4 else 0)*math.sin(1.1*x-.65*y)) for x,y,z in rings[0]])
# Keep the first band below the terrain even at the edges.
for j in range(1, len(rings)):
    rings[j] = [(x,y,min(z,rings[j-1][i][2]-.12)) for i,(x,y,z) in enumerate(rings[j])]
count = len(edge)
for j, mat in enumerate(strata):
    mesh("Exposed layer %02d" % (j+1), rings[j]+rings[j+1],
         [(i,count+i,count+(i+1)%count,(i+1)%count) for i in range(count)], land, mat)
box("Charcoal display base", (0,0,-3.77), (54.7,42.7,.64), ink, land, .15)
box("Lower display base", (0,0,-4.19), (53.85,41.85,.28), deck, land, .10)

# Fractured basalt, kept away from the habitat, pad and array.
rock_meshes = []
for i in range(8):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1)
    rock = bpy.context.object
    for v in rock.data.vertices:
        v.co *= rng.uniform(.75,1.19)
    rock.data.materials.append(stone)
    rock_meshes.append(rock.data)
    bpy.data.objects.remove(rock, do_unlink=True)
for i in range(470):
    x, y = rng.uniform(-26,26), rng.uniform(-20,20)
    if any(((x-cx)/rx)**2+((y-cy)/ry)**2 < 1 for cx,cy,rx,ry in
           [(-3,1,9,5),(9,-9,6,6),(-14,4,5,4)]):
        continue
    size = .09+1.12*rng.random()**4
    obj = bpy.data.objects.new("Basalt fragment", rng.choice(rock_meshes))
    land.objects.link(obj)
    obj.location = (x,y,height(x,y)+size*.17)
    obj.scale = (size, size*rng.uniform(.52,.98), size*rng.uniform(.36,.73))
    obj.rotation_euler = (rng.uniform(-.3,.3),rng.uniform(-.3,.3),rng.uniform(0,math.tau))

# Two pressurized modules and a covered airlock.
for y in (-.65, 2.55):
    for x in (-7.2,-2.8):
        for sy in (-.94,.94):
            box("Footing", (x,y+sy,.13), (.68,.55,.34), ink, station)
            beam("Steel strut",(x,y+sy,.19),(x,y+sy*.68,.95),.12,ink,station)
    cylinder("Pressure hull",(-5,y,1.48),1.17,6.45,white,station,12,'X')
    for x in (-8.12,-7.75,-2.25,-1.88):
        cylinder("External hull band",(x,y,1.48),1.21,.19,orange if x in (-7.75,-2.25) else ink,station,12,'X')
    for x in (-6.7,-5.6,-4.5,-3.4):
        box("Observation window", (x,y-1.115,1.61), (.79,.16,.39), ink,station,.07)
        box("Glazing", (x,y-1.205,1.61), (.62,.04,.24), glass,station,.045)
    box("Roof spine",(-5,y,2.61),(4.6,.32,.18),ink,station)
    for x in (-6.2,-4,-2.8):
        box("Roof equipment", (x,y,2.78), (.62,.54,.27), white,station)
cylinder("Module connector",(-5.65,.95,1.38),.67,3.2,ink,station,16,'Y')
box("Airlock vestibule",(-.65,.04,1.22),(2.55,2.0,1.92),white,station,.19)
box("Hatch surround",(.88,.04,1.14),(.56,1.53,1.58),orange,station,.14)
box("Hatch", (1.19,.04,1.17), (.11,1.04,1.21), ink,station,.12)
box("Hatch window",(1.26,.04,1.41),(.05,.51,.28),glass,station)
for i in range(5):
    box("Airlock steps",(1.4+i*.26,.04,.51-i*.1),(.3,1.65,.19),ink,station)
box("Storage skid",(-3.3,-3.95,.14),(3.0,1.04,.24),ink,station)
for x in (-4.3,-3.3,-2.3):
    box("Field cargo", (x,-3.95,.56),(.88,.85,.65),white,station)
    for dy in (-.26,.26):
        box("Cargo restraint",(x,-3.95+dy,.89),(.87,.075,.045),orange,station)

mx,my = -1.15,4.55
cylinder("Comms mast", (mx,my,2.58),.12,5.1,ink,station)
for angle in (0,2.094,4.189):
    beam("Antenna brace",(mx+math.cos(angle)*.95,my+math.sin(angle)*.95,.08),(mx,my,1.85),.075,ink,station)
beam("Crossbar",(mx-.87,my,4.65),(mx+.87,my,4.65),.065,white,station)
for dx in (-.85,.85):
    beam("Aerial",(mx+dx,my,4.65),(mx+dx,my,5.53),.043,white,station)
cylinder("Aviation light", (mx,my,5.22),.16,.22,beacon,station)
# Parabolic dish, aimed outward from the station.
dish_axis = Vector((.58,-.43,.69)).normalized()
dish_pos = Vector((mx,my,3.68))
dv = [(0,0,0)] + [(r*math.cos(i*math.tau/32), r*math.sin(i*math.tau/32), .29*r*r)
                    for r in (.26,.53,.80,1.05) for i in range(32)]
df = [(0,1+i,1+(i+1)%32) for i in range(32)]
df += [(1+32*j+i,1+32*(j+1)+i,1+32*(j+1)+(i+1)%32,1+32*j+(i+1)%32)
       for j in range(3) for i in range(32)]
dish = mesh("High gain dish", dv, df, station, white)
dish.location = dish_pos
dish.rotation_euler = dish_axis.to_track_quat('Z','Y').to_euler()
dish.modifiers.new("Dish shell",'SOLIDIFY').thickness = .055
beam("Dish feed",dish_pos,dish_pos+dish_axis*.81,.045,ink,station)

# Solar tables. Rails and individual cells share the panel's tilt.
for x in (-16.5,-12.6):
    for y in (2.4,5.75):
        z = height(x,y)
        center = Vector((x,y,z+1.48))
        tilt = .36
        for dx in (-1.04,1.04):
            cylinder("Array stanchion",(x+dx,y,z+.65),.095,1.3,ink,power)
        def tiled(name, px, py, dz, dims, mat):
            loc = center+Vector((px,py*math.cos(tilt)-dz*math.sin(tilt),py*math.sin(tilt)+dz*math.cos(tilt)))
            obj = box(name,loc,dims,mat,power,.025)
            obj.rotation_euler.x = tilt
        tiled("Array frame",0,0,0,(3.44,2.25,.18),white)
        for i in range(8):
            for j in range(4):
                tiled("Photovoltaic tile",(i-3.5)*.402,(j-1.5)*.515,.103,(.378,.486,.055),panel)

# Landing pad with an inset ring, painted H, and edge lights.
px, py = 8.8, -8.6
cylinder("Landing apron", (px,py,.095),4.65,.26,ink,survey,12)
cylinder("Landing surface", (px,py,.245),4.49,.10,deck,survey,12)
for i in range(64):
    a = i*math.tau/64
    if i%16 in (14,15,0,1):
        continue
    box("Landing circle", (px+3.43*math.cos(a),py+3.43*math.sin(a),.303),
        (.352,.105,.012), mark,survey,0,a+math.pi/2)
for dx in (-.6,.6):
    box("Pad H", (px+dx,py,.306),(.18,1.8,.014),mark,survey,0)
box("Pad H", (px,py,.307),(1.2,.18,.014),mark,survey,0)
for i in range(8):
    a = (i+.5)*math.tau/8
    cylinder("Pad edge light",(px+4.22*math.cos(a),py+4.22*math.sin(a),.34),.105,.10,beacon,survey,12)

# Six-wheeled rover with a sensor mast and equipment deck.
rx,ry = -1.35,-8.15
rz = height(rx,ry)
yaw = -.25
def rover_pos(x,y,z):
    return (rx+x*math.cos(yaw)-y*math.sin(yaw), ry+x*math.sin(yaw)+y*math.cos(yaw),rz+z)

for x in (-.99,0,.99):
    for y in (-.89,.89):
        wheel = cylinder("Rover tire",rover_pos(x,y,.47),.43,.35,ink,survey,20,'Y')
        wheel.rotation_euler.z = yaw
        hub = cylinder("Rover hub",rover_pos(x,y*1.22,.47),.22,.08,white,survey,12,'Y')
        hub.rotation_euler.z = yaw
for name, loc, dims, mat in [
    ("Rover chassis",(0,0,.71),(2.53,1.35,.36),ink),
    ("Rover body",(-.12,0,1.02),(2.06,1.31,.45),white),
    ("Rover bumper",(1.13,0,.89),(.25,1.32,.18),orange),
    ("Rover equipment deck",(-.52,0,1.275),(.98,1.06,.14),panel),
    ("Rover sensor head",(.57,0,1.91),(.45,.62,.26),white),
    ("Rover camera",(.81,0,1.92),(.075,.28,.14),glass),
]:
    box(name,rover_pos(*loc),dims,mat,survey,.06,yaw)
cylinder("Rover mast",rover_pos(.57,0,1.53),.073,.61,ink,survey)
for y in (-.46,.46):
    box("Rover running light",rover_pos(1.277,y,.90),(.06,.16,.10),beacon,survey,.02,yaw)

for i in range(23):
    x = -15.1+.64*i
    y = -5.4-2.8*(i/22)**1.48
    angle = math.atan2(-2.8*1.48*(i/22)**.48, .64*22)
    for dy in (-.67,.67):
        h = height(x,y+dy)
        obj = box("Survey track", (x,y+dy,h+.013),(.23,.18,.036),stone,survey,0,angle+.35)
        obj.rotation_euler.x = math.atan2(height(x,y+dy+.1)-height(x,y+dy-.1),.2)
        obj.rotation_euler.y = -math.atan2(height(x+.1,y+dy)-height(x-.1,y+dy),.2)
for x,y in ((-10.8,-5.4),(3.2,-5.9),(4.7,5.7),(15.9,1.4),(21.1,7.8)):
    z = height(x,y)
    cylinder("Survey marker", (x,y,z+.37),.075,.8,ink,survey,12)
    cylinder("Marker reflector", (x,y,z+.77),.12,.17,beacon,survey,12)


def aim(obj, at):
    obj.rotation_euler = (Vector(at)-obj.location).to_track_quat('-Z','Y').to_euler()


def camera(name, at, eye, scale):
    data = bpy.data.cameras.new(name)
    obj = bpy.data.objects.new(name,data)
    rig.objects.link(obj)
    obj.location = eye
    aim(obj,at)
    data.type, data.ortho_scale = 'ORTHO',scale
    data.clip_end = 300
    return obj


hero = camera("01 | Diorama", (0,0,-.6),(57,-78,61),84)
camera("02 | Survey map", (0,0,0),(0,0,90),66).rotation_euler = (0,0,0)
camera("03 | Outpost detail",(-3,-1,1),(15,-25,13),26)
scene.camera = hero


def light(name, typ, loc, target, color, energy, size):
    data = bpy.data.lights.new(name,typ)
    obj = bpy.data.objects.new(name,data)
    rig.objects.link(obj)
    obj.location, data.color, data.energy = loc,color,energy
    aim(obj,target)
    if typ == 'SUN':
        data.angle = size
    else:
        data.shape, data.size = 'DISK',size


light("Low sun",'SUN',(-40,-32,35),(0,0,0),(1,.76,.56),2.75,.09)
light("Cool bounce",'AREA',(12,-26,32),(0,0,0),(.52,.70,1),4200,34)
light("Warm rim",'AREA',(14,25,30),(0,0,0),(1,.48,.25),8400,27)
world = bpy.data.worlds.new("Deep umber studio")
scene.world = world
world.use_nodes = True
nodes = world.node_tree.nodes
bg = nodes.get("Background")
bg.inputs[0].default_value = (.16,.126,.102,1)
bg.inputs[1].default_value = .40
back = nodes.new("ShaderNodeBackground")
back.inputs[0].default_value = (.017,.010,.009,1)
back.inputs[1].default_value = .75
path = nodes.new("ShaderNodeLightPath")
mix = nodes.new("ShaderNodeMixShader")
links = world.node_tree.links
links.new(path.outputs["Is Camera Ray"],mix.inputs[0])
links.new(bg.outputs[0],mix.inputs[1])
links.new(back.outputs[0],mix.inputs[2])
links.new(mix.outputs[0],nodes.get("World Output").inputs[0])

# Camera-facing typography for the diorama presentation. Hide this collection
# for a clean render or when using the detail cameras.
def unlit(name, color):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    em = nodes.new("ShaderNodeEmission")
    em.inputs[0].default_value = (*color,1)
    mat.node_tree.links.new(em.outputs[0],nodes.get("Material Output").inputs[0])
    return mat


ivory = unlit("Overlay | ivory",(.86,.72,.54))
copper = unlit("Overlay | copper",(.76,.29,.12))
muted = unlit("Overlay | muted",(.42,.31,.25))


def caption(name, body, x, y, size, mat, align='LEFT', tracking=1.12):
    data = bpy.data.curves.new(name, 'FONT')
    obj = bpy.data.objects.new(name,data)
    layout.objects.link(obj)
    obj.parent = hero
    obj.location = (x,y,-4)
    data.body, data.size, data.align_x, data.space_character = body,size,align,tracking
    data.materials.append(mat)
    return obj


def rule(name, x, y, width, height_, mat):
    obj = mesh(name,[(0,0,0),(width,0,0),(width,height_,0),(0,height_,0)],[(0,1,2,3)],layout,mat)
    obj.parent = hero
    obj.location = (x,y,-4)


rule("Title accent",-38.4,23.5,2.6,.16,copper)
caption("Mission label","SURFACE OPERATIONS  /  01",-35,23.18,.83,copper)
caption("Title","MARS ZONE",-38.55,18.42,4.45,ivory,tracking=1.03)
caption("Site label","ARES-07   /   RESEARCH OUTPOST",-38.35,16.62,.83,muted)
caption("Archive label","MARTIAN ATLAS",38.35,23.18,.86,ivory,'RIGHT')
caption("Plate ID","TERRAIN PLATE  /  007",38.35,21.73,.75,muted,'RIGHT')
rule("Footer rule",-38.35,-23.15,76.7,.036,muted)
caption("Footer left","FIELD SURVEY     /     BASIN AND OUTPOST",-38.35,-24.78,.73,muted)
caption("Footer right","MZ   /   ARES-07",38.35,-24.78,.73,copper,'RIGHT')

scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 1440, 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = "//Mars Zone.png"
scene.view_settings.view_transform = 'AgX'
bpy.ops.object.select_all(action='DESELECT')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.region_3d.view_perspective = 'CAMERA'
            area.spaces.active.region_3d.view_camera_zoom = 4
            area.spaces.active.overlay.show_overlays = False
            area.spaces.active.shading.color_type = 'MATERIAL'

args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "Mars Zone.blend"))
if "--render" in args:
    bpy.ops.render.render(write_still=True)
