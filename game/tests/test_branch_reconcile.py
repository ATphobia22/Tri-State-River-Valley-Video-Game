import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from reconcile_merged_branches import reconcile, paged

MAIN="mainsha01"
class FakeAPI:
    repository="ATphobia22/Tri-State-River-Valley-Video-Game"
    def __init__(self):
        self.deleted=[]
        self.prs=[{"head":{"ref":"feat/live","repo":{"full_name":self.repository}},"base":{"ref":"main"}}]
        self.branches=[
            {"name":"main","commit":{"sha":MAIN},"protected":True},
            {"name":"feat/merged","commit":{"sha":"m1"},"protected":False},
            {"name":"feat/new","commit":{"sha":"u1"},"protected":False},
            {"name":"feat/live","commit":{"sha":"l1"},"protected":False},
            {"name":"feat/locked","commit":{"sha":"p1"},"protected":True},
        ]
        self.compare={
            "/compare/main...feat%2Fmerged":{"ahead_by":0,"behind_by":20,"base_commit":{"sha":MAIN}},
            "/compare/main...feat%2Fnew":{"ahead_by":3,"behind_by":2,"base_commit":{"sha":MAIN}},
        }
        self.moved=False
    def get(self,path):
        if path=="":return {"default_branch":"main"}
        if path=="/branches/main":return {"commit":{"sha":MAIN}}
        if path.startswith("/pulls?"):return self.prs
        if path.startswith("/branches?"):return self.branches
        if path.startswith("/compare/"):return self.compare[path]
        if path=="/branches/feat%2Fmerged":
            return {"commit":{"sha":"moved" if self.moved else "m1"},"protected":False}
        raise AssertionError("Unexpected API call: "+path)
    def delete(self,path):
        self.deleted.append(path)
        return None

class BranchCleanupTests(unittest.TestCase):
    def test_dry_run_preserves_all_branches(self):
        api=FakeAPI()
        report=reconcile(api,apply=False)
        states={x["name"]:x["status"] for x in report["branches"]}
        self.assertEqual(states["feat/merged"],"SAFE_TO_DELETE_DRY_RUN")
        self.assertEqual(states["feat/new"],"UNMERGED_UNIQUE_COMMITS")
        self.assertEqual(states["feat/live"],"RESERVED_OR_OPEN_PR")
        self.assertEqual(states["feat/locked"],"PROTECTED")
        self.assertEqual(report["deleted"],0)
        self.assertFalse(api.deleted)
    def test_apply_deletes_only_pinned_sha_merged_branch(self):
        api=FakeAPI()
        report=reconcile(api,apply=True)
        self.assertEqual(report["deleted"],1)
        self.assertEqual(api.deleted,["/git/refs/heads/feat/merged"])
    def test_moved_branch_prevents_destructive_deletion(self):
        api=FakeAPI()
        api.moved=True
        report=reconcile(api,apply=True)
        self.assertFalse(api.deleted)
        self.assertEqual(report["branches"][1]["status"],"BRANCH_MOVED")
    def test_never_operates_on_non_main_default_branch(self):
        api=FakeAPI()
        original=api.get
        api.get=lambda path: {"default_branch":"dev"} if path=="" else original(path)
        with self.assertRaisesRegex(RuntimeError,"Expected main"):
            reconcile(api,apply=True)
        self.assertFalse(api.deleted)

if __name__ == "__main__":
    unittest.main()
