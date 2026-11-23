"""Construct River's garment cage and skeleton using measured turnaround landmarks.

XY on the guide is measured in a normalized 560 x 420 image. Depth comes
from the side panel, increasing towards the face. Blender units correspond
to the game controller. Export glTF uses +Y up.
"""
import os
import bpy
import json
import math
import struct
import sys
from pathlib import Path

from mathutils import Matrix, Quaternion, Vector
from math import pi, sin, cos

guide, v2_file, donor_file, output = [Path(v).resolve() for v in sys.argv[-4:]]
bpy.ops.wm.read_factory_settings(use_empty=True)
raw = v2_file.read_bytes()
v2 = json.loads(raw[20:20 + struct.unpack_from('<I',raw,12)[0]])
original = [v2['nodes'][i]['translation'] for i in v2['skins'][0]['joints']]
if len(original) != 17:
    raise ValueError('Expected the 17-landmark River v2 skeleton')
bill = os.environ.get("VALLEY_CHARACTER") == "bill_tucker"
unit = 16.4/122
def point(x,y,depth=319):
    return Vector(((x-175.5)*unit,(319-depth)*unit,(165-y)*unit))

# Articulation pivots align with the elbows, wrists, knees and ankles on the new cage.
joints = {}
def joint(name,parent,x,y,d=319):
    joints[name]=(parent,point(x,y,d))
joint('Hips',None,175.5,100)
joint('Spine','Hips',175.5,89)
joint('Chest','Spine',175.5,75)
joint('Neck','Chest',175.5,64)
joint('Head','Neck',175.5,59)
digits=('Thumb','Index','Middle','Ring','Pinky')
for sign,side in [(-1,'Left'),(1,'Right')]:
    def limb(n,parent,offset,y,depth=319):
        joint(side+n,parent,175.5+sign*offset,y,depth)
    limb('UpperArm','Chest',11.8,69)
    limb('Forearm',side+'UpperArm',16.8,84)
    limb('Hand',side+'Forearm',21,98,320)
    limb('UpperLeg','Hips',6.7,102)
    limb('LowerLeg',side+'UpperLeg',9.8,127,320)
    limb('Foot',side+'LowerLeg',12.8,153,315)
    for i,d in enumerate(digits):
        limb(d,side+'Hand',19.7 if i==0 else 21.4+.45*(i-2),103.8,320.9-i*.8)

mats=[]
def material(name,color,roughness,metallic=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=roughness;bs.inputs['Metallic'].default_value=metallic
    mats.append(m);return m
body=material('Turnaround garment and skin atlas',(1,1,1),.82)
graph=body.node_tree;bs=graph.nodes.get('Principled BSDF')
tex=graph.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(guide));tex.image.pack()
graph.links.new(tex.outputs[0],bs.inputs['Base Color'])
# Material response per source panel. Dark fabrics are coarse, skin smoother,
# the lenses and necklace have separate materials.
import numpy as np
image=tex.image;w,h=image.size
pixels=np.empty(w*h*4,dtype=np.float32);image.pixels.foreach_get(pixels)
rgb=pixels.reshape(h,w,4)[:,:,:3];lum=rgb@np.array([.2126,.7152,.0722])
yy,xx=np.mgrid[:h,:w]
cloth=(rgb[:,:,0] < .20)
weave=(np.sin(xx*np.pi*.5)*np.cos(yy*np.pi*.5))*.02
relief=.045*lum+weave*cloth
dy,dx=np.gradient(relief)
def bitmap(name,channels):
    img=bpy.data.images.new(name,w,h,alpha=False);img.colorspace_settings.name='Non-Color'
    data=np.ones((h,w,4),np.float32);data[:,:,:3]=channels
    img.pixels.foreach_set(np.ascontiguousarray(data).ravel());img.pack()
    t=graph.nodes.new('ShaderNodeTexImage');t.image=img;return t
