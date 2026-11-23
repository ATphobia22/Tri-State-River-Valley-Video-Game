import importlib.util
from pathlib import Path
import math
import unittest
s = importlib.util.spec_from_file_location("usgs_terrain",Path(__file__).parents[1]/"tools/acquire_3dep_terrain.py")
m = importlib.util.module_from_spec(s);s.loader.exec_module(m)

class ThreeDepTests(unittest.TestCase):
    def test_export_extent_matches_current_game_registration(self):
        w,s,e,n=m.requested_bounds()
        self.assertTrue(-88<w<-87.8)
        self.assertTrue(37.9<s<n<38.0)
        url=m.build_export_url((w,s,e,n))
        self.assertIn("pixelType=F32",url)
        self.assertIn("imageSR=4326",url)

    def test_cm_quantization_and_north_first_row(self):
        w,s,e,n=m.requested_bounds()
        values=[104+(i % 256) * .01 for i in range(256*256)]
        g=m.encode_samples(values,256,256,(w,s,e,n))
        self.assertEqual(g['cols'],256)
        self.assertAlmostEqual(g['minFt'],104*3.28083989501312,places=7)
        import base64,struct
        raw=base64.b64decode(g['b64'])
        self.assertEqual(len(raw),256*256*2)
        self.assertEqual(struct.unpack_from('<H',raw,2)[0],1)

    def test_fail_closed_for_void_pixels_wrong_area_and_overflow(self):
        bounds=m.requested_bounds()
        samples=[110.]* (256*256)
        samples[-1]=math.nan
        with self.assertRaises(ValueError):m.encode_samples(samples,256,256,bounds)
        samples[-1]=115.
        with self.assertRaises(ValueError):m.encode_samples(samples,256,256,(-81,37,-80,38))
        samples[-1]=1000.
        with self.assertRaises(ValueError):m.encode_samples(samples,256,256,bounds)

if __name__ == "__main__":unittest.main()
