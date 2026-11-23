#!/usr/bin/env python3
"""Actual source GLB staging without pretending reference screenshots are rigged.
Only independently usable, self-contained animation/PBR candidates can be copied
to studio staging. NEVER mutates runtime model files or the live game build.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys
from audit_uploaded_character_glb import inspect_glb, CLIPS

def assess(path):
    result=inspect_glb(path)
    flags=list(result["issues"])
    if result["joint_count"]!=27: flags.append("Retarget skeleton to the 27 named gameplay joints")
    if set(CLIPS)-set(result["clips"]):flags.append("Supply actual motion keys for all 13 controller actions")
    if not result["UV0"]:flags.append("Create validated UV0 atlas; vertex colors alone are not textured PBR")
    if result["texture_count"]<4:flags.append("Add at least four embedded PBR material textures")
    if result["unique_position_vertices"]<3000:flags.append("Reference geometry is an insufficient production likeness")
    unique=list(dict.fromkeys(flags))
    return {
        "file":Path(path).name,"sha256":result["sha256"],
        "sourceJointCount":result["joint_count"],"sourceActionClips":result["clips"],
        "vertices":result["unique_position_vertices"],
        "uv0":result["UV0"],"embeddedTextureCount":result["texture_count"],
        "stagingEligible":not unique,
        "productionReplacementApproved":False,
        "manualDeformationReviewComplete":False,
        "physicalMobilePerformanceVerified":False,
        "blockers":unique,
        "status":"STAGING_ELIGIBLE_NEEDS_RENDER_QA" if not unique else "SOURCE_CANDIDATE_NOT_PRODUCTION_READY"
    }

def stage(src,dest):
    src=Path(src);dest=Path(dest)
    report=assess(src)
    if not report["stagingEligible"]:
        return report
    dest.mkdir(parents=True,exist_ok=True)
    out=dest/src.name
    # Copy verified exact source bytes: never change, optimize or claim retargeting.
    shutil.copyfile(src,out)
    if hashlib.sha256(out.read_bytes()).hexdigest()!=report["sha256"]:
        out.unlink(missing_ok=True)
        raise ValueError("Character staging checksum changed unexpectedly")
    receipt=dest/(src.stem+".audit.json")
    receipt.write_text(json.dumps(report,indent=2)+"\n")
    return report

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("glb",type=Path)
    p.add_argument("--staging-dir",type=Path,default=Path("game/staging/character-candidates"))
    p.add_argument("--audit-only",action="store_true")
    a=p.parse_args()
    try:report=assess(a.glb) if a.audit_only else stage(a.glb,a.staging_dir)
    except Exception as exc:
        print(json.dumps({"error":str(exc),"stagingEligible":False}))
        sys.exit(3)
    print(json.dumps(report,indent=2))
    sys.exit(0 if report["stagingEligible"] else 2)