normal=bitmap('Woven surface normals',np.stack([.5-2*dx,.5-2*dy,np.ones_like(dx)],axis=2).clip(0,1))
n=graph.nodes.new('ShaderNodeNormalMap');graph.links.new(normal.outputs[0],n.inputs['Color']);graph.links.new(n.outputs[0],bs.inputs['Normal'])
packed=bitmap('River packed surface',np.stack([np.ones_like(lum),np.where(cloth,.86,.59)+weave,0*lum],axis=2))
split=graph.nodes.new('ShaderNodeSeparateColor');graph.links.new(packed.outputs[0],split.inputs[0])
graph.links.new(split.outputs['Green'],bs.inputs['Roughness']);graph.links.new(split.outputs['Blue'],bs.inputs['Metallic'])
material('Acetate',(.016,.013,.009),.24)
material('Smoke glass',(.074,.085,.064),.12,.32)
material('Brass chain',(.44,.25,.064),.28,.8)
material('Glove leather',(.045,.031,.022),.72)
material('Boot tread',(.036,.031,.024),.89)

if bill:
    for name, rgb in [('Skin',(.48,.27,.17)),('Olive cotton',(.12,.16,.085)),('Indigo denim',(.07,.14,.21)),('Brown leather',(.09,.047,.026)),('Cap canvas',(.24,.23,.14))]:
        fabric=material(name,rgb,.83)
        graph=fabric.node_tree
        bs=graph.nodes.get('Principled BSDF')
        w=h=128
        y,x=np.mgrid[:h,:w]
        weave=np.sin(2*pi*x/4)*np.cos(2*pi*y/4)
        grain=.014*np.sin(2*pi*(x+2*y)/17)
        relief=.012*weave if name!='Skin' else .002*weave
        color=np.array(rgb)[None,None,:]*(1+.085*weave[:,:,None]+grain[:,:,None])
        tint=bitmap(name+' colour',color)
        graph.links.new(tint.outputs[0],bs.inputs['Base Color'])
        dy,dx=np.gradient(relief)
        normal=bitmap(name+' surface normal',np.stack([.5-dx,.5-dy,np.ones_like(dx)],axis=2))
        node=graph.nodes.new('ShaderNodeNormalMap')
        graph.links.new(normal.outputs[0],node.inputs['Color']);graph.links.new(node.outputs[0],bs.inputs['Normal'])
        packed=bitmap(name+' packed material',np.stack([np.ones_like(x),(.68 if name=='Brown leather' else .80)+.055*weave,np.zeros_like(x)],axis=2))
        split=graph.nodes.new('ShaderNodeSeparateColor');graph.links.new(packed.outputs[0],split.inputs[0])
        graph.links.new(split.outputs['Green'],bs.inputs['Roughness']);graph.links.new(split.outputs['Blue'],bs.inputs['Metallic'])
verts=[];faces=[];uvs=[];weights=[];surface=[]
def uv(v,panel):
    x,d,z=v;py=165-z/unit
    if panel==0:px=175.5+x/unit;l,r=147,203
    elif panel==1:px=319-d/unit;l,r=295,339
    else:px=384-x/unit;l,r=353,412
    return ((panel+max(.002,min(.998,(px-l)/(r-l))))/3,max(.002,min(.998,(166-py)/123)))
def poly(indices,mat=0):
    a,b,c=[verts[i] for i in indices[:3]];normal=(b-a).cross(c-a)
    # Winding follows top-to-bottom ring order.
    n=normal.normalized()
    panel=(0 if n.y<0 else 2) if abs(n.y)>.57*abs(n.x) else 1
    faces.append(indices);uvs.append([uv(verts[i],panel) for i in indices]);surface.append(mat)
def single(b):return {b:1}
def mix(a,b,t):return {a:1-t,b:t}
def loft(rows,mat=0,sides=24,fold=.0):
    if bill and mat==0:
        x,y,d,_,_,_=rows[0]
        if y<64 and d<312: return
        mat = 6 if y<62.8 else 7 if y<77 else 6 if abs(x-175.5)>14 and y<99 else 9 if y>143 else 8
    start=len(verts)
    for i,(x,y,d,rx,rd,weight) in enumerate(rows):
        for j in range(sides):
            angle=2*pi*j/sides
            amplitude=1+fold*(sin(5*angle+.7*i)+.4*cos(8*angle-i))
            verts.append(point(x+rx*cos(angle)*amplitude,y,d+rd*sin(angle)*amplitude))
            weights.append(single(weight) if isinstance(weight,str) else weight)
    for i in range(len(rows)-1):
        for j in range(sides):
            a=start+i*sides+j;b=start+i*sides+(j+1)%sides
            poly((a,b,b+sides,a+sides),mat)
    for i in [0,len(rows)-1]:
        ring=[start+i*sides+j for j in range(sides)]
        poly(tuple(reversed(ring)) if i==0 else tuple(ring),mat)
