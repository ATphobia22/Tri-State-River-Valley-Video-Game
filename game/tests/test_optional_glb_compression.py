"""Deterministic, offline-only optional GLB transport tests."""
import gzip
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "compress_optional_glb.py"
spec = importlib.util.spec_from_file_location("optional_compressor", SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def fixture(required=None):
    body = {"asset": {"version": "2.0"}, "buffers": [{"byteLength": 4}],
            "meshes": [{}], "nodes": [{}], "animations": [{}], "skins": [{}]}
    if required:
        body["extensionsRequired"] = required
    payload = json.dumps(body, separators=(",", ":")).encode()
    payload += b" " * ((-len(payload)) % 4)
    binary = b"\x00" * 4
    return (b"glTF" + struct.pack("<II", 2, 12 + 8 + len(payload) + 8 + len(binary)) +
            struct.pack("<II", len(payload), 0x4E4F534A) + payload +
            struct.pack("<II", len(binary), 0x004E4942) + binary)


class TestOptionalGLBCompression(unittest.TestCase):
    def test_roundtrip_and_rig_counts_are_preserved(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source, output, receipt = (root / x for x in ["model.glb", "model.glb.gz", "receipt.json"])
            source.write_bytes(fixture())
            data = m.compress_glb(source, output, receipt)
            self.assertEqual(gzip.decompress(output.read_bytes()), source.read_bytes())
            self.assertEqual(data["gltf"]["animations"], 1)
            self.assertEqual(json.loads(receipt.read_text())["gltf"]["skins"], 1)

    def test_required_extensions_rejected(self):
        with self.assertRaisesRegex(ValueError, "extensions"):
            m.inspect_glb(fixture(["EXT_meshopt_compression"]))

    def test_corrupt_header_rejected(self):
        with self.assertRaisesRegex(ValueError, "header"):
            m.inspect_glb(b"not a glb")


if __name__ == "__main__":
    unittest.main()
