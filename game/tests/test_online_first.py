import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class OnlineFirstTests(unittest.TestCase):
    def test_hosted_builder_does_not_read_offline_artifact(self):
        source = (ROOT / 'build_hosted.py').read_text()
        self.assertNotIn('River_Valley_Family_Adventure_OFFLINE.html', source)

    def test_online_build_runs_first(self):
        import json
        command = json.loads((ROOT / 'package.json').read_text())['scripts']['build']
        self.assertLess(command.index('build_hosted.py'), command.index('build_offline.py'))

    def test_pages_includes_runtime_modules(self):
        from importlib.util import spec_from_file_location, module_from_spec
        import tempfile
        spec = spec_from_file_location('build_pages', ROOT / 'tools/build_pages.py')
        module = module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            module.build(ROOT, out)
            for name in ('physics-bakeoff', 'maplibre-reference', 'hand-ik-validation', 'gpu-evidence', 'cinema-particles', 'hero-pbr', 'hero-micro-details'):
                self.assertTrue((out / 'src' / (name + '.js')).is_file(), name)

if __name__ == '__main__':
    unittest.main()
