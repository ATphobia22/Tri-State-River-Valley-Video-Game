import json
import struct
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import build_ktx2_pilot as pilot

def glb(path, *, conflict=False, bad=False):
    png=b'\x89PNG\r\n\x1a\n'+b'fixture'
    doc={'asset':{'version':'2.0'},'buffers':[{'byteLength':len(png)}],
         'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(png)+(100 if bad else 0)}],
         'images':[{'mimeType':'image/png','bufferView':0}],'textures':[{'source':0}],
         'materials':[{'pbrMetallicRoughness':{'baseColorTexture':{'index':0}}}]}
    if conflict: doc['materials'][0]['normalTexture']={'index':0}
    j=json.dumps(doc).encode();j+=b' '*(-len(j)%4)
    blob=png+b'\0'*(-len(png)%4)
    path.write_bytes(struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(blob))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(blob),b'BIN\0')+blob)

class KTXPilotTests(unittest.TestCase):
    def test_roles_and_source_preservation(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'hero.glb';glb(p)
            before=p.read_bytes()
            result=pilot.extract(p)
            self.assertEqual(len(result),1)
            self.assertEqual(result[0]['role'],'color')
            self.assertEqual(result[0]['codec'],'basis-lz')
            self.assertEqual(p.read_bytes(),before)

    def test_conflicting_color_and_linear_use_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'hero.glb';glb(p,conflict=True)
            with self.assertRaisesRegex(ValueError,'conflicting'):pilot.extract(p)

    def test_out_of_bounds_embedded_image_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'hero.glb';glb(p,bad=True)
            with self.assertRaisesRegex(ValueError,'bounds'):pilot.extract(p)

    def test_encoder_flags_preserve_transfer_function(self):
        color=pilot.command('ktx',Path('in.png'),Path('out.ktx2'),'color','basis-lz')
        normal=pilot.command('ktx',Path('in.png'),Path('out.ktx2'),'normal','uastc')
        self.assertIn('R8G8B8A8_SRGB',color)
        self.assertIn('R8G8B8A8_UNORM',normal)
        self.assertIn('--generate-mipmap',color)
        self.assertIn('--assign-tf',normal)
        self.assertNotIn('--normal-mode',normal)
if __name__=='__main__':unittest.main()
