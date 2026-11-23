"""Exercise each exported clip in Blender, measure deformation, and render a paired walk."""
import bpy,sys,json,math
import numpy as np
from mathutils import Matrix, Vector
from pathlib import Path
out=Path(sys.argv[-1]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.fps=24
report={}
def positions(mesh):
    m=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
    a=np.empty(3*len(m.vertices),dtype=np.float32);m.vertices.foreach_get('co',a)
    return a.reshape(-1,3)
measure_only='--measure-only' in sys.argv
for label in (('river','bill_tucker','scout') if measure_only else ('river','scout')):
    if measure_only:bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=str(out/(label+'.glb')))
    rig=next(o for o in bpy.context.selected_objects if o.type=='ARMATURE')
    mesh=next(o for o in bpy.context.selected_objects if o.type=='MESH')
    tracks={t.name:t.strips[0].action for t in rig.animation_data.nla_tracks}
    rig.animation_data_clear();rig.animation_data_create()
    for p in rig.pose.bones:
        p.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
    rest=positions(mesh).copy()
    e=np.array([tuple(edge.vertices) for edge in mesh.data.edges])
    def lengths(a):return np.linalg.norm(a[e[:,0]]-a[e[:,1]],axis=1)
    initial=lengths(rest);valid=initial>.0001
    report[label]={}
    for name,action in tracks.items():
        rig.animation_data.action=action;lo,hi=action.frame_range
        ratios=[];motion=0
        for f in np.linspace(lo,hi,17):
            scene.frame_set(int(f),subframe=float(f%1));v=positions(mesh)
            if not np.isfinite(v).all():raise ValueError(name+' nonfinite pose')
            ratios.append(lengths(v)[valid]/initial[valid]);motion=max(motion,float(np.linalg.norm(v-rest,axis=1).max()))
        r=np.asarray(ratios);report[label][name]={'samples':17,'peak_displacement':motion,'edge_ratio_p01':float(np.percentile(r,1)),'edge_ratio_p99':float(np.percentile(r,99)),'max_edge_ratio':float(r.max())}
        if not np.isfinite(r).all() or motion<1e-5 or np.percentile(r,99)>2.5:
            raise ValueError(f'{label} {name} failed deformation check')
    if measure_only:continue
    walk=next(a for n,a in tracks.items() if n.split('.')[0]=='Walk')
    rig.animation_data.action=None
    cycle=rig.animation_data.nla_tracks.new().strips.new('Walk',1,walk)
    cycle.repeat=8
    rig.scale=(.1,)*3 if label=='river' else (1,)*3
    rig.location.x=-.32 if label=='river' else .38
(out/'deformation.json').write_text(json.dumps(report,indent=2)+'\n')
if measure_only:sys.exit(0)
def aim(obj,point):obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200);ground=bpy.context.object
m=bpy.data.materials.new('Slate');m.diffuse_color=(.10,.13,.13,1);ground.data.materials.append(m)
scene.world=bpy.data.worlds.new('Studio');scene.world.color=(.24,.24,.24)
for pos,power,size,color in [((-2,-3,4),420,3,(1,.85,.72)),((2,1,3),460,2,(.69,.82,1))]:
    bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color;aim(o,(0,0,.7))
bpy.ops.object.camera_add(location=(2.5,-4.8,1.7));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.55;aim(cam,(0,0,.82));scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.use_denoising=False;scene.cycles.samples=24;scene.render.resolution_x=720;scene.render.resolution_y=480;scene.render.resolution_percentage=100
# Move from a three-quarter view to a frontal silhouette while both gait
# cycles play. Head and foot clearance stay inside the landscape frame.
cam.data.ortho_scale=2.82
for frame,location in [(1,(2.8,-4.4,1.58)),(72,(-1.2,-4.95,1.34))]:
    cam.location=location;aim(cam,(0,0,.82))
    cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame)
scene.frame_start=1;scene.frame_end=72;scene.render.filepath=str(out/'frames'/'cast-')
bpy.ops.render.render(animation=True)
