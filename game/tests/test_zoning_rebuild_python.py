"""Prove repeatable, offline, game-only parcel classification using synthetic GIS fixtures."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

GAME = Path(__file__).resolve().parents[1]
SCRIPT = GAME / "valley-scene/tools/rebuild_zoning.py"
spec = importlib.util.spec_from_file_location("rebuild_zoning", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def polygon(x, y, width, height):
    return {"type": "Polygon", "coordinates": [[
        [x, y], [x + width, y], [x + width, y + height],
        [x, y + height], [x, y]]]}


def feature(ident, geom, key="parcel_id"):
    return {"type": "Feature", "id": str(ident),
            "properties": {key: str(ident)}, "geometry": geom}


class ZoningBuildTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.folder = Path(self.tmp.name)
        self.parcels = self.folder / "parcels.geojson"
        self.buildings = self.folder / "buildings.geojson"
        self.roads = self.folder / "roads.geojson"
        self.scene = self.folder / "scene.json"
        self.out = self.folder / "zoned.geojson"
        self.write(self.parcels, [feature(11, polygon(0, 0, .0002, .0002)),
                                  feature(12, polygon(.0003, 0, .0002, .0002))])
        self.write(self.buildings, [feature(90, polygon(.00004, .00004, .0001, .0001), "building_id")])
        self.write(self.roads, [{"type": "Feature", "properties": {},
                                 "geometry": {"type": "LineString",
                                              "coordinates": [[0, -.00005], [.0005, -.00005]]}}])
        self.scene.write_text(json.dumps({"origin": [0, 0], "metresPerDegree": [100000, 100000]}))

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, path, features):
        path.write_text(json.dumps({"type": "FeatureCollection", "features": features}))

    def run_build(self):
        return mod.build(self.parcels, self.buildings, self.roads, self.scene, self.out)

    def test_generates_only_real_polygons_with_deterministic_ids_and_unknown_safety(self):
        actual = self.run_build()
        self.assertEqual(len(actual["features"]), 2)
        parcels = {f["id"]: f["properties"] for f in actual["features"]}
        self.assertEqual(parcels["11"]["built"], True)
        self.assertEqual(parcels["12"]["built"], False)
        self.assertEqual(parcels["11"]["existing_footprint_ids"], ["90"])
        self.assertEqual(parcels["11"]["road_access_estimate"], True)
        self.assertEqual(parcels["12"]["road_access_estimate"], True)
        self.assertEqual(parcels["11"]["flood_status"], "UNKNOWN")
        self.assertEqual(parcels["12"]["levee_protection"], "NOT_VERIFIED")
        self.assertEqual(parcels["11"]["utilities"]["water"], "UNKNOWN")
        self.assertEqual(parcels["12"]["zone_source"], "INFERRED_GAME_ONLY")
        self.assertEqual(actual["properties"]["legalZone"], "UNVERIFIED")
        raw = self.parcels.read_bytes()
        digest = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
        self.assertEqual(actual["properties"]["parcelGitBlob"], digest)
        self.assertEqual(len(json.loads(self.out.read_text())["features"]), 2)

    def test_duplicate_parcel_ids_are_never_silently_accepted(self):
        feature_one = feature(11, polygon(0, 0, .0002, .0002))
        self.write(self.parcels, [feature_one, feature_one])
        with self.assertRaisesRegex(ValueError, "duplicated"):
            self.run_build()

    def test_rejects_nonpolygon_and_unregistered_source(self):
        self.write(self.parcels, [{"type": "Feature", "id": "9",
                                  "geometry": {"type": "Point", "coordinates": [0, 0]}}])
        with self.assertRaisesRegex(ValueError, "Expected polygon"):
            self.run_build()


if __name__ == "__main__":
    unittest.main()
