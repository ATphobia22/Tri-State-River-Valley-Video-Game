import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location("posey_mesh",Path(__file__).parents[1]/"tools/posey_courthouse_mesh.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Recorder:
 def __init__(self):self.items=[]
 def box(self,size,pos,cat='wood',rotate=None):self.items.append(("box",size,pos,cat))
 def cylinder(self,r,height,pos,cat='metal',sections=12,rotate=None):self.items.append(("cylinder",(r,height),pos,cat))
 def cone(self,r,height,pos,cat='roof',sections=4,rotate=None):self.items.append(("cone",(r,height),pos,cat))
 def add(self,mesh,cat='wood',pos=(0,0,0),rotate=None):self.items.append(("mesh",mesh,pos,cat))
class TestCourthouseSource(unittest.TestCase):
 def test_reference_guided_geometry_includes_real_silhouette_elements(self):
  v=Recorder()
  info=m.assemble(v)
  self.assertGreater(len(v.items),170,"New model cannot be the old five-box courthouse")
  self.assertGreater(info["architecturalFeatures"]["archedWindows"],40)
  self.assertGreater(info["architecturalFeatures"]["corniceBands"],1)
  self.assertTrue(info["architecturalFeatures"]["octagonalCupola"])
  self.assertEqual(info["heightEvidence"],"UNMEASURED_ARTISTIC_PROPORTIONS")
  self.assertEqual(info["horizontalFootprintSourceObjectID"],741267)
 def test_source_footprint_limits_and_roof_are_not_falsely_surveyed(self):
  self.assertTrue(20<m.WIDTH<23)
  self.assertTrue(30<m.DEPTH<33)
  v=Recorder();m.assemble(v)
  self.assertTrue(all(p[2]>=-m.DEPTH/2-1 for kind,s,p,cat in v.items if kind=='box'))
if __name__=="__main__":unittest.main()
