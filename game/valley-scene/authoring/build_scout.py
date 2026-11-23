"""Build Scout's articulated replacement cage in source metres, facing -Y."""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector
from math import sin, cos, pi
out=Path(sys.argv[-1]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bones={}
def bone(name, head, tail, parent=None):
    bones[name]=(head,tail,parent)
bone('Body',(0,.18,.39),(0,-.16,.46))
bone('Neck',(0,-.16,.46),(0,-.25,.60),'Body')
bone('Head',(0,-.25,.60),(0,-.46,.63),'Neck')
bone('Tail',(0,.21,.45),(0,.41,.56),'Body')
vertices=[];faces=[];weights=[];surfaces=[];coordinates=[]
def loft(rings, direction, surface):
    sides=16
    start=len(vertices)
    for i,(center,w,h,weight) in enumerate(rings):
        for j in range(sides):
            a=2*pi*j/sides
            x,y,z=center
            vertices.append((x+w*cos(a),y+(h*sin(a) if direction=='z' else 0),z+(h*sin(a) if direction=='y' else 0)))
            weights.append(weight)
    def face(indices,uv):
        faces.append(indices);surfaces.append(surface);coordinates.append(uv)
    for i in range(len(rings)-1):
        for j in range(sides):
            a=start+i*sides+j;b=start+i*sides+(j+1)%sides
            face((a,b,b+sides,a+sides),[(j/sides,i/(len(rings)-1)),((j+1)/sides,i/(len(rings)-1)),((j+1)/sides,(i+1)/(len(rings)-1)),(j/sides,(i+1)/(len(rings)-1))])
    for i in [0,len(rings)-1]:
        order=list(range(sides))
        if i==0:order.reverse()
        face([start+i*sides+j for j in order],[(.5+.49*cos(2*pi*j/sides),.5+.49*sin(2*pi*j/sides)) for j in order])
def line(rows,direction,mat):
    loft([(c,w,h,{b:1} if isinstance(b,str) else b) for c,w,h,b in rows],direction,mat)
line([((0,.28,.39),.04,.07,'Body'),((0,.18,.40),.12,.14,'Body'),((0,.01,.41),.105,.12,'Body'),((0,-.14,.43),.135,.17,'Body'),((0,-.20,.50),.11,.14,{'Body':.5,'Neck':.5}),((0,-.25,.60),.073,.088,'Neck')],'y',0)
line([((0,-.22,.63),.065,.074,'Head'),((0,-.29,.65),.099,.10,'Head'),((0,-.36,.65),.089,.073,'Head'),((0,-.39,.627),.055,.049,'Head'),((0,-.478,.62),.045,.036,'Head')],'y',0)
line([((0,-.472,.626),.043,.033,'Head'),((0,-.495,.628),.036,.026,'Head')],'y',1)
for sign in [-1,1]:
    x=.096*sign
    line([((x*.8,-.272,.692),.039,.042,'Head'),((x,-.255,.64),.038,.033,'Head'),((x*1.12,-.25,.557),.018,.018,'Head')],'z',1)
    line([((x*.68,-.356,.676),.014,.015,'Head'),((x*.7,-.367,.677),.011,.011,'Head')],'y',1)
    for y in [-.165,.17]:
        side=('L' if sign<0 else 'R')+('Front' if y<0 else 'Hind')
        bend=.035 if y>0 else -.018
        a,b,c=side+'Upper',side+'Lower',side+'Paw'
        bone(a,(x,y,.37),(x,y-bend,.225),'Body')
        bone(b,(x,y-bend,.225),(x,y+.018,.068),a)
        bone(c,(x,y+.018,.068),(x,y-.048,.026),b)
        line([((x,y,.39),.050,.065,a),((x,y-bend,.251),.041,.045,a),((x,y-bend,.222),.032,.034,{a:.5,b:.5}),((x,y+.018,.104),.023,.025,b),((x,y+.018,.065),.022,.023,{b:.5,c:.5}),((x,y-.001,.033),.032,.047,c),((x,y-.012,.014),.031,.052,c)],'z',0)
line([((0,.209,.439),.044,.05,'Body'),((0,.262,.457),.041,.043,{'Body':.35,'Tail':.65}),((0,.344,.502),.031,.033,'Tail'),((0,.425,.552),.009,.011,'Tail')],'y',0)
mesh=bpy.data.meshes.new('Scout loft cage');mesh.from_pydata(vertices,[],faces);mesh.update()
obj=bpy.data.objects.new('Scout',mesh);bpy.context.collection.objects.link(obj)
def texture(name,kind):
    size=128;img=bpy.data.images.new(name,size,size,alpha=False)
    if kind!='coat':img.colorspace_settings.name='Non-Color'
    px=[]
    for y in range(size):
        for x in range(size):
            wave=sin(2*pi*(19*x/size+2*sin(2*pi*y/size))) 
            shade=.84+.12*wave+.04*cos(2*pi*7*y/size)
            value={'coat':(.48*shade,.295*shade,.15*shade),'normal':(.5+.055*wave,.5,.997),'packed':(1,.78+.08*wave,0)}[kind]
            px.extend((*value,1))
    img.pixels[:]=px;img.pack();return img
imgs=[texture('Scout '+k,k) for k in ['coat','normal','packed']]
for name in ['Sable coat','Dark markings']:
    m=bpy.data.materials.new(name);m.use_nodes=True;mesh.materials.append(m)
    nodes=m.node_tree.nodes;link=m.node_tree.links.new;shader=nodes.get('Principled BSDF')
    for i,img in enumerate(imgs):
        t=nodes.new('ShaderNodeTexImage');t.image=img
        if i==0:
            if name=='Sable coat':link(t.outputs['Color'],shader.inputs['Base Color'])
            else:shader.inputs['Base Color'].default_value=(.022,.014,.01,1)
        if i==1:
            n=nodes.new('ShaderNodeNormalMap');link(t.outputs['Color'],n.inputs['Color']);link(n.outputs[0],shader.inputs['Normal'])
        if i==2:
            n=nodes.new('ShaderNodeSeparateColor');link(t.outputs['Color'],n.inputs[0]);link(n.outputs['Green'],shader.inputs['Roughness']);link(n.outputs['Blue'],shader.inputs['Metallic'])
uv=mesh.uv_layers.new()
for p,s,coords in zip(mesh.polygons,surfaces,coordinates):
    p.use_smooth=True;p.material_index=s
    for idx,co in zip(p.loop_indices,coords):uv.data[idx].uv=co
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
arm=bpy.data.armatures.new('Scout skeleton');rig=bpy.data.objects.new('Scout rig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for name,(h,t,parent) in bones.items():
    b=arm.edit_bones.new(name);b.head=h;b.tail=t
    if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');obj.parent=rig
groups={n:obj.vertex_groups.new(name=n) for n in bones}
for i,w in enumerate(weights):
    for n,v in w.items():groups[n].add([i],v,'REPLACE')
mod=obj.modifiers.new('Skin','ARMATURE');mod.object=rig
sub=obj.modifiers.new('Smooth cage','SUBSURF');sub.levels=1
for clip,amplitude,period in [('Idle',.03,40),('Walk',.42,28),('Run',.72,18)]:
    action=bpy.data.actions.new(clip);rig.animation_data_create().action=action
    for i in range(9):
        phase=i*pi/4
        for n in bones:
            p=rig.pose.bones[n];p.rotation_mode='XYZ'
            if n.endswith(('Upper','Lower','Paw')):
                angle=amplitude*sin(phase+(pi if n.startswith(('LFront','RHind')) else 0))
                if n.endswith('Lower'):angle=-max(0,angle)*1.2
                if n.endswith('Paw'):angle*=-.35
            elif n=='Tail':angle=.17*sin(phase)
            else:angle=.025*cos(phase)
            p.rotation_euler=(angle,0,0);p.keyframe_insert('rotation_euler',frame=1+period*i/8)
    tr=rig.animation_data.nla_tracks.new();tr.name=clip;tr.strips.new(clip,1,action);tr.mute=True
rig.animation_data.action=None
bpy.ops.wm.save_as_mainfile(filepath=str(out/'scout.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'scout.glb'),export_apply=True,export_animation_mode='ACTIONS')
