#!/usr/bin/env python3
"""Read-only glTF 2.0 GLB inspection and gameplay-rig gate. Standard library only.

This is NOT a replacement for Khronos glTF-Validator or a deformation/visual QA.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys

CLIPS=("Idle","Walk","Run","Sprint","FishingCast","Cook","Track","Drive","Interact","Jump","Land","Farm","Wave")
JOINTS=("Hips","Spine","Chest","Neck","Head","LeftHand","RightHand","LeftFoot","RightFoot")


def inspect_glb(path):
    path=Path(path)
    raw=path.read_bytes()
    if not 36<=len(raw)<=64_000_000:
        raise ValueError("GLB size outside supported range")
    magic,version,total=struct.unpack_from("<4sII",raw)
    if magic!=b"glTF" or version!=2 or total!=len(raw):
        raise ValueError("Invalid/incomplete glTF 2.0 binary header")
    length,kind=struct.unpack_from("<II",raw,12)
    if kind!=0x4e4f534a or length<2 or 20+length>len(raw):
        raise ValueError("Malformed GLB JSON chunk")
    doc=json.loads(raw[20:20+length])
    if doc.get("asset",{}).get("version")!="2.0":
        raise ValueError("Unsupported glTF asset version")
    bin_head=20+length
    if bin_head+8>len(raw):
        raise ValueError("GLB missing embedded BIN chunk")
    bin_length,bin_type=struct.unpack_from("<II",raw,bin_head)
    if bin_type!=0x004e4942 or bin_head+8+bin_length>len(raw):
        raise ValueError("Incorrect GLB BIN chunk identifier or length")
    buffers=doc.get("buffers",[])
    if len(buffers)!=1 or buffers[0].get("uri") or not 0<buffers[0].get("byteLength",0)<=bin_length:
        raise ValueError("GLB has no complete embedded data buffer")
    sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}
    dims={"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4,"MAT2":4,"MAT3":9,"MAT4":16}
    views=doc.get("bufferViews",[])
    for number,acc in enumerate(doc.get("accessors",[])):
        ref=acc.get("bufferView")
        if type(ref) is not int or not 0<=ref<len(views):
            raise ValueError("Accessor %d missing binary bufferView"%number)
        view=views[ref]
        if view.get("buffer")!=0:
            raise ValueError("Accessor references external data")
        width=sizes.get(acc.get("componentType"),0)*dims.get(acc.get("type"),0)
        count=acc.get("count")
        if width<1 or type(count) is not int or count<1:
            raise ValueError("Accessor has invalid component type or count")
        stride=view.get("byteStride",width)
        offset=view.get("byteOffset",0)+acc.get("byteOffset",0)
        if type(stride) is not int or type(offset) is not int or stride<width or offset<0 or offset+(count-1)*stride+width>buffers[0]["byteLength"]:
            raise ValueError("Accessor extends outside embedded binary buffer")
    nodes=doc.get("nodes",[])
    skins=doc.get("skins",[])
    accessors=doc.get("accessors",[])
    clips=[x.get("name") for x in doc.get("animations",[])]
    issues=[]
    if len(skins)!=1:
        issues.append("Expected exactly one compatible skeleton skin")
    names=[]
    if skins:
        for idx in skins[0].get("joints",[]):
            if type(idx) is not int or not 0<=idx<len(nodes):
                raise ValueError("Skin references invalid joint node")
            names.append(nodes[idx].get("name",""))
    if len(names)!=27:
        issues.append("Expected 27 gameplay joints; found %d"%len(names))
    for name in JOINTS:
        if name not in names:
            issues.append("Missing semantic joint "+name)
    if any(not clip.get("channels") or not clip.get("samplers") for clip in doc.get("animations",[])):
        issues.append("Animation with no actual sampler/pose channels")
    if len(clips)!=13:
        issues.append("Expected 13 game action clips; found %d"%len(clips))
    for name in CLIPS:
        if name not in clips:
            issues.append("Missing action "+name)
    primitives=[p for mesh in doc.get("meshes",[]) for p in mesh.get("primitives",[])]
    signatures=[]
    positions=set()
    colors=False
    uv=False
    for i,p in enumerate(primitives):
        attrs=p.get("attributes",{})
        for key in ("POSITION","NORMAL","JOINTS_0","WEIGHTS_0"):
            idx=attrs.get(key)
            if type(idx) is not int or not 0<=idx<len(accessors):
                issues.append("Primitive %d missing %s"%(i,key))
        pos=attrs.get("POSITION")
        if type(pos) is int and 0<=pos<len(accessors):
            positions.add(pos)
            for name in ("JOINTS_0","WEIGHTS_0"):
                idx=attrs.get(name)
                if type(idx) is int and 0<=idx<len(accessors):
                    if accessors[idx].get("count")!=accessors[pos].get("count"):
                        issues.append("Mismatched attribute count on primitive %d"%i)
        colors|="COLOR_0" in attrs
        uv|="TEXCOORD_0" in attrs
        signatures.append((tuple(sorted(attrs.items())),p.get("indices")))
    if len(signatures)!=len(set(signatures)):
        issues.append("Repeated primitive attributes and index accessor cause unnecessary geometry overdraw")
    if not uv and not colors:
        issues.append("No UV0 or vertex colors")
    if not primitives:
        issues.append("No mesh primitives")
    return {
        "file":path.name,"sha256":hashlib.sha256(raw).hexdigest(),
        "bytes":len(raw),"mesh_count":len(doc.get("meshes",[])),
        "primitive_count":len(primitives),
        "unique_position_vertices":sum(accessors[i].get("count",0) for i in positions),
        "joint_count":len(names),"semantic_joint_names":names,
        "clips":clips,"clip_count":len(clips),
        "UV0":uv,"COLOR_0":colors,
        "material_count":len(doc.get("materials",[])),"texture_count":len(doc.get("textures",[])),
        "issues":issues,"gameplay_compatible":not issues,
        "scope":"Structural/gameplay contract only; official Khronos GLB validation and gameplay visual review still required"
    }

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("files",nargs="+",type=Path)
    p.add_argument("--require-gameplay",action="store_true")
    a=p.parse_args(argv)
    try:
        results=[inspect_glb(f) for f in a.files]
    except (OSError,ValueError,IndexError,KeyError,TypeError,struct.error) as exc:
        print(json.dumps({"error":str(exc)}),file=sys.stderr)
        return 3
    print(json.dumps(results,indent=2))
    return 2 if a.require_gameplay and any(not x["gameplay_compatible"] for x in results) else 0

if __name__=="__main__":
    sys.exit(main())
