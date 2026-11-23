from pathlib import Path
from collections import defaultdict
import trimesh, numpy as np, base64, json, hashlib
ROOT=Path(__file__).parent
DST=ROOT/'assets'/'models'; DST.mkdir(exist_ok=True)
V={
  'barn':{'red':(170,62,53),'roof':(64,63,62),'wood':(212,163,105),'glass':(174,218,221),'metal':(110,124,122),'gold':(224,174,84)},
  'riverboat':{'red':(173,57,48),'roof':(70,91,96),'wood':(168,121,79),'glass':(124,205,218),'metal':(230,228,204),'gold':(231,174,74)},
  'fishing_pier':{'red':(168,90,54),'roof':(86,76,62),'wood':(149,104,71),'glass':(118,200,221),'metal':(96,107,91),'gold':(231,190,101)},
  'courthouse':{'red':(139,61,49),'roof':(62,71,76),'wood':(219,210,190),'glass':(65,111,127),'metal':(236,235,222),'gold':(192,150,86)},
  'oak_cottage':{'red':(162,88,65),'roof':(95,78,66),'wood':(177,126,86),'glass':(153,199,211),'metal':(108,101,85),'gold':(246,215,128)}
}
class Model:
 def __init__(self,name):self.name=name;self.items=defaultdict(list)
 def add(self,mesh,cat='wood',pos=(0,0,0),rotate=None):
  mesh=mesh.copy();
  if rotate: mesh.apply_transform(trimesh.transformations.euler_matrix(*rotate));
  mesh.apply_translation(pos); self.items[cat].append(mesh)
 def box(self,size,pos,cat='wood',rotate=None):self.add(trimesh.creation.box(extents=size),cat,pos,rotate)
 def cylinder(self,r,height,pos,cat='metal',sections=12,rotate=None):self.add(trimesh.creation.cylinder(radius=r,height=height,sections=sections),cat,pos,rotate)
 def cone(self,r,height,pos,cat='roof',sections=4,rotate=None):self.add(trimesh.creation.cone(radius=r,height=height,sections=sections),cat,pos,rotate)
 def export(self):
  scene=trimesh.Scene()
  for cat,meshes in self.items.items():
   col=V[self.name][cat];m=trimesh.util.concatenate(meshes)
   m.visual=trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(baseColorFactor=list(col)+[255],metallicFactor=0.0,roughnessFactor=.88,doubleSided=True))
   scene.add_geometry(m,geom_name=f'{self.name}_{cat}')
  raw=scene.export(file_type='glb');fname=DST/f'{self.name}.glb';fname.write_bytes(raw)
  check=trimesh.load(fname,force='scene');assert len(check.geometry)>=2
  return {'name':self.name,'bytes':len(raw),'meshes':len(check.geometry),'sha256':hashlib.sha256(raw).hexdigest(),'bounds':np.asarray(check.bounds).round(2).tolist(),'base64':base64.b64encode(raw).decode()}

def barn():
 m=Model('barn');m.box((40,25,32),(0,12.5,0),'red');m.box((44,2,40),(0,29,0),'roof',rotate=(0,0,.52));m.box((44,2,40),(0,29,0),'roof',rotate=(0,0,-.52));m.box((14,19,1),(0,9,-16.5),'wood');m.box((7,7,.6),(12,18,-16.7),'glass');m.cylinder(7,33,(27,16.5,5),'metal');m.cone(7.8,8,(27,37,5),'roof',sections=16);
 for x in (-14,14):m.box((8,7,6),(x,3.5,-30),'gold')
 return m.export()
def riverboat():
 m=Model('riverboat');m.box((60,10,24),(0,5,0),'red');m.box((48,4,20),(0,12,0),'metal');m.box((20,16,17),(-7,21,0),'metal');
 for x in (-13,-1):m.box((7,5,.3),(x,26,-8.6),'glass');m.box((7,5,.3),(x,26,8.6),'glass')
 m.cylinder(3,13,(8,29,1),'roof');m.cylinder(4,1.5,(8,36,1),'gold');m.box((20,2,25),(-7,30,0),'roof');
 for x in (-25,25):m.box((2,5,3),(x,13,-10),'wood');m.box((2,5,3),(x,13,10),'wood')
 return m.export()
def pier():
 m=Model('fishing_pier');m.box((14,1.2,62),(0,2,4),'wood');m.box((52,1.2,14),(0,2,25),'wood');
 for z in (-22,-10,5,18,28):
  for x in (-6,6):m.box((1.6,8,1.6),(x,-1.5,z),'wood')
 for x in (-24,24):m.box((2,7,2),(x,5.5,25),'metal');
 for x in (-18,18):m.box((12,1.5,1.7),(x,3.3,25),'gold')
 return m.export()
def courthouse():
 # Original geometry, author-reconstructed using National Register façade descriptions.
 # All heights are artistic; the GIS polygon is authoritative only horizontally.
 from tools.posey_courthouse_mesh import assemble
 m=Model('courthouse')
 source=assemble(m)
 result=m.export()
 result['architecturalProvenance']=source
 return result
def cottage():
 m=Model('oak_cottage');m.box((27,18,22),(0,9,0),'wood');m.box((32,3,28),(-5,22,0),'roof',rotate=(0,0,.48));m.box((32,3,28),(5,22,0),'roof',rotate=(0,0,-.48));m.box((6,11,.5),(0,5,-11.3),'red');m.box((7,6,.5),(-8,11,-11.3),'glass');m.box((7,6,.5),(8,11,-11.3),'glass');m.box((4,16,4),(8,24,1),'red');m.box((27,1,11),(0,1,-16),'wood');return m.export()
models=[barn(),riverboat(),pier(),courthouse(),cottage()]
js='/* Original locally generated glTF 2.0 models. No external requests. */\nwindow.ValleyModelData='+json.dumps({m['name']:m['base64'] for m in models},separators=(',',':'))+';\n'
(ROOT/'data'/'models.js').write_text(js)
metadata=[{k:v for k,v in m.items() if k!='base64'} for m in models]
(ROOT/'assets'/'models'/'MANIFEST.json').write_text(json.dumps({'source':'Original model geometry generated for this game by build_models.py','license':'Project-original assets; no external model imports','models':metadata},indent=2))
print(json.dumps(metadata,indent=2))
