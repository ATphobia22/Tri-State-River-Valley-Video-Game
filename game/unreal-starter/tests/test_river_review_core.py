"""Unit tests for the Unreal Editor asset-inventory review (no Unreal install needed)."""
import importlib.util
import json
from pathlib import Path
import unittest

LAB = Path(__file__).resolve().parents[1]
SOURCE = LAB / "Content" / "Python" / "river_review_core.py"
spec = importlib.util.spec_from_file_location("river_review_core", SOURCE)
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)


class RiverReviewTests(unittest.TestCase):
    def setUp(self):
        self.assets = [
            {"name": "RiverSkinned", "class": "SkeletalMesh"},
            {"name": "RiverRig", "class": "Skeleton"},
            {"name": "Idle", "class": "AnimSequence"},
            {"name": "Walk", "class": "AnimSequence"},
            {"name": "Shirt", "class": "MaterialInstanceConstant"},
            {"name": "Fabric", "class": "Texture2D"},
        ]

    def test_complete_inventory_remains_an_art_review_not_a_deployment(self):
        result = core.review_inventory(self.assets, ["Idle", "Walk"])
        self.assertEqual(result["status"], "CATALOG_COMPLETE")
        self.assertTrue(result["catalogComplete"])
        self.assertFalse(result["verifiedInGame"])
        self.assertEqual(result["counts"]["SkeletalMesh"], 1)
        self.assertEqual(result["missingAnimations"], [])
        self.assertEqual(result["blockers"], [])

    def test_missing_skeletal_mesh_cannot_pass(self):
        assets = [asset for asset in self.assets if asset["class"] != "SkeletalMesh"]
        result = core.review_inventory(assets, ["Idle", "Walk"])
        self.assertFalse(result["catalogComplete"])
        self.assertIn("No SkeletalMesh imported", result["blockers"])

    def test_missing_controller_clip_is_blocker(self):
        result = core.review_inventory(self.assets, ["Idle", "Walk", "Drive", "FishingCast"])
        self.assertEqual(result["missingAnimations"], ["Drive", "FishingCast"])
        self.assertFalse(result["catalogComplete"])

    def test_animation_name_not_count_controls_compatibility(self):
        renamed = [dict(item) for item in self.assets]
        renamed[2]["name"] = "WalkCopy"
        result = core.review_inventory(renamed, ["Idle", "Walk"])
        self.assertIn("Idle", result["missingAnimations"])

    def test_duplicate_animation_names_are_reported(self):
        result = core.review_inventory(self.assets + [self.assets[2]], ["Idle"])
        self.assertIn("Idle", result["duplicateAnimations"])
        self.assertFalse(result["catalogComplete"])

    def test_empty_inventory_fails(self):
        result = core.review_inventory([], ["Idle"])
        self.assertFalse(result["catalogComplete"])
        self.assertGreaterEqual(len(result["blockers"]), 2)

    def test_project_is_blueprint_only_editor_lab_without_runtime_editor_modules(self):
        project = json.loads((LAB / "RiverValleyArtLab.uproject").read_text())
        self.assertEqual(project["EngineAssociation"], "5.8")
        self.assertEqual(project.get("Modules", []), [])
        plugins = {p["Name"]: p["Enabled"] for p in project["Plugins"]}
        self.assertEqual(plugins, {"PythonScriptPlugin": True, "EditorScriptingUtilities": True})


if __name__ == "__main__":
    unittest.main()
