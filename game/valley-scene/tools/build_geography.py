"""Build Y-up metre meshes for the county and downtown from registered GIS snapshots."""
import base64
import hashlib
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

import mapbox_earcut as earcut
import numpy as np
import rasterio
import shapefile
import trimesh
from PIL import Image, ImageDraw
from shapely.geometry import Point, Polygon, box, shape
from shapely.ops import unary_union
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals

SCENE = Path(__file__).resolve().parents[1]
GAME = SCENE.parent
DATA = Path(sys.argv[1])
OUT = SCENE/'assets'
OUT.mkdir(exist_ok=True)
REF = GAME/'reference/mount-vernon'
anchor = json.loads((REF/'landmark-anchors-receipt.json').read_text())['courthouse']
lon0, lat0 = anchor['centerWGS84']
sx, sz = 1/.00001137489, 1/.000009009399
def local(lon, lat):
    return (lon-lon0)*sx,(lat0-lat)*sz
def geo(x,z):
    return lon0+x/sx,lat0-z/sz

def surface(data,bounds,x,z):
    lon,lat=geo(x,z)
    left,bottom,right,top=bounds
    rows,cols=data.shape
    i=np.clip((lon-left)/(right-left)*cols-.5,0,cols-1)
    j=np.clip((top-lat)/(top-bottom)*rows-.5,0,rows-1)
    a,b=np.floor(i).astype(int),np.floor(j).astype(int)
    c,d=np.minimum(a+1,cols-1),np.minimum(b+1,rows-1)
    u,v=i-a,j-b
    return (1-v)*((1-u)*data[b,a]+u*data[b,c])+v*((1-u)*data[d,a]+u*data[d,c])
with rasterio.open(DATA/'posey.tif') as ds:
    county=ds.read(1);county_bounds=list(ds.bounds)
assert np.isfinite(county).all() and 50<county.min()<county.max()<500
code=(GAME/'data/usgs-3dep-terrain.js').read_text()
grid=json.loads(code.split('window.ValleySourceTerrain=',1)[1].strip().rstrip(';'))['grid']
city=(np.frombuffer(base64.b64decode(grid['b64']),dtype='<u2').astype(float).reshape(grid['rows'],grid['cols'])*grid['stepFt']+grid['minFt'])*.3048
city_bounds=[grid[k] for k in ('lonMin','latMin','lonMax','latMax')]
base=float(surface(city,city_bounds,0,0))
def h(x,z):
    a=surface(county,county_bounds,x,z)
    b=surface(city,city_bounds,x,z)
    t=np.clip((1920-np.maximum(np.abs(x),np.abs(z)))/260,0,1)
    return a*(1-t)+b*t-base

def uv_for(x,z,b):
    lon,lat=geo(x,z)
    return np.column_stack(((lon-b[0])/(b[2]-b[0]),(lat-b[1])/(b[3]-b[1])))
def dem_mesh(xs,zs,img,bounds,hole=False):
    x,z=np.meshgrid(xs,zs);x=x.ravel();z=z.ravel();n=len(xs)
    a=np.arange(len(xs)*(len(zs)-1)).reshape(-1,n)[:,:-1].ravel()
    if hole:a=a[~((x[a]>=-2000)&(x[a]<2000)&(z[a]>=-2000)&(z[a]<2000))]
    faces=np.vstack([np.column_stack([a,a+n,a+1]),np.column_stack([a+n,a+n+1,a+1])])
    m=trimesh.Trimesh(np.column_stack((x,h(x,z),z)),faces,process=False)
    m.visual=TextureVisuals(uv=uv_for(x,z,bounds),material=PBRMaterial(baseColorTexture=img,metallicFactor=0,roughnessFactor=1))
    return m

regional=Image.open(DATA/'regional.jpg').convert('RGB')
ext=json.loads((DATA/'regional-imagery.json').read_text())['extent']
regional_bounds=[ext[k] for k in ('xmin','ymin','xmax','ymax')]
x0,z0=local(county_bounds[0],county_bounds[3]);x1,z1=local(county_bounds[2],county_bounds[1])
def axis(lo,hi):
    return np.unique(np.r_[lo,np.arange(math.ceil(lo/200)*200,hi,200),hi])
