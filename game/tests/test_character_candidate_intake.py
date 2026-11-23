import sys
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
from intake_character_candidate import evaluate

class CandidateIntakeTests(unittest.TestCase):
    def test_existing_source_prototype_is_structurally_intact_not_automatically_promoted(self):
        report=evaluate(ROOT/"assets/models/river_explorer_rigged.glb",
                        ROOT/"assets/models/river_explorer_manifest.json",triangle_cap=40000)
        self.assertEqual(report["status"],"STRUCTURAL_PASS_REQUIRES_VISUAL_AND_DEFORMATION_QA",report["blockers"])
        self.assertFalse(report["automaticPromotionAllowed"])
        self.assertTrue(report["structuralReport"]["UV0"])
        self.assertGreaterEqual(report["structuralReport"]["texture_count"],8)
    def test_unrigged_environment_model_is_rejected_without_copying_it(self):
        report=evaluate(ROOT/"assets/models/courthouse.glb",
                        ROOT/"assets/models/river_explorer_manifest.json")
        self.assertEqual(report["status"],"REJECT")
        self.assertFalse(report["automaticPromotionAllowed"])
    def test_mobile_budget_can_reject_high_poly_rig_even_if_structurally_compatible(self):
        report=evaluate(ROOT/"assets/models/river_explorer_rigged.glb",
                        ROOT/"assets/models/river_explorer_manifest.json",triangle_cap=25000)
        self.assertEqual(report["status"],"REJECT")
        self.assertTrue(any("triangle budget" in x for x in report["blockers"]))

if __name__=="__main__":unittest.main()
