import importlib.util
from pathlib import Path
from unittest import TestCase, main
from PIL import Image
s=importlib.util.spec_from_file_location("leafon", Path(__file__).parents[1]/"tools/acquire_2025_leafon.py")
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)

class LeafOnTests(TestCase):
    def test_2025_sources_must_be_official_viewer_subgroup(self):
        webmap={"operationalLayers":[
          {"title":"2025 Leaf-on - 6-inch","layerType":"GroupLayer","layers":[
            {"title":"Published tile 1","url":"https://iserver5.surdex.com/arcgis/rest/services/Indiana/P3500372s1/ImageServer"},
            {"title":"Fake","url":"https://fake.example/imagery"}]},
          {"title":"2023 leaf-off","url":"https://di-ingov.img.arcgis.com/arcgis/rest/services/DynamicWebMercator/Indiana_Current_Imagery/ImageServer"}]}
        self.assertEqual(m.leafon_services(webmap),["https://iserver5.surdex.com/arcgis/rest/services/Indiana/P3500372s1/ImageServer"])

    def test_untrusted_layer_path_rejected(self):
        bad={"operationalLayers":[{"title":"2025 Leaf-on - 6-inch","layers":[
            {"url":"https://iserver5.surdex.com.evil.test/arcgis/rest/services/Indiana/P3500372s1/ImageServer"}]}]}
        self.assertEqual(m.leafon_services(bad),[])

    def test_wgs84_bounds_validation_rejects_wrong_state_and_size(self):
        m.verify_extent((-87.928,37.909,-87.853,37.960),(-87.928,37.909,-87.853,37.960))
        with self.assertRaises(ValueError):
            m.verify_extent((-87.928,37.909,-87.853,37.960),(-86.,37.9,-85.,38.))
        with self.assertRaises(ValueError):
            m.verify_extent((-87.928,37.909,-87.853,37.960),(-87.928,37.909,-87.927,37.960))

    def test_rejects_coverage_gaps_and_improper_source_colors(self):
        im=Image.new("RGBA",(10,10),(30,70,100,255))
        m.verify_coverage(im)
        im.putpixel((4,4),(0,0,0,0))
        with self.assertRaisesRegex(ValueError,"gap"):m.verify_coverage(im)
        blank=Image.new("RGBA",(10,10),(10,10,10,255))
        with self.assertRaisesRegex(ValueError,"diversity"):m.verify_coverage(blank)

    def test_warp_registration_does_not_invert_north(self):
        from PIL import Image
        img=Image.new("RGBA",(20,20),(20,30,40,255))
        for x in range(20):
            for y in range(0,10):img.putpixel((x,y),(210,30,30,255))
        bbox=(-87.93,37.90,-87.87,37.96)
        out=m.align_layer(img,bbox,bbox,(20,20))
        self.assertEqual(out.getpixel((10,1))[0],210)
        self.assertEqual(out.getpixel((10,19))[0],20)
if __name__=="__main__":main()