dem_mesh(axis(x0,x1),axis(z0,z1),regional,regional_bounds,True).export(OUT/'posey_terrain.glb')
img=Image.open(REF/'overhead.jpg').convert('RGB')
overlay=Image.open(REF/'leafon-2025-overlay.png').convert('RGBA');img.paste(overlay,mask=overlay.getchannel('A'))
b=json.loads((REF/'leafon-2025-receipt.json').read_text())['geographicExtentWGS84']
parcels=json.loads((DATA/'parcels-response.json').read_text())
if parcels.get('exceededTransferLimit'):raise ValueError('Partial parcel response')
atlas=img.copy();draw=ImageDraw.Draw(atlas)
for f in parcels['features']:
    for ring in f['geometry']['rings']:
        draw.line([((lon-b[0])/(b[2]-b[0])*img.width,(b[3]-lat)/(b[3]-b[1])*img.height) for lon,lat in ring],fill=(207,177,91),width=1)
# Toggleable registered parcel texture shares UVs with the aerial material.
atlas.save(OUT/'downtown-parcels.jpg',quality=88)
dem_mesh(np.linspace(-2000,2000,201),np.linspace(-2000,2000,201),img,b).export(OUT/'mount_vernon_lod0.glb')
dem_mesh(np.linspace(-2000,2000,21),np.linspace(-2000,2000,21),img.resize((512,348)),b).export(OUT/'mount_vernon_lod1.glb')

def triangles(poly):
    rings=[np.asarray(r.coords)[:-1,:2] for r in [poly.exterior,*poly.interiors]]
    points=np.vstack(rings)
    faces=earcut.triangulate_float64(points,np.cumsum([len(r) for r in rings]).astype('uint32')).reshape(-1,3)
    return points,faces

def parts(geom):
    if geom.geom_type=='Polygon':return [geom]
    return [p for p in getattr(geom,'geoms',[]) if p.geom_type=='Polygon']
water={}
clip=box(*county_bounds)
for shp in sorted((DATA/'water').glob('*.shp')):
    for sr in shapefile.Reader(str(shp)).iterShapeRecords():
        name=sr.record['FULLNAME']
        if name in ['Ohio Riv','Wabash Riv','Hovey Lk','Old Channel Wabash Riv']:
            water.setdefault(name,[]).append(shape(sr.shape.__geo_interface__).buffer(0))
scene=trimesh.Scene()
for name,items in water.items():
    surfaces=[]
    for p in parts(unary_union(items).intersection(clip).simplify(.00004)):
        coords,faces=triangles(p);x,z=local(coords[:,0],coords[:,1])
        # Long triangles over a river bend must not interpolate high bank elevations.
        height=np.full_like(x,np.percentile(h(x,z),15)+.48)
        m=trimesh.Trimesh(np.column_stack((x,height,z)),faces,process=False)
        m.visual=trimesh.visual.ColorVisuals(m,face_colors=(50,103,109,255));surfaces.append(m)
    if surfaces:scene.add_geometry(trimesh.util.concatenate(surfaces),node_name=name)
scene.export(OUT/'rivers.glb')

def append(bucket,v,f,color):
    o=len(bucket[0]);bucket[0].extend(v);bucket[1].extend(np.asarray(f)+o);bucket[2].extend([color]*len(f))
def bucket():return [[],[],[]]
tiles=defaultdict(bucket)
proxies=defaultdict(list)
def road(line,width,buf,color):
    points=np.asarray(line)
    x,z=local(points[:,0],points[:,1])
    for i in range(len(x)-1):
        dx,dz=x[i+1]-x[i],z[i+1]-z[i];length=math.hypot(dx,dz)
        if length<.03:continue
        ax,az=-dz/length*width/2,dx/length*width/2
        v=[(x[j]+s*ax,h(x[j]+s*ax,z[j]+s*az)+.23,z[j]+s*az) for j,s in [(i,1),(i,-1),(i+1,1),(i+1,-1)]]
        append(buf,v,[(0,2,1),(1,2,3)],color)
def tk(x,z):return math.floor(x/700),math.floor(z/700)
for f in json.loads((REF/'roads.geojson').read_text())['features']:
    geom=shape(f['geometry'])
    for ln in [geom] if geom.geom_type=='LineString' else geom.geoms:
        x,z=local(ln.centroid.x,ln.centroid.y)
        if max(abs(x),abs(z))<2100:road(ln.coords,6.1,tiles[tk(x,z)],(67,69,70,255))
