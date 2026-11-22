import tempfile
import unittest
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec

ROOT = Path(__file__).resolve().parents[1]
spec = spec_from_file_location("audit_runtime_graph", ROOT / "tools" / "audit_runtime_graph.py")
mod = module_from_spec(spec)
spec.loader.exec_module(mod)


class RuntimeGraphAudit(unittest.TestCase):
    def test_actual_repository_dependency_graph_is_closed(self):
        result = mod.audit(ROOT)
        self.assertEqual(result["errors"], [])
        self.assertTrue(result["ok"])
        self.assertGreaterEqual(result["scripts"], 14)
        self.assertEqual(result["models"], 6)

    def test_rejects_untrusted_remote_and_missing_scripts(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "index.html").write_text('<script src="https://cdn.example/evil.js"></script><script src="src/game.js"></script>')
            (root / "sw.js").write_text('const ASSETS=["./src/game.js"];')
            result = mod.audit(root)
            self.assertFalse(result["ok"])
            self.assertTrue(any("Unsafe or remote" in x for x in result["errors"]))
            self.assertTrue(any("Missing runtime dependency" in x for x in result["errors"]))

    def test_missing_files_are_not_an_empty_success(self):
        with tempfile.TemporaryDirectory() as folder:
            result = mod.audit(Path(folder))
            self.assertFalse(result["ok"])
            self.assertTrue(result["errors"])


if __name__ == "__main__":
    unittest.main()
