#!/usr/bin/env python3
"""Tiny CPU-only PyTorch neural radiance volume for review-only posed imagery.

No gsplat/CUDA, no pretrained weights, no survey geometry inference, no GLB
promotion. Uses calibrated Nerfstudio-format OpenGL C2W poses.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

def frames(root, max_side=96):
    root=Path(root).resolve()
    scene=json.loads((root/"transforms.json").read_text())
    result=[]
    for record in scene.get("frames",[]):
        name=record["file_path"]
        path=(root/name).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise ValueError("Unsafe or absent frame: "+name)
        pose=np.asarray(record["transform_matrix"],dtype=np.float32)
        if pose.shape!=(4,4) or not np.isfinite(pose).all():
            raise ValueError("Invalid C2W matrix")
        with Image.open(path) as loaded:
            raw=loaded.convert("RGB")
            ow,oh=raw.size
            if max(ow,oh)>max_side:
                factor=max_side/max(ow,oh)
                raw=raw.resize((max(1,round(ow*factor)),max(1,round(oh*factor))))
            pix=np.asarray(raw,dtype=np.float32)/255
        height,width=pix.shape[:2]
        fx=float(record.get("fl_x",scene.get("fl_x",0)))*width/ow
        fy=float(record.get("fl_y",scene.get("fl_y",0)))*height/oh
        cx=float(record.get("cx",scene.get("cx",ow/2)))*width/ow
        cy=float(record.get("cy",scene.get("cy",oh/2)))*height/oh
        if fx<=0 or fy<=0 or not all(map(math.isfinite,(fx,fy,cx,cy))):
            raise ValueError("Missing/invalid camera intrinsics")
        yy,xx=np.mgrid[0:height,0:width].astype("f4")
        local=np.stack(((xx+.5-cx)/fx,-(yy+.5-cy)/fy,-np.ones_like(xx)),-1)
        local/=np.maximum(np.linalg.norm(local,axis=-1,keepdims=True),1e-8)
        direction=local.reshape(-1,3)@pose[:3,:3].T
        direction/=np.maximum(np.linalg.norm(direction,axis=1,keepdims=True),1e-8)
        origin=np.broadcast_to(pose[:3,3],direction.shape).copy()
        result.append((origin,direction,pix.reshape(-1,3),path))
    if len(result)<3 or len({row[-1] for row in result})!=len(result):
        raise ValueError("At least three independent calibrated frame paths required")
    return result

def encoding(torch,v,n):
    parts=[v]
    for i in range(n):
        parts.extend((torch.sin(v*(2**i)*math.pi),torch.cos(v*(2**i)*math.pi)))
    return torch.cat(parts,dim=-1)

def network(torch,hidden=48):
    return torch.nn.Sequential(
        torch.nn.Linear(42,hidden),torch.nn.ReLU(),
        torch.nn.Linear(hidden,hidden),torch.nn.ReLU(),
        torch.nn.Linear(hidden,4))

def render(torch,model,origin,direction,center,radius,samples=24):
    t=torch.linspace(.05,2.8,samples,device=origin.device)
    p=(origin-center)[:,None,:]/radius+direction[:,None,:]*t[None,:,None]
    d=direction[:,None,:].expand_as(p)
    x=torch.cat((encoding(torch,p,4),encoding(torch,d,2)),-1)
    raw=model(x.reshape(-1,42)).reshape(-1,samples,4)
    density=torch.nn.functional.softplus(raw[...,0])
    colors=torch.sigmoid(raw[...,1:])
    alpha=1-torch.exp(-density*(t[1]-t[0]))
    trans=torch.cumprod(torch.cat((torch.ones_like(alpha[:,:1]),
                                 1-alpha+1e-7),1),1)[:,:-1]
    weight=alpha*trans
    opacity=weight.sum(1,keepdim=True)
    return (weight[...,None]*colors).sum(1)+(1-opacity).clamp_min(0)

def train(dataset,output,steps=80,rays=64,samples=24,max_side=96,seed=13):
    import torch
    if not 1<=steps<=10000 or not 1<=rays<=8192 or not 4<=samples<=256:
        raise ValueError("Invalid training resource budget")
    torch.set_num_threads(min(4,torch.get_num_threads()))
    torch.manual_seed(seed)
    np.random.seed(seed)
    rows=frames(dataset,max_side)
    centers=np.stack([row[0][0] for row in rows])
    center_np=np.median(centers,axis=0)
    radius=float(np.median(np.linalg.norm(centers-center_np,axis=1)))
    if radius<1e-4 or not math.isfinite(radius):
        raise ValueError("All camera centers coincide: no multi-view baseline")
    center=torch.from_numpy(center_np)
    train_rows,validation=rows[:-1],rows[-1]
    O,D,C=(torch.from_numpy(np.concatenate([row[i] for row in train_rows])) for i in range(3))
    model=network(torch)
    optimizer=torch.optim.Adam(model.parameters(),lr=.005)
    initial=None
    for _ in range(steps):
        indices=torch.randint(len(O),(rays,))
        rgb=render(torch,model,O[indices],D[indices],center,radius,samples)
        loss=((rgb-C[indices])**2).mean()
        if initial is None:initial=float(loss.detach())
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        optimizer.step()
    with torch.no_grad():
        o,d,c=(torch.from_numpy(validation[i]) for i in range(3))
        preds=[render(torch,model,o[i:i+rays],d[i:i+rays],center,radius,samples)
               for i in range(0,len(o),rays)]
        mse=float(((torch.cat(preds)-c)**2).mean())
    output=Path(output)
    output.parent.mkdir(parents=True,exist_ok=True)
    tensors={k:v.detach().cpu().numpy() for k,v in model.state_dict().items()}
    tensors.update(center=center_np.astype("f4"),radius=np.asarray([radius],dtype="f4"))
    # Numeric arrays only, no pickled checkpoint loading.
    np.savez_compressed(output,**tensors)
    manifest={
        "status":"EXPERIMENTAL_CPU_NEURAL_VOLUME",
        "trained_on":"user-supplied-calibrated-frames",
        "frames":len(rows),"train_frames":len(train_rows),"holdout_frames":1,
        "steps":steps,"rays_per_batch":rays,"samples_per_ray":samples,
        "initial_training_mse":initial,"holdout_mse":mse,
        "holdout_psnr_db":-10*math.log10(max(mse,1e-12)),
        "image_sha256":{str(row[-1].relative_to(Path(dataset).resolve())):
                        hashlib.sha256(row[-1].read_bytes()).hexdigest() for row in rows},
        "checkpoint_sha256":hashlib.sha256(output.read_bytes()).hexdigest(),
        "evidence_class":"RESEARCH_ONLY_NOT_REAL_WORLD_SURVEY",
        "note":"Not gsplat, not measured physical geometry, not an automatically shipped game asset."
    }
    output.with_suffix(".json").write_text(json.dumps(manifest,indent=2,sort_keys=True))
    return manifest

def synthetic_self_test(folder,steps=20):
    """Four locally authored toy views. Result is NOT courthouse evidence."""
    folder=Path(folder)
    images=folder/"images"
    images.mkdir(parents=True,exist_ok=True)
    poses=[]
    for i in range(4):
        a=i*math.pi/2
        eye=np.asarray([2*math.sin(a),.1,2*math.cos(a)])
        forward=-eye/np.linalg.norm(eye)
        right=np.cross(forward,[0,1,0])
        right/=np.linalg.norm(right)
        up=np.cross(right,forward)
        pose=np.eye(4)
        pose[:3,0]=right
        pose[:3,1]=up
        pose[:3,2]=-forward
        pose[:3,3]=eye
        name=f"view{i:02d}.png"
        Image.new("RGB",(24,24),(184,111,62)).save(images/name)
        poses.append({"file_path":"./images/"+name,"transform_matrix":pose.tolist()})
    (folder/"transforms.json").write_text(json.dumps({
        "camera_model":"OPENCV","fl_x":34,"fl_y":34,"cx":12,"cy":12,
        "w":24,"h":24,"frames":poses}))
    output=folder/"synthetic_cpu_volume.npz"
    result=train(folder,output,steps=steps,rays=48,samples=12,max_side=24)
    result["synthetic_toy_not_reconstruction"]=True
    return result

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dataset",type=Path)
    p.add_argument("--output",type=Path,required=True)
    p.add_argument("--steps",type=int,default=80)
    p.add_argument("--rays",type=int,default=64)
    p.add_argument("--samples",type=int,default=24)
    p.add_argument("--max-side",type=int,default=96)
    p.add_argument("--self-test",action="store_true")
    a=p.parse_args()
    if a.self_test:
        result=synthetic_self_test(a.output,steps=a.steps)
    else:
        if a.dataset is None or a.output.suffix!=".npz":
            p.error("Supply --dataset and an .npz --output")
        result=train(a.dataset,a.output,a.steps,a.rays,a.samples,a.max_side)
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
