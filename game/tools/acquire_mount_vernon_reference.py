#!/usr/bin/env python3
"""Reproducible IGIO Mount Vernon overhead reference acquisition (no app credentials).

2023 source mosaic (per ImageServer identify downtown); 2025 GIS street centerlines;
2016-2020 statewide LiDAR-derived building footprints. This is an ART/DESIGN
reference; not a survey or regulatory raster/elevation model.
"""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from PIL import Image, ImageDraw

BBOX = (-87.928,37.909,-87.853,37.960)
IMG = 'https://di-ingov.img.arcgis.com/arcgis/rest/services/DynamicWebMercator/Indiana_Current_Imagery/ImageServer'
ROADS='https://gisdata.in.gov/server/rest/services/Hosted/Road_Centerlines_of_Indiana_Current/FeatureServer/0'
BLD='https://gisdata.in.gov/server/rest/services/Hosted/Building_Footprints/FeatureServer/0'
R = dict(lon0=-87.895,lat0=37.9325,z0=430,dlon=0.00001137489,dlat=-0.000009009399)
STOPS = {'courthouse':(16,504),'riverfront':(130,1050),'farm':(-1260,-850),'oak':(-810,-170),'dock':(-1350,1050),'trail':(1260,-900)}

def fetch(url,max_bytes=60_000_000):
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'RiverValleyFamilyGame-OpenReference/1.0'}),timeout=80) as response:
        if response.status!=200:raise RuntimeError(f'HTTP {response.status} for {url}')
        data=response.read(max_bytes+1)
        if len(data)>max_bytes: raise ValueError('Download exceeds review size budget')
        return data

def api_json(url,params):
    data=json.loads(fetch(url+'?'+urllib.parse.urlencode(params),max_bytes=30_000_000))
    if data.get('error'): raise RuntimeError(str(data['error']))
    return data

def acquire_features(service,bbox,fields):
    base={'geometry':','.join(map(str,bbox)),'geometryType':'esriGeometryEnvelope','inSR':4326,'outSR':4326,'spatialRel':'esriSpatialRelIntersects','where':'1=1','f':'geojson','outFields':fields,'returnGeometry':'true'}
    count=api_json(service+'/query',{**base,'f':'json','returnCountOnly':'true'})['count']
    if not 0<count<20000:raise ValueError(f'Unexpected {service} feature count {count}')
    features=[]
    for offset in range(0,count,500):
        response=api_json(service+'/query',{**base,'resultOffset':offset,'resultRecordCount':500})
        if response.get('type')!='FeatureCollection':raise RuntimeError('Did not receive GeoJSON')
        features+=response['features']
    ids=[int(f['properties']['objectid']) for f in features]
    if len(features)!=count or len(set(ids))!=count:raise RuntimeError(f'Incomplete {service} page results: {len(features)} of {count}')
    for f in features:
        if f['geometry']['type'] not in ('Polygon','MultiPolygon','LineString','MultiLineString'):
            raise ValueError('Unexpected GIS geometry type')
    return {'type':'FeatureCollection','features':features},count

def world(lon,lat):
    return (lon-R['lon0'])/R['dlon'],R['z0']+(lat-R['lat0'])/R['dlat']

def geog(x,z):
    return R['lon0']+x*R['dlon'],R['lat0']+(z-R['z0'])*R['dlat']

def flat_lines(feature):
    g=feature['geometry']; t=g['type']; c=g['coordinates']
    return [c] if t in ('LineString','Polygon') else c

def line_worlds(feature):
    g=feature['geometry'];return [list(map(lambda p:world(*p[:2]),line)) for line in ([g['coordinates']] if g['type']=='LineString' else g['coordinates'])]

def nearest_on_roads(x,z,features):
    best=None
    for f in features:
        for line in line_worlds(f):
            for a,b in zip(line,line[1:]):
                dx=b[0]-a[0];dz=b[1]-a[1];den=dx*dx+dz*dz
                t=max(0,min(1,((x-a[0])*dx+(z-a[1])*dz)/den)) if den>1e-9 else 0
                px=a[0]+t*dx;pz=a[1]+t*dz;dist=((px-x)**2+(pz-z)**2)**.5
                if best is None or dist<best['distanceLocalMeters']:
                    best={'distanceLocalMeters':round(dist,2),'roadName':f.get('properties',{}).get('st_name'),'nearestLonLat':tuple(round(v,9) for v in geog(px,pz)),'roadObjectID':f.get('properties',{}).get('objectid')}
    return best

