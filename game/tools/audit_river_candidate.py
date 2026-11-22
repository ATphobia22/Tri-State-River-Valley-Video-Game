#!/usr/bin/env python3
"""Statically inspect a candidate River GLB before considering it for game use.

This tool never edits or promotes the source asset. --strict rejects malformed
or incompatible candidates and produces an inspectable JSON receipt.
"""
import argparse
import hashlib
import json
import struct
import sys
from pathlib import Path

COMPONENT_BYTES = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
TYPE_COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT2": 4, "MAT3": 9, "MAT4": 16}
MAX_BYTES = 300 * 1024 * 1024


def audit(raw: bytes, baseline=None, max_triangles=None):
    blockers = []
    warnings = []
    report = {"validGlb": False, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest(),
              "boneCount": 0, "clips": [], "triangleCount": 0, "vertexCount": 0,
              "meshCount": 0, "primitiveCount": 0, "imageCount": 0,
              "usesExternalResources": False, "blockers": blockers, "warnings": warnings}
    def finish(reason):
        blockers.append(reason)
        return report
    if len(raw) < 20 or len(raw) > MAX_BYTES:
        return finish("GLB size is outside supported 20-byte to 300-MiB range")
    magic, version, length = struct.unpack_from("<III", raw)
    if magic != 0x46546C67 or version != 2 or length != len(raw):
        return finish("Invalid GLB magic, version, or declared byte length")
    offset = 12
    chunks = []
    while offset + 8 <= len(raw):
        chunk_length, chunk_type = struct.unpack_from("<II", raw, offset)
        offset += 8
        if chunk_length % 4 or offset + chunk_length > len(raw):
            return finish("Truncated or misaligned GLB chunk")
        chunks.append((chunk_type, raw[offset:offset + chunk_length]))
        offset += chunk_length
    if offset != len(raw) or len(chunks) < 2 or chunks[0][0] != 0x4E4F534A:
        return finish("GLB requires a JSON-first chunk and complete chunk structure")
    try:
        document = json.loads(chunks[0][1].rstrip(b" \x00").decode("utf-8"))
    except (ValueError, UnicodeError):
        return finish("GLB JSON chunk cannot be decoded")
    bins = [c for kind, c in chunks[1:] if kind == 0x004E4942]
    if len(bins) != 1 or not isinstance(document, dict) or document.get("asset", {}).get("version") != "2.0":
        return finish("GLB must contain glTF 2.0 JSON and exactly one BIN chunk")
    binary = bins[0]
    buffers = document.get("buffers", [])
    if not buffers or len(buffers) != 1 or not isinstance(buffers[0], dict):
        return finish("Expected one embedded glTF buffer")
    if buffers[0].get("uri") or buffers[0].get("byteLength", 0) > len(binary):
        report["usesExternalResources"] = bool(buffers[0].get("uri"))
        return finish("Invalid or externally referenced buffer")
    report["usesExternalResources"] = any(bool(image.get("uri")) for image in document.get("images", []))
    if report["usesExternalResources"]:
        blockers.append("Image URIs refer outside the self-contained GLB")
    views = document.get("bufferViews", [])
    for index, view in enumerate(views):
        start, size = view.get("byteOffset", 0), view.get("byteLength", -1)
        if (view.get("buffer") != 0 or not isinstance(start, int) or not isinstance(size, int)
                or start < 0 or size < 0 or start + size > len(binary)):
            blockers.append(f"bufferView {index} is outside the embedded BIN chunk")
    accessors = document.get("accessors", [])
    for index, accessor in enumerate(accessors):
        vi = accessor.get("bufferView")
        if not isinstance(vi, int) or vi < 0 or vi >= len(views):
            blockers.append(f"accessor {index} references an unsupported or missing bufferView")
            continue
        component_size = COMPONENT_BYTES.get(accessor.get("componentType"))
        channels = TYPE_COMPONENTS.get(accessor.get("type"))
        count = accessor.get("count")
        start = accessor.get("byteOffset", 0)
        stride = views[vi].get("byteStride") or ((component_size or 0) * (channels or 0))
        if (not component_size or not channels or not isinstance(count, int) or count < 0
                or not isinstance(start, int) or start < 0 or not isinstance(stride, int)
                or stride < component_size * channels
                or (count and start + (count - 1) * stride + component_size * channels > views[vi].get("byteLength", 0))):
            blockers.append(f"accessor {index} is malformed or extends beyond its bufferView")
        if accessor.get("sparse"):
            blockers.append(f"accessor {index} uses unsupported sparse encoding")
    meshes = document.get("meshes", [])
    report["meshCount"] = len(meshes)
    for mesh in meshes:
        for primitive in mesh.get("primitives", []):
            report["primitiveCount"] += 1
            if primitive.get("mode", 4) != 4:
                blockers.append("Non-triangle mesh mode is unsupported for River")
                continue
            position_id = primitive.get("attributes", {}).get("POSITION")
            if not isinstance(position_id, int) or not (0 <= position_id < len(accessors)):
                blockers.append("Primitive lacks a valid POSITION accessor")
                continue
            n_vertices = accessors[position_id].get("count", 0)
            report["vertexCount"] += n_vertices
            index_id = primitive.get("indices")
            if index_id is not None and (not isinstance(index_id, int) or not 0 <= index_id < len(accessors)):
                blockers.append("Primitive has an invalid index accessor")
                continue
            element_count = accessors[index_id]["count"] if index_id is not None else n_vertices
            if element_count % 3:
                blockers.append("Triangle primitive has an incomplete final triangle")
            report["triangleCount"] += element_count // 3
    report["imageCount"] = len(document.get("images", []))
    for i, image in enumerate(document.get("images", [])):
        ref = image.get("bufferView")
        if not isinstance(ref, int) or not 0 <= ref < len(views):
            blockers.append(f"image {i} has no valid embedded bufferView")
    skins = document.get("skins", [])
    report["boneCount"] = len(skins[0].get("joints", [])) if skins else 0
    report["clips"] = [item.get("name", "") for item in document.get("animations", [])]
    if not skins:
        blockers.append("River requires a skinned character rig")
    if not report["clips"]:
        blockers.append("River requires animated clips")
    if baseline is not None:
        expected = baseline.get("boneCount")
        if expected is not None and report["boneCount"] != expected:
            blockers.append(f"Rig mismatch: {report['boneCount']} joints; current game expects {expected}")
        missing = sorted(set(baseline.get("clips", [])) - set(report["clips"]))
        if missing:
            blockers.append("Missing controller clips: " + ", ".join(missing))
    if max_triangles is not None and report["triangleCount"] > max_triangles:
        blockers.append(f"Game triangle budget exceeded: {report['triangleCount']} > {max_triangles}; supply a runtime LOD")
    if report["vertexCount"] == 0 or report["triangleCount"] == 0:
        blockers.append("River contains no usable triangle geometry")
    report["validGlb"] = not any(s.startswith(("bufferView", "accessor", "Primitive", "Triangle", "Non-triangle", "image ")) for s in blockers)
    return report


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("glb", type=Path)
    ap.add_argument("--baseline-manifest", type=Path, help="Current in-game River GLB manifest")
    ap.add_argument("--max-triangles", type=int, help="Runtime triangle cap; omit for studio-only inspection")
    ap.add_argument("--strict", action="store_true", help="Exit nonzero if validation finds blockers")
    args = ap.parse_args(argv)
    try:
        baseline = json.loads(args.baseline_manifest.read_text()) if args.baseline_manifest else None
        report = audit(args.glb.read_bytes(), baseline, args.max_triangles)
    except (OSError, ValueError, TypeError, KeyError, IndexError, AttributeError, struct.error) as exc:
        report = {"validGlb": False, "blockers": [f"Could not inspect input: {exc}"], "warnings": []}
    print(json.dumps(report, indent=2, sort_keys=True))
    return 2 if args.strict and report["blockers"] else 0


if __name__ == "__main__":
    sys.exit(main())