def ellipsoid(x,y,d,rx,ry,rd,bone,mat=0):
    rows=[]
    for i in range(1,12):
        a=i*pi/12
        rows.append((x,y-ry*cos(a),d,rx*sin(a),rd*sin(a),bone))
    loft(rows,mat,20)
# Head, curls, gathered gaiter and neck. Front/rear sampling preserves the
# supplied mask print and trim while the side panel wraps the jaw and neck.
loft([(175.5,45,318,3,3,'Head'),(175.5,47,318,5.8,5,'Head'),(175.5,51,319,5.7,6,'Head'),(175.5,54,319.8,5.35,6,'Head'),(175.5,57,319.5,4.8,5.7,'Head'),(175.5,60.2,319,4,4.8,'Head')])
if bill:
    ellipsoid(175.5,47.1,319,6.5,4.25,6.2,'Head',10)
    ellipsoid(175.5,49.15,324,6.15,.59,4.5,'Head',10)
    ellipsoid(175.5,53.5,325,1.35,1.85,1.6,'Head',6)
    ellipsoid(175.5,57,324,1.63,.36,.48,'Head',9)
    for side in (-1,1):
        ellipsoid(175.5+side*2.28,51.8,324.5,.82,.48,.5,'Head',1)
        ellipsoid(175.5+side*5.25,53.9,318.8,1.0,2.12,1.15,'Head',6)
    loft([(175.5,58,319,3.65,3.8,'Head'),(175.5,61.5,318.9,3.7,3.8,'Neck'),(175.5,65.8,318.5,4.25,4.4,'Neck')],6)
else:
    for row,y in enumerate([45.6,47.1]):
        for i in range(14):
            a=2*pi*i/14+.19*row
            ellipsoid(175.5+4.55*cos(a),y+.6*sin(3*a),318.1+4.0*sin(a),1.65,1.55,1.48,'Head')
    loft([(175.5,54.2,320,5.45,5.9,'Head'),(175.5,55.9,320.4,5.75,6.5,'Head'),(175.5,57.0,320.1,5.52,6.05,'Head'),(175.5,59.0,319.9,5.75,6.12,'Head'),(175.5,60.2,319.1,5.27,5.45,mix('Head','Neck',.25)),(175.5,62.2,319,5.7,5.3,mix('Head','Neck',.68)),(175.5,64.4,318.6,5.5,5.0,'Neck')],fold=.022)
