#!/usr/bin/env python3
"""Non-destructive KTX2 pilot for project-owned embedded GLB PNGs."""
import argparse
import hashlib
import json
import struct
import subprocess
from pathlib import Path

PNG=b'\x89PNG\r\n\x1a\n'
KTX2=b'\xabKTX 20\xbb\r\n\x1a\n'
def sha(data):return hashlib.sha256(data).hexdigest()

def extract(path):
    data=path.read_bytes()
    if len(data)<20 or struct.unpack_from('<4sII',data)!=(b'glTF',2,len(data)):
        raise ValueError('Invalid GLB header')
    chunks={};offset=12
    while offset<len(data):
        if offset+8>len(data):raise ValueError('Invalid chunk bounds')
        size,kind=struct.unpack_from('<I4s',data,offset);offset+=8
        if size%4 or offset+size>len(data) or kind in chunks:raise ValueError('Invalid chunk bounds')
        chunks[kind]=data[offset:offset+size];offset+=size
    doc=json.loads(chunks[b'JSON']);binary=chunks[b'BIN\0']
    roles={}
    def use(info,role):
        if info is None:return
        tex=doc['textures'][info['index']]
        i=tex['source']
        if i in roles and roles[i]!=role:raise ValueError('conflicting image roles')
        roles[i]=role
    for m in doc.get('materials',[]):
        p=m.get('pbrMetallicRoughness',{})
        use(p.get('baseColorTexture'),'color');use(m.get('emissiveTexture'),'color')
        use(p.get('metallicRoughnessTexture'),'linear');use(m.get('occlusionTexture'),'linear')
        use(m.get('normalTexture'),'normal')
    result=[]
    for i,role in sorted(roles.items()):
        image=doc['images'][i]
        if image.get('mimeType')!='image/png' or 'uri' in image:raise ValueError('Only embedded PNG inputs supported')
        view=doc['bufferViews'][image['bufferView']]
        start=view.get('byteOffset',0);size=view['byteLength']
        if view.get('buffer')!=0 or start<0 or size<33 or start+size>min(len(binary),doc['buffers'][0]['byteLength']):raise ValueError('Image buffer bounds')
        payload=binary[start:start+size]
        if not payload.startswith(PNG) or payload[12:16]!=b'IHDR':raise ValueError('Invalid PNG header')
        w,h,depth,color=struct.unpack_from('>IIBB',payload,16)
        if depth!=8 or color not in (2,6) or not (4<=w<=8192 and 4<=h<=8192) or w%4 or h%4:raise ValueError('Unsupported PNG dimensions or channels')
        result.append({'index':i,'role':role,'codec':'basis-lz' if role=='color' else 'uastc','width':w,'height':h,'channels':3 if color==2 else 4,'bytes':payload})
    return result

def command(encoder,src,dst,role,codec,channels=4):
    if role not in ('color','linear','normal') or codec not in ('basis-lz','uastc') or channels not in (3,4):raise ValueError('Invalid encoding recipe')
    fmt=('R8G8B8A8' if channels==4 else 'R8G8B8')+('_SRGB' if role=='color' else '_UNORM')
    return [encoder,'create','--format',fmt,'--assign-tf','srgb' if role=='color' else 'linear','--encode',codec,'--generate-mipmap','--threads','1',str(src),str(dst)]

def build(inputs,out,encoder):
    out.mkdir(parents=True,exist_ok=False)
    report=[]
    for path in inputs:
        source_hash=sha(path.read_bytes())
        for im in extract(path):
            stem=f'{path.stem}-{im["index"]:02d}'
            src=out/(stem+'.png');dst=out/(stem+'.ktx2')
            src.write_bytes(im['bytes'])
            subprocess.run(command(encoder,src,dst,im['role'],im['codec'],im['channels']),check=True)
            subprocess.run([encoder,'validate','--gltf-basisu',str(dst)],check=True)
            encoded=dst.read_bytes()
            if not encoded.startswith(KTX2):raise ValueError('Invalid KTX2 output')
            report.append({k:v for k,v in im.items() if k!='bytes'}|{'source':path.name,'source_sha256':source_hash,'png_sha256':sha(im['bytes']),'png_bytes':len(im['bytes']),'ktx2':dst.name,'ktx2_bytes':len(encoded),'ktx2_sha256':sha(encoded)})
        if sha(path.read_bytes())!=source_hash:raise RuntimeError('Source was modified')
    if not report:raise ValueError('No embedded textures found')
    manifest={'schema':'river-valley-ktx2-pilot/v1','runtime_integration':False,'textures':report,'total_png_bytes':sum(r['png_bytes'] for r in report),'total_ktx2_bytes':sum(r['ktx2_bytes'] for r in report)}
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps(manifest,indent=2))
    return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('inputs',nargs='+',type=Path)
    p.add_argument('--output',required=True,type=Path)
    p.add_argument('--encoder',default='ktx')
    a=p.parse_args();build(a.inputs,a.output,a.encoder)
