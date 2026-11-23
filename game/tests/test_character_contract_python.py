"""Prove that a plausible JSON-only 'rig' is not admitted as a valid game asset."""
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
from audit_uploaded_character_glb import inspect_glb, CLIPS, JOINTS


def save_doc(doc):
    payload=json.dumps(doc,separators=(",",":")).encode()
    payload+=b" " * ((-len(payload))%4)
    output=struct.pack("<4sII",b"glTF",2,20+len(payload))
    output+=struct.pack("<II",len(payload),0x4e4f534a)+payload
    return output


class CharacterContract(unittest.TestCase):
    def test_fake_27_joints_13_clips_without_binary_must_fail(self):
        doc={"asset":{"version":"2.0"},
             "nodes":[{"name":name} for name in JOINTS]+[{"name":"FingerExtra%d"%i} for i in range(27-len(JOINTS))],
             "skins":[{"joints":list(range(27))}],
             "meshes":[{"primitives":[{"attributes":{"POSITION":0,"NORMAL":1,"JOINTS_0":2,"WEIGHTS_0":3,"COLOR_0":4},"indices":5}]}],
             "accessors":[{"count":3,"type":"VEC3"} for i in range(6)],
             "animations":[{"name":name,"channels":[],"samplers":[]} for name in CLIPS]}
        with tempfile.TemporaryDirectory() as temp:
            glb=Path(temp)/"fake.glb"
            glb.write_bytes(save_doc(doc))
            with self.assertRaises(ValueError):
                inspect_glb(glb)

    def test_broken_glb_header_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            glb=Path(temp)/"bad.glb"
            glb.write_bytes(b"not a GLB")
            with self.assertRaises(ValueError):
                inspect_glb(glb)

    def test_built_in_animation_assets_remain_compatible(self):
        asset=Path(__file__).resolve().parents[1]/"assets"/"models"/"river_explorer_rigged.glb"
        if not asset.exists():
            self.skipTest("Run npm --prefix game run build to generate expected hero GLB")
        report=inspect_glb(asset)
        self.assertTrue(report["gameplay_compatible"],report["issues"])
        self.assertEqual(report["joint_count"],27)
        self.assertEqual(report["clip_count"],13)


if __name__=="__main__":unittest.main()
