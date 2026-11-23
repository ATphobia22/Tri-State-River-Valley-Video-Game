#!/usr/bin/env python3
"""Read-only production-candidate gate for user-supplied GLBs.

A structural pass does NOT install an asset: Blender skin-deformation tests,
grip poses, animation retargeting, and physical-device performance remain
mandatory. Never overwrite the canonical procedural hero from this script.
"""
import argparse
import json
from pathlib import Path
import struct
import sys
from audit_uploaded_character_glb import inspect_glb
from audit_river_candidate import audit

def evaluate(path,baseline_path,triangle_cap=25000):
    source=Path(path)
    baseline=json.loads(Path(baseline_path).read_text())
    raw=source.read_bytes()
    coarse=audit(raw,baseline=baseline,max_triangles=triangle_cap)
    try:
        structure=inspect_glb(source)
    except (ValueError,KeyError,TypeError,IndexError,struct.error) as error:
        return {"path":str(source),"sourceSHA256":coarse.get("sha256"),
                "status":"REJECT","blockers":coarse.get("blockers",[])+[str(error)],
                "automaticPromotionAllowed":False}
    blockers=list(coarse["blockers"])+list(structure["issues"])
    if structure["joint_count"]!=27 or structure["clip_count"]!=13:
        blockers.append("Source rig cannot replace 27-joint/13-action production avatar")
    if not structure["UV0"]:
        blockers.append("UV texture coordinates absent, needs authoring")
    if structure["texture_count"]==0:
        blockers.append("No embedded texture resources for PBR presentation")
    if structure["primitive_count"]<1:
        blockers.append("No character mesh primitives")
    if structure["unique_position_vertices"]<4000:
        blockers.append("Insufficient source mesh resolution for close-up hero")
    status="REJECT" if blockers else "STRUCTURAL_PASS_REQUIRES_VISUAL_AND_DEFORMATION_QA"
    return {"path":str(source),"sourceSHA256":coarse["sha256"],
            "sourceBytes":len(raw),"status":status,
            "structuralReport":structure,
            "blockers":list(dict.fromkeys(blockers)),
            "automaticPromotionAllowed":False,
            "requires":["Blender deformation/UV and skeleton-axis inspection",
                        "13 clips retargeting, hands/feet grip and root-motion checks",
                        "independent runtime WebGL comparison on desktop and mobile",
                        "physical iPhone GPU, battery, thermal and animation tests"]}

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("candidate",type=Path)
    p.add_argument("--baseline",type=Path,default=Path(__file__).resolve().parents[1]/"assets/models/river_explorer_manifest.json")
    p.add_argument("--out",type=Path)
    args=p.parse_args(argv)
    try:
        report=evaluate(args.candidate,args.baseline)
    except (OSError,ValueError,TypeError,IndexError,KeyError,struct.error) as e:
        report={"status":"REJECT","blockers":[str(e)],"automaticPromotionAllowed":False}
    result=json.dumps(report,indent=2,sort_keys=True)+"\n"
    if args.out:
        args.out.parent.mkdir(parents=True,exist_ok=True)
        args.out.write_text(result)
    print(result)
    return 0 if report["status"]=="STRUCTURAL_PASS_REQUIRES_VISUAL_AND_DEFORMATION_QA" else 2

if __name__=="__main__":sys.exit(main())
