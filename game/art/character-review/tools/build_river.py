"""Resurface the detailed source cage and adapt game actions to its relaxed bind pose."""
import bpy, sys, math, json, struct, tempfile
from pathlib import Path
from mathutils import Quaternion, Vector
source, donor, output = map(lambda p:Path(p).resolve(),sys.argv[-3:])
bpy.ops.wm.read_factory_settings(use_empty=True)
def load(path):
    raw=path.read_bytes()
    size=int.from_bytes(raw[12:16],'little');doc=json.loads(raw[20:20+size])
    # The source prototype stored SCALAR bounds as numbers instead of arrays.
    for accessor in doc['accessors']:
        for key in ('min','max'):
            if isinstance(accessor.get(key),(float,int)):accessor[key]=[accessor[key]]
    data=json.dumps(doc).encode();data+=b' '*(-len(data)%4)
    tail=raw[20+size:]
    with tempfile.NamedTemporaryFile(suffix='.glb') as tmp:
        tmp.write(struct.pack('<4sIIII',b'glTF',2,20+len(data)+len(tail),len(data),0x4e4f534a)+data+tail);tmp.flush()
        bpy.ops.import_scene.gltf(filepath=tmp.name,bone_heuristic='BLENDER')
    return next(o for o in bpy.context.selected_objects if o.type=='ARMATURE')
rig=load(source)
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
# Assign connected garment panels, accessories and limb sections by their
# source landmarks. This prevents a pack strap from inheriting an arm weight.
adj=[set() for _ in mesh.data.vertices]
for e in mesh.data.edges:
    a,b=e.vertices;adj[a].add(b);adj[b].add(a)
todo=set(range(len(adj)))
while todo:
    part={todo.pop()};stack=list(part)
    while stack:
        fresh=adj[stack.pop()] & todo;todo-=fresh;part.update(fresh);stack.extend(fresh)
    center=sum((mesh.data.vertices[i].co for i in part),Vector((0,0,0)))/len(part)
    x,depth,z=center;side='Left' if x<0 else 'Right'
    if z>13 and abs(depth)<1.55:joint='Head'
    elif z>=10 and abs(x)<2.1:joint='Chest'
    elif abs(x)>2.1 and z>6:joint=side+('UpperArm' if z>10 else 'Forearm' if z>8 else 'Hand')
    elif z<6:joint=side+('UpperLeg' if z>3.5 else 'LowerLeg' if z>1.65 else 'Foot')
    else:joint='Hips'
    ids=list(part)
    for group in mesh.vertex_groups:group.remove(ids)
    mesh.vertex_groups[joint].add(ids,1,'REPLACE')
# Preserve color boundaries through bevel and UV baking.
bpy.context.view_layer.objects.active=mesh;bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True)
bevel=mesh.modifiers.new('Garment and gear edge radii','BEVEL');bevel.width=.065;bevel.segments=2;bevel.limit_method='ANGLE'
bpy.ops.object.modifier_move_to_index(modifier=bevel.name,index=0)
bpy.ops.object.modifier_apply(modifier=bevel.name)
for p in mesh.data.polygons:p.use_smooth=True
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.012);bpy.ops.object.mode_set(mode='OBJECT')
mat=mesh.data.materials[0];mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links
shader=nodes.get('Principled BSDF');vertex=nodes.new('ShaderNodeVertexColor');vertex.layer_name=mesh.data.color_attributes[0].name
links.new(vertex.outputs['Color'],shader.inputs['Base Color'])
img=bpy.data.images.new('River source color atlas',1024,1024,alpha=False)
target=nodes.new('ShaderNodeTexImage');target.image=img;nodes.active=target
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1
bpy.ops.object.bake(type='DIFFUSE',pass_filter={'COLOR'},margin=4)
img.pack();links.new(target.outputs['Color'],shader.inputs['Base Color'])
# Baked color replaces the original vertex multiplier.
while mesh.data.color_attributes:mesh.data.color_attributes.remove(mesh.data.color_attributes[0])
for kind in ['Normal','Roughness-metallic']:
    image=bpy.data.images.new('River '+kind,128,128,alpha=False);image.colorspace_settings.name='Non-Color';px=[]
    for y in range(128):
        for x in range(128):
            grain=math.sin(x*math.pi/2)*math.cos(y*math.pi/4)
            px.extend((.5+.035*grain,.5,.999,1) if kind=='Normal' else (1,.81+.06*grain,0,1))
    image.pixels[:]=px;image.pack();t=nodes.new('ShaderNodeTexImage');t.image=image
    if kind=='Normal':
        n=nodes.new('ShaderNodeNormalMap');links.new(t.outputs[0],n.inputs['Color']);links.new(n.outputs[0],shader.inputs['Normal'])
    else:
        n=nodes.new('ShaderNodeSeparateColor');links.new(t.outputs[0],n.inputs[0]);links.new(n.outputs['Green'],shader.inputs['Roughness']);links.new(n.outputs['Blue'],shader.inputs['Metallic'])
