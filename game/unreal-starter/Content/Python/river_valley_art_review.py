"""Run with Unreal Editor > Tools > Execute Python Script after manual Interchange import.

Read-only for Unreal assets. Writes a JSON QA receipt under project Saved/.
No source assets, browser build files, or Unreal packages are modified.
"""
import hashlib
import json
from pathlib import Path
import sys

import unreal

SCRIPT_ROOT = Path(__file__).resolve().parent
if str(SCRIPT_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPT_ROOT))
from river_review_core import review_inventory

UNREAL_ASSET_ROOT = "/Game/River"


def inspect_river_import():
    lab_root = Path(unreal.Paths.project_dir()).resolve()
    baseline_file = lab_root.parent / "assets" / "models" / "river_explorer_manifest.json"
    if not baseline_file.is_file():
        raise RuntimeError(f"Missing game asset manifest: {baseline_file}")
    baseline_bytes = baseline_file.read_bytes()
    baseline = json.loads(baseline_bytes.decode("utf-8"))
    clips = baseline.get("clips")
    if not isinstance(clips, list) or not clips:
        raise RuntimeError("Current in-game River manifest has no animation requirements")

    paths = unreal.EditorAssetLibrary.list_assets(UNREAL_ASSET_ROOT, recursive=True, include_folder=False)
    entries = []
    for package_path in sorted(str(path) for path in paths):
        asset = unreal.EditorAssetLibrary.load_asset(package_path)
        if asset is None:
            unreal.log_warning(f"River QA: could not load {package_path}")
            continue
        entries.append({
            "name": str(asset.get_name()),
            "class": str(asset.get_class().get_name()),
            "path": package_path,
        })
    report = review_inventory(entries, clips)
    report.update({
        "editorOnly": True,
        "scope": UNREAL_ASSET_ROOT,
        "unrealEngineVersion": str(unreal.SystemLibrary.get_engine_version()),
        "sourceGameManifest": str(baseline_file),
        "sourceGameManifestSha256": hashlib.sha256(baseline_bytes).hexdigest(),
        "assets": entries,
        "notice": "Catalog checks only. Mesh/animation transfer, PBR, retarget, collision, GPU frames, gameplay and Shipping require independent validation."
    })
    out = lab_root / "Saved" / "RiverQA" / "river_asset_review.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    unreal.log(f"River asset review written: {out}")
    for warning in report["warnings"]:
        unreal.log_warning("River QA: " + warning)
    for blocker in report["blockers"]:
        unreal.log_error("River QA: " + blocker)
    if not report["catalogComplete"]:
        raise RuntimeError(f"River import inventory is incomplete; inspect {out}")
    unreal.log("River art catalog complete; NOT certified for runtime or Shipping.")
    return report


if __name__ == "__main__":
    inspect_river_import()
