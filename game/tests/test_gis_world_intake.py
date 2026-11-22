"""Regression tests for v1.12 GIS intake boundary."""
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[1] / "tools" / "validate_gis_world_intake.py"
spec = importlib.util.spec_from_file_location("gis_intake", MODULE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class TestGISIntake(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.manifest = self.root / "world_manifest.json"
        self.glb = self.root / "world_preview.glb"
        self.manifest.write_text(json.dumps({
            "status": "DATA_READY_NOT_EDITOR_VERIFIED",
            "target_crs": "EPSG:26916",
            "vertical_datum": "LOCAL_SYNTHETIC_NOT_NAVD88",
            "sources": [{"source_license": "Synthetic demo"}]
        }))
        self.glb.write_bytes(b"glTF" + struct.pack("<II", 2, 20) + b"\0" * 8)

    def test_synthetic_rejected_for_production(self):
        with self.assertRaisesRegex(ValueError, "Synthetic"):
            mod.inspect(self.manifest, self.glb)

    def test_synthetic_accepted_only_as_preview(self):
        result = mod.inspect(self.manifest, self.glb, allow_synthetic=True)
        self.assertFalse(result["promotion_allowed"])
        self.assertEqual(result["character_policy"], "PRESERVE_EXISTING_27_JOINT_13_CLIP_RIG")

    def test_truncated_glb_rejected(self):
        self.glb.write_bytes(b"glTF")
        with self.assertRaisesRegex(ValueError, "Invalid GLB"):
            mod.inspect(self.manifest, self.glb, allow_synthetic=True)

    def test_mismatched_length_rejected(self):
        self.glb.write_bytes(b"glTF" + struct.pack("<II", 2, 24) + b"\0" * 8)
        with self.assertRaisesRegex(ValueError, "length mismatch"):
            mod.inspect(self.manifest, self.glb, allow_synthetic=True)

if __name__ == "__main__":
    unittest.main()
