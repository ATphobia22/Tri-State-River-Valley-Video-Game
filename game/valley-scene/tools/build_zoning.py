"""Non-regulatory parcel game layer from Indiana GIO GIS snapshots."""
import hashlib
import json
from pathlib import Path
from shapely.affinity import affine_transform
from shapely.geometry import shape
from shapely.strtree import STRtree
from shapely.ops import unary_union

def build_zoned(parcels,manifest,buildings,roads,out_path):
    lon0,lat0=manifest['origin'];sx,sz=manifest['metresPerDegree']
    def metric(geometry):
        return affine_transform(geometry,[sx,0,0,sz,-lon0*sx,-lat0*sz])
    footprints=[shape(f['geometry']).buffer(0) for f in buildings['features']]
    footprints=[f for f in footprints if not f.is_empty]
    index=STRtree(footprints)
    roadlines=unary_union([metric(shape(f['geometry'])) for f in roads['features']])
    features=[];seen=set()
    for parcel in parcels['features']:
        raw_id=parcel.get('properties',{}).get('objectid')
        if raw_id is None:raise ValueError('Missing authoritative parcel objectid')
        ident=str(raw_id)
        if ident in seen:raise ValueError('Duplicate parcel objectid '+ident)
        seen.add(ident)
        geom=shape(parcel['geometry']).buffer(0)
        if geom.is_empty or not geom.is_valid:raise ValueError('Invalid parcel geometry '+ident)
        matches=index.query(geom)
        built=any(geom.covers(footprints[int(i)].centroid) for i in matches)
        pt=geom.centroid
        road_access=metric(geom).distance(roadlines)<=12
        features.append({'type':'Feature','id':ident,'geometry':parcel['geometry'],
          'properties':{'objectid':int(raw_id),'zone':'NONE','zone_age':0,
            'built':bool(built),'building_level':1 if built else 0,'households':0,
            'desirability':50,'abandoned':False,'road_access':bool(road_access),
            'sim_center':[round((pt.x-lon0)*sx,2),round((lat0-pt.y)*sz,2)],
            'flood_status':'UNKNOWN','utility_status':'UNVERIFIED',
            'legal_zoning_verified':False,'built_classification':'footprint_centroid_v1'}})
    digest=hashlib.sha256(json.dumps([(f['id'],f['geometry']) for f in features],sort_keys=True).encode()).hexdigest()[:16]
    result={'type':'FeatureCollection','properties':{'snapshot_id':'in-gio-2025-mv-'+digest,
      'source':'Indiana GIO 2025 parcel boundaries','crs':'EPSG:4326',
      'status':'SIMULATION_ONLY','legal_zoning_verified':False,
      'feature_count':len(features)},'features':features}
    Path(out_path).write_text(json.dumps(result,separators=(',',':')))
    return result
