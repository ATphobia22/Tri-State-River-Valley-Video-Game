#!/usr/bin/env python3
"""Deterministic, standard-library-only River Explorer rigged glTF 2.0 GLB builder.
Original geometry, 27-bone skin, blended body weights, PBR, finger joints and 13 clips.
Coordinates: right-handed, Y up, forward -Z, game world scale (approx 17 units high).
"""
import base64, hashlib, json, math, struct
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "assets" / "models"
DATA = Path(__file__).resolve().parents[1] / "data"
OUT.mkdir(parents=True, exist_ok=True)
DATA.mkdir(parents=True, exist_ok=True)
PALETTE = {
 'shirt': ([.075,.086,.099,1],.88,.03), 'cargo': ([.138,.145,.151,1],.93,.00),
 'pocket':([.20,.19,.16,1],.88,0), 'skin':([.57,.34,.21,1],.87,0),
 'hair':([.065,.039,.025,1],.97,0), 'gaiter':([.044,.047,.05,1],.89,0),
 'mask':([.83,.83,.79,1],.86,0), 'glasses':([.018,.021,.025,1],.29,.1),
 'gold':([.72,.42,.12,1],.24,.84), 'pack':([.23,.19,.13,1],.93,0),
 'strap':([.38,.27,.16,1],.85,0), 'boots':([.078,.088,.087,1],.91,.03),
 'sole':([.035,.042,.041,1],.97,0), 'metal':([.26,.28,.27,1],.4,.65),
 'lens':([.29,.35,.37,.10],.10,.08)
}
BONES = [
 ('Hips',None,(0,6.65,0)),('Spine',0,(0,1.5,0)),('Chest',1,(0,3.15,0)),
 ('Neck',2,(0,1.18,0)),('Head',3,(0,1.55,0)),
 ('LeftUpperArm',2,(-2.5,.35,0)),('LeftForearm',5,(-2.6,0,0)),('LeftHand',6,(-2.1,0,0)),
 ('RightUpperArm',2,(2.5,.35,0)),('RightForearm',8,(2.6,0,0)),('RightHand',9,(2.1,0,0)),
 ('LeftUpperLeg',0,(-1.35,-.38,0)),('LeftLowerLeg',11,(0,-3.25,0)),('LeftFoot',12,(0,-2.74,-.25)),
 ('RightUpperLeg',0,(1.35,-.38,0)),('RightLowerLeg',14,(0,-3.25,0)),('RightFoot',15,(0,-2.74,-.25))
] 
# Ten independent finger/thumb joints, local to each hand; no licensed rig assets.
FINGER_NAMES=['Thumb','Index','Middle','Ring','Pinky']
for side,hand_idx,sign in [('Left',7,-1),('Right',10,1)]:
 for digit in range(5):
  BONES.append((side+FINGER_NAMES[digit],hand_idx,(sign*(.50 if digit==0 else .44),-.28,-.30+(digit-.9)*.19)))
WORLD=[]
for name,parent,v in BONES:
 q=WORLD[parent] if parent is not None else (0,0,0)
 WORLD.append(tuple(q[i]+v[i] for i in range(3)))
assert WORLD[13][1] > 0 and WORLD[16][1] > 0
parts={k:dict(pos=[],indices=[],joints=[],weights=[],norm=[]) for k in PALETTE}
skipped_degenerate_triangles=0

