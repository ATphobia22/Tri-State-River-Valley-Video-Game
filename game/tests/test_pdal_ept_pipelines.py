"""Deterministic offline safety gates for bounded EPT processing."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_pdal_ept_pipelines', ROOT / 'tools/build_pdal_ept_pipelines.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class EptPipelineTests(unittest.TestCase):
    def test_all_products_are_bounded_and_reprojected(self):
        for product in m.PRODUCTS:
            ext = '.laz' if product in ('clip', 'buildings') else '.tif'
            stages = m.build_pipeline(product, '/tmp/output' + ext)['pipeline']
            self.assertEqual(stages[0]['bounds']['crs'], 'EPSG:3857')
            self.assertEqual(stages[1 if product in ('clip', 'dsm') else 2]['out_srs'], 'EPSG:26916')
            self.assertEqual(stages[-1]['filename'], '/tmp/output' + ext)
        self.assertEqual(m.build_pipeline('dem', '/tmp/dem.tif')['pipeline'][1]['expression'], 'Classification == 2')
        self.assertEqual(m.build_pipeline('buildings', '/tmp/roof.laz')['pipeline'][1]['expression'], 'Classification == 6')
        self.assertEqual(m.build_pipeline('dsm', '/tmp/dsm.tif')['pipeline'][-1]['output_type'], 'max')

    def test_rejects_unbounded_and_unsafe_input(self):
        for bounds in ((-9791000, -9779000, 0, 2), (-9791000, -9700000, 4562000, 4577000),
                       (float('nan'), -9779000, 4562000, 4577000),
                       (-9779000, -9791000, 4562000, 4577000)):
            with self.assertRaises(ValueError):
                m.build_pipeline('clip', '/tmp/x.laz', bounds)
        with self.assertRaises(ValueError):
            m.build_pipeline('clip', '/tmp/x.laz', source='https://example.com/ept.json')
        with self.assertRaises(ValueError):
            m.build_pipeline('dem', '/tmp/x.laz')

    def test_source_metadata_must_explicitly_verify_crs_and_dimensions(self):
        example = {'srs': {'authority': 'EPSG', 'horizontal': '3857'},
                   'schema': [{'name': n} for n in ('X', 'Y', 'Z', 'Classification')]}
        self.assertFalse(m.verify_metadata(example)['verticalDatumVerified'])
        for srs in ({'authority': 'EPSG', 'horizontal': '26916'}, {'wkt': 'PROJCS[EPSG:3857]'}, {}):
            with self.assertRaises(ValueError):
                m.verify_metadata({**example, 'srs': srs})

    def test_dry_run_never_contacts_network_or_pdal(self):
        def forbidden(*args, **kwargs):
            raise AssertionError('network or subprocess called in dry run')
        report = m.run('clip', '/tmp/nonexistent.laz', metadata_fetcher=forbidden, runner=forbidden)
        self.assertEqual(report['status'], 'PLAN_ONLY')

    def test_execute_refuses_unverified_metadata(self):
        with self.assertRaises(ValueError):
            m.run('clip', '/tmp/untrusted.laz', execute=True,
                  metadata_fetcher=lambda: {'horizontalCRS': 'EPSG:26916'},
                  runner=lambda *a, **kw: None)

if __name__ == '__main__':
    unittest.main()
