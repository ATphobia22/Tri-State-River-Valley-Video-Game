#!/usr/bin/env python3
"""COLMAP / OpenMVS / Nerfstudio reconstruction worker for review-only game assets.

No remote downloads, no hidden fallbacks to invented measurements, no automatic
replacement of the existing playable courthouse. Native tools run headlessly.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import shutil
import struct
import subprocess
from colmap_database_audit import inspect as audit_database
from nerfstudio_profiles import (PROFILES, describe_profiles, profile_for_appearance,
                                  training_command)

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff"}
NATIVE_TOOLS = ("colmap", "InterfaceCOLMAP", "DensifyPointCloud",
                "ReconstructMesh", "RefineMesh", "TextureMesh", "TransformScene")

def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()

def image_inventory(folder):
    root = Path(folder).resolve(strict=True)
    if not root.is_dir():
        raise ValueError("Image source must be a directory")
    rows, digests = [], set()
    for path in sorted(root.iterdir()):
        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        if path.is_symlink() or not path.is_file():
            raise ValueError("Unsafe input: " + path.name)
        if not 0 < path.stat().st_size <= 250_000_000:
            raise ValueError("Invalid image size: " + path.name)
        digest = sha256(path)
        if digest in digests:
            raise ValueError("Duplicated image bytes: " + path.name)
        digests.add(digest)
        rows.append({"name": path.name, "bytes": path.stat().st_size, "sha256": digest})
    if len(rows) < 3:
        raise ValueError("At least three distinct photographs are required")
    return rows

def lines(path):
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if line.strip() and not line.lstrip().startswith("#"):
            yield line.strip()

def sparse_quality(model, total, min_fraction=0.75, max_error_px=2.0):
    model = Path(model)
    if not all((model / x).is_file() for x in ("cameras.txt","images.txt","points3D.txt")):
        raise ValueError("COLMAP text model incomplete")
    # COLMAP images.txt alternates one pose line and one 2D observation line.
    raw = [x.strip() for x in (model / "images.txt").read_text().splitlines()
           if not x.lstrip().startswith("#")]
    if len(raw) % 2:
        raise ValueError("Odd image-record line count")
    registered = []
    for line in raw[::2]:
        tokens = line.split()
        if len(tokens) < 10:
            raise ValueError("Malformed COLMAP image pose row")
        iid, cid = int(tokens[0]), int(tokens[8])
        pose = [float(x) for x in tokens[1:8]]
        if iid <= 0 or cid <= 0 or not all(math.isfinite(x) for x in pose):
            raise ValueError("Invalid COLMAP pose")
        registered.append(" ".join(tokens[9:]))
    if len(set(registered)) != len(registered) or len(registered) > total:
        raise ValueError("Duplicate or excessive camera registrations")
    errors = []
    for line in lines(model / "points3D.txt"):
        parts = line.split()
        if len(parts) >= 8:
            value = float(parts[7])
            if math.isfinite(value) and value >= 0:
                errors.append(value)
    if not errors:
        raise ValueError("No COLMAP sparse reprojection observations")
    fraction = len(registered) / total
    average = sum(errors) / len(errors)
    return {"input_images": total, "registered": len(registered),
            "registration_fraction": fraction, "mean_sparse_reprojection_px": average,
            "sparse_points": len(errors),
            "pass": len(registered) >= 3 and fraction >= min_fraction and average <= max_error_px,
            "thresholds": {"min_fraction": min_fraction, "max_error_px": max_error_px},
            "note": "Sparse reprojection fit is not physical-survey or geodetic accuracy."}

def rotation(q):
    import numpy as np
    w,x,y,z = q
    norm = math.sqrt(sum(v*v for v in q))
    if not math.isfinite(norm) or norm < 1.e-9:
        raise ValueError("Degenerate or nonfinite camera quaternion")
    w,x,y,z = [v/norm for v in q]
    return np.array([[1-2*y*y-2*z*z,2*x*y-2*w*z,2*x*z+2*w*y],
                     [2*x*y+2*w*z,1-2*x*x-2*z*z,2*y*z-2*w*x],
                     [2*x*z-2*w*y,2*y*z+2*w*x,1-2*x*x-2*y*y]])

def nerfstudio_dataset(model, images, destination):
    """Convert undistorted COLMAP poses to Nerfstudio OpenGL C2W convention."""
    import numpy as np
    model, images, destination = Path(model),Path(images),Path(destination)
    cameras = {}
    for line in lines(model / "cameras.txt"):
        items = line.split()
        cid,kind,width,height = int(items[0]),items[1],int(items[2]),int(items[3])
        values = [float(x) for x in items[4:]]
        if kind == "PINHOLE" and len(values)==4:
            fx,fy,cx,cy = values
        elif kind == "SIMPLE_PINHOLE" and len(values)==3:
            focal,cx,cy=values
            fx=fy=focal
        else:
            raise ValueError("Undistort cameras before Nerfstudio export: "+kind)
        if width <= 0 or height <= 0 or not all(map(math.isfinite,(fx,fy,cx,cy))) or fx <= 0 or fy <= 0:
            raise ValueError("Invalid camera intrinsics")
        cameras[cid] = dict(fl_x=fx,fl_y=fy,cx=cx,cy=cy,w=width,h=height)
    raw=[x.strip() for x in (model/"images.txt").read_text().splitlines()
         if not x.lstrip().startswith("#")]
    if len(raw)%2: raise ValueError("Malformed COLMAP image/track rows")
    frames=[]
    for line in raw[::2]:
        tokens=line.split()
        cid=int(tokens[8])
        name=" ".join(tokens[9:])
        src=(images/name).resolve()
        if not src.is_relative_to(images.resolve()) or not src.is_file():
            raise ValueError("Unsafe or missing undistorted photograph: "+name)
        quat=[float(x) for x in tokens[1:5]]
        trans=np.array([float(x) for x in tokens[5:8]])
        if not np.isfinite(trans).all():
            raise ValueError("Invalid camera translation")
        rot=rotation(quat).T
        pose=np.eye(4)
        pose[:3,:3] = rot@np.diag([1,-1,-1])
        pose[:3,3] = -rot@trans
        frames.append({"file_path":"./images/"+name.replace("\\","/"),
                       "transform_matrix":pose.tolist(),**cameras[cid]})
    if len(frames)<3:
        raise ValueError("Not enough calibrated photos for appearance")
    destination.mkdir(parents=True,exist_ok=True)
    for frame in frames:
        rel=frame["file_path"].removeprefix("./images/")
        dst=destination/"images"/rel
        dst.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(images/rel,dst)
    output=destination/"transforms.json"
    output.write_text(json.dumps({"camera_model":"OPENCV","frames":frames},indent=2))
    return output

def inspect_glb(path):
    payload=Path(path).read_bytes()
    if len(payload)<20 or payload[:4]!=b"glTF" or struct.unpack_from("<I",payload,4)[0]!=2:
        raise ValueError("Invalid GLB magic/version")
    if struct.unpack_from("<I",payload,8)[0] != len(payload):
        raise ValueError("GLB declared length mismatch")
    size,tag=struct.unpack_from("<I4s",payload,12)
    if tag!=b"JSON" or 20+size>len(payload):
        raise ValueError("Missing GLB JSON chunk")
    document=json.loads(payload[20:20+size])
    if document.get("asset",{}).get("version")!="2.0":
        raise ValueError("Invalid GLB asset version")
    if document.get("extensionsRequired"):
        raise ValueError("Unsupported required GLB extensions")
    if any("uri" in item for item in document.get("buffers",[])):
        raise ValueError("External mesh buffers are not allowed in a self-contained GLB")
    if any("bufferView" not in item and not str(item.get("uri","")).startswith("data:")
           for item in document.get("images",[])):
        raise ValueError("External image resources are not allowed in a self-contained GLB")
    if not document.get("meshes"):
        raise ValueError("GLB has no mesh")
    embedded=any("bufferView" in image or str(image.get("uri","")).startswith("data:")
                 for image in document.get("images",[]))
    return {"meshes":len(document["meshes"]),"embedded_texture":embedded,
            "bytes":len(payload),"sha256":sha256(path),
            "classification":"TEXTURED_REVIEW_ONLY" if embedded else "GEOMETRY_REVIEW_ONLY"}

def tools():
    return {name:shutil.which(name) for name in NATIVE_TOOLS+("ns-train",)}

def commands(images,work):
    images=Path(images).resolve();work=Path(work).resolve()
    db=str(work/"database.db")
    return [
        ["colmap","feature_extractor","--image_path",str(images),"--database_path",db,
         "--ImageReader.single_camera","1","--SiftExtraction.use_gpu","0"],
        ["colmap","exhaustive_matcher","--database_path",db,"--SiftMatching.use_gpu","0"],
        ["colmap","mapper","--image_path",str(images),"--database_path",db,
         "--output_path",str(work/"sparse")],
    ]

def run_cmd(argv,cwd,logs,index,timeout):
    logs.mkdir(parents=True,exist_ok=True)
    output=logs/("%02d-%s.log"%(index,Path(argv[0]).name))
    with output.open("wb") as stream:
        try:
            completed=subprocess.run(argv,cwd=cwd,stdin=subprocess.DEVNULL,
                                     stdout=stream,stderr=subprocess.STDOUT,
                                     timeout=timeout,check=False)
        except (OSError,subprocess.TimeoutExpired) as error:
            raise RuntimeError(f"{argv[0]} did not complete: {error}") from error
    if completed.returncode:
        raise RuntimeError(f"{argv[0]} failed with exit={completed.returncode}; inspect {output}")
    return str(output)

def run(images,workspace,kind,license_id,appearance="none",
        min_registration=0.75,max_reprojection=2.0,timeout=7200,
        appearance_profile=None,max_iterations=None,min_verified_inliers=15):
    if kind not in ("benchmark_photographs","rendered_game_asset","physical_landmark"):
        raise ValueError("Explicit evidence class required")
    if not license_id.strip():
        raise ValueError("License/right declaration required")
    if not 0<min_registration<=1 or max_reprojection<=0:
        raise ValueError("Invalid quality thresholds")
    if appearance_profile:
        if appearance not in ("nerfacto","gsplat") or appearance_profile not in PROFILES:
            raise ValueError("Nerfstudio profile requires a matching neural engine")
        if appearance=="nerfacto" and not appearance_profile.startswith("nerfacto"):
            raise ValueError("Use a Nerfacto profile with Nerfacto appearance")
        if appearance=="gsplat" and not appearance_profile.startswith("splatfacto"):
            raise ValueError("Use Splatfacto profile with gsplat appearance")
    photos=image_inventory(images)
    installed=tools()
    missing=[x for x in NATIVE_TOOLS if not installed[x]]
    if appearance in ("nerfacto","gsplat"):
        if not installed["ns-train"]:
            missing.append("ns-train")
        try:
            import torch
            if not torch.cuda.is_available():
                missing.append("CUDA device")
        except ImportError:
            missing.append("PyTorch CUDA")
    if missing:
        raise RuntimeError("Native tools unavailable: "+", ".join(missing))
    work=Path(workspace).resolve()
    if work.exists() and any(work.iterdir()):
        raise FileExistsError("Refusing to overwrite an existing reconstruction workspace")
    work.mkdir(parents=True,exist_ok=True)
    (work/"sparse").mkdir()
    (work/"openmvs").mkdir()
    from courthouse_gis_adapter import verify as verify_game_reference
    game_reference=verify_game_reference(Path(__file__).resolve().parents[1])
    receipt={
        "game_reference":game_reference,
        "alignment_status":"NOT_ALIGNED_TO_SURVEY_CONTROL",
        "status":"FAILED","kind":kind,"license_id":license_id,
        "created_utc":datetime.now(timezone.utc).isoformat(),
        "input_images":photos,"crs":"UNREGISTERED_LOCAL",
        "vertical_datum":"UNVERIFIED","regulatory_authority":False,
        "automatic_game_promotion":False,
        "note":"Game turntable reconstruction does not establish physical-courthouse accuracy."}
    logs=work/"logs"
    try:
        for i,argv in enumerate(commands(images,work),1):
            run_cmd(argv,work,logs,i,timeout)
            if i == 2:
                # Database contains feature observations and verified pairs, NOT
                # accepted camera poses. Do not infer registration from this graph.
                receipt["colmap_database_audit"]=audit_database(
                    work/"database.db", expected_images=len(photos),
                    min_verified_inliers=min_verified_inliers)
                graph=receipt["colmap_database_audit"]
                if graph["expected_image_coverage"] < 1:
                    receipt["status"]="SOURCE_IMAGES_NOT_ALL_INDEXED"
                    return receipt
                if graph["largest_verified_component"] < 3:
                    receipt["status"]="MATCH_GRAPH_INSUFFICIENT"
                    return receipt
        candidates=[]
        for n,model in enumerate(sorted((work/"sparse").iterdir())):
            if not model.is_dir():
                continue
            text_model=work/("colmap-txt-"+str(n))
            text_model.mkdir()
            run_cmd(["colmap","model_converter","--input_path",str(model),
                     "--output_path",str(text_model),"--output_type","TXT"],work,logs,10+n,timeout)
            try:
                metric=sparse_quality(text_model,len(photos),min_registration,max_reprojection)
            except ValueError:
                continue
            candidates.append((metric["registered"],metric["sparse_points"],model,metric))
        if not candidates:
            raise RuntimeError("COLMAP produced no valid registered sparse model")
        registered,points,model,quality=max(candidates,key=lambda t:(t[0],t[1]))
        receipt["camera_quality"]=quality
        if not quality["pass"]:
            receipt["status"]="CAMERA_COVERAGE_REJECTED"
            return receipt
        dense=work/"dense"
        run_cmd(["colmap","image_undistorter","--image_path",str(Path(images).resolve()),
                 "--input_path",str(model),"--output_path",str(dense),
                 "--output_type","COLMAP"],work,logs,20,timeout)
        undistorted=work/"undistorted-text"
        undistorted.mkdir()
        run_cmd(["colmap","model_converter","--input_path",str(dense/"sparse"),
                 "--output_path",str(undistorted),"--output_type","TXT"],work,logs,21,timeout)
        nerfstudio_dataset(undistorted,dense/"images",work/"nerfstudio")
        mvs=work/"openmvs"
        phases=[
            ["InterfaceCOLMAP","-i",str(dense),"-o","scene.mvs",
             "--image-folder",str(dense/"images")],
            ["DensifyPointCloud","scene.mvs"],
            ["ReconstructMesh","scene_dense.mvs","-p","scene_dense.ply"],
            ["RefineMesh","scene_dense.mvs","-m","scene_dense_mesh.ply",
             "-o","scene_dense_mesh_refined.mvs"],
            ["TextureMesh","scene_dense.mvs","-m","scene_dense_mesh_refined.ply",
             "-o","scene_dense_mesh_refined_texture.mvs"],
            ["TransformScene","scene_dense_mesh_refined_texture.mvs",
             "--convert","1","--export-type","glb"],
        ]
        for i,argv in enumerate(phases,30):
            run_cmd(argv,mvs,logs,i,timeout)
        files=list(mvs.rglob("*.glb"))
        if not files:
            raise RuntimeError("OpenMVS export produced no GLB; preserve intermediates for review")
        selected=max(files,key=lambda p:p.stat().st_size)
        candidate=work/"courthouse_candidate_REVIEW_ONLY.glb"
        shutil.copy2(selected,candidate)
        receipt["candidate"]=inspect_glb(candidate)
        receipt["status"]="REVIEW_REQUIRED"
        if appearance in ("nerfacto","gsplat"):
            profile=appearance_profile or profile_for_appearance(appearance)
            command=training_command(work/"nerfstudio",work/"nerfstudio-output",
                                     profile,max_iterations=max_iterations)
            receipt["appearance_plan"]={"profile":profile,"command":command,
                                        "automatic_game_promotion":False}
            run_cmd(command,work,logs,40,timeout)
            configs=list((work/"nerfstudio-output").rglob("config.yml"))
            if not configs:
                raise RuntimeError("Nerfstudio command completed without a saved config.yml")
            receipt["appearance_config"]={
                "relative_path":str(configs[0].relative_to(work)),
                "sha256":sha256(configs[0])}
            receipt["appearance"]="TRAIN_FINISHED_UNVALIDATED"
        elif appearance=="cpu":
            from cpu_volume import train
            receipt["cpu_radiance_field"]=train(work/"nerfstudio",work/"cpu_radiance.npz")
        return receipt
    except Exception as error:
        receipt["error"]=str(error)
        raise
    finally:
        (work/"receipt.json").write_text(json.dumps(receipt,indent=2,sort_keys=True))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    subs=parser.add_subparsers(dest="action",required=True)
    subs.add_parser("doctor")
    dbsub=subs.add_parser("db-audit",help="Read-only COLMAP SQLite match and schema audit")
    dbsub.add_argument("--database",required=True,type=Path)
    dbsub.add_argument("--expected-images",type=int)
    dbsub.add_argument("--min-verified-inliers",type=int,default=15)
    subs.add_parser("profiles",help="List documented Nerfstudio profile budgets")
    for cmd in ("plan","run"):
        p=subs.add_parser(cmd)
        p.add_argument("--images",required=True,type=Path)
        p.add_argument("--workspace",required=True,type=Path)
        p.add_argument("--kind",required=True,choices=("benchmark_photographs",
                       "rendered_game_asset","physical_landmark"))
        p.add_argument("--license-id",required=True)
        p.add_argument("--appearance",default="none",
                       choices=("none","cpu","nerfacto","gsplat"))
        p.add_argument("--appearance-profile",choices=sorted(PROFILES))
        p.add_argument("--max-iterations",type=int)
        p.add_argument("--min-verified-inliers",type=int,default=15)
        p.add_argument("--min-registration",type=float,default=.75)
        p.add_argument("--max-reprojection",type=float,default=2.)
        p.add_argument("--timeout",type=int,default=7200)
    p=subs.add_parser("inspect-glb")
    p.add_argument("path",type=Path)
    options=parser.parse_args()
    if options.action=="doctor":
        print(json.dumps({"tools":tools(),"cpu_fallback":"cpu_volume.py",
                          "gsplat_requirement":"CUDA-enabled GPU",
                          "colmap_database_audit":"read-only SQLite; see db-audit",
                          "nerfstudio_profiles":describe_profiles()},indent=2));return
    if options.action=="profiles":
        print(json.dumps(describe_profiles(),indent=2));return
    if options.action=="db-audit":
        print(json.dumps(audit_database(options.database,
                         expected_images=options.expected_images,
                         min_verified_inliers=options.min_verified_inliers),
                         indent=2));return
    if options.action=="inspect-glb":
        print(json.dumps(inspect_glb(options.path),indent=2));return
    if options.action=="plan":
        photos=image_inventory(options.images)
        from courthouse_gis_adapter import verify as verify_game_reference
        profile=options.appearance_profile or (profile_for_appearance(options.appearance)
                                             if options.appearance in ("nerfacto","gsplat") else None)
        neural=training_command(options.workspace/"nerfstudio",
                               options.workspace/"nerfstudio-output",profile,
                               max_iterations=options.max_iterations) if profile else None
        print(json.dumps({"game_reference":verify_game_reference(Path(__file__).resolve().parents[1]),
                          "source_class":options.kind,"license":options.license_id,
                          "inputs":photos,"native_toolchain":tools(),
                          "colmap_commands":commands(options.images,options.workspace),
                          "colmap_db_audit":"After feature extraction and matching; prior to mapping",
                          "nerfstudio_command":neural,
                          "status":"PLAN_ONLY_NOT_EXECUTED"},indent=2));return
    result=run(options.images,options.workspace,options.kind,options.license_id,
               options.appearance,options.min_registration,options.max_reprojection,
               options.timeout,options.appearance_profile,options.max_iterations,
               options.min_verified_inliers)
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