# Connected shirt, pelvis and belt.
loft([(175.5,62.8,318.4,5.2,4.75,'Chest'),(175.5,65.0,318.7,9.4,5.55,'Chest'),(175.5,68.5,319,12.4,6.6,'Chest'),(175.5,73,319.3,12.0,7.25,'Chest'),(175.5,79,319.3,11.5,7.45,mix('Chest','Spine',.3)),(175.5,84,319.2,10.8,6.8,mix('Chest','Spine',.72)),(175.5,89,319,10.2,6.55,'Spine'),(175.5,92.8,319.1,10.8,6.6,mix('Spine','Hips',.75)),(175.5,95.1,319,11.2,6.9,'Hips')],fold=.015)
loft([(175.5,92,319,10.5,6.75,'Hips'),(175.5,94.5,319,11.5,7.1,'Hips'),(175.5,98,319,12.8,7.6,'Hips'),(175.5,102,319,12.6,7.4,'Hips'),(175.5,105.5,319,9.7,6.1,'Hips')])
# Backpack volume extends to the measured rear silhouette in side view.
if not bill: loft([(175.5,65,311.8,4.7,2.1,'Chest'),(175.5,68,309.6,8.5,4,'Chest'),(175.5,72,307.3,9.7,6.1,'Chest'),(175.5,80,306.9,10.0,7.2,'Chest'),(175.5,85,306.9,9.8,7.5,'Chest'),(175.5,89.8,307.1,8.9,6.5,'Chest'),(175.5,92,308.2,6.9,4,'Chest')],fold=.012)
for sign,side in [(-1,'Left'),(1,'Right')]:
    upper,fore,hand=[side+s for s in ['UpperArm','Forearm','Hand']]
    thigh,shin,foot=[side+s for s in ['UpperLeg','LowerLeg','Foot']]
    def limb(rows,mat=0,fold=.0):
        loft([(175.5+sign*x,y,d,rx,rd,b) for x,y,d,rx,rd,b in rows],mat,fold=fold)
    limb([(10.9,66.6,319,3.4,4.4,mix('Chest',upper,.50)),(12.5,69,319,4.5,5.3,upper),(13.6,72.5,319,4.5,5.15,upper),(14.8,76.7,319.3,4.0,4.5,upper),(15,78.9,319.4,3.8,4.35,upper)])
    limb([(14.9,77.7,319.5,3.6,4.1,upper),(15.6,80.6,319.5,3.75,3.95,mix(upper,fore,.15)),(16.8,84,319.4,3.15,3.6,mix(upper,fore,.55)),(17.8,87.3,319.8,3.6,3.8,fore),(19.4,92.5,320,2.9,3.1,fore),(21.1,98.7,320,2.45,2.5,mix(fore,hand,.7))])
    limb([(20.6,96.6,320,2.8,2.65,hand),(21.1,98.1,320,2.95,3,hand),(21.4,100.8,320.3,2.8,3.2,hand),(21.5,104.5,320.3,2.6,3,hand)])
    for i,digit in enumerate(digits):
        offset=19.0 if i==0 else 21.8+.4*(i-2)
        dc=321.9 if i==0 else 322.3-(i-1)*1.35
        end=107.2 if i==0 else 109.3-abs(i-2)*.55
        limb([(offset,102.8,dc,.96,.95,side+digit),(offset+.35,105.2,dc,1,.9,side+digit),(offset+.1,end-1.2,dc+.48,.85,.78,side+digit),(offset-.55,end,dc+.9,.64,.68,side+digit)],4)
    limb([(6.25,99.5,319.1,6.2,6.6,mix('Hips',thigh,.38)),(6.7,103,319,7,7.25,mix('Hips',thigh,.75)),(7.7,107,319.7,7.1,7.25,thigh),(8.75,113,319.4,6.65,7.05,thigh),(9.1,119.2,319.2,5.7,6,thigh),(9.6,123.1,319.2,5.45,5.4,mix(thigh,shin,.2)),(9.8,126.7,320,5.35,5.95,mix(thigh,shin,.52)),(10.0,129.6,318.8,5.65,5.8,mix(thigh,shin,.8)),(10.7,134.2,316.9,6.05,6,shin),(11.7,137.5,316.4,5.65,5.8,shin),(11.9,139.2,316,6.0,5.65,shin),(12.1,141.7,315.1,6.2,5.9,shin),(12.4,143.6,315,6.75,6.1,shin),(12.55,145.3,314.9,5.8,5.45,shin),(12.6,147.0,315,4.7,4.8,shin)],fold=.033)
    limb([(12.6,144.5,315.4,4.85,4.9,shin),(12.7,149,315.0,4.36,4.75,mix(shin,foot,.33)),(13.0,153.2,315,4.4,4.85,mix(shin,foot,.85)),(13.4,157.4,317.2,4.85,6.5,foot),(14.2,160.4,318.1,6.0,9.5,foot),(14.7,162.6,318.7,6.60,11.4,foot)],fold=.013)
    limb([(14.7,162,318.7,6.6,11.3,foot),(14.9,163.6,318.6,6.75,11.45,foot),(14.9,164.6,318.5,6.55,11.2,foot)],5)
    # Gusseted thigh pockets and weight-bearing shoulder straps.
    limb([(11.8,103.5,319.3,2.1,4.5,thigh),(12.5,106,319.3,2.5,5.2,thigh),(12.75,112.0,319.4,2.75,4.85,thigh),(12.7,115,319.4,2.2,4.1,thigh)])
    if bill:
        ellipsoid(175.5+sign*2.9,64.7,323.6,2.8,1.4,.65,'Chest',7)
        if sign==1:
            loft([(181.1,70,325.1,2.4,.51,'Chest'),(181.1,74.8,325.8,2.13,.50,'Chest'),(181.1,75.7,325.8,.5,.40,'Chest')],7)
            for y in (66,69,72):ellipsoid(175.5,y,325.95,.43,.47,.48,'Chest',9)
        continue
    limb([(6.9,64.1,318.9,1.5,2.8,'Chest'),(7.7,66.2,322.5,1.55,2.7,'Chest'),(8.6,70.1,324.2,1.38,1.55,'Chest'),(9.1,74.4,324.5,1.25,1.18,'Chest'),(9.7,79.0,323.7,1.06,1.0,'Chest'),(10.4,83.6,322.1,1.1,1.0,'Chest')])
    # Narrow lenses plus a separate dark frame and temple.
    ellipsoid(175.5+sign*2.92,51.75,324.05,2.87,1.43,.70,'Head',1)
    ellipsoid(175.5+sign*2.94,51.8,324.65,2.43,1.01,.42,'Head',2)
    ellipsoid(175.5+sign*5.3,51.7,320, .42,.53,3.74,'Head',1)
