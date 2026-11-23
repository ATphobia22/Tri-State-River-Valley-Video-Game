"""Build a separate illustrative Coliseum facade fitted to the selected GIO footprint."""
import json
from pathlib import Path
import numpy as np
import trimesh
from shapely.geometry import shape,Polygon

root=Path(__file__).resolve().parents[1]
m=json.loads((root/'assets/scene.json').read_text())
lon,lat=m['origin'];sx,sz=m['metresPerDegree'];cx,cz=m['coliseum']
fs=json.loads((root.parent/'reference/mount-vernon/buildings.geojson').read_text())['features']
g=shape(next(f['geometry'] for f in fs if f['properties']['objectid']==741283))
ring=np.array(g.minimum_rotated_rectangle.exterior.coords)[:-1]
xy=np.column_stack(((ring[:,0]-lon)*sx-cx,(lat-ring[:,1])*sz-cz))
p=Polygon(xy).minimum_rotated_rectangle
corners=np.array(p.exterior.coords)[:-1];edges=np.roll(corners,-1,axis=0)-corners
axis=edges[np.argmax(np.linalg.norm(edges,axis=1))];depth=np.linalg.norm(axis);width=p.area/depth
yaw=float(np.arctan2(axis[0],axis[1]))
pieces=[]
stone=(176,166,147,255);trim=(206,196,171,255);glass=(63,77,75,255)
def block(size,loc,clr):
    obj=trimesh.creation.box(size);obj.apply_translation(loc);obj.visual.face_colors=clr;pieces.append(obj)
block((width,8.6,depth),(0,4.3,0),stone)
for y in [1.15,6.8,8.55]:block((width+.45,.36,depth+.52),(0,y,0),trim)
block((width-.7,.5,depth-.7),(0,8.83,0),(105,106,101,255))
for x in np.linspace(-width*.42,width*.42,7):
    for z in [-depth/2-.10,depth/2+.10]:block((1.45,3.2,.22),(x,4.1,z),glass)
for z in np.linspace(-depth*.40,depth*.40,9):
    for x in [-width/2-.10,width/2+.10]:block((.22,3.2,1.5),(x,4.15,z),glass)
for x in np.linspace(-width*.43,width*.43,6):
    block((.56,6.9,.72),(x,3.55,-depth/2-.23),trim)
for k in range(4):block((width*.58,.23*(k+1),(4-k)*.56),(0,.115*(k+1),-depth/2-.28*(4-k)),trim)
mesh=trimesh.util.concatenate(pieces)
mesh.apply_transform(trimesh.transformations.rotation_matrix(yaw,(0,1,0)))
mesh.export(root/'assets/coliseum.glb')
