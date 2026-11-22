"""Plugin admission tests without Unreal Engine installation."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

source = Path(__file__).resolve().parents[1] / "Content" / "Python" / "plugin_policy.py"
spec = importlib.util.spec_from_file_location("plugin_policy", source)
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)

class TestPluginPolicy(unittest.TestCase):
    def test_unverified_descriptor_is_not_engine_proof(self):
        result = policy.audit({"Plugins": [{"Name": "PythonScriptPlugin", "Enabled": True}]}, {})
        self.assertFalse(result["engineVerified"])
        self.assertTrue(result["warnings"])
        self.assertFalse(result["shippingVerified"])

    def test_editor_dependency_blocked_in_shipping(self):
        result = policy.audit({"Plugins": [{"Name": "PythonScriptPlugin", "Enabled": True}]}, {}, "shipping")
        self.assertEqual(result["status"], "BLOCKED")

    def test_editor_module_types_rejected_for_shipping(self):
        result = policy.audit({"Plugins": [{"Name": "SomeTool", "Enabled": True}]},
                              {"SomeTool": [{"path": "SomeTool.uplugin", "modules": [{"type": "Editor"}]}]},
                              "shipping")
        self.assertTrue(any("Non-runtime" in item for item in result["blockers"]))

    def test_tracking_blocked_even_in_editor(self):
        result = policy.audit({"Plugins": [{"Name": "Adjust", "Enabled": True}]}, {})
        self.assertEqual(result["status"], "BLOCKED")

    def test_candidates_do_not_enable_themselves(self):
        result = policy.audit({"Plugins": []}, {"PCG": [{"path": "PCG.uplugin", "modules": []}]},
                              requested=["PCG"])
        self.assertEqual(result["enabled"], [])
        self.assertTrue(result["candidates"][0]["installedDescriptor"])

    def test_duplicate_plugin_declarations_blocked(self):
        result = policy.audit({"Plugins": [{"Name": "Example", "Enabled": True}] * 2}, {})
        self.assertEqual(result["status"], "BLOCKED")

    def test_scan_reads_real_uplugin_module_metadata(self):
        with tempfile.TemporaryDirectory() as folder:
            (Path(folder) / "MyPlugin.uplugin").write_text(json.dumps({
                "Modules": [{"Name": "MyRuntime", "Type": "Runtime"}]}))
            result = policy.scan_descriptors([folder])
            self.assertEqual(result["MyPlugin"][0]["modules"][0]["type"], "Runtime")

    def test_ml_profile_lists_all_four_nne_plugins_without_enabling(self):
        expected = ["NNERuntimeCoreML", "NNERuntimeIREE", "NNERuntimeORT", "NNERuntimeRDG"]
        self.assertEqual(policy.PROFILES["ml"], expected)
        result = policy.audit({"Plugins": []}, {}, requested=policy.PROFILES["ml"])
        self.assertEqual(result["enabled"], [])
        self.assertEqual([x["name"] for x in result["candidates"]], expected)
        self.assertTrue(all(not x["installedDescriptor"] for x in result["candidates"]))
        self.assertFalse(result["nativeBuildVerified"])

    def test_ml_editor_only_backend_rejected_in_shipping(self):
        result = policy.audit(
            {"Plugins": [{"Name": "NNERuntimeCoreML", "Enabled": True}]},
            {"NNERuntimeCoreML": [{"path": "NNERuntimeCoreML.uplugin",
                                   "modules": [{"name": "NNERuntimeCoreMLEditor", "type": "Editor"}]}]},
            target="shipping")
        self.assertEqual(result["status"], "BLOCKED")
        self.assertTrue(any("Non-runtime module" in b for b in result["blockers"]))

    def test_runtime_profiles_are_candidates_not_enabled_plugins(self):
        for profile in ("performance", "physics", "rendering", "profiling", "scripting"):
            with self.subTest(profile=profile):
                names = policy.PROFILES[profile]
                self.assertTrue(names)
                report = policy.audit({"Plugins": []}, {}, requested=names)
                self.assertEqual(report["enabled"], [])
                self.assertEqual([candidate["name"] for candidate in report["candidates"]], names)
                self.assertFalse(report["nativeBuildVerified"])

    def test_editor_scripting_dependencies_cannot_ship(self):
        for name in ("PythonScriptPlugin", "EditorScriptingUtilities"):
            with self.subTest(name=name):
                result = policy.audit({"Plugins": [{"Name": name, "Enabled": True}]},
                                      {}, target="shipping")
                self.assertEqual(result["status"], "BLOCKED")

    def test_virtual_production_profiles_remain_opt_in(self):
        for profile in ("virtual_production_capture", "virtual_production_authoring",
                        "virtual_production_stage", "misc"):
            with self.subTest(profile=profile):
                names = policy.PROFILES[profile]
                result = policy.audit({"Plugins": []}, {}, requested=names)
                self.assertEqual(result["enabled"], [])
                self.assertEqual([entry["name"] for entry in result["candidates"]], names)
                self.assertFalse(result["engineVerified"])
                self.assertFalse(result["shippingVerified"])

    def test_virtual_production_editor_module_blocked_from_shipping(self):
        result = policy.audit(
            {"Plugins": [{"Name": "Switchboard", "Enabled": True}]},
            {"Switchboard": [{"path": "Switchboard.uplugin",
                             "modules": [{"name": "SwitchboardEditor", "type": "Editor"}]}]},
            "shipping")
        self.assertEqual(result["status"], "BLOCKED")

    def test_scan_skips_malformed_descriptor(self):
        with tempfile.TemporaryDirectory() as folder:
            (Path(folder) / "Bad.uplugin").write_text("{oops")
            self.assertEqual(policy.scan_descriptors([folder]), {})

if __name__ == "__main__":
    unittest.main()
