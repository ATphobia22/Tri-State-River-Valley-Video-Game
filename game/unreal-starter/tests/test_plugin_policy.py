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

    def test_scan_skips_malformed_descriptor(self):
        with tempfile.TemporaryDirectory() as folder:
            (Path(folder) / "Bad.uplugin").write_text("{oops")
            self.assertEqual(policy.scan_descriptors([folder]), {})

if __name__ == "__main__":
    unittest.main()
