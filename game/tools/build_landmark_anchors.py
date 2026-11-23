#!/usr/bin/env python3
"""Recover a *probable* courthouse footprint anchor from checked-in Indiana GIO GIS.

This is horizontal registration only; IGIO footprint polygons do not contain
roof surfaces, construction heights or verified NAVD88 controls. Hard fail
instead of guessing if the known county source feature moves or disappears.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path

OBJECTID=741267
NRHP_SQUARE_LONLAT=(-87.894722,37.931944)  # Approximate historic-square locator, not survey corner
LON0=-87.895
LAT0=37.9325
DLON=0.00001137489
DLAT=-0.000009009399

def meters_dx(dl,lat):
    return dl*111320*math.cos(math.radians(lat))
def meters_dy(dl):
    return dl*111132.92

def select(dataset):
    matches=[f for f in dataset.get("features",[]) if f.get("properties",{}).get("objectid")==OBJECTID]
    if len(matches)!=1:raise ValueError("Exactly one authoritative courthouse footprint ID 741267 required")
    obj=matches[0]
    p=obj.get("properties",{})
    if p.get("county")!="Posey" or str(p.get("lidaryear"))!="2020":
        raise ValueError("Posey County 2020 source provenance required")
    geo=obj.get("geometry",{})
    if geo.get("type")!="Polygon":raise ValueError("Expected Polygon, not converted bounding box")
    ring=geo["coordinates"][0]
    if len(ring)!=5 or ring[0]!=ring[-1]:raise ValueError("Expected intact rectangular footprint ring")
    if not all(len(v)>=2 and -88<v[0]<-87 and 37<v[1]<39 and math.isfinite(v[0]) and math.isfinite(v[1]) for v in ring):
        raise ValueError("Footprint is outside Mount Vernon WGS84")
    center=(sum(v[0] for v in ring[:-1])/4,sum(v[1] for v in ring[:-1])/4)
    # Distinct authoritative polygon and less accurate NRIS square locator.
    delta=math.hypot(meters_dx(center[0]-NRHP_SQUARE_LONLAT[0],center[1]),
                     meters_dy(center[1]-NRHP_SQUARE_LONLAT[1]))
    if delta>45:raise ValueError("Courthouse footprint moved away from documented historic square")
    a,b,c,d=ring[:4]
    longitudinal=(meters_dx(b[0]-a[0],center[1]),-meters_dy(b[1]-a[1])) # game Z points south
    lateral=(meters_dx(c[0]-b[0],center[1]),-meters_dy(c[1]-b[1]))
    depth=math.hypot(*longitudinal)
    width=math.hypot(*lateral)
    if not (28<depth<35 and 19<width<26):
        raise ValueError("Courthouse footprint changed materially, manual review needed")
    # Local positive Z is south; choose direction A<-B for a +Z basis.
    angle=math.atan2(-longitudinal[0],-longitudinal[1])
    x=(center[0]-LON0)/DLON
    z=430+(center[1]-LAT0)/DLAT
    return {
      "id":"posey-county-courthouse",
      "address":"300 Main St, Mount Vernon, IN 47620, USA",
      "footprintObjectID":OBJECTID,
      "status":"IGIO_2020_FOOTPRINT_MATCHED_TO_APPROXIMATE_HISTORIC_SQUARE",
      "source":"Indiana GIO Building Footprints FeatureServer/0; LiDAR-derived 2020",
      "registration":"Approximate affine EPSG:4326 game transform, not surveyed",
      "sourceYear":2020,
      "centerWGS84":[round(v,10) for v in center],
      "historicSquareLocatorOffsetMeters":round(delta,2),
      "gamePosition":{"x":round(x,4),"z":round(z,4)},
      "dimensionsMeters":{"width":round(width,4),"depth":round(depth,4)},
      "rotationRadians":round(angle,7),
      "measuredRoofHeightMeters":None,
      "verticalDatum":None,
      "roofHeightStatus":"UNVERIFIED_NOT_FROM_BARE_EARTH_DEM",
      "meshGeometry":"ARTIST_AUTHORED_REFERENCE_GUIDED_SILHOUETTE",
      "npsNomination":"https://npgallery.nps.gov/AssetDetail/NRIS/88003042",
      "sourceFootprintRingWGS84":[[round(v[0],10),round(v[1],10)] for v in ring]
    }

def build(root):
    root=Path(root)
    raw=(root/"reference/mount-vernon/buildings.geojson").read_bytes()
    meta=select(json.loads(raw))
    payload={"schemaVersion":1,"courthouse":meta,
             "provenance":{"inputSHA256":hashlib.sha256(raw).hexdigest(),
                "sourceURL":"https://gisdata.in.gov/server/rest/services/Hosted/Building_Footprints/FeatureServer/0",
                "landmarkReference":"https://npgallery.nps.gov/AssetDetail/NRIS/88003042",
                "groundElevationSource":"USGS 3DEP bare earth with game-local horizontal mapping; absolute datum not certified",
                "measuredRoofElevation":False}}
    text=json.dumps(payload,separators=(",",":"),ensure_ascii=False)
    (root/"data/landmark-anchors.js").write_text("/* Source-derived horizontal only; roofs not measured. */\nwindow.ValleyLandmarkAnchors="+text+";\n",encoding="utf-8")
    (root/"reference/mount-vernon/landmark-anchors-receipt.json").write_text(json.dumps(payload,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({"input_sha256":payload["provenance"]["inputSHA256"],"landmark":meta},indent=2))

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[1])
    args=parser.parse_args()
    build(args.root)
