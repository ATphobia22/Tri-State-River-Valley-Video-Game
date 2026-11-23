import json
import tempfile
import unittest
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'tools' / 'build_pages.py'

class PagesBuildTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out = Path(self.tmp.name) / 'site'

    def tearDown(self):
        self.tmp.cleanup()

    def build(self):
        spec = spec_from_file_location('build_pages', SCRIPT)
        mod = module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.build(ROOT, self.out)

    def test_playable_entry_not_redirect(self):
        self.build()
        html = (self.out / 'index.html').read_text()
        self.assertGreater(len(html), 2_000_000)
        self.assertIn('window.ValleyReference=', html)
        self.assertNotIn('serviceWorker.register(', html)
        self.assertIn('serviceWorker.getRegistrations()', html)
        self.assertNotIn('http-equiv="refresh"', html)
        self.assertEqual((self.out / 'game.html').read_bytes(), (self.out / 'index.html').read_bytes())

    def test_courthouse_reconstruction_review_is_opt_in_and_local(self):
        self.build()
        html = (self.out / "index.html").read_text()
        review = (self.out / "courthouse-review.html").read_text()
        self.assertIn("./courthouse-review.html", html)
        self.assertNotIn("courthouse_candidate_REVIEW_ONLY.glb", html)
        self.assertNotIn('id="mesh"', html)
        self.assertIn("RiverGLTFLoader", review)
        self.assertIn('type="file"', review)
        self.assertIn("REVIEW ONLY", review)
        self.assertTrue((self.out / "vendor" / "three.js").is_file())
        self.assertTrue((self.out / "vendor" / "gltf-loader.js").is_file())
        self.assertNotIn("serviceWorker.register(", review)

    def test_opt_in_character_review_preserves_normal_pages_entry(self):
        self.build()
        regular = (self.out / 'index.html').read_text()
        review = (self.out / 'character-review.html').read_text()
        self.assertNotIn('window.ValleyCharacterReview=', regular)
        self.assertIn('window.ValleyCharacterReview=', review)
        self.assertIn('riverHash', review)
        self.assertIn('scoutHash', review)
        self.assertEqual(review.count('window.ValleyCharacterReview='), 1)

    def test_subpath_offline_download_and_retired_worker(self):
        self.build()
        m = json.loads((self.out / 'game.webmanifest').read_text())
        self.assertEqual(m['start_url'], './')
        self.assertEqual(m['scope'], './')
        self.assertTrue(all(icon['src'].startswith('./assets/') for icon in m['icons']))
        for icon in m['icons']:
            self.assertTrue((self.out / icon['src']).is_file())
        sw = (self.out / 'game-sw.js').read_text()
        self.assertIn('registration.unregister()', sw)
        self.assertNotIn("addEventListener('fetch'", sw)
        self.assertTrue((self.out / 'offline.html').stat().st_size > 2_000_000)
        self.assertTrue((self.out / '.nojekyll').is_file())

if __name__ == '__main__':
    unittest.main()
