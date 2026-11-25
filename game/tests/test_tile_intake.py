import json, struct, unittest, zipfile, tempfile, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from tile_intake import normalize_glb, intake

def fixture(pad=b'\0'):
    j=b'{"asset":{"version":"2.0"},"buffers":[{"byteLength":4}]}'
    if len(j)%4==0: j+=b" "
    j+=pad*((-len(j))%4)
    body=struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',4,b'BIN\0')+b'1234'
    return struct.pack('<4sII',b'glTF',2,len(body)+12)+body

class IntakeTests(unittest.TestCase):
    def test_repairs_json_only(self):
        old=fixture(); fixed,changed=normalize_glb(old)
        self.assertTrue(changed); self.assertEqual(old[-12:],fixed[-12:]);self.assertEqual(normalize_glb(fixed),(fixed,False))
    def test_rejects_invalid_header_and_truncated_payload(self):
        for raw in [b'bad',fixture()[:-1]]:
            with self.assertRaises(ValueError):normalize_glb(raw)
    def test_rejects_traversal(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'bad.zip'
            with zipfile.ZipFile(p,'w') as z:z.writestr('../escaped.glb',fixture())
            with self.assertRaises(ValueError):intake(p,Path(d)/'out')
    def test_rejects_missing_tile_payload(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'bad.zip'
            with zipfile.ZipFile(p,'w') as z:z.writestr('mount-vernon/tileset.json',json.dumps({'asset':{'version':'1.1'},'root':{'content':{'uri':'missing.glb'}}}))
            with self.assertRaises(ValueError):intake(p,Path(d)/'out')
if __name__=='__main__':unittest.main()