coliseum_id=741283 # nearest mapped footprint to Census matched street range; approximate
coliseum=None
for f in json.loads((REF/'buildings.geojson').read_text())['features']:
    fid=f['properties']['objectid']
    for p in parts(shape(f['geometry']).buffer(0)):
        x,z=local(p.centroid.x,p.centroid.y)
        if fid==coliseum_id:coliseum=[float(x),float(z)]
        if max(abs(x),abs(z))>2100 or fid in [anchor['footprintObjectID'],coliseum_id]:continue
        pts,faces=triangles(p);xx,zz=local(pts[:,0],pts[:,1]);n=len(xx);floor=float(h(x,z))-.25
        roof=floor+4+(fid%6)*.62
        cell=tk(x,z);center=((cell[0]+.5)*700,(cell[1]+.5)*700)
        rect=np.array(Polygon(np.column_stack([xx,zz])).minimum_rotated_rectangle.exterior.coords)[:-1]
        ex,ez=rect[1]-rect[0]
        proxies[cell].append([round(float(v),2) for v in (x-center[0],floor,z-center[1],math.hypot(ex,ez),roof-floor,np.linalg.norm(rect[2]-rect[1]),-math.atan2(ez,ex))])
        vv=np.vstack((np.column_stack((xx,np.full(n,floor),zz)),np.column_stack((xx,np.full(n,roof),zz))))
        wall=[]
        start=0
        for r in [p.exterior,*p.interiors]:
            count=len(r.coords)-1
            for i in range(count):
                j=start+(i+1)%count;k=start+i
                wall.extend([(k,j,k+n),(j,j+n,k+n)])
            start+=count
        t=tiles[tk(x,z)]
        append(t,vv,wall,(135+fid%32,103+fid%24,87+fid%20,255))
        append(t,vv,faces+n,(104+fid%30,103+fid%26,99+fid%20,255))
def tri_mesh(buf):
    m=trimesh.Trimesh(buf[0],buf[1],process=False)
    m.visual=trimesh.visual.ColorVisuals(m,face_colors=buf[2])
    return m
tile_manifest=[]
for (ix,iz),buf in sorted(tiles.items()):
    cx,cz=(ix+.5)*700,(iz+.5)*700
    m=tri_mesh(buf);m.apply_translation([-cx,0,-cz])
    name=f'blocks_{ix}_{iz}.glb';m.export(OUT/name)
    tile_manifest.append({'file':name,'center':[cx,cz],'proxies':proxies[(ix,iz)]})
routes=bucket()
for sr in shapefile.Reader(str(next((DATA/'countyroads').glob('*.shp')))).iterShapeRecords():
    if sr.record['FULLNAME'] in ['State Hwy 69','State Rte 69','State Road 69','State Rd 69','State Rd 62','State Hwy 62','State Rte 62']:
        g=shape(sr.shape.__geo_interface__).intersection(clip)
        for ln in [g] if g.geom_type=='LineString' else g.geoms:
            if ln.geom_type=='LineString' and not ln.is_empty:road(ln.coords,9,routes,(111,96,79,255))
if routes[1]:tri_mesh(routes).export(OUT/'county_routes.glb')
assert coliseum
# Small quantized grid for clamping both actors and their shadows to downtown relief.
xx,zz=np.meshgrid(np.linspace(-2000,2000,201),np.linspace(-2000,2000,201))
ground=np.rint(h(xx,zz)*100).astype('<i2')
(OUT/'ground.bin').write_bytes(ground.tobytes())
manifest={'origin':[lon0,lat0],'metresPerDegree':[sx,sz],'tiles':tile_manifest,'coliseum':coliseum,
          'courthouseYaw':anchor['rotationRadians'],'regionalBounds':[x0,z0,x1,z1],
          'parcels':len(parcels['features']),'water':list(water),'routes':bool(routes[1])}
(OUT/'scene.json').write_text(json.dumps(manifest,separators=(',',':')))
print(len(tile_manifest),'town tiles;',len(parcels['features']),'parcels;',list(water))
