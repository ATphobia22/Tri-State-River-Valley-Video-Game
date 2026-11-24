#!/usr/bin/env python3
"""Applied COLMAP / OpenMVS / Nerfstudio Splatfacto reconstruction toolchain.

Production photogrammetry worker for the River Valley personal video game.
Implements end-to-end COLMAP feature extraction + matching + sparse reconstruction,
OpenMVS dense geometry / texture / GLB export, Nerfstudio Splatfacto (gsplat) and
nerfacto appearance training, plus CPU neural volume fallback.

Native tools run headlessly. Inputs are hashed. Quality gates are enforced.
When gates pass the resulting GLB is classified PRODUCTION_READY for game intake.
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
        registered.append(tokens[9])
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
            "note": "COLMAP sparse registration quality for game asset production."}

def rotation(q):
    import numpy as np
    w,x,y,z = q
    norm = math.sqrt(sum(v*v for v in q))
    if norm < 1.e-9:
        raise ValueError("Degenerate camera quaternion")
    w,x,y,z = [v/norm for v in q]
    return np.array([[1-2*y*y-2*z*z,2*x*y-2*w*z,2*x*z+2*w*y],
                     [2*x*y+2*w*z,1-2*x*x-2*z*z,2*y*z-2*w*x],
                     [2*x*z-2*w*y,2*y*z+2*w*x,1-2*x*x-2*y*y]])

def nerfstudio_dataset(model, images, destination):
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
    classification = "TEXTURED_PRODUCTION_READY" if embedded else "GEOMETRY_PRODUCTION_READY"
    return {"meshes":len(document["meshes"]),"embedded_texture":embedded,
            "bytes":len(payload),"sha256":sha256(path),
            "classification":classification}

def tools():
    return {name:shutil.which(name) for name in NATIVE_TOOLS+("ns-train",)}

def commands(images,work):
    images=Path(images).resolve();work=Path(work).resolve()
    db=str(work/"database.db")
    return [
        ["colmap","feature_extractor","--image_path",str(images),"--database_path",db,
         "--ImageReader.single_camera","0","--SiftExtraction.use_gpu","0",
         "--SiftExtraction.max_image_size","2000"],
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

def run_appearance(work, appearance, timeout):
    ns = shutil.which("ns-train")
    if not ns:
        return {"status": "SKIPPED", "reason": "ns-train not installed"}
    try:
        import torch
        if not torch.cuda.is_available() and appearance in ("gsplat", "nerfacto"):
            return {"status": "SKIPPED", "reason": "CUDA device not available for Splatfacto/nerfacto"}
    except ImportError:
        return {"status": "SKIPPED", "reason": "PyTorch not available"}
    try:
        from nerfstudio_configs import build_ns_train_argv, PRESETS
        preset = "gsplat" if appearance == "gsplat" else "nerfacto"
        out = work / f"nerfstudio_{PRESETS[preset]['method']}"
        out.mkdir(parents=True, exist_ok=True)
        argv = build_ns_train_argv(preset, str(work / "nerfstudio"), str(out), max_iters=500)
    except Exception:
        method = "splatfacto" if appearance == "gsplat" else "nerfacto"
        out = work / f"nerfstudio_{method}"
        out.mkdir(parents=True, exist_ok=True)
        argv = ["ns-train", method, "--data", str(work / "nerfstudio"),
                "--output-dir", str(out), "--max-num-iterations", "500",
                "--pipeline.model.background-color", "random",
                "--viewer.quit-on-train-completion", "True"]
    log = run_cmd(argv, work, work / "logs", 40, timeout)
    return {"status": "TRAINED", "method": argv[1], "output": str(out), "log": log, "argv": argv}

def run(images,workspace,kind,license_id,appearance="none",
        min_registration=0.75,max_reprojection=2.0,timeout=7200,promote=False):
    if kind not in ("benchmark_photographs","rendered_game_asset","physical_landmark"):
        raise ValueError("Explicit evidence class required")
    if not license_id.strip():
        raise ValueError("License/right declaration required")
    if not 0<min_registration<=1 or max_reprojection<=0:
        raise ValueError("Invalid quality thresholds")
    photos=image_inventory(images)
    installed=tools()
    if not installed.get("colmap"):
        raise RuntimeError("COLMAP is required and not installed")
    work=Path(workspace).resolve()
    if work.exists() and any(work.iterdir()):
        raise FileExistsError("Refusing to overwrite an existing reconstruction workspace")
    work.mkdir(parents=True,exist_ok=True)
    (work/"sparse").mkdir()
    (work/"openmvs").mkdir()
    try:
        from courthouse_gis_adapter import verify as verify_game_reference
        game_reference=verify_game_reference(Path(__file__).resolve().parents[1])
    except Exception:
        game_reference={"status":"adapter_unavailable"}
    receipt={
        "game_reference":game_reference,
        "status":"FAILED","kind":kind,"license_id":license_id,
        "created_utc":datetime.now(timezone.utc).isoformat(),
        "input_images":photos,
        "toolchain":"applied_colmap_openmvs_nerfstudio_splatfacto",
        "promote_requested":bool(promote),
        "automatic_game_promotion":bool(promote),
        "note":"Applied photogrammetry toolchain for River Valley personal game assets."}
    logs=work/"logs"
    try:
        for i,argv in enumerate(commands(images,work),1):
            run_cmd(argv,work,logs,i,timeout)
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
        openmvs_available = all(installed.get(x) for x in (
            "InterfaceCOLMAP","DensifyPointCloud","ReconstructMesh",
            "RefineMesh","TextureMesh","TransformScene"))
        if openmvs_available:
            phases=[
                ["InterfaceCOLMAP","-i",str(dense),"-o","scene.mvs","--image-folder",str(dense/"images")],
                ["DensifyPointCloud","scene.mvs"],
                ["ReconstructMesh","scene_dense.mvs","-p","scene_dense.ply"],
                ["RefineMesh","scene_dense.mvs","-m","scene_dense_mesh.ply","-o","scene_dense_mesh_refined.mvs"],
                ["TextureMesh","scene_dense.mvs","-m","scene_dense_mesh_refined.ply","-o","scene_dense_mesh_refined_texture.mvs"],
                ["TransformScene","scene_dense_mesh_refined_texture.mvs","--convert","1","--export-type","glb"],
            ]
            for i,argv in enumerate(phases,30):
                run_cmd(argv,mvs,logs,i,timeout)
            files=list(mvs.rglob("*.glb"))
            if files:
                selected=max(files,key=lambda p:p.stat().st_size)
                candidate=work/"asset_PRODUCTION_READY.glb"
                shutil.copy2(selected,candidate)
                receipt["candidate"]=inspect_glb(candidate)
                receipt["status"]="PRODUCTION_READY"
            else:
                receipt["status"]="DENSE_NO_GLB"
        else:
            receipt["status"]="SPARSE_CALIBRATED"
            receipt["openmvs"]="not_installed"
        if appearance in ("nerfacto","gsplat"):
            receipt["appearance"]=run_appearance(work, appearance, timeout)
        if appearance == "cpu" or (appearance in ("nerfacto","gsplat") and
                                   receipt.get("appearance",{}).get("status") == "SKIPPED"):
            from cpu_volume import train
            receipt["cpu_radiance_field"]=train(work/"nerfstudio",work/"cpu_radiance.npz")
            if receipt["status"] in ("SPARSE_CALIBRATED","DENSE_NO_GLB"):
                receipt["status"]="SPARSE_CALIBRATED_WITH_CPU_APPEARANCE"
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
    for cmd in ("plan","run"):
        p=subs.add_parser(cmd)
        p.add_argument("--images",required=True,type=Path)
        p.add_argument("--workspace",required=True,type=Path)
        p.add_argument("--kind",required=True,choices=("benchmark_photographs",
                       "rendered_game_asset","physical_landmark"))
        p.add_argument("--license-id",required=True)
        p.add_argument("--appearance",default="none",
                       choices=("none","cpu","nerfacto","gsplat"))
        p.add_argument("--min-registration",type=float,default=.75)
        p.add_argument("--max-reprojection",type=float,default=2.)
        p.add_argument("--timeout",type=int,default=7200)
        p.add_argument("--promote",action="store_true",
                       help="Mark receipt for game production intake when gates pass")
    p=subs.add_parser("inspect-glb")
    p.add_argument("path",type=Path)
    options=parser.parse_args()
    if options.action=="doctor":
        print(json.dumps({"tools":tools(),"cpu_fallback":"cpu_volume.py",
                          "splatfacto":"ns-train splatfacto (requires CUDA + gsplat)",
                          "toolchain":"applied_production"},indent=2));return
    if options.action=="inspect-glb":
        print(json.dumps(inspect_glb(options.path),indent=2));return
    if options.action=="plan":
        photos=image_inventory(options.images)
        try:
            from courthouse_gis_adapter import verify as verify_game_reference
            ref=verify_game_reference(Path(__file__).resolve().parents[1])
        except Exception:
            ref={"status":"adapter_unavailable"}
        print(json.dumps({"game_reference":ref,
                          "source_class":options.kind,"license":options.license_id,
                          "inputs":photos,"native_toolchain":tools(),
                          "colmap_commands":commands(options.images,options.workspace),
                          "status":"PLAN_READY_FOR_EXECUTION"},indent=2));return
    result=run(options.images,options.workspace,options.kind,options.license_id,
               options.appearance,options.min_registration,options.max_reprojection,
               options.timeout,getattr(options,"promote",False))
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
