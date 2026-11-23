#!/usr/bin/env python3
"""Verify authoritative horizontal inputs before admitting a courthouse mesh.

Reference registration is EPSG:4326 and the existing approximate game affine,
not a survey transformation. Bare-earth DEM cannot supply roof elevations.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path

from build_landmark_anchors import select

def sha256(path):
    h=hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def verify(root):
    root=Path(root)
    data=root/"reference"/"mount-vernon"
    footprints=data/"buildings.geojson"
    anchors=json.loads((data/"landmark-anchors-receipt.json").read_text())
    terrain=json.loads((data/"usgs-3dep-receipt.json").read_text())
    imagery=json.loads((data/"leafon-2025-receipt.json").read_text())
    observed=sha256(footprints)
    if observed!=anchors["provenance"]["inputSHA256"]:
        raise ValueError("Indiana GIO building-footprint SHA-256 does not match receipt")
    selected=select(json.loads(footprints.read_text()))
    source=anchors["courthouse"]
    if selected["footprintObjectID"]!=source["footprintObjectID"] or source["footprintObjectID"]!=741267:
        raise ValueError("Posey courthouse source object identifier mismatch")
    if selected["sourceFootprintRingWGS84"]!=source["sourceFootprintRingWGS84"]:
        raise ValueError("Source polygon changed since receipt")
    point=source["centerWGS84"]
    bbox=terrain["spatialBoundsWGS84"]
    ortho=imagery["geographicExtentWGS84"]
    for label,extent in (("USGS 3DEP",bbox),("IGIO 2025 ortho",ortho)):
        if not (extent[0]<=point[0]<=extent[2] and extent[1]<=point[1]<=extent[3]):
            raise ValueError("Courthouse footprint outside "+label+" coverage")
    if not (0<imagery["coveredFraction"]<=1) or imagery["sourceYear"]!=2025:
        raise ValueError("2025 image provenance incomplete")
    if terrain.get("datumVerified") is not False or imagery.get("verticalDatumValidated") is not False:
        raise ValueError("Unexpected change to vertical datum review assumptions")
    if source["measuredRoofHeightMeters"] is not None or source["verticalDatum"] is not None:
        raise ValueError("Do not silently promote unverified roof/datum to measurement")
    return {
        "status":"OFFICIAL_HORIZONTAL_PROVENANCE_VERIFIED",
        "footprint_source":"Indiana GIO lidar-derived footprint 2020",
        "objectid":741267,
        "reference_crs":"EPSG:4326",
        "game_registration":"APPROXIMATE_AFFINE_NOT_SURVEYED",
        "source_center_lonlat":point,
        "source_polygon_sha256":observed,
        "game_local_center":source["gamePosition"],
        "source_dimensions_m":source["dimensionsMeters"],
        "source_rotation_radians":source["rotationRadians"],
        "orthophoto_year":2025,
        "orthophoto_covered_fraction":imagery["coveredFraction"],
        "orthophoto_status":imagery["status"],
        "usgs_terrain_status":terrain["status"],
        "roof_height_status":"UNVERIFIED",
        "vertical_datum":"UNVERIFIED",
        "reference_only":True,
        "can_automatically_promote_candidate":False
    }

if __name__=="__main__":
    import argparse
    parser=argparse.ArgumentParser()
    parser.add_argument("--game-root",type=Path,default=Path(__file__).resolve().parents[1])
    parser.add_argument("--out",type=Path)
    a=parser.parse_args()
    result=verify(a.game_root)
    rendered=json.dumps(result,indent=2)
    if a.out:
        a.out.parent.mkdir(parents=True,exist_ok=True)
        a.out.write_text(rendered+"\n")
    print(rendered)
