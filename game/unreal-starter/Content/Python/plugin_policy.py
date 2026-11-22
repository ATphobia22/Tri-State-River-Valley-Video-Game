"""Read-only Unreal plugin admission audit: no downloads, enables or build claims."""
import argparse
import json
from pathlib import Path

PROFILES = {
    "animation": ["ControlRig", "IKRig", "MotionWarping", "PoseSearch"],
    "world": ["PCG", "GeometryScripting", "Water", "WorldPartitionHLODUtilities"],
    "cameras": ["GameplayCameras", "Composure"],
    "audio": ["Metasound", "AudioModulation"],
    "accessibility": ["TextToSpeech"],
    "database": ["SQLiteSupport"],
    "optimization": ["OodleTexture"],
    "editor": ["PythonScriptPlugin", "EditorScriptingUtilities"],
}
# Suggested identifiers require validation against the locally installed engine.
SHIPPING_EXCLUSIONS = {"PythonScriptPlugin", "EditorScriptingUtilities", "DataprepEditor",
                       "Bridge", "AndroidFileServer", "GooglePAD", "TapJoy", "Adjust",
                       "RemoteDatabaseSupport", "MultiUserClient"}
TRACKING_EXCLUSIONS = {"TapJoy", "Adjust", "IOSAdvertising"}

def scan_descriptors(roots):
    found = {}
    for root in map(Path, roots):
        if not root.is_dir():
            continue
        for path in sorted(root.rglob("*.uplugin")):
            try:
                descriptor = json.loads(path.read_text(encoding="utf-8-sig"))
            except (OSError, UnicodeError, ValueError):
                continue
            found.setdefault(path.stem, []).append({
                "path": str(path),
                "modules": [{"name": m.get("Name"), "type": m.get("Type")}
                            for m in descriptor.get("Modules", []) if isinstance(m, dict)],
                "platforms": descriptor.get("SupportedTargetPlatforms"),
            })
    return found

def audit(project, installed, target="editor", requested=()):
    if target not in ("editor", "shipping"):
        raise ValueError("Invalid target")
    plugins = project.get("Plugins")
    if not isinstance(plugins, list):
        raise ValueError("Project Plugins must be an array")
    enabled = [p.get("Name") for p in plugins if isinstance(p, dict) and p.get("Enabled") is True]
    blockers, warnings = [], []
    if any(not isinstance(name, str) or not name for name in enabled):
        blockers.append("Enabled plugin has no valid Name")
    if len(set(map(str, enabled))) != len(enabled):
        blockers.append("Duplicate enabled plugin")
    evidence = []
    for name in enabled:
        if not isinstance(name, str):
            continue
        descriptors = installed.get(name, [])
        if not descriptors:
            warnings.append("Descriptor unavailable: " + name)
        if len(descriptors) > 1:
            blockers.append("Ambiguous duplicate descriptors: " + name)
        if name in TRACKING_EXCLUSIONS:
            blockers.append("Advertising/tracking forbidden: " + name)
        if target == "shipping" and name in SHIPPING_EXCLUSIONS:
            blockers.append("Editor/platform plugin forbidden in Shipping profile: " + name)
        for desc in descriptors:
            types = [m.get("type", "") for m in desc.get("modules", [])]
            if target == "shipping" and any(t.lower() in (
                "editor", "editornocommandlet", "developer", "developertool", "program")
                    for t in types):
                blockers.append("Non-runtime module in Shipping: " + name)
            evidence.append({"name": name, "descriptor": desc.get("path"), "moduleTypes": types})
    candidates = [{"name": name, "installedDescriptor": bool(installed.get(name)),
                   "enabled": name in enabled} for name in requested]
    return {"target": target, "status": "BLOCKED" if blockers else "POLICY_PASS",
            "engineVerified": bool(installed) and not warnings,
            "shippingVerified": False, "nativeBuildVerified": False,
            "enabled": enabled, "candidates": candidates, "evidence": evidence,
            "blockers": blockers, "warnings": warnings}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path,
                        default=Path(__file__).resolve().parents[2] / "RiverValleyArtLab.uproject")
    parser.add_argument("--engine-plugins", type=Path, action="append", default=[])
    parser.add_argument("--target", choices=["editor", "shipping"], default="editor")
    parser.add_argument("--profile", choices=list(PROFILES) + ["all"], default="editor")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    names = sorted({name for values in PROFILES.values() for name in values}) if args.profile == "all" else PROFILES[args.profile]
    result = audit(json.loads(args.project.read_text(encoding="utf-8")),
                   scan_descriptors(args.engine_plugins), args.target, names)
    output = json.dumps(result, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding="utf-8")
    print(output, end="")
    if result["blockers"] or (args.strict and result["warnings"]):
        raise SystemExit(2)

if __name__ == "__main__":
    main()
