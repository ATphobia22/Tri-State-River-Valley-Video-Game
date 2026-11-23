#!/usr/bin/env python3
"""Offline, reproducible game-only parcel-zoning build for the regional scene.

Inputs are admitted GeoJSON snapshots. No remote calls, no personal assessment
attributes, no legal zoning inference, no assumptions of verified utilities or
levee protection. This is a feeder for MV Town Generator v5 and the browser game.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
GAME = HERE.parent


def load(path):
    raw = Path(path).read_bytes()
    data = json.loads(raw)
    if data.get("type") != "FeatureCollection" or not isinstance(data.get("features"), list):
        raise ValueError(f"Invalid GeoJSON: {path}")
    return data, raw


def polygon_rings(geometry):
    typ = geometry.get("type")
    if typ == "Polygon":
        return geometry["coordinates"]
    if typ == "MultiPolygon":
        return [ring for poly in geometry["coordinates"] for ring in poly]
    raise ValueError(f"Expected polygon, got {typ}")


def project(point, origin, scale):
    return ((point[0] - origin[0]) * scale[0], (origin[1] - point[1]) * scale[1])


def area_centroid(ring):
    cross_total = cx = cz = 0.
    for (x, z), (u, v) in zip(ring, ring[1:]):
        cross = x * v - u * z
        cross_total += cross
        cx += (x + u) * cross
        cz += (z + v) * cross
    if abs(cross_total) < 1.e-9:
        raise ValueError("Zero-area parcel polygon")
    return (cx / (3 * cross_total), cz / (3 * cross_total), abs(cross_total) / 2)


def inside(point, ring):
    x, z = point
    match = False
    for (a, b), (c, d) in zip(ring, ring[1:]):
        if (b > z) != (d > z) and x < (c - a) * (z - b) / (d - b) + a:
            match = not match
    return match


def bbox(ring):
    return (min(p[0] for p in ring), min(p[1] for p in ring),
            max(p[0] for p in ring), max(p[1] for p in ring))


def intersects_bbox(a, b, padding=0):
    return a[0] <= b[2] + padding and a[2] >= b[0] - padding and a[1] <= b[3] + padding and a[3] >= b[1] - padding


def distance_point_segment(point, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]
    t = max(0, min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / (dx * dx + dz * dz or 1)))
    return math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dz)


def source_lines(feature):
    geometry = feature["geometry"]
    if geometry["type"] == "LineString":
        return [geometry["coordinates"]]
    if geometry["type"] == "MultiLineString":
        return geometry["coordinates"]
    raise ValueError("Road source contains non-line geometry")


def build(parcels_path, footprints_path, roads_path, scene_path, output_path):
    parcels, parcel_raw = load(parcels_path)
    buildings, building_raw = load(footprints_path)
    roads, road_raw = load(roads_path)
    scene = json.loads(Path(scene_path).read_text())
    origin, scale = scene["origin"], scene["metresPerDegree"]
    road_segments = []
    for feature in roads["features"]:
        for points in source_lines(feature):
            projected = [project(p, origin, scale) for p in points]
            for a, b in zip(projected, projected[1:]):
                road_segments.append((a, b, bbox((a, b))))
    houses = []
    for feature in buildings["features"]:
        rings = polygon_rings(feature["geometry"])
        outer = [project(p, origin, scale) for p in rings[0]]
        if len(outer) < 4:
            raise ValueError("Truncated GIO building polygon")
        x, z, _ = area_centroid(outer)
        houses.append((str(feature.get("id", feature.get("properties", {}).get("building_id"))),
                       (x, z), bbox(outer)))
    seen = set()
    output = []
    for feature in parcels["features"]:
        ident = str(feature.get("id", feature.get("properties", {}).get("parcel_id")))
        if not ident or ident == "None" or ident in seen:
            raise ValueError(f"Missing/duplicated parcel ID: {ident}")
        seen.add(ident)
        rings = polygon_rings(feature["geometry"])
        projected = [[project(p, origin, scale) for p in ring] for ring in rings]
        if not projected or any(len(r) < 4 for r in projected):
            raise ValueError(f"Corrupt parcel ring: {ident}")
        outer = max(projected, key=lambda r: area_centroid(r)[2])
        x, z, area = area_centroid(outer)
        box = bbox(outer)
        building_ids = [fid for fid, center, bounds in houses
                        if intersects_bbox(box, bounds) and inside(center, outer)]
        distance = float("inf")
        samples = outer[::max(1, len(outer) // 80)]
        for a, b, bounds in road_segments:
            if not intersects_bbox(box, bounds, 24):
                continue
            distance = min(distance, *(distance_point_segment(p, a, b) for p in samples))
            if distance < 1:
                break
        front = distance <= 16
        dist = math.hypot(x, z)
        # Scene-only suggested zone; actual zoning map has NOT been joined.
        zone = "AG" if area > 5500 else "C" if dist < 110 and area < 2500 else "R1" if area < 1900 else "R2" if area < 4100 else "NONE"
        output.append({"type": "Feature", "id": ident,
                       "geometry": feature["geometry"],
                       "properties": {
                           "parcel_id": ident, "zone": zone, "zone_source": "INFERRED_GAME_ONLY",
                           "zone_age": 0, "built": bool(building_ids),
                           "building_level": 1 if building_ids else 0,
                           "households": 0, "desirability": 50, "abandoned": False,
                           "existing_footprint_ids": building_ids,
                           "road_access_estimate": front,
                           "road_distance_m": round(distance, 1) if math.isfinite(distance) else None,
                           "area_m2": round(area),
                           "center_local_m": [round(x, 2), round(z, 2)],
                           "flood_status": "UNKNOWN",
                           "levee_protection": "NOT_VERIFIED",
                           "utilities": {"water": "UNKNOWN", "power": "UNKNOWN", "sewer": "UNKNOWN"},
                           "archetype": "existing-footprint" if building_ids else None}})
    if not output or len(output) != len(parcels["features"]):
        raise ValueError("Incomplete parcel zoning export")
    # Stable per-source Git blob SHA; prevents stale save diffs from applying to new parcel shapes.
    parcel_git_sha = hashlib.sha1(b"blob " + str(len(parcel_raw)).encode() + b"\0" + parcel_raw).hexdigest()
    out = {"type": "FeatureCollection",
           "name": "Mount Vernon Downtown Parcel-Based Zones — GAME SCENARIO, NOT OFFICIAL ZONING",
           "properties": {
               "schemaVersion": 1, "parcelCount": len(output),
               "buildingsInExtent": len(buildings["features"]), "roadsInReference": len(roads["features"]),
               "parcelGitBlob": parcel_git_sha,
               "sourceParcels": "Indiana GIO 2025 Parcel Boundaries FeatureServer/0",
               "sourceBuildings": "Indiana GIO Building Footprints FeatureServer/0",
               "sourceRoads": "Indiana GIO Road Centerlines Current",
               "defaultZoneMethod": "Illustrative area/distance heuristic, not official zoning",
               "roadAccess": "Estimated centerline proximity <=16 metres; not verified legal ingress",
               "floodAndLevee": "UNKNOWN; no verified NFHL/levee joins",
               "utilities": "UNKNOWN; no verified service availability",
               "legalZone": "UNVERIFIED",
               "inputSHA256": {
                   "parcels": hashlib.sha256(parcel_raw).hexdigest(),
                   "footprints": hashlib.sha256(building_raw).hexdigest(),
                   "roads": hashlib.sha256(road_raw).hexdigest()},
               "runUTC": datetime.now(timezone.utc).isoformat(),
               "use": "Offline parcel-level gameplay only; not regulatory, property, or engineering information"},
           "features": sorted(output, key=lambda f: int(f["id"]) if f["id"].isdigit() else f["id"])}
    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    return out


def cli():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--parcels", type=Path, default=HERE / "assets/mount_vernon_parcels_2025.geojson")
    parser.add_argument("--footprints", type=Path, default=HERE / "assets/mount_vernon_gio_footprints.geojson")
    parser.add_argument("--roads", type=Path, default=GAME / "reference/mount-vernon/roads.geojson")
    parser.add_argument("--scene", type=Path, default=HERE / "assets/scene.json")
    parser.add_argument("--output", type=Path, default=HERE / "assets/mount_vernon_zoned.geojson")
    args = parser.parse_args()
    result = build(args.parcels, args.footprints, args.roads, args.scene, args.output)
    print("Built", len(result["features"]), "non-regulatory game parcel records at", args.output)


if __name__ == "__main__":
    cli()