# Add curved components to the source's single-piece hands, lenses and gaiter.
# Object-space placement follows the landmarks of the relaxed source rig.
details=[]
def piece(name, pos, radii, joint, color, roughness, metallic=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=pos)
    part=bpy.context.object;part.name=name;part.scale=radii
    mat=bpy.data.materials.get(name)
    if mat is None:
        mat=bpy.data.materials.new(name);mat.use_nodes=True
        bsdf=mat.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Base Color'].default_value=(*color,1)
        bsdf.inputs['Roughness'].default_value=roughness
        bsdf.inputs['Metallic'].default_value=metallic
    part.data.materials.append(mat)
    for poly in part.data.polygons:poly.use_smooth=True
    part.vertex_groups.new(name=joint).add(list(range(len(part.data.vertices))),1,'REPLACE')
    details.append(part)
piece('Folded graphite gaiter',(0,-.15,13.96),(.96,.99,.64),'Head',(.021,.026,.027),.88)
for i in range(6):
    x=(i-2.5)*.15
    piece('Ivory gaiter print',(x,-1.12+.14*x*x,13.96),(.063,.036,.11-abs(x)*.07),'Head',(.56,.53,.44),.88)
for sign,side in [(-1,'Left'),(1,'Right')]:
    piece('Acetate frame',(sign*.49,-.99,14.94),(.47,.13,.28),'Head',(.022,.025,.024),.32)
    piece('Smoked lenses',(sign*.49,-1.088,14.95),(.403,.064,.21),'Head',(.073,.093,.088),.15,.28)
    for i,digit in enumerate(('Index','Middle','Ring','Pinky')):
        piece('Fingers',(sign*2.72,-.41+i*.19,6.52+abs(i-1)*.07),(.136,.127,.35),side+digit,(.39,.212,.124),.76)
    piece('Thumb',(sign*2.43,-.36,6.84),(.165,.17,.32),side+'Thumb',(.39,.212,.124),.76)
    piece('Toe leather',(sign*1.6,-.10,.54),(.74,1.10,.43),side+'Foot',(.071,.045,.031),.66)
    for i in range(4):
        piece('Boot laces',(sign*1.6,-.70+i*.17,.83+i*.044),(.42,.047,.043),side+'Foot',(.20,.145,.09),.85)
bpy.ops.object.select_all(action='DESELECT')
for part in [mesh,*details]:part.select_set(True)
bpy.context.view_layer.objects.active=mesh;bpy.ops.object.join()

rig.animation_data_clear()
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
other=load(donor)
tracks=list(other.animation_data.nla_tracks)
actions=[(t.name,t.strips[0].action) for t in tracks]
other.animation_data_clear()
rig.animation_data_create()
for name,src in actions:
    other.animation_data_create().action=src
    dst=bpy.data.actions.new('Target_'+name);rig.animation_data.action=dst
    start,end=map(round,src.frame_range)
    for f in range(start,end+1):
        scene.frame_set(f)
        for p in rig.pose.bones:
            d=other.pose.bones.get(p.name)
            if not d:continue
            # Transfer local bend/twist in anatomical bone coordinates.
            p.rotation_mode='QUATERNION';q=d.matrix_basis.to_quaternion()
            if f>start:q.make_compatible(p.rotation_quaternion)
            p.rotation_quaternion=q;p.keyframe_insert('rotation_quaternion',frame=f)
            if p.parent is None:
                p.location=d.location;p.keyframe_insert('location',frame=f)
    tr=rig.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,start,dst);tr.mute=True
    rig.animation_data.action=None
other.animation_data_clear()
for o in list(bpy.context.scene.objects):
    if o not in (mesh,rig):bpy.data.objects.remove(o,do_unlink=True)
for name,src in actions:bpy.data.actions.remove(src)
for t in rig.animation_data.nla_tracks:
    t.strips[0].action.name=t.name
bpy.ops.wm.save_as_mainfile(filepath=str(output/'river.blend'))
bpy.ops.export_scene.gltf(filepath=str(output/'river.glb'),export_animation_mode='ACTIONS',export_apply=True)
