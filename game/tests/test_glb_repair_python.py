"""Regression: reject malformed binary chunks and non-destructively repair only known BIA typo."""
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
from repair_known_bia_glb import repair
from audit_uploaded_character_glb import inspect_glb


def fixture(tag=b"BIA\x00"):
    doc={"asset":{"version":"2.0"},"buffers":[{"byteLength":4}]}
    data=json.dumps(doc).encode()
    data+=b" "*((-len(data))%4)
    return (struct.pack("<4sII",b"glTF",2,28+len(data)+4)+
            struct.pack("<II",len(data),0x4e4f534a)+data+
            struct.pack("<I",4)+tag+b"\x01\x02\x03\x04")


class GLBRepair(unittest.TestCase):
    def test_known_bia_chunk_repair_is_one_byte_change_and_source_unchanged(self):
        with tempfile.TemporaryDirectory() as tmp:
            src,dst=Path(tmp)/"bad.glb",Path(tmp)/"fixed.glb"
            src.write_bytes(fixture())
            old=src.read_bytes()
            report=repair(src,dst)
            self.assertEqual(src.read_bytes(),old)
            self.assertEqual(sum(a!=b for a,b in zip(old,dst.read_bytes())),1)
            self.assertEqual(report["status"],"GLB_HEADER_FIXED_ONLY__GAMEPLAY_NOT_VERIFIED")
            self.assertEqual(report["changed_byte_offset"],len(old)-6)
            self.assertFalse(inspect_glb(dst)["gameplay_compatible"])

    def test_never_clobber_or_repair_arbitrary_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            src,dst=Path(tmp)/"source.glb",Path(tmp)/"fixed.glb"
            src.write_bytes(fixture(b"BIN\x00"))
            with self.assertRaises(ValueError):repair(src,dst)
            src.write_bytes(fixture())
            with self.assertRaises(ValueError):repair(src,src)
            dst.write_bytes(b"KEEP")
            with self.assertRaises(FileExistsError):repair(src,dst)
            self.assertEqual(dst.read_bytes(),b"KEEP")

    def test_built_in_rig_is_not_regressed(self):
        existing=Path(__file__).resolve().parents[1]/"assets/models/river_explorer_rigged.glb"
        if not existing.exists():self.skipTest("Build LOD assets before test")
        report=inspect_glb(existing)
        self.assertTrue(report["gameplay_compatible"],report["issues"])


if __name__=="__main__":unittest.main()