def add(material, vertices, faces, weight_fn):
 p=parts[material];base=len(p['pos']);p['pos'].extend(vertices)
 for v in vertices:
  js,ws=weight_fn(v);assert len(js)==len(ws) and 0<len(js)<=4
  pairs=list(zip(js,ws))[:4];s=sum(w for _,w in pairs)
  p['joints'].append([j for j,_ in pairs]+[0]*(4-len(pairs)))
  p['weights'].append([w/s for _,w in pairs]+[0.]*(4-len(pairs)))
 global skipped_degenerate_triangles
 for a,b,c in faces:
  # UV spheres repeat polar vertices by design. Discard the zero-area fan
  # triangles *before* normals and GLB index accessors are constructed.
  # Avoid reindexing the skinned mesh: surviving joint/weight/UVs stay paired.
  if len({a,b,c})<3:
   skipped_degenerate_triangles+=1;continue
  pa,pb,pc=vertices[a],vertices[b],vertices[c]
  ux,uy,uz=(pb[i]-pa[i] for i in range(3))
  vx,vy,vz=(pc[i]-pa[i] for i in range(3))
  nx,ny,nz=uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx
  if nx*nx+ny*ny+nz*nz<=1e-16:
   skipped_degenerate_triangles+=1;continue
  p['indices'].extend([base+a,base+b,base+c])

def rigid(j):return lambda v:([j],[1.])
def blend(a,b,t):return ([a,b],[max(0,min(1,1-t)),max(0,min(1,t))])
def torso_skin(v):
 y=v[1]
 if y<9.1:return blend(0,1,(y-7.0)/2.1)
 return blend(1,2,(y-9.1)/2.2)
def leg_skin(hi,lo):return lambda v:blend(hi,lo,(3.65-v[1])/.9+.5)

def loft_y(mat,rings,sx,sz,weight):
 verts=[];faces=[];n=16
 for x,y,z,rx,rz in rings:
  for k in range(n):
   th=2*math.pi*k/n
   verts.append((x+rx*math.cos(th),y,z+rz*math.sin(th)))
 for i in range(len(rings)-1):
  for j in range(n):
   a=i*n+j;b=i*n+(j+1)%n;c=(i+1)*n+j;d=(i+1)*n+(j+1)%n
   faces.extend([(a,c,b),(b,c,d)])
 faces.extend([(0,(j+1)%n,j) for j in range(1,n-1)])
 offset=(len(rings)-1)*n
 faces.extend([(offset,offset+j,offset+(j+1)%n) for j in range(1,n-1)])
 add(mat,verts,faces,weight)

def uv_ball(mat,center,radii,weight,lat=9,lon=14):
 cx,cy,cz=center;rx,ry,rz=radii;v=[];f=[]
 for j in range(lat+1):
  phi=math.pi*j/lat
  for i in range(lon):
   th=2*math.pi*i/lon;v.append((cx+rx*math.sin(phi)*math.cos(th),cy+ry*math.cos(phi),cz+rz*math.sin(phi)*math.sin(th)))
 for j in range(lat):
  for i in range(lon):
   a=j*lon+i;b=j*lon+(i+1)%lon;c=(j+1)*lon+i;d=(j+1)*lon+(i+1)%lon
   f.extend([(a,c,b),(b,c,d)])
 add(mat,v,f,weight)