if not bill: ellipsoid(175.5,51.47,324.78,.95,.38,.38,'Head',1)
# Small raised necklace links follow the front of the shirt.
for i in range(0 if bill else 20):
    a=i*pi/19
    ellipsoid(175.5-6.3*cos(a),64.8+7.05*sin(a),321.5+5.15*sin(a),.40,.61,.30,'Chest',3)

mesh=bpy.data.meshes.new('River reconstructed garment cage')
mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('River',mesh);bpy.context.collection.objects.link(obj)
for m in mats:mesh.materials.append(m)
layer=mesh.uv_layers.new()
for poly_id,(p,coords) in enumerate(zip(mesh.polygons,uvs)):
    p.use_smooth=True;p.material_index=surface[poly_id]
    for idx,co in zip(p.loop_indices,coords):layer.data[idx].uv=co

arm=bpy.data.armatures.new('River game skeleton')
rig=bpy.data.objects.new('River rig',arm);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for name,(parent,head) in joints.items():
    b=arm.edit_bones.new(name);b.head=head
    children=[p for par,p in joints.values() if par==name]
    if children:b.tail=children[0]
    else:
        offset=(0,-.8,-.1) if name.endswith('Foot') else (0,0,.8) if name=='Head' else (0,-.08,-.60)
        b.tail=head+Vector(offset)
    if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
obj.parent=rig;mod=obj.modifiers.new('Weighted deformation','ARMATURE');mod.object=rig
groups={n:obj.vertex_groups.new(name=n) for n in joints}
for i,w in enumerate(weights):
    for n,v in w.items():groups[n].add([i],v,'REPLACE')
# Concrete rest landmarks and the source v2 skeleton stay with the editable master.
rig['source_v2_landmarks']=json.dumps(original)
rig['river_authored_pose']=True
bpy.ops.import_scene.gltf(filepath=str(donor_file),bone_heuristic='BLENDER')
donor=next(o for o in bpy.context.selected_objects if o.type=='ARMATURE')
tracks={t.name:t.strips[0].action for t in donor.animation_data.nla_tracks}
donor.animation_data_clear();donor.animation_data_create()
scene=bpy.context.scene;donor.animation_data.action=tracks['Idle'];scene.frame_set(int(tracks['Idle'].frame_range[0]))
neutral={p.name:p.matrix.to_quaternion() for p in donor.pose.bones}
rest={b.name:b.matrix_local.to_quaternion() for b in arm.bones}
rig.animation_data_create()
def align_segment(name,child,goal):
    p=rig.pose.bones[name]
    current=rig.pose.bones[child].head-p.head
    desired=goal-p.head
    if current.length<1e-6 or desired.length<1e-6:return
    world=current.rotation_difference(desired) @ p.matrix.to_quaternion()
    parent=joints[name][0]
    p.rotation_quaternion=rest[name].inverted() @ rest[parent] @ rig.pose.bones[parent].matrix.to_quaternion().inverted() @ world
    bpy.context.view_layer.update()

