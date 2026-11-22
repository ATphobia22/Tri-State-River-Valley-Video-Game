#!/usr/bin/env python3
"""Fail-safe intake for GIS world previews; never promote synthetic scenes to production."""
import argparse
import hashlib
import json
from pathlib import Path
import struct

def inspect(manifest_path: Path, glb_path: Path, allow_synthetic: bool = False) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    data = glb_path.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF" or struct.unpack_from("<I", data, 4)[0] != 2:
        raise ValueError("Invalid GLB v2 header")
    if struct.unpack_from("<I", data, 8)[0] != len(data):
        raise ValueError("GLB declared length mismatch")
    if manifest.get("status") != "DATA_READY_NOT_EDITOR_VERIFIED":
        raise ValueError("Unexpected source build status")
    datum = manifest.get("vertical_datum", "")
    sources = manifest.get("sources", [])
    synthetic = "SYNTHETIC" in datum.upper() or any(
        "synthetic" in str(s.get("source_license", "")).lower() for s in sources
    )
    if not sources or not manifest.get("target_crs") or not datum:
        raise ValueError("Missing source provenance, CRS, or vertical datum")
    if synthetic and not allow_synthetic:
        raise ValueError("Synthetic GIS world cannot replace the production world")
    return {
        "glb_sha256": hashlib.sha256(data).hexdigest(),
        "glb_bytes": len(data),
        "world_status": manifest["status"],
        "synthetic": synthetic,
        "promotion_allowed": not synthetic,
        "target_crs": manifest["target_crs"],
        "vertical_datum": datum,
        "character_policy": "PRESERVE_EXISTING_27_JOINT_13_CLIP_RIG",
        "render_policy": "PREVIEW_ONLY_UNTIL_RUNTIME_COLLISION_AND_OFFLINE_TESTS_PASS",
    }

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", required=True, type=Path)
    p.add_argument("--glb", required=True, type=Path)
    p.add_argument("--allow-synthetic-preview", action="store_true")
    args = p.parse_args()
    print(json.dumps(inspect(args.manifest, args.glb, args.allow_synthetic_preview), indent=2))

if __name__ == "__main__":
    main()
