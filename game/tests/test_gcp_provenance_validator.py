"""Control-data safety: no geocoder or scaled vertical benchmarks enter survey QA."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from gcp_provenance_validator import evaluate_control_file, parse_ngs_datasheet, validate_control_point

class MonumentGateTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory()
  self.addCleanup(self.tmp.cleanup)
  self.root=Path(self.tmp.name)

 def write(self,name,doc):
  p=self.root/name
  p.write_text(json.dumps(doc))
  return p

 def test_actual_nearest_road_reference_is_quarantined(self):
  report=evaluate_control_file(ROOT/'reference/mount-vernon/control-points.geojson')
  self.assertEqual(report['gate_state'],'QUARANTINED')
  self.assertFalse(report['modeling_eligible'])
  self.assertEqual(report['failure_class'],'SUBSTANTIVE_PROVENANCE_DEFECT')
  self.assertTrue(any('road' in str(e).lower() for e in report['reasons']))

 def test_metadata_nearest_road_blocks_even_when_records_look_valid(self):
  p=self.write('control.json',{'metadata':{'loc_method':'NEAREST_ROAD',
      'source_type':'road centerline interpolation'},
      'control_points':[self.synthetic('HA1083')]})
  report=evaluate_control_file(p)
  self.assertEqual(report['gate_state'],'QUARANTINED')
  self.assertFalse(report['modeling_eligible'])

 def test_row_level_geocoded_method_blocks_file(self):
  rec=self.synthetic('HA1083')
  rec['loc_method']='GEOCODED_ADDRESS'
  report=evaluate_control_file(self.write('p.json',{'control_points':[rec]}))
  self.assertFalse(report['modeling_eligible'])
  self.assertIn(report['gate_state'],('QUARANTINED','BLOCKED_SUBSTANTIVE'))

 def test_scaled_horizontal_position_cannot_be_survey_control(self):
  rec=self.synthetic('HA1083')
  rec['horizontal_source']='SCALED'
  with self.assertRaises(ValueError):validate_control_point(rec)

 def test_missing_datum_geoid_order_and_datasheet_are_invalid(self):
  rec=self.synthetic('HA1083')
  for name in ('geoid_model','order_class','horizontal_epoch','datasheet_sha256'):
   wrong=dict(rec)
   wrong.pop(name)
   with self.subTest(name=name),self.assertRaises(ValueError):validate_control_point(wrong)

 def test_unverified_egress_is_never_marked_passed(self):
  recs=[self.synthetic(pid) for pid in ('HA1083','HA1080','HA1084')]
  report=evaluate_control_file(self.write('candidate.json',{'control_points':recs}))
  self.assertNotEqual(report['gate_state'],'PASSED')
  self.assertFalse(report['modeling_eligible'])

 def test_pid_candidates_do_not_invent_survey_coordinates(self):
  doc=json.loads((ROOT/'data/control/posey/mount_vernon_ngs_pid_candidates.json').read_text())
  self.assertEqual(doc['gate_state'],'REFERENCE_ONLY')
  self.assertEqual(set(doc['candidate_pids']),{'HA1083','HA1080','HA1084','HA1085','AP2992'})
  self.assertNotIn('control_points',doc)
  self.assertFalse(doc['modeling_eligible'])

 def test_ngs_datasheet_parser_preserves_scaled_and_adjusted_distinction(self):
  sample=('HA1083  PID         -  HA1083\n'
          'HA1083  DESIGNATION - MT VERNON 3\n'
          'HA1083* NAD 83(2011) POSITION- 37 56 14.12345(N) 087 53 29.12345(W) ADJUSTED\n'
          'HA1083* NAVD 88 ORTHO HEIGHT - 126.362 (meters) 414.57 (feet) ADJUSTED\n'
          'HA1083  GEOID HEIGHT - -30.12 (meters) GEOID18\n')
  extracted=parse_ngs_datasheet(sample,'HA1083')
  self.assertEqual(extracted['status'],'EXTRACTED_NOT_VALIDATED')
  self.assertEqual(extracted['horizontal_source'],'ADJUSTED')
  self.assertEqual(extracted['vertical_source'],'ADJUSTED')
  self.assertLess(extracted['longitude_deg'],0)
  self.assertEqual(extracted['geoid_model'],'GEOID18')
  scaled=parse_ngs_datasheet(sample.replace('POSITION- 37','POSITION- 37').replace('(W) ADJUSTED','(W) SCALED'),'HA1083')
  self.assertFalse(scaled['horizontal_survey_grade'])

 def test_parser_refuses_unrelated_pid(self):
  with self.assertRaises(ValueError):
   parse_ngs_datasheet('HA1080  PID - HA1080','HA1083')

 def synthetic(self,pid):
  # Deliberately made-up test inputs: no independent source assertion.
  return {'pid':pid,'designation':'TEST MONUMENT','source_agency':'NOAA_NGS',
    'loc_method':'STATIC_GNSS_OPUS','provenance_notes':'station observed with GNSS',
    'latitude_deg':37.93,'longitude_deg':-87.89,
    'horizontal_datum':'NAD83(2011)','horizontal_source':'ADJUSTED',
    'horizontal_epoch':'2010.00','ortho_height_m':126.362,
    'vertical_datum':'NAVD88','vertical_source':'ADJUSTED',
    'geoid_model':'GEOID18','order_class':'FIRST_CLASS_II',
    'datasheet_sha256':hashlib.sha256(b'synthetic test only').hexdigest(),
    'datasheet_url':'https://geodesy.noaa.gov/datasheets/passive-marks/index.html?PID='+pid}

if __name__=='__main__':
 unittest.main()
