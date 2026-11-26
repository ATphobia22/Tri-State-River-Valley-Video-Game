import hashlib,json,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from geographic_release_gate import validate_release

class ReleaseGateTests(unittest.TestCase):
 def setUp(self):
  self.dir=tempfile.TemporaryDirectory()
  self.addCleanup(self.dir.cleanup)
  self.root=Path(self.dir.name)
  data=b'validated synthetic asset bytes'
  (self.root/'sample.glb').write_bytes(data)
  self.digest=hashlib.sha256(data).hexdigest()
 def manifest(self):
  return {
    'schema':'river-valley-geographic-release/v1','classification':'PRODUCTION_CANDIDATE',
    'registration':{'horizontalCrs':'EPSG:4978','verticalDatum':'WGS84_ELLIPSOIDAL',
      'coordinateEpoch':'2026.0','localFrame':'ENU','transformSource':'survey-registered',
      'controlPointReceipt':{'path':'control.json','sha256':self.digest},
      'verticalTransformationReceipt':{'path':'vertical.json','sha256':self.digest}},
    'source':{'sourceDatasetId':'official-feature-2026','license':'CC0',
      'provenanceReceipt':{'path':'source.json','sha256':self.digest}},
    'semantic':{'citygmlVersion':'3.0','citydbMajor':5,'geometryLod':2,
      'semanticReceipt':{'path':'semantic.json','sha256':self.digest}},
    'assets':[{'path':'sample.glb','sha256':self.digest,'bytes':len(b'validated synthetic asset bytes'),'role':'3d-tiles-glb'}],
    'validation':{'3dTiles':{'pass':True,'receipt':{'path':'tiles.json','sha256':self.digest}},
      'glTF':{'pass':True,'receipt':{'path':'gltf.json','sha256':self.digest}},
      'pmtiles':{'pass':True,'receipt':{'path':'pmtiles.json','sha256':self.digest}},
      'ktx2':{'pass':True,'receipt':{'path':'ktx.json','sha256':self.digest}},
      'renderer':{'pass':True,'receipt':{'path':'renderer.json','sha256':self.digest}}},
    'review':{'independent':True,'approved':True,'receipt':{'path':'review.json','sha256':self.digest}}
  }
 def test_unregistered_preview_is_not_promotable(self):
  m=self.manifest();m['classification']='LOCAL_PREVIEW_ONLY'
  self.assertFalse(validate_release(m,self.root)['publishable'])
 def test_missing_vertical_transform_rejected(self):
  m=self.manifest();del m['registration']['verticalTransformationReceipt']
  self.assertFalse(validate_release(m,self.root)['publishable'])
 def test_missing_control_evidence_rejected(self):
  m=self.manifest();del m['registration']['controlPointReceipt']
  self.assertFalse(validate_release(m,self.root)['publishable'])
 def test_invalid_asset_hash_rejected(self):
  m=self.manifest();m['assets'][0]['sha256']='0'*64
  self.assertFalse(validate_release(m,self.root)['publishable'])
 def test_rejects_unsafe_asset_paths(self):
  m=self.manifest();m['assets'][0]['path']='../sample.glb'
  self.assertFalse(validate_release(m,self.root)['publishable'])
 def test_requires_complete_semantics_and_independent_review(self):
  m=self.manifest();m['semantic']['citydbMajor']=4;m['review']['independent']=False
  self.assertFalse(validate_release(m,self.root)['publishable'])
 def test_unsigned_or_missing_receipts_never_promote(self):
  self.assertFalse(validate_release(self.manifest(),self.root)['publishable'])
 def test_fully_present_synthetic_receipts_still_require_real_provenance(self):
  for p in ('control','vertical','source','semantic','tiles','gltf','pmtiles','ktx','renderer','review'):
   (self.root/(p+'.json')).write_bytes(b'validated synthetic asset bytes')
  m=self.manifest()
  self.assertFalse(validate_release(m,self.root)['publishable'])
 def test_errors_are_returned_without_claiming_certification(self):
  x=validate_release({},self.root)
  self.assertEqual(x['status'],'BLOCKED')
  self.assertIn('errors',x)
  self.assertFalse(x['publishable'])
if __name__=='__main__':unittest.main()
