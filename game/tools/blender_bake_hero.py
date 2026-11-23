#!/usr/bin/env python3
"""Strict, non-destructive Blender -> offline River Explorer GLB PBR exporter.

Invoke with a real editable source .blend (not a JPEG or turnaround GLB):
  blender --background Hero.blend --python game/tools/blender_bake_hero.py -- \
    --out /tmp/river_explorer_candidate.glb --size 1024 --samples 32

Requires Cycles, non-overlapping *already authored* UV0, armature with EXACT
game bone names, 13 correctly exported actions, feet at origin and unapplied
object scales. Does not invent missing rigged Blender geometry and does NOT
overwrite the canonical game asset. CPU is supported for reproducibility.

Cycles can bake base color, tangent normals, AO and roughness. Metallic has no
native Cycles bake pass: this script only supports a constant source metallic
factor across a mesh; procedural/varying metallic inputs fail explicitly.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import struct
import sys
from pathlib import Path

REQUIRED_BONES=(
    "Hips","Spine","Chest","Neck","Head",
    "LeftUpperArm","LeftForearm","LeftHand",
    "RightUpperArm","RightForearm","RightHand",
    "LeftUpperLeg","LeftLowerLeg","LeftFoot",
    "RightUpperLeg","RightLowerLeg","RightFoot",
    "LeftThumb","LeftIndex","LeftMiddle","LeftRing","LeftPinky",
    "RightThumb","RightIndex","RightMiddle","RightRing","RightPinky"
)
REQUIRED_CLIPS=(
    "Idle","Walk","Run","Sprint","FishingCast","Cook","Track",
    "Drive","Interact","Jump","Land","Farm","Wave"
)

def check_name_contract(bones,actions):
    actual=set(bones)
    missing=set(REQUIRED_BONES)-actual
    if missing:
        raise ValueError("Missing bones: "+", ".join(sorted(missing)))
    extras=actual-set(REQUIRED_BONES)
    if extras or len(bones)!=27:
        raise ValueError("Expected exactly the 27 game bones; extras: "+", ".join(sorted(extras)))
    missing_actions=set(REQUIRED_CLIPS)-set(actions)
    if missing_actions:
        raise ValueError("Missing actions: "+", ".join(sorted(missing_actions)))

def pack_orm_pixels(ao_pixels,rough_pixels,metallic):
    """Pack linear/non-color floats R=AO, G=roughness, B=metallic, A=1."""
    if len(ao_pixels)!=len(rough_pixels):
        raise ValueError("ORM inputs have different lengths")
    if len(ao_pixels)==0 or len(ao_pixels)%4:
        raise ValueError("ORM inputs must contain RGBA pixels")
    if not isinstance(metallic,(int,float)) or not math.isfinite(metallic) or not 0<=metallic<=1:
        raise ValueError("Invalid constant metallic factor: requires 0..1")
    out=[]
    for i in range(0,len(ao_pixels),4):
        if not all(math.isfinite(v) and 0<=v<=1 for v in (ao_pixels[i],rough_pixels[i])):
            raise ValueError("Nonlinear or invalid AO/roughness sample")
        out.extend([ao_pixels[i],rough_pixels[i],float(metallic),1])
    return out

def verify_export_json(doc):
    if doc.get("asset",{}).get("version")!="2.0":
        raise ValueError("Expected glTF 2.0")
    if len(doc.get("skins",[]))!=1 or len(doc["skins"][0].get("joints",[]))!=27:
        raise ValueError("Expected one 27-bone skinned armature")
    skin_nodes=[doc["nodes"][i]["name"] for i in doc["skins"][0]["joints"]]
    check_name_contract(skin_nodes,[a.get("name") for a in doc.get("animations",[])])
    if len(doc.get("buffers",[]))!=1 or doc["buffers"][0].get("uri"):
        raise ValueError("External GLB buffer is forbidden")
    images=doc.get("images",[])
    if any(img.get("uri") or not isinstance(img.get("bufferView"),int) for img in images):
        raise ValueError("External or missing image bytes in GLB")
    textures=doc.get("textures",[])
    materials=doc.get("materials",[])
    if not materials or not images or not textures:
        raise ValueError("Baked PBR textures missing")
    required_slots=(
        lambda m:m.get("pbrMetallicRoughness",{}).get("baseColorTexture"),
        lambda m:m.get("normalTexture"),
        lambda m:m.get("pbrMetallicRoughness",{}).get("metallicRoughnessTexture"),
        lambda m:m.get("occlusionTexture"),
    )
    if not any(all(check(m) is not None for check in required_slots) for m in materials):
        raise ValueError("Expected embedded albedo, normal, metallic/roughness and AO slots")
    for material in materials:
        pbr=material.get("pbrMetallicRoughness",{})
        infos=[pbr.get("baseColorTexture"),pbr.get("metallicRoughnessTexture"),
               material.get("normalTexture"),material.get("occlusionTexture")]
        for info in infos:
            if info is None:
                continue
            if not isinstance(info.get("index"),int) or info["index"]<0 or info["index"]>=len(textures):
                raise ValueError("Bad exported PBR texture index")
            if info.get("texCoord",0)!=0:
                raise ValueError("TEXCOORD_1 would not be rendered by the current runtime")
            img_idx=textures[info["index"]].get("source")
            if not isinstance(img_idx,int) or not 0<=img_idx<len(images):
                raise ValueError("Unresolved PBR texture image")
    return True

def _load_glb_json(path):
    raw=Path(path).read_bytes()
    if len(raw)<20 or raw[:4]!=b"glTF" or struct.unpack_from("<I",raw,4)[0]!=2:
        raise ValueError("Not a glTF 2.0 binary")
    if struct.unpack_from("<I",raw,8)[0]!=len(raw):
        raise ValueError("GLB size header mismatch")
    size,chunk_type=struct.unpack_from("<II",raw,12)
    if chunk_type!=0x4E4F534A or size>len(raw)-20:
        raise ValueError("Missing first GLB JSON chunk")
    return json.loads(raw[20:20+size])

def _material_metallic(mat):
    if not mat or not mat.use_nodes:
        raise ValueError("Materials must use Principled BSDF nodes before baking")
    pbs=[node for node in mat.node_tree.nodes if node.type=="BSDF_PRINCIPLED"]
    if len(pbs)!=1:
        raise ValueError("Exactly one Principled BSDF node per material is required")
    socket=pbs[0].inputs.get("Metallic")
    if not socket or socket.is_linked:
        raise ValueError("Procedural metallic inputs require manual bake before this exporter")
    metal=float(socket.default_value)
    if not 0<=metal<=1 or not math.isfinite(metal):
        raise ValueError("Invalid metallic factor")
    return metal

def _new_image(bpy,name,size,non_color):
    img=bpy.data.images.new(name,width=size,height=size,alpha=True,float_buffer=False)
    img.file_format="PNG"
    img.colorspace_settings.name="Non-Color" if non_color else "sRGB"
    return img

def _bake(bpy,mesh,image,bake_type,outdir,samples):
    # One shared target across the existing source material slots, with a
    # pre-existing UV atlas for this mesh. We do not auto-generate UVs.
    for slot in mesh.material_slots:
        mat=slot.material
        nodes=mat.node_tree.nodes
        n=nodes.new("ShaderNodeTexImage")
        n.name="__River_Bake_Target__"
        n.image=image
        nodes.active=n
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active=mesh
    scene=bpy.context.scene
    scene.render.engine="CYCLES"
    scene.cycles.samples=samples
    kw={"type":bake_type,"margin":8,"use_clear":True}
    if bake_type=="DIFFUSE":
        kw["pass_filter"]={"COLOR"}  # no direct or indirect illumination baked into albedo
    bpy.ops.object.bake(**kw)
    target=outdir/(image.name+".png")
    image.filepath_raw=str(target);image.file_format="PNG";image.save()
    image.pack()
    for slot in mesh.material_slots:
        nodes=slot.material.node_tree.nodes
        n=nodes.get("__River_Bake_Target__")
        if n:
            nodes.remove(n)

def _set_gltf_material(bpy,obj,albedo,normal,orm):
    mat=bpy.data.materials.new(name="RiverBaked_"+obj.name)
    mat.use_nodes=True
    nodes=mat.node_tree.nodes
    nodes.clear()
    links=mat.node_tree.links
    out=nodes.new("ShaderNodeOutputMaterial")
    bsdf=nodes.new("ShaderNodeBsdfPrincipled")
    links.new(bsdf.outputs["BSDF"],out.inputs["Surface"])
    color=nodes.new("ShaderNodeTexImage");color.image=albedo
    links.new(color.outputs["Color"],bsdf.inputs["Base Color"])
    norm_tex=nodes.new("ShaderNodeTexImage");norm_tex.image=normal
    nm=nodes.new("ShaderNodeNormalMap")
    nm.space="TANGENT"
    links.new(norm_tex.outputs["Color"],nm.inputs["Color"])
    links.new(nm.outputs["Normal"],bsdf.inputs["Normal"])
    packed=nodes.new("ShaderNodeTexImage");packed.image=orm
    channels=nodes.new("ShaderNodeSeparateColor")
    links.new(packed.outputs["Color"],channels.inputs["Color"])
    links.new(channels.outputs["Green"],bsdf.inputs["Roughness"])
    links.new(channels.outputs["Blue"],bsdf.inputs["Metallic"])
    # Blender's official glTF exporter recognizes this named group's input,
    # keeping AO independent of the shader's direct color channels.
    group=bpy.data.node_groups.get("glTF Material Output")
    if group is None:
        group=bpy.data.node_groups.new("glTF Material Output","ShaderNodeTree")
        group.interface.new_socket(name="Occlusion",in_out="INPUT",socket_type="NodeSocketFloat")
    ao=nodes.new("ShaderNodeGroup");ao.node_tree=group
    links.new(channels.outputs["Red"],ao.inputs["Occlusion"])
    obj.data.materials.clear()
    obj.data.materials.append(mat)

def run():
    import bpy
    argv=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out",type=Path,required=True)
    parser.add_argument("--size",type=int,choices=(512,1024),default=1024)
    parser.add_argument("--samples",type=int,default=32)
    parser.add_argument("--armature",default="Armature")
    args=parser.parse_args(argv)
    if not 4<=args.samples<=128:
        raise ValueError("Bake samples must be 4..128")
    if not bpy.data.filepath or not Path(bpy.data.filepath).is_file():
        raise ValueError("Load and save a real source .blend before exporting")
    arm=bpy.data.objects.get(args.armature)
    if not arm or arm.type!="ARMATURE":
        raise ValueError("Missing editable rig armature object: "+args.armature)
    check_name_contract(tuple(arm.data.bones.keys()),tuple(a.name for a in bpy.data.actions))
    objects=[o for o in bpy.data.objects if o.type=="MESH" and
             (o.parent==arm or any(m.type=="ARMATURE" and m.object==arm for m in o.modifiers))]
    if not objects:
        raise ValueError("Missing genuine skinned character meshes bound to the armature")
    for obj in [arm,*objects]:
        if any(abs(v-1)>1e-4 for v in obj.scale) or any(abs(v)>1e-4 for v in obj.rotation_euler):
            raise ValueError("Apply scale and rotation to "+obj.name+" before baking")
    for obj in objects:
        if not obj.data.uv_layers.active:
            raise ValueError("Missing UV0 atlas on "+obj.name)
        if not obj.material_slots or any(not s.material for s in obj.material_slots):
            raise ValueError("Material slots are missing on "+obj.name)
    args.out=args.out.resolve()
    args.out.parent.mkdir(parents=True,exist_ok=True)
    bake_dir=args.out.parent/(args.out.stem+"_baked_maps")
    bake_dir.mkdir(parents=True,exist_ok=True)
    for obj in objects:
        metal_set={round(_material_metallic(s.material),6) for s in obj.material_slots}
        if len(metal_set)!=1:
            raise ValueError("Multiple metallic factors on "+obj.name+"; author a metallic atlas first")
        metallic=metal_set.pop()
        imgs={}
        for name,t,non_color in (("albedo","DIFFUSE",False),("normal","NORMAL",True),
                                  ("ao","AO",True),("roughness","ROUGHNESS",True)):
            img=_new_image(bpy,obj.name+"_"+name,args.size,non_color)
            _bake(bpy,obj,img,t,bake_dir,args.samples)
            imgs[name]=img
        packed=_new_image(bpy,obj.name+"_orm",args.size,True)
        packed.pixels[:]=pack_orm_pixels(list(imgs["ao"].pixels),list(imgs["roughness"].pixels),metallic)
        packed.filepath_raw=str(bake_dir/(packed.name+".png"))
        packed.file_format="PNG";packed.save();packed.pack()
        _set_gltf_material(bpy,obj,imgs["albedo"],imgs["normal"],packed)
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=arm
    # Export API changes across Blender versions. Only pass supported options.
    parameters=set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    kwargs={"filepath":str(args.out),"export_format":"GLB","use_selection":True,
            "export_texcoords":True,"export_normals":True,"export_materials":"EXPORT",
            "export_animations":True,"export_apply":False,"export_image_format":"AUTO"}
    if "export_animation_mode" in parameters:
        kwargs["export_animation_mode"]="ACTIONS"
    elif "export_nla_strips" in parameters:
        kwargs["export_nla_strips"]=True
    bpy.ops.export_scene.gltf(**{key:value for key,value in kwargs.items() if key in parameters})
    try:
        doc=_load_glb_json(args.out)
        verify_export_json(doc)
    except Exception:
        args.out.unlink(missing_ok=True)
        raise
    source=Path(bpy.data.filepath)
    receipt={"status":"STRUCTURAL_BAKE_ONLY_NOT_DEFORMATION_VERIFIED",
             "sourceBlendSHA256":hashlib.sha256(source.read_bytes()).hexdigest(),
             "glbSHA256":hashlib.sha256(args.out.read_bytes()).hexdigest(),
             "asset":args.out.name,"bytes":args.out.stat().st_size,
             "uvAtlasSize":args.size,"sourceMeshes":[o.name for o in objects],
             "bakedChannels":["albedo_sRGB","normal_linear","ORM_linear_AO_R_roughness_G_metallic_B"],
             "boneCount":27,"clipCount":13,"physicalIPhoneVerified":False,
             "deformationVerified":False,"productionPromoted":False}
    args.out.with_suffix(".bake-receipt.json").write_text(json.dumps(receipt,indent=2)+"\n")
    print(json.dumps(receipt,indent=2))

if __name__=="__main__":
    run()
