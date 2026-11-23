#!/usr/bin/env python3
"""Stage a structurally valid GLB without replacing any game runtime assets.

Port of the useful opt-in staging concept from superseded courthouse PR #29,
rewired to the *current* main intake gate. Staging is not production approval.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path
from intake_character_candidate import evaluate

ROOT=Path(__file__).resolve().parents[1]
BASELINE=ROOT/'assets/models/river_explorer_manifest.json'
DEFAULT_STAGING=ROOT/'staging/character-candidates'
PASS="STRUCTURAL_PASS_REQUIRES_VISUAL_AND_DEFORMATION_QA"

def assess(path,triangle_cap=40000):
    report=evaluate(Path(path),BASELINE,triangle_cap=triangle_cap)
    eligible=report.get("status")==PASS and not report.get("blockers")
    return {
        **report,
        "status":"STAGING_ELIGIBLE_NEEDS_RENDER_QA" if eligible else "REJECT",
        "stagingEligible":eligible,
        "productionReplacementApproved":False,
        "manualDeformationReviewComplete":False,
        "physicalMobilePerformanceVerified":False
    }

def stage(source,destination=DEFAULT_STAGING,triangle_cap=40000):
    src=Path(source).resolve(strict=True)
    dest=Path(destination).resolve()
    # Files *must* be clearly quarantined, even if an operator supplies an
    # absolute path. Never allow an output to land in live gameplay assets.
    if dest.name!="character-candidates" or dest==ROOT or dest.is_relative_to(ROOT/'assets') or dest.is_relative_to(ROOT/'data'):
        raise ValueError("Destination must be a dedicated character-candidates staging directory")
    if not src.is_file() or src.suffix.lower()!=".glb":
        raise ValueError("Only local binary GLB files can enter staging")
    report=assess(src,triangle_cap)
    if not report["stagingEligible"]:
        return report
    out=dest/src.name
    receipt=dest/(src.stem+'.audit.json')
    if out.exists() or receipt.exists():
        raise FileExistsError("Candidate or receipt already exists in staging; do not overwrite audit evidence")
    dest.mkdir(parents=True,exist_ok=True)
    try:
        # Exclusive creation prevents overwrites even in race conditions.
        with src.open('rb') as input_file,out.open('xb') as output_file:
            shutil.copyfileobj(input_file,output_file,1024*1024)
        observed=hashlib.sha256(out.read_bytes()).hexdigest()
        if observed!=report["sourceSHA256"]:
            raise ValueError("Character staging checksum mismatch; source changed or copy corrupted")
        receipt_data={
            **report,
            "stagedPath":str(out),
            "sourceSizeBytes":src.stat().st_size,
            "auditedByteIdentitySHA256":observed,
            "productionPromotionAllowed":False
        }
        with receipt.open('x',encoding='utf-8') as file:
            json.dump(receipt_data,file,sort_keys=True,indent=2)
            file.write("\n")
    except Exception:
        out.unlink(missing_ok=True)
        raise
    return report

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate",type=Path)
    parser.add_argument("--staging-dir",type=Path,default=DEFAULT_STAGING)
    parser.add_argument("--audit-only",action="store_true")
    parser.add_argument("--triangle-cap",type=int,default=40000)
    args=parser.parse_args(argv)
    try:
        if args.triangle_cap<=0 or args.triangle_cap>100000:
            raise ValueError("triangle cap out of allowed range")
        report=assess(args.candidate,args.triangle_cap) if args.audit_only else stage(args.candidate,args.staging_dir,args.triangle_cap)
        print(json.dumps(report,sort_keys=True,indent=2))
        return 0 if report["stagingEligible"] else 2
    except (OSError,ValueError,TypeError,KeyError) as error:
        print(json.dumps({"status":"REJECT","error":str(error),"automaticPromotionAllowed":False}))
        return 3

if __name__=="__main__":
    sys.exit(main())
