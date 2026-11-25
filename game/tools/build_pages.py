#!/usr/bin/env python3
"""Package the playable, online-first family game at the root of GitHub Pages.

The built HTML includes the engine, models and imagery. Never publish a redirect
or a nested source file as the site's homepage.
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


def build(game_root: Path, destination: Path) -> None:
    game_root = Path(game_root)
    destination = Path(destination)
    hosted = game_root / "game.html"
    offline = game_root / "River_Valley_Family_Adventure_OFFLINE.html"
    if not hosted.is_file() or not offline.is_file():
        raise FileNotFoundError("Run npm --prefix game run build before packaging Pages")
    html = hosted.read_text(encoding="utf-8")
    if "window.ValleyReference=" not in html or len(html) < 2_000_000:
        raise ValueError("Refusing incomplete or non-georeferenced HTML build")
    if "serviceWorker.register(" in html:
        raise ValueError("Hosted game must not register a service worker")
    if "serviceWorker.getRegistrations()" not in html:
        raise ValueError("Hosted game lacks legacy service-worker cleanup")

    atlas_anchor = '<div class="countyList" id="countyRegionList"'
    if atlas_anchor not in html:
        raise ValueError("County atlas entry is missing")
    html = html.replace(
        atlas_anchor,
        '<p><a style="color:inherit" href="./valley-scene/">Explore Mount Vernon in 3D with River, Bill and Scout</a></p>'
        '<p><a style="color:inherit" href="./courthouse-review.html">Review experimental courthouse GLB (local file only)</a></p>' + atlas_anchor,
        1,
    )
    destination.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "game.html"):
        (destination / name).write_text(html, encoding="utf-8")
    shutil.copyfile(offline, destination / "offline.html")

    # Publish runtime companions referenced by the inline application.
    shutil.copytree(game_root / "src", destination / "src", dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    # Explicit local-only review surface. The live game never loads candidate GLBs.
    shutil.copyfile(game_root / "courthouse-review.html", destination / "courthouse-review.html")
    vendor_destination = destination / "vendor"
    vendor_destination.mkdir(parents=True, exist_ok=True)
    for vendor in ("three.js", "gltf-loader.js"):
        shutil.copyfile(game_root / "vendor" / vendor, vendor_destination / vendor)


    # Candidate art is an explicitly opt-in page, never the default game.
    import subprocess
    import sys
    subprocess.run([sys.executable, str(game_root / "tools" / "build_character_review.py"),
                    str(destination / "character-review.html")], check=True)

    subprocess.run([sys.executable, str(game_root / "valley-scene/tools/package_scene.py"),
                    str(destination / "valley-scene")], check=True)

    # Publish the retired worker at the same URL to clean up old installations.
    sw = (game_root / "game-sw.js").read_text(encoding="utf-8")
    if "registration.unregister()" not in sw or "addEventListener('fetch'" in sw:
        raise ValueError("Legacy service worker must unregister and never intercept fetch")
    (destination / "game-sw.js").write_text(sw, encoding="utf-8")

    # The hosted-site manifest formerly referenced images on a different host.
    # All installation icons now live on GitHub Pages under relative paths.
    manifest = json.loads((game_root / "manifest.webmanifest").read_text(encoding="utf-8"))
    manifest["id"] = "./"
    manifest["start_url"] = "./"
    manifest["scope"] = "./"
    for icon in manifest["icons"]:
        icon["src"] = "./assets/" + Path(icon["src"]).name
        src = game_root / icon["src"]
        dst = destination / icon["src"]
        if not src.is_file():
            raise FileNotFoundError(f"Missing PWA icon: {src}")
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
    (destination / "game.webmanifest").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    preview = game_root / "reference/mount-vernon/digitized-overview.png"
    if preview.is_file():
        shutil.copyfile(preview, destination / "map-reference.png")
    (destination / ".nojekyll").write_text("", encoding="utf-8")
    print(f"GitHub Pages: playable root HTML, offline download, local icons: {destination}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--game-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path, default=Path("_site"))
    args = parser.parse_args()
    build(args.game_root, args.output)
