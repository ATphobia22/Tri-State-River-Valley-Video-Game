import importlib.util
from pathlib import Path
import unittest
s=importlib.util.spec_from_file_location('ref',Path(__file__).parents[1]/'tools/acquire_mount_vernon_reference.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class ReferenceTests(unittest.TestCase):
    def test_inverse_local_map(self):
        for x,z in [(16,504),(130,1050),(-1260,-850)]:
            a=m.geog(x,z);b=m.world(*a)
            self.assertAlmostEqual(x,b[0],places=6)
            self.assertAlmostEqual(z,b[1],places=6)
    def test_packed_buildings_keep_city_world_coordinates(self):
        f={'properties':{'objectid':12},'geometry':{'type':'Polygon','coordinates':[[[-87.895,37.931],[-87.8949,37.931],[-87.8949,37.9309],[-87.895,37.9309],[-87.895,37.931]]]}}
        r=m.pack_buildings([f]);self.assertEqual(len(r),1)
        self.assertEqual(len(r[0][5]),8)
    def test_nearest_road_is_not_fabricated_landmark(self):
        ln={'properties':{'st_name':'Sample','objectid':7},'geometry':{'type':'LineString','coordinates':[m.geog(10,20),m.geog(20,20)]}}
        result=m.nearest_on_roads(15,30,[ln]);self.assertAlmostEqual(result['distanceLocalMeters'],10,places=3)
        self.assertEqual(result['roadObjectID'],7)
    def test_packed_roads_not_prototype_scaling(self):
        f={'properties':{'st_name':'Main'},'geometry':{'type':'LineString','coordinates':[m.geog(0,0),m.geog(10,10)]}}
        r=m.pack_roads([f]);self.assertEqual(r[0][1], [0,0,40,40])
if __name__=='__main__':unittest.main()
