"""Offline Cesium ion credential, asset-state and redaction tests."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('verify_ion_assets', ROOT / 'tools/verify_ion_assets.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class IonInventoryTests(unittest.TestCase):
    def test_completed_ion_metadata_is_not_georegistration(self):
        def reader(url, token):
            self.assertEqual(token, 'not-a-real-secret')
            return ({'id': 6204792, 'type': '3DTILES', 'status': 'COMPLETE'}
                    if not url.endswith('/endpoint') else
                    {'type': '3DTILES', 'url': 'https://assets.cesium.com/6204792/tileset.json?access_token=secret'})
        receipt = m.inspect(6204792, 'not-a-real-secret', reader)
        self.assertEqual(receipt['status'], 'ION_COMPLETE_METADATA_ONLY')
        self.assertFalse(receipt['productionApproved'])
        self.assertNotIn('secret', str(receipt))
        self.assertNotIn('tileset.json', str(receipt))

    def test_refuses_incomplete_or_wrong_type(self):
        for status, kind in [('AWAITING_FILES', '3DTILES'), ('COMPLETE', 'TERRAIN')]:
            with self.assertRaises(ValueError):
                m.sanitize(6204792, {'id':6204792, 'type':kind, 'status':status},
                           {'type':kind, 'url':'https://assets.cesium.com/path'})

    def test_refuses_untrusted_urls_and_ids(self):
        with self.assertRaises(ValueError):
            m.inspect(6204790, 'token', lambda u, t: None)
        with self.assertRaises(ValueError):
            m.sanitize(6204792, {'id':6204792, 'type':'3DTILES', 'status':'COMPLETE'},
                       {'type':'3DTILES', 'url':'https://malicious.example/tileset.json'})
        with self.assertRaises(ValueError):
            m.read_json('https://example.org/path', 'token')

if __name__ == '__main__':
    unittest.main()
