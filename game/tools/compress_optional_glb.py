#!/usr/bin/env python3
"""Create a deterministic, lossless gzip transport for optional local GLB assets.

This does NOT write Draco or Meshopt extensions. The game's own decoder requires
ordinary glTF 2.0 data after browser gzip decompression.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import struct


def inspect_glb(data: bytes) -> dict:
    if len(data) < 20 or data[:4] != b"glTF":
        raise ValueError("GLB header missing")
    version, declared = struct.unpack_from("<II", data, 4)
    if version != 2 or declared != len(data):
        raise ValueError("GLB version or length mismatch")
    offset, doc, binary = 12, None, False
    while offset + 8 <= len(data):
        length, kind = struct.unpack_from("<II", data, offset)
        offset += 8
        if offset + length > len(data):
            raise ValueError("Truncated GLB chunk")
        payload = data[offset:offset + length]
        if kind == 0x4E4F534A:
            doc = json.loads(payload.decode("utf-8").rstrip(" \x00"))
        if kind == 0x004E4942:
            binary = True
        offset += length
    if offset != len(data) or not binary or not isinstance(doc, dict):
        raise ValueError("Missing GLB JSON or BIN chunk")
    if doc.get("asset", {}).get("version") != "2.0":
        raise ValueError("Unsupported glTF asset version")
    if doc.get("extensionsRequired"):
        raise ValueError("Decoder cannot accept required glTF extensions")
    for entry in doc.get("buffers", []) + doc.get("images", []):
        if entry.get("uri"):
            raise ValueError("External buffers/images defeat offline self-containment")
    return {
        "scene_nodes": len(doc.get("nodes", [])),
        "meshes": len(doc.get("meshes", [])),
        "skins": len(doc.get("skins", [])),
        "animations": len(doc.get("animations", [])),
        "embedded_images": len(doc.get("images", [])),
    }


def compress_glb(source: Path, output: Path, manifest: Path) -> dict:
    if source.suffix.lower() != ".glb" or not output.name.endswith(".glb.gz"):
        raise ValueError("Use .glb input and .glb.gz output")
    if source.resolve() == output.resolve():
        raise ValueError("Source must never be overwritten")
    raw = source.read_bytes()
    metadata = inspect_glb(raw)
    packed = gzip.compress(raw, compresslevel=9, mtime=0)
    if gzip.decompress(packed) != raw:
        raise ValueError("Lossless round-trip failed")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(packed)
    receipt = {
        "format": "gzip-wrapper-glb-v1",
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "transport_sha256": hashlib.sha256(packed).hexdigest(),
        "source_bytes": len(raw),
        "transport_bytes": len(packed),
        "requires_browser": "DecompressionStream(gzip) or raw asset fallback",
        "gltf": metadata,
    }
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return receipt


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(compress_glb(args.source, args.output, args.manifest), indent=2))


if __name__ == "__main__":
    main()
