import importlib.util
from pathlib import Path
import unittest
s=importlib.util.spec_from_file_location("discover",Path(__file__).parents[1]/"tools/discover_2025_leafon.py")
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class SourceDiscoveryTests(unittest.TestCase):
 def test_s3_xml_is_parsed_without_assuming_country_or_keys(self):
  xml=b'<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><IsTruncated>false</IsTruncated><CommonPrefixes><Prefix>2025/</Prefix></CommonPrefixes><Contents><Key>readme.txt</Key></Contents></ListBucketResult>'
  actual=m.parse_s3(xml)
  self.assertEqual(actual['prefixes'],['2025/'])
  self.assertEqual(actual['sampleKeys'],['readme.txt'])
  self.assertFalse(actual['truncated'])
 def test_only_official_layer_urls_survive(self):
  source=b'{"operationalLayers":[{"title":"Leafon","url":"https://di-ingov.img.arcgis.com/path","layerType":"ArcGISImageServiceLayer"},{"title":"Untrusted","url":"https://evil.example/x"}]}'
  layers=m.parse_map(source)
  self.assertEqual(layers[0]['url'],'https://di-ingov.img.arcgis.com/path')
  self.assertIsNone(layers[1]['url'])
 def test_rejects_unexpected_map_shape(self):
  with self.assertRaises(ValueError):m.parse_map(b'{"item":"irrelevant"}')
if __name__=="__main__":unittest.main()
