import math,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from local_earth_registration import geodetic_to_ecef,root_enu_to_ecef_transform,transform_position

class GeodeticTransformTests(unittest.TestCase):
 def test_equatorial_origin_matches_wgs84_semimajor_axis(self):
  x,y,z=geodetic_to_ecef(0,0,0)
  self.assertAlmostEqual(x,6378137.0,places=4)
  self.assertAlmostEqual(y,0,places=4)
  self.assertAlmostEqual(z,0,places=4)
 def test_local_east_north_up_basis_is_right_handed(self):
  matrix=root_enu_to_ecef_transform(lon_deg=0,lat_deg=0,height_m=0)
  self.assertEqual(len(matrix),16)
  self.assertAlmostEqual(matrix[12],6378137.0,places=4)
  self.assertEqual([round(v) for v in matrix[0:3]],[0,1,0])
  self.assertEqual([round(v) for v in matrix[4:7]],[0,0,1])
  self.assertEqual([round(v) for v in matrix[8:11]],[1,0,0])
  self.assertEqual(transform_position(matrix,(10,20,30)),(6378167.0,10.0,20.0))
 def test_origin_and_height_require_explicit_finite_geodetic_values(self):
  for p in [(-200,0,0),(0,91,0),(0,0,float('nan')),(True,0,0)]:
   with self.assertRaises((ValueError,TypeError)):geodetic_to_ecef(*p)
 def test_rejects_non_finite_local_vertex(self):
  matrix=root_enu_to_ecef_transform(lon_deg=0,lat_deg=0,height_m=0)
  with self.assertRaises(ValueError):transform_position(matrix,(0,float('inf'),0))
if __name__=='__main__':unittest.main()
