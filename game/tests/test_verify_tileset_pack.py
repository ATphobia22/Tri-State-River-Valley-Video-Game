import hashlib
import json
import struct
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from verify_tileset_pack import audit_package, box_limits


def package(path, *, overhang=False, corrupt=False):
    box = [0, 1, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2]
    child = [6 if overhang else 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]
    tileset = {'asset': {'version': '1.1'}, 'root': {'boundingVolume': {'box': box},
               'children': [{'boundingVolume': {'box': child}, 'content': {'uri': 'a.glb'}}]}}
    glb = struct.pack('<4sII', b'glTF', 2, 20) + b'12345678'
    files = {'a.glb': glb, 'tileset.json': json.dumps(tileset).encode()}
    records = [{'name': n, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                'json_padding_repaired': False} for n, data in files.items()]
    catalog = {'schema': 'river-valley-local-tile-intake/v1', 'classification': 'local-frame preview only',
               'geographic_registration': 'unverified; no authoritative local-to-earth transform supplied',
               'asset_count': len(records), 'glb_count': 1, 'repaired_glbs': 0,
               'referenced_tiles': 1, 'assets': records, 'features': [{'uri': 'a.glb'}]}
    with zipfile.ZipFile(path, 'w') as z:
        for n, data in files.items():
            if n == 'a.glb' and corrupt:
                data += b'changed'
            z.writestr('preview/mount-vernon/'+n, data)
        z.writestr('preview/catalog.json', json.dumps(catalog))


class VerifyTilesetTests(unittest.TestCase):
    def test_clean_local_preview_is_not_geographic_production(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)/'pack.zip'; package(path)
            report = audit_package(path)
            self.assertTrue(report['ok'], report['errors'])
            self.assertFalse(report['geographic_publishable'])
            self.assertEqual(report['tiles_checked'], 1)

    def test_child_outside_root_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)/'pack.zip'; package(path, overhang=True)
            self.assertTrue(any('outside declared root' in e for e in audit_package(path)['errors']))

    def test_corrupted_asset_digest_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)/'pack.zip'; package(path, corrupt=True)
            self.assertTrue(any('digest mismatch' in e for e in audit_package(path)['errors']))

    def test_degenerate_box_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'degenerate'):
            box_limits([0]*12)

    def test_zip_path_traversal_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)/'pack.zip'; package(path)
            with zipfile.ZipFile(path, 'a') as z:
                z.writestr('../outside', b'bad')
            with self.assertRaisesRegex(ValueError, 'unsafe'):
                audit_package(path)


if __name__ == '__main__':
    unittest.main()
