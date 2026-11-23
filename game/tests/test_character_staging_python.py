import hashlib
import json
import sys
import tempfile
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from stage_character_candidate import assess, stage

class CharacterStagingGate(unittest.TestCase):
    def test_original_27_joint_13_action_asset_can_stage_but_never_promotes(self):
        original=ROOT/'assets/models/river_explorer_rigged.glb'
        with tempfile.TemporaryDirectory() as tmp:
            report=stage(original,Path(tmp)/'character-candidates')
            self.assertEqual(report["status"],"STAGING_ELIGIBLE_NEEDS_RENDER_QA")
            self.assertFalse(report["productionReplacementApproved"])
            self.assertFalse(report["physicalMobilePerformanceVerified"])
            self.assertFalse(report["manualDeformationReviewComplete"])
            output=Path(tmp)/'character-candidates'/original.name
            self.assertTrue(output.exists())
            self.assertEqual(hashlib.sha256(output.read_bytes()).hexdigest(),report["sourceSHA256"])
            self.assertEqual(json.loads(output.with_suffix('.audit.json').read_text())["sourceSHA256"],report["sourceSHA256"])
            self.assertEqual(original.read_bytes(),output.read_bytes())
            with self.assertRaisesRegex(FileExistsError,"already exists"):stage(original,Path(tmp)/'character-candidates')

    def test_cannot_write_to_canonical_assets_or_game_data(self):
        original=ROOT/'assets/models/river_explorer_rigged.glb'
        for blocked in (ROOT/'assets/models',ROOT/'data',ROOT):
            with self.subTest(path=str(blocked)):
                with self.assertRaisesRegex(ValueError,"staging"):stage(original,blocked)

    def test_non_skin_candidate_is_not_staged(self):
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)/'character-candidates'
            r=stage(ROOT/'assets/models/courthouse.glb',out)
            self.assertEqual(r["status"],"REJECT")
            self.assertFalse(out.exists())

    def test_staging_receipt_preserves_review_gates_and_source_hash(self):
        original=ROOT/'assets/models/river_explorer_rigged.glb'
        result=assess(original)
        self.assertTrue(result["stagingEligible"])
        self.assertIn("physical iPhone", " ".join(result["requires"]))
        self.assertFalse(result["automaticPromotionAllowed"])

if __name__=="__main__":unittest.main()
