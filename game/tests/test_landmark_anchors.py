import importlib.util, json, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("anchor",Path(__file__).parents[1]/"tools/build_landmark_anchors.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class AnchorTests(unittest.TestCase):
    def fixture(self):
        return {"type":"FeatureCollection","features":[
          {"type":"Feature","properties":{"objectid":741267,"county":"Posey","lidaryear":"2020"},"geometry":{
           "type":"Polygon","coordinates":[[
             [-87.894649476,37.931735731],[-87.894756645,37.932007028],
             [-87.894992482,37.931948584],[-87.894885312,37.931677287],
             [-87.894649476,37.931735731]
           ]]}}]}
    def test_verified_2020_footprint_georeferences_rotated_courthouse(self):
        a=mod.select(self.fixture())
        self.assertEqual(a["footprintObjectID"],741267)
        self.assertTrue(20<a["dimensionsMeters"]["width"]<25)
        self.assertTrue(28<a["dimensionsMeters"]["depth"]<34)
        self.assertTrue(0.20<a["rotationRadians"]<0.40)
        self.assertTrue(-5<a["gamePosition"]["x"]<35)
        self.assertTrue(485<a["gamePosition"]["z"]<520)
        self.assertEqual(a["roofHeightStatus"],"UNVERIFIED_NOT_FROM_BARE_EARTH_DEM")
    def test_rejects_ambiguous_or_wrong_county(self):
        obj=self.fixture()
        obj["features"][0]["properties"]["county"]="Gibson"
        with self.assertRaisesRegex(ValueError,"Posey"):mod.select(obj)
        obj=self.fixture();obj["features"]+=obj["features"]
        with self.assertRaisesRegex(ValueError,"Exactly one"):mod.select(obj)
    def test_does_not_derive_roof_height_from_lidar_footprint(self):
        obj=self.fixture()
        a=mod.select(obj)
        self.assertIsNone(a["measuredRoofHeightMeters"])
        self.assertIsNone(a["verticalDatum"])
    def test_missing_feature_is_not_replaced_with_nearest_unverified_building(self):
        with self.assertRaisesRegex(ValueError,"Exactly one"):mod.select({"features":[]})

if __name__=="__main__":unittest.main()