def thin_ring(coords,max_vertices=48):
    # Retain original authoritative geometry in buildings.geojson; reduce vertex
    # density in the gameplay-only representation, not in the reference archive.
    pts=[]
    for pt in coords:
        if len(pt)<2:continue
        x,z=world(pt[0],pt[1]);
        if not (-1e6<x<1e6 and -1e6<z<1e6):continue
        if pts and abs(x-pts[-1][0])+abs(z-pts[-1][1])<.35:continue
        pts.append((x,z))
    if len(pts)>1 and (abs(pts[0][0]-pts[-1][0])+abs(pts[0][1]-pts[-1][1]))<.35:pts.pop()
    if len(pts)>max_vertices:
        idx=sorted(set(int(i*(len(pts)-1)/(max_vertices-1)) for i in range(max_vertices)))
        pts=[pts[i] for i in idx]
    return pts

def pack_buildings(features,limit=2450):
    out=[]
    for f in features:
        g=f.get('geometry',{});t=g.get('type');c=g.get('coordinates');
        if not c:continue
        if t=='Polygon':rings=c
        elif t=='MultiPolygon':rings=c[0]
        else:continue
        if not rings:continue
        pts=thin_ring(rings[0]);
        if len(pts)<3:continue
        x=sum(p[0] for p in pts)/len(pts);z=sum(p[1] for p in pts)/len(pts)
        if abs(x)>limit or abs(z)>limit:continue
        originX=int(round(x*4));originZ=int(round(z*4))
        packed=[]
        for xx,zz in pts:packed.extend([int(round(xx*4))-originX,int(round(zz*4))-originZ])
        objectid=int(f.get('properties',{}).get('objectid',0))
        # Artistic roof height: no height field in IGIO statewide footprints.
        height_cm=(5+(objectid%7))*100
        out.append([originX,originZ,height_cm,0,0,packed])
    return out

def pack_roads(features):
    out=[]
    for f in features:
        for line in line_worlds(f):
            if len(line)<2:continue
            name=str(f.get('properties',{}).get('st_name') or '')
            road_class=4 if name else 7
            arr=[]
            for x,z in line:arr.extend([round(x*4),round(z*4)])
            out.append([road_class,arr])
    return out

def geo_features_img(feature,bbox,width,height):
    g=feature['geometry'];t=g['type'];c=g['coordinates'];
    polys=[]
    if t=='Polygon': polys=c
    if t=='MultiPolygon':polys=[ring for poly in c for ring in poly]
    if t=='LineString':polys=[c]
    if t=='MultiLineString':polys=c
    def point(pt):return ((pt[0]-bbox[0])/(bbox[2]-bbox[0])*width,(bbox[3]-pt[1])/(bbox[3]-bbox[1])*height)
    return [[point(pt) for pt in ring] for ring in polys]

def render_reference(im,bbox,roads,buildings,out):
    im=im.convert('RGB');im.thumbnail((1600,1600),Image.Resampling.LANCZOS)
    w,h=im.size
    overlay=Image.new('RGBA',im.size,(0,0,0,0));d=ImageDraw.Draw(overlay)
    for f in buildings['features']:
        for ring in geo_features_img(f,bbox,w,h):
            if len(ring)>2:d.line(ring+[ring[0]],fill=(32,234,214,125),width=1)
    for f in roads['features']:
        for line in geo_features_img(f,bbox,w,h):
            if len(line)>1:d.line(line,fill=(255,237,120,230),width=2,joint='curve')
    composite=Image.alpha_composite(im.convert('RGBA'),overlay)
    d=ImageDraw.Draw(composite)
    d.rectangle((0,h-30,w,h),fill=(14,37,37,230));d.text((12,h-22),'Indiana GIO orthophoto | yellow: current road centerlines | cyan: lidar-derived building outlines | reference only',fill='white')
    composite.convert('RGB').save(out,format='PNG',optimize=True)