def box(mat,center,ext,weight):
 x,y,z=center;a,b,c=[k/2 for k in ext]
 v=[(x+dx*a,y+dy*b,z+dz*c) for dx,dy,dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 f=[(0,1,2),(0,2,3),(1,5,6),(1,6,2),(5,4,7),(5,7,6),(4,0,3),(4,3,7),(3,2,6),(3,6,7),(4,5,1),(4,1,0)]
 add(mat,v,f,weight)

def tube(mat,a,b,r,weight,sides=9):
 dx,dy,dz=[b[i]-a[i] for i in range(3)];length=math.sqrt(dx*dx+dy*dy+dz*dz);assert length>1e-5
 up=(dx/length,dy/length,dz/length);ref=(0,0,1) if abs(up[2])<.85 else (0,1,0)
 ux=up[1]*ref[2]-up[2]*ref[1];uy=up[2]*ref[0]-up[0]*ref[2];uz=up[0]*ref[1]-up[1]*ref[0]
 norm=math.sqrt(ux*ux+uy*uy+uz*uz);u=(ux/norm,uy/norm,uz/norm)
 v=(up[1]*u[2]-up[2]*u[1],up[2]*u[0]-up[0]*u[2],up[0]*u[1]-up[1]*u[0]);vert=[];faces=[]
 for c in [a,b]:
  for i in range(sides):
   t=2*math.pi*i/sides;vert.append(tuple(c[k]+r*(math.cos(t)*u[k]+math.sin(t)*v[k]) for k in range(3)))
 for i in range(sides):
  j=(i+1)%sides;faces.extend([(i,j,sides+i),(j,sides+j,sides+i)])
 add(mat,vert,faces,weight)

loft_y('shirt',[(0,7.25,0,1.9,1.2),(0,8.2,0,2.28,1.23),(0,9.4,0,2.08,1.18),
 (0,10.65,0,2.51,1.36),(0,11.7,0,2.64,1.37),(0,12.15,0,1.95,1.09)],0,0,torso_skin)
loft_y('cargo',[(0,6.35,0,1.9,1.05),(0,7.25,0,2.2,1.2),(0,7.75,0,2.1,1.2)],0,0,rigid(0))
box('sole',(0,7.38,-1.21),(4.2,.36,.4),rigid(0))
box('metal',(0,7.43,-1.48),(.7,.48,.2),rigid(0))
for side,hip,shin,foot in [(-1,11,12,13),(1,14,15,16)]:
 x=side*1.35
 rings=[(x,6.48,0,1.13,1.08),(x,5.8,0,1.11,1.04),(x,4.5,0,.99,1.0),
        (x,3.82,0,.88,.89),(x,3.37,0,.92,.92),(x,2.9,0,.89,.86),
        (x,1.45,0,.74,.76),(x,.90,0,.80,.80)]
 loft_y('cargo',rings,0,0,leg_skin(hip,shin))
 box('pocket',(x+side*.95,4.9,.35),(.43,1.5,1.48),rigid(hip))
 box('pocket',(x+side*.98,5.54,.36),(.52,.32,1.62),rigid(hip))
 box('pocket',(x,3.44,-.85),(1.5,.42,.20),rigid(shin))
 for yseam in [4.20,5.25]:
  tube('pocket',(x+side*.96,yseam,.25),(x+side*.96,yseam+.30,.25),.030,rigid(hip),5)
 loft_y('boots',[(x,.28,0,.96,1.03),(x,.72,0,.94,.99),(x,1.27,0,.86,.85)],0,0,rigid(foot))
 box('boots',(x,.50,-.75),(2.04,.85,2.45),rigid(foot))
 box('sole',(x,.23,-.86),(2.15,.43,2.70),rigid(foot))
 # Outsole tread and crossed laces are visible from the gameplay camera.
 for yy in [.65,.86,1.07]:
  tube('strap',(x-.56,yy,-1.84),(x+.56,yy,-1.84),.065,rigid(foot),5)
 for yy in [.66,.91]:
  tube('strap',(x-.46,yy,-1.86),(x+.46,yy+.20,-1.87),.043,rigid(foot),5)
 for treadZ in [-1.85,-1.35,-.82,-.32]:
  box('sole',(x,.06,treadZ),(2.20,.15,.18),rigid(foot))

loft_y('gaiter',[(0,12.15,-.17,1.1,1.10),(0,13.00,-.15,1.32,1.13),(0,13.72,-.19,1.36,1.08)],0,0,rigid(3))
uv_ball('skin',(0,14.28,0),(1.54,1.72,1.3),rigid(4))
# Soft rounded cloth front is bound to Head; the flat original skull decal
# is drawn as an offline procedural CanvasTexture on a curved face mesh.
uv_ball('gaiter',(0,13.72,-.78),(1.34,.88,.76),rigid(4),10,16)
for side in [-1,1]:
 # Eyes and pupils remain readable behind the much clearer glasses.
 uv_ball('mask',(side*.65,14.87,-1.385),(.22,.145,.050),rigid(4),6,10)
 uv_ball('glasses',(side*.59,14.87,-1.453),(.066,.072,.023),rigid(4),5,8)
 tube('hair',(side*.27,15.45,-1.20),(side*1.12,15.49,-1.11),.08,rigid(4),7)
 box('lens',(side*.68,14.82,-1.455),(.88,.66,.021),rigid(4))
 uv_ball('glasses',(side*.65,14.78,-1.41),(.22,.24,.07),rigid(4),6,9)
 for dy in [-.39,.39]:tube('glasses',(side*.20,14.85+dy,-1.45),(side*1.19,14.85+dy,-1.45),.075,rigid(4),6)
 for xx in [side*.2,side*1.19]:tube('glasses',(xx,14.46,-1.45),(xx,15.24,-1.45),.068,rigid(4),6)
 tube('glasses',(side*1.23,14.8,-1.36),(side*1.53,14.84,.06),.07,rigid(4),6)
tube('glasses',(-.18,14.86,-1.47),(.18,14.86,-1.47),.09,rigid(4),6)
uv_ball('hair',(0,15.22,.08),(1.53,.96,1.3),rigid(4))
for row in range(4):
 for col in range(7):
  x=(col-3)*.43+math.sin(row*3+col*2)*.07
  z=-1.07+row*.59
  y=15.84+math.sin(row*1.7+col*.8)*.19+(1-abs(col-3)/4)*.28
  uv_ball('hair',(x,y,z),(.33,.40,.33),rigid(4),6,8)

def arm_tube(mat,side,upper,lower,hand):
 y=11.98;n=12;verts=[]
 locations=[2.25,2.7,4.25,4.73,5.09,5.47,6.5,7.18,7.45]
 radii=[.86,.82,.73,.68,.67,.66,.55,.51,.56]
 for dd,rad in zip(locations,radii):
  for i in range(n):
   th=2*math.pi*i/n
   verts.append((side*dd,y+rad*math.cos(th),rad*.87*math.sin(th)))
 def skin(v):
  x=abs(v[0])
  if x<4.96:return blend(upper,lower,(x-4.52)/.8+.5)
  return blend(lower,hand,(x-7.05)/.52+.5)
 # Actual short sleeve -> exposed forearm -> black glove cuff.
 # Adjacent rings meet without skin or pose seams, with skinned weights.
 for lo,hi,fabric in [(0,3,'shirt'),(3,6,'skin'),(6,8,'gaiter')]:
  local=verts[lo*n:(hi+1)*n];faces=[]
  for row in range(hi-lo):
   for i in range(n):
    a=row*n+i;b=row*n+(i+1)%n;c=(row+1)*n+i;d=(row+1)*n+(i+1)%n
    faces.extend([(a,c,b),(b,c,d)])
  add(fabric,local,faces,skin)
for side,upper,lower,hand in [(-1,5,6,7),(1,8,9,10)]:
 arm_tube('shirt',side,upper,lower,hand)
 box('gaiter',(side*7.2,11.98,0),(.83,.87,1),rigid(hand))
 uv_ball('skin',(side*7.60,11.98,-.07),(.57,.47,.48),rigid(hand),7,9)
 # Individual skinned finger geometry follows each new finger bone.
 for finger in range(5):
  finger_joint=17+(0 if side==-1 else 5)+finger
  world_x=side*(7.45+(.50 if finger==0 else .44))
  world_y=11.98-.28
  world_z=-.07-.30+(finger-.9)*.19
  mid=(world_x+side*(.14 if finger==0 else .19),world_y-.055,world_z-.02)
  tip=(world_x+side*(.32 if finger==0 else .43),world_y-.13,world_z-.05)
  tube('gaiter',(world_x,world_y,world_z),mid,.125,rigid(finger_joint),7)
  tube('skin',mid,tip,.088,rigid(finger_joint),7)
# Reinforced shirt seams, pack hardware and stitches share existing
# PBR materials/primitives to avoid increasing GPU draw submissions.
for side in [-1,1]:
 tube('pocket',(side*2.14,9.24,-.88),(side*2.31,11.52,-.89),.033,rigid(2),5)
 tube('pocket',(side*1.5,11.64,-1.00),(side*2.55,11.45,-.45),.036,rigid(2),5)
 box('metal',(side*1.83,10.32,-1.40),(.27,.42,.12),rigid(2))
for i in range(18):
 t=i/18*math.pi
 a=(1.58*math.cos(t),12.07-.9*math.sin(t),-1.46)
 t2=(i+1)/18*math.pi
 b=(1.58*math.cos(t2),12.07-.9*math.sin(t2),-1.46)
 tube('gold',a,b,.067,rigid(2),6)
for side in [-1,1]:
 tube('strap',(side*2.08,11.86,-1.25),(side*1.72,9.10,-1.21),.19,rigid(2),8)
 box('metal',(side*1.8,10.7,-1.41),(.38,.53,.13),rigid(2))
box('pack',(0,10.25,2.08),(4.2,4.45,2.1),rigid(2))
box('pocket',(0,9.36,3.23),(3.0,1.5,.43),rigid(2))
box('strap',(0,12.43,2.05),(3.96,.45,2.43),rigid(2))
box('gold',(0,9.9,3.54),(.46,.35,.1),rigid(2))
for side in [-1,1]:
 tube('pocket',(side*2.03,9.15,-.75),(side*2.27,10.8,-.97),.044,rigid(2),5)
 tube('pocket',(side*.93,7.45,-1.15),(side*.93,6.72,-1.07),.048,rigid(0),5)

blob=bytearray();views=[];accessors=[]
def push(raw,target=None):
 while len(blob)%4:blob.append(0)
 offset=len(blob);blob.extend(raw);v={'buffer':0,'byteOffset':offset,'byteLength':len(raw)}
 if target:v['target']=target
 views.append(v);return len(views)-1
def acc(raw,comp,type_,count,target=None,mn=None,mx=None):
 v=push(raw,target);a={'bufferView':v,'componentType':comp,'count':count,'type':type_}
 if mn is not None:a['min']=mn;a['max']=mx
 accessors.append(a);return len(accessors)-1
def pack_f(v):return struct.pack('<%sf'%len(v),*v)

prim=[]
for material,p in parts.items():
 if not p['pos']:continue
 vertex=p['pos'];norm=[[0.,0.,0.] for v in vertex]
 for idx in range(0,len(p['indices']),3):
  ia,ib,ic=p['indices'][idx:idx+3];a=vertex[ia];b=vertex[ib];c=vertex[ic]
  u=[b[k]-a[k] for k in range(3)];v=[c[k]-a[k] for k in range(3)]
  cross=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
  for j in [ia,ib,ic]:
   for k in range(3):norm[j][k]+=cross[k]
 norm=[tuple(z/math.sqrt(sum(q*q for q in n)) if sum(q*q for q in n)>1e-12 else 0 for z in n) for n in norm]
 flat=lambda a:[x for row in a for x in row]
 mins=[min(v[i] for v in vertex) for i in range(3)];maxs=[max(v[i] for v in vertex) for i in range(3)]
 pos=acc(pack_f(flat(vertex)),5126,'VEC3',len(vertex),34962,mins,maxs)
 nor=acc(pack_f(flat(norm)),5126,'VEC3',len(norm),34962)
 joints=acc(struct.pack('<%dH'%(len(vertex)*4),*flat(p['joints'])),5123,'VEC4',len(vertex),34962)
 weights=acc(pack_f(flat(p['weights'])),5126,'VEC4',len(vertex),34962)
 # UV0 supplies native game-owned repeating microfabric textures. No network texture files.
 uvs=[(v[0]*.18+v[2]*.045,v[1]*.20+v[2]*.05) for v in vertex]
 uv=acc(pack_f(flat(uvs)),5126,'VEC2',len(vertex),34962)
 indices=acc(struct.pack('<%dH'%len(p['indices']),*p['indices']),5123,'SCALAR',len(p['indices']),34963)
 prim.append({'attributes':{'POSITION':pos,'NORMAL':nor,'JOINTS_0':joints,'WEIGHTS_0':weights,'TEXCOORD_0':uv},'indices':indices,'material':list(PALETTE).index(material)})

nodes=[{'name':'RiverExplorer','children':[1,2]},{'name':'RiverSkin','mesh':0,'skin':0}]
for i,(name,parent,trans) in enumerate(BONES):
 node={'name':name,'translation':list(trans)}
 kids=[j+2 for j,(_,p,_) in enumerate(BONES) if p==i]
 if kids:node['children']=kids
 nodes.append(node)
ib=[]
for x,y,z in WORLD:ib.extend([1,0,0,0,0,1,0,0,0,0,1,0,-x,-y,-z,1])
ibm=acc(pack_f(ib),5126,'MAT4',len(BONES))
def quat_x(v):return [math.sin(v*.5),0.,0.,math.cos(v*.5)]
def quat_z(v):return [0.,0.,math.sin(v*.5),math.cos(v*.5)]
def pose(state,phase):
 wave=math.sin(phase*math.pi*2);c={}
 if state=='Idle':
  # A real authored idle breathing clip: the previous all-identity Idle
  # contained zero animation channels and couldn't receive mixer crossfades.
  c={'Chest':quat_x(.018*wave),'Head':quat_z(.012*wave)}
 elif state in ('Walk','Run','Sprint'):
  a={'Walk':.37,'Run':.67,'Sprint':.91}[state]
  c={'LeftUpperLeg':quat_x(a*wave),'RightUpperLeg':quat_x(-a*wave),
     'LeftUpperArm':quat_z(-.15-a*.55*wave),'RightUpperArm':quat_z(.15-a*.55*wave),
     'LeftLowerLeg':quat_x(max(0,-wave)*a*.74),'RightLowerLeg':quat_x(max(0,wave)*a*.74),
     'Chest':quat_x(.04 if state=='Walk' else .12)}
 elif state=='FishingCast':c={'RightUpperArm':quat_z(-.98+phase*.20),'RightForearm':quat_z(.6+math.sin(phase*math.pi)*.5),'LeftUpperArm':quat_z(.74)}
 elif state=='Cook':c={'Chest':quat_x(.45),'RightUpperArm':quat_z(-.75),'RightForearm':quat_z(.9+math.sin(phase*2*math.pi)*.24),'LeftUpperLeg':quat_x(.3),'RightUpperLeg':quat_x(.3)}
 elif state=='Track':c={'Chest':quat_x(.17),'RightUpperArm':quat_z(-1.0),'LeftUpperArm':quat_z(.85),'RightForearm':quat_z(.85),'LeftForearm':quat_z(-.85)}
 elif state=='Drive':c={'LeftUpperLeg':quat_x(1),'RightUpperLeg':quat_x(1),'LeftLowerLeg':quat_x(-1.1),'RightLowerLeg':quat_x(-1.1),'LeftUpperArm':quat_z(-.95),'RightUpperArm':quat_z(.95)}
 elif state=='Interact':c={'Chest':quat_x(.4),'RightUpperArm':quat_z(-.8),'RightForearm':quat_z(.6)}
 elif state=='Jump':c={'LeftUpperLeg':quat_x(-.45-.16*math.sin(phase*math.pi)),'RightUpperLeg':quat_x(-.45-.16*math.sin(phase*math.pi)),
   'LeftLowerLeg':quat_x(.85),'RightLowerLeg':quat_x(.85),'LeftUpperArm':quat_z(-.55),'RightUpperArm':quat_z(.55)}
 elif state=='Land':c={'Chest':quat_x(.38*(1-phase)),'LeftUpperLeg':quat_x(-.38*(1-phase)),'RightUpperLeg':quat_x(-.38*(1-phase)),
   'LeftLowerLeg':quat_x(.55*(1-phase)),'RightLowerLeg':quat_x(.55*(1-phase))}
 elif state=='Farm':c={'Chest':quat_x(.55),'LeftUpperArm':quat_z(-.6),'RightUpperArm':quat_z(.64),
   'LeftUpperLeg':quat_x(.3),'RightLowerLeg':quat_x(.48)}
 elif state=='Wave':c={'RightUpperArm':quat_z(1.20),'RightForearm':quat_z(.65+math.sin(phase*4*math.pi)*.32)}

 return c
animations=[]
for state in ['Idle','Walk','Run','Sprint','FishingCast','Cook','Track','Drive','Interact','Jump','Land','Farm','Wave']:
 times=[0,.25,.5,.75,1.0];timeref=acc(pack_f(times),5126,'SCALAR',len(times),mn=[0],mx=[1]);channels=[];samplers=[]
 for i,(name,_,_) in enumerate(BONES):
  vals=[]
  for t in times:vals.extend(pose(state,t).get(name,[0,0,0,1]))
  if all(vals[j:j+4]==vals[0:4] for j in range(4,len(vals),4)) and vals[:4]==[0,0,0,1]:continue
  target=acc(pack_f(vals),5126,'VEC4',len(times));samplers.append({'input':timeref,'output':target,'interpolation':'LINEAR'})
  channels.append({'sampler':len(samplers)-1,'target':{'node':i+2,'path':'rotation'}})
 animations.append({'name':state,'channels':channels,'samplers':samplers})
materials=[]
for name,(factor,rough,metal) in PALETTE.items():
 m={'name':'River '+name,'pbrMetallicRoughness':{'baseColorFactor':factor,'metallicFactor':metal,'roughnessFactor':rough},'doubleSided':False}
 if factor[3]<1:m['alphaMode']='BLEND';m['doubleSided']=True
 materials.append(m)
model={'asset':{'version':'2.0','generator':'River Valley original deterministic rig builder 1.0','copyright':'Original game asset'},
 'scenes':[{'nodes':[0]}],'scene':0,'nodes':nodes,'skins':[{'name':'RiverHumanoid','joints':list(range(2,2+len(BONES))),'inverseBindMatrices':ibm,'skeleton':2}],
 'meshes':[{'name':'RiverExplorerSkinned','primitives':prim}], 'materials':materials,'animations':animations,
 'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':accessors}
js=json.dumps(model,separators=(',',':')).encode();js+=b' ' * (-len(js)%4);blob.extend(b'\0'*(-len(blob)%4))
header=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(blob))
raw=header+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(blob),0x004e4942)+blob
OUT.joinpath('river_explorer_rigged.glb').write_bytes(raw)
DATA.joinpath('hero-model.js').write_text('/* Original rigged River Explorer; generated by build_rigged_hero.py. */\nwindow.ValleyRiggedHeroData='+json.dumps(base64.b64encode(raw).decode())+';\n')
receipt={'name':'RiverExplorer','format':'glTF 2.0 GLB','license':'Project-original, no third-party asset','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),
 'boneCount':len(BONES),'vertexCount':sum(len(p['pos']) for p in parts.values()),'triangleCount':sum(len(p['indices'])//3 for p in parts.values()),'primitives':len(prim),'materials':len(materials),'degenerateTrianglesRemoved':skipped_degenerate_triangles,'clips':[a['name'] for a in animations],'footGroundY':[WORLD[13][1],WORLD[16][1]],'usesExternalResources':False}
OUT.joinpath('river_explorer_manifest.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2))
