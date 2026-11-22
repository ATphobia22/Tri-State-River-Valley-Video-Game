#!/usr/bin/env python3
"""Headless, dependency-aware preflight for the family browser game.

Inspired by the studio's studio-tree/path validation and cross-subsystem quality
gates. The source documents are PRIVATE and are not bundled in this project.
"""
from __future__ import annotations
import json
import re
import struct
import sys
from html.parser import HTMLParser
from pathlib import Path


class ScriptIndex(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sources: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag != "script":
            return
        attrs = dict(attrs)
        if attrs.get("src"):
            self.sources.append(attrs["src"])


def audit(root: Path) -> dict:
    root = Path(root).resolve()
    errors: list[str] = []
    html = root / "index.html"
    service_worker = root / "sw.js"
    if not html.exists() or not service_worker.exists():
        return {"ok": False, "errors": ["Missing game/index.html or game/sw.js"], "scripts": 0, "models": 0}

    parser = ScriptIndex()
    parser.feed(html.read_text(encoding="utf-8"))
    sources = parser.sources
    if not sources:
        errors.append("No runtime scripts found in index.html")
    if len(sources) != len(set(sources)):
        errors.append("Duplicate script reference in index.html")

    # This relative, static dependency graph must be available offline in
    # exactly the same order as during normal HTTPS game loading.
    cache = service_worker.read_text(encoding="utf-8")
    cached_paths = set(re.findall(r'"(\./(?:src|vendor|data)/[^"]+)"', cache))
    for src in sources:
        rel = Path(src)
        if (rel.is_absolute() or ".." in rel.parts or ":" in src or src.startswith("//")
                or not (root / rel).resolve().is_relative_to(root)):
            errors.append(f"Unsafe or remote runtime dependency: {src}")
            continue
        if not (root / rel).is_file():
            errors.append(f"Missing runtime dependency: {src}")
        if "./" + src not in cached_paths:
            errors.append(f"Missing offline precache entry: {src}")
    if "src/game.js" not in sources:
        errors.append("Missing game runtime entry point")
    elif "src/streaming-policy.js" not in sources or sources.index("src/streaming-policy.js") >= sources.index("src/game.js"):
        errors.append("Frame-budget policy must load before game runtime")
    if "src/core.js" not in sources or "src/game.js" in sources and sources.index("src/core.js") > sources.index("src/game.js"):
        errors.append("Core gameplay API must load before game runtime")

    model_dir = root / "assets" / "models"
    models = sorted(model_dir.glob("*.glb"))
    if len(models) < 5:
        errors.append("Expected five original runtime GLB models")
    for p in models:
        try:
            with p.open("rb") as f:
                header = f.read(12)
            if len(header) != 12:
                raise ValueError("GLB header too short")
            magic, version, length = struct.unpack("<4sII", header)
            if magic != b"glTF" or version != 2 or length != p.stat().st_size:
                raise ValueError("Invalid GLB header, version or byte length")
        except (OSError, ValueError) as exc:
            errors.append(f"{p.name}: {exc}")
    return {"ok": not errors, "errors": errors, "scripts": len(sources), "cached_runtime_paths": len(cached_paths),
            "models": len(models), "release_gate": "runtime-assets-and-offline-caching"}


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    report = audit(root)
    print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
