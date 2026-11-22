"""Pure, editor-independent checks on an Unreal River asset inventory.

This does not inspect bone weights, render the mesh, retarget animations,
run PIE, or certify release readiness. Never treat CATALOG_COMPLETE as shipped.
"""
from collections import Counter

KNOWN_CLASSES = (
    "SkeletalMesh", "Skeleton", "AnimSequence", "Material",
    "MaterialInstance", "MaterialInstanceConstant", "Texture2D", "PhysicsAsset"
)


def review_inventory(assets, expected_clips):
    """Assess catalog presence by *exact* Unreal asset names and types.

    The Unreal adapter passes {"name": str, "class": str} records. Exact clip
    names intentionally fail renamed assets instead of silently treating
    a different action as equivalent.
    """
    if not isinstance(assets, list) or not isinstance(expected_clips, list):
        raise TypeError("assets and expected_clips must be lists")
    if any(not isinstance(item, dict) or
           not isinstance(item.get("name"), str) or
           not isinstance(item.get("class"), str) for item in assets):
        raise ValueError("Every inventory record requires name and class strings")
    if any(not isinstance(clip, str) or not clip for clip in expected_clips):
        raise ValueError("Animation requirements must have nonempty string names")
    counts = Counter(item["class"] for item in assets)
    animations = sorted(item["name"] for item in assets if item["class"] == "AnimSequence")
    animation_counts = Counter(animations)
    duplicates = sorted(name for name, count in animation_counts.items() if count > 1)
    missing = sorted(set(expected_clips) - set(animations))
    blockers = []
    if not counts["SkeletalMesh"]:
        blockers.append("No SkeletalMesh imported")
    if not counts["Skeleton"]:
        blockers.append("No Skeleton asset imported")
    if missing:
        blockers.append("Missing required AnimSequence assets: " + ", ".join(missing))
    if duplicates:
        blockers.append("Duplicate AnimSequence asset names: " + ", ".join(duplicates))
    warnings = []
    if not counts["Texture2D"]:
        warnings.append("No imported Texture2D assets; inspect GLB PBR texture import")
    if not (counts["Material"] or counts["MaterialInstance"] or counts["MaterialInstanceConstant"]):
        warnings.append("No imported material assets; inspect glTF material assignments")
    if not counts["PhysicsAsset"]:
        warnings.append("No PhysicsAsset found; check collision/ragdoll separately")
    complete = not blockers
    return {
        "status": "CATALOG_COMPLETE" if complete else "REQUIRES_EDITOR_FIXES",
        "catalogComplete": complete,
        "verifiedInGame": False,
        "counts": {key: counts[key] for key in KNOWN_CLASSES},
        "expectedAnimations": sorted(set(expected_clips)),
        "importedAnimations": animations,
        "missingAnimations": missing,
        "duplicateAnimations": duplicates,
        "blockers": blockers,
        "warnings": warnings,
        "assetCount": len(assets),
    }