def wrist_goal(clip,sign,phase):
    w=sin(2*pi*phase)
    swing={'Walk':.65,'Run':1.05,'Sprint':1.32}.get(clip,0)
    if swing:return Vector((sign*2.68,-.33-sign*w*swing,9.35+abs(w)*swing*.30))
    if clip=='FishingCast':
        return Vector((sign*.66+0.45,-1.65-1.08*sin(pi*phase),11.55+.90*cos(2*pi*phase)+(sign*.23)))
    if clip in ('Cook','Farm','Interact'):
        return Vector((sign*(1.16 if clip=='Cook' else .93),-2.12-.52*w*sign,10.15+.38*w))
    if clip=='Track':return Vector((sign*.84,-1.52,14.28))
    if clip=='Drive':return Vector((sign*1.48,-2.94,11.16))
    if clip=='Wave' and sign>0:return Vector((2.85+.46*w,-.63,14.28))
    if clip in ('Jump','Land'):return Vector((sign*(2.95+.42*sin(pi*phase)),-.62,9.85+.6*sin(pi*phase)))
    return Vector((sign*2.78,-.18,9.22+.055*w))

def pose_arms(clip,phase,frame):
    for side,sign in [('Left',-1),('Right',1)]:
        upper,lower,hand=[side+n for n in ('UpperArm','Forearm','Hand')]
        shoulder=rig.pose.bones[upper].head.copy()
        goal=wrist_goal(clip,sign,phase)
        delta=goal-shoulder;axis=delta.normalized()
        l1=(joints[lower][1]-joints[upper][1]).length
        l2=(joints[hand][1]-joints[lower][1]).length
        dist=min(l1+l2-.008,max(abs(l1-l2)+.008,delta.length))
        goal=shoulder+axis*dist
        pole=Vector((sign*.9,1.0,-.45))
        plane=(pole-axis*pole.dot(axis)).normalized()
        along=(l1*l1-l2*l2+dist*dist)/(2*dist)
        elbow=shoulder+axis*along+plane*math.sqrt(max(0,l1*l1-along*along))
        align_segment(upper,lower,elbow);align_segment(lower,hand,goal)
        # Keep bent fingers on the palm side of the prop throughout activity clips.
        grip={'FishingCast':.66,'Drive':.49,'Track':.54,'Cook':.45,'Farm':.53,'Interact':.36}.get(clip,.13)
        for i,digit in enumerate(digits):
            finger=rig.pose.bones[side+digit]
            finger.rotation_quaternion=Quaternion((0,0,1),sign*grip*(.62 if i==0 else 1))
            finger.keyframe_insert('rotation_quaternion',frame=frame)
        for n in (upper,lower):rig.pose.bones[n].keyframe_insert('rotation_quaternion',frame=frame)

for name,source in tracks.items():
    donor.animation_data.action=None
    for p in donor.pose.bones:p.matrix_basis=Matrix.Identity(4)
    donor.animation_data.action=source
    action=bpy.data.actions.new('Reconstructed '+name);rig.animation_data.action=action
    lo,hi=map(round,source.frame_range);previous={}
    for f in range(lo,hi+1):
        scene.frame_set(f)
        world={n:donor.pose.bones[n].matrix.to_quaternion() @ neutral[n].inverted() @ rest[n] for n in joints}
        for n,(parent,_) in joints.items():
            # Invert target rest and parent rotations to express the desired
            # neutral-relative world pose in the target bone's local frame.
            parent_rest=rest[parent] if parent else Quaternion()
            parent_now=world[parent] if parent else Quaternion()
            local=rest[n].inverted() @ parent_rest @ parent_now.inverted() @ world[n]
            if n in previous:local.make_compatible(previous[n])
            previous[n]=local.copy()
            p=rig.pose.bones[n];p.rotation_quaternion=local;p.keyframe_insert('rotation_quaternion',frame=f)
        bpy.context.view_layer.update()
        pose_arms(name,(f-lo)/max(1,hi-lo),f)
    tr=rig.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,lo,action);tr.mute=True;rig.animation_data.action=None
donor.animation_data_clear()
for o in list(scene.objects):
    if o not in (obj,rig):bpy.data.objects.remove(o,do_unlink=True)
for source in tracks.values():bpy.data.actions.remove(source)
for t in rig.animation_data.nla_tracks:t.strips[0].action.name=t.name
scene.frame_set(1)
label='bill_tucker' if bill else 'river'
rig.name='BILL_TUCKER_LOD0_RIGGED' if bill else 'RIVER_LOD0_RIGGED'
obj.name='Bill Tucker' if bill else 'River Explorer'
bpy.ops.wm.save_as_mainfile(filepath=str(output/(label+'.blend')))
bpy.ops.export_scene.gltf(filepath=str(output/(label+'.glb')),export_apply=True,export_extras=True,export_animation_mode='ACTIONS')