def acquire(root):
    root=Path(root);root.mkdir(parents=True,exist_ok=True)
    bbox=BBOX
    roads,n_roads=acquire_features(ROADS,bbox,'objectid,st_name,st_postyp')
    buildings,n_bld=acquire_features(BLD,bbox,'objectid,lidaryear,county')
    imageinfo=api_json(IMG+'/exportImage',{'bbox':','.join(map(str,bbox)),'bboxSR':4326,'imageSR':4326,'size':'2048,1393','format':'jpg','f':'json'})
    href=imageinfo.get('href')
    if not href or not href.startswith('https://di-ingov.img.arcgis.com/'):
        raise RuntimeError('ImageServer did not return a trusted source URI')
    raw=fetch(href);im=Image.open(io.BytesIO(raw));im.verify()
    im=Image.open(io.BytesIO(raw)).convert('RGB')
    if im.size!=(imageinfo['width'],imageinfo['height']) or len(set(im.resize((12,12)).getdata()))<16:
        raise RuntimeError('Image dimensions / pixel diversity check failed')
    actual=imageinfo['extent'];bounds=[actual['xmin'],actual['ymin'],actual['xmax'],actual['ymax']]
    (root/'overhead.jpg').write_bytes(raw)
    source_identifier=api_json(IMG+'/identify',{'geometry':json.dumps({'x':-87.895,'y':37.931,'spatialReference':{'wkid':4326}}),'geometryType':'esriGeometryPoint','returnGeometry':'false','returnCatalogItems':'true','f':'json'})
    ci=source_identifier.get('catalogItems',{}).get('features',[])
    vintages=[f.get('attributes',{}).get('Image_Year') for f in ci if f.get('attributes',{}).get('Image_Year')]
    sample_year=vintages[0] if vintages else None
    (root/'roads.geojson').write_text(json.dumps(roads,separators=(',',':')))
    (root/'buildings.geojson').write_text(json.dumps(buildings,separators=(',',':')))
    packaged=pack_buildings(buildings['features'])
    roadPacked=pack_roads(roads['features'])
    control=[]
    for ident,(x,z) in STOPS.items():
        nearest=nearest_on_roads(x,z,roads['features'])
        control.append({'type':'Feature','properties':{'id':ident,'kind':'nearest-public-road-to-game-stop','approximateGamePosition':list(geog(x,z)),'distanceFromCurrentGameStopMeters':nearest['distanceLocalMeters'] if nearest else None,'nearestRoadName':nearest['roadName'] if nearest else None,'sourceRoadObjectID':nearest['roadObjectID'] if nearest else None,'note':'Computed nearest road, NOT a surveyed landmark ground-control point'},'geometry':{'type':'Point','coordinates':nearest['nearestLonLat'] if nearest else geog(x,z)}})
    (root/'control-points.geojson').write_text(json.dumps({'type':'FeatureCollection','features':control},indent=2))
    meta={'captureUTC':datetime.now(timezone.utc).isoformat(),'bboxRequestedWGS84':bbox,'bboxReturnedWGS84':bounds,'projection':'EPSG:4326','sourceImage':IMG,'imageServiceYears':'2022–2025','identifiedDowntownTileYear':sample_year,'imageDimensions':[im.width,im.height],'imageryLicense':'CC0 — Indiana GIO','roadsSource':ROADS,'roadsReleaseDate':'2025-12-31','roadLineCount':n_roads,'buildingsSource':BLD,'buildingYears':'LiDAR 2016–2020','buildingFootprintCount':n_bld,'buildingsRenderedInGame':len(packaged),'roadLineParts':len(roadPacked),'gameHorizontalTransform':R,'verticalDatumVerified':False,'allStopCoordinatesSurveyVerified':False,'roadAndBuildingUse':'Design-reference and approximate visual registration; not cadastral or engineering','2025LeafOnPoseyAvailableSeparately':True,'policy':'No fabricated elevation, roofs or imagery vintage; gameplay heights deliberately illustrative.'}
    (root/'registration.json').write_text(json.dumps(meta,indent=2))
    render_reference(im,bounds,roads,buildings,root/'digitized-overview.png')
    bundle={'version':'1.8.0','imageDataUrl':'data:image/jpeg;base64,'+base64.b64encode(raw).decode('ascii'),'bboxWGS84':bounds,'roadsPacked':roadPacked,'buildingsPacked':packaged,'controlPoints':control,'metadata':{'downtownTileYear':sample_year,'roads':n_roads,'buildings':n_bld,'source':'Indiana Geographic Information Office','imageLicense':'CC0','verticalVerified':False}}
    (root.parent.parent/'data/reference-bundle.js').write_text('/* Generated directly from Indiana GIO public services. See reference/mount-vernon/registration.json */\nwindow.ValleyReference='+json.dumps(bundle,separators=(',',':'))+';\n')
    hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in root.iterdir() if p.is_file()}
    (root/'SHA256SUMS.json').write_text(json.dumps(hashes,indent=2))
    print(json.dumps({'imageryImageYearAtDowntown':sample_year,'size':[im.width,im.height],'bbox':bounds,'roads':n_roads,'buildings':n_bld,'gameBuildings':len(packaged),'packedRoadParts':len(roadPacked),'imageSha256':hashes['overhead.jpg']},indent=2))
    return meta

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--out',default='reference/mount-vernon');args=parser.parse_args()
    acquire(args.out)
