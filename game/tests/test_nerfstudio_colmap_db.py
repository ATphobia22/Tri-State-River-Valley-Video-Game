"""Read-only COLMAP SQLite diagnostics and bounded Nerfstudio preset tests."""
from __future__ import annotations

import json
from pathlib import Path
import sqlite3
import struct
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import colmap_database_audit as db
import nerfstudio_profiles as profiles
import reconstruction_engine as worker


def populated_database(path):
    connection = sqlite3.connect(path)
    connection.executescript("""
      CREATE TABLE cameras (camera_id INTEGER PRIMARY KEY, model INTEGER,
                            width INTEGER, height INTEGER, params BLOB);
      CREATE TABLE images (image_id INTEGER PRIMARY KEY, name TEXT UNIQUE,
                           camera_id INTEGER);
      CREATE TABLE rigs (rig_id INTEGER PRIMARY KEY);
      CREATE TABLE frames (frame_id INTEGER PRIMARY KEY);
      CREATE TABLE keypoints (image_id INTEGER PRIMARY KEY, rows INTEGER,
                              cols INTEGER, data BLOB);
      CREATE TABLE descriptors (image_id INTEGER PRIMARY KEY, rows INTEGER,
                                cols INTEGER, data BLOB);
      CREATE TABLE matches (pair_id INTEGER PRIMARY KEY, rows INTEGER,
                            cols INTEGER, data BLOB);
      CREATE TABLE two_view_geometries (
          pair_id INTEGER PRIMARY KEY, rows INTEGER, cols INTEGER,
          data BLOB, config INTEGER, F BLOB, E BLOB, H BLOB);
    """)
    connection.execute("INSERT INTO cameras VALUES (1, 1, 640, 480, ?)",
                       (struct.pack("<4d", 550.0, 560.0, 320.0, 240.0),))
    for i in range(1, 4):
        connection.execute("INSERT INTO images VALUES (?, ?, 1)",
                           (i, f"view {i}.png"))
        connection.execute("INSERT INTO keypoints VALUES (?, 2, 4, ?)",
                           (i, struct.pack("<8f", *([0., 0., 1., 0.] * 2))))
        connection.execute("INSERT INTO descriptors VALUES (?, 2, 128, ?)",
                           (i, bytes(range(128)) * 2))
    for a, b, n in [(1, 2, 24), (2, 3, 22), (1, 3, 0)]:
        pid = db.image_ids_to_pair_id(a, b)
        blob = b"".join(struct.pack("<II", i % 2, i % 2) for i in range(n))
        connection.execute("INSERT INTO matches VALUES (?, ?, 2, ?)",
                           (pid, n, blob))
        connection.execute("INSERT INTO two_view_geometries VALUES (?, ?, 2, ?, 2, NULL, NULL, NULL)",
                           (pid, n, blob))
    connection.commit()
    connection.close()


class DatabaseAuditTests(unittest.TestCase):
    def test_pair_identifier_matches_current_colmap_encoding(self):
        self.assertEqual(db.image_ids_to_pair_id(1, 2), 2147483649)
        self.assertEqual(db.image_ids_to_pair_id(2, 1), 2147483649)
        self.assertEqual(db.pair_id_to_image_ids(2147483649), (1, 2))
        for args in [(0, 1), (3, 3), (1, 2147483647), (-1, 2)]:
            with self.assertRaises(ValueError):
                db.image_ids_to_pair_id(*args)

    def test_matching_pairs_and_image_graph_provenance(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "database.db"
            populated_database(path)
            report = db.inspect(path, expected_images=3, min_verified_inliers=15)
            self.assertEqual(report["status"], "MATCH_GRAPH_CONNECTED")
            self.assertEqual(report["images"], 3)
            self.assertEqual(report["cameras"], 1)
            self.assertEqual(report["images_with_keypoints"], 3)
            self.assertEqual(report["images_with_descriptors"], 3)
            self.assertEqual(report["verified_pairs"], 2)
            self.assertEqual(report["largest_verified_component"], 3)
            self.assertEqual(report["isolated_images"], 0)
            self.assertEqual(report["rigs"], 0)
            self.assertEqual(report["frames"], 0)
            self.assertFalse(report["camera_poses_recovered_by_db_audit"])
            self.assertEqual(report["expected_images"], 3)
            self.assertEqual(report["expected_image_coverage"], 1.0)
            self.assertEqual(report["database_mode"], "READ_ONLY")

    def test_bad_keypoint_blob_and_orphan_camera_fail_without_mutation(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "dataset.sqlite"
            populated_database(path)
            before = path.stat().st_size
            with sqlite3.connect(path) as conn:
                conn.execute("UPDATE keypoints SET data=x'00' WHERE image_id=1")
            with self.assertRaisesRegex(ValueError, "keypoints.*blob"):
                db.inspect(path)
            with sqlite3.connect(path) as conn:
                conn.execute("UPDATE keypoints SET data=? WHERE image_id=1",
                             (struct.pack("<8f", *([0., 0., 1., 0.] * 2)),))
                conn.execute("UPDATE images SET camera_id=999 WHERE image_id=1")
            with self.assertRaisesRegex(ValueError, "camera"):
                db.inspect(path)
            self.assertTrue(path.is_file())
            self.assertGreater(before, 0)

    def test_unverified_pairs_are_not_reported_as_registered_cameras(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "database.db"
            populated_database(path)
            with sqlite3.connect(path) as conn:
                conn.execute("UPDATE two_view_geometries SET config=0")
            report = db.inspect(path, expected_images=32)
            self.assertEqual(report["verified_pairs"], 0)
            self.assertEqual(report["isolated_images"], 3)
            self.assertEqual(report["status"], "MATCH_GRAPH_INSUFFICIENT")
            self.assertEqual(report["images"], 3)
            self.assertEqual(report["expected_image_coverage"], 3 / 32)

    def test_absent_database_is_not_created(self):
        with tempfile.TemporaryDirectory() as directory:
            missing = Path(directory) / "missing.db"
            with self.assertRaises(FileNotFoundError):
                db.inspect(missing)
            self.assertFalse(missing.exists())


class NerfstudioProfileTests(unittest.TestCase):
    def test_profile_commands_are_headless_with_correct_argument_order(self):
        for profile in ["nerfacto-preview", "splatfacto-balanced", "splatfacto-cinematic"]:
            command = profiles.training_command("/tmp/courthouse/transforms",
                                                "/tmp/work/appearance", profile)
            self.assertEqual(command[0], "ns-train")
            self.assertIn("--vis", command)
            self.assertEqual(command[command.index("--vis") + 1], "tensorboard")
            self.assertIn("--max-num-iterations", command)
            self.assertIn("nerfstudio-data", command)
            self.assertLess(command.index("--max-num-iterations"),
                            command.index("nerfstudio-data"))
            self.assertGreater(command.index("--eval-mode"),
                               command.index("nerfstudio-data"))
            self.assertEqual(command[command.index("--eval-mode") + 1], "fraction")
            self.assertIn("--train-split-fraction", command)
            self.assertEqual(command[command.index("--train-split-fraction") + 1], "0.9")
            self.assertEqual(command[command.index("--data") + 1],
                             str(Path("/tmp/courthouse/transforms").resolve()))

    def test_cinematic_splatting_config_has_documented_quality_controls(self):
        command = profiles.training_command("/tmp/poses", "/tmp/output",
                                            "splatfacto-cinematic", max_iterations=30000)
        self.assertEqual(command[1], "splatfacto-big")
        self.assertIn("--pipeline.model.cull_alpha_thresh=0.005", command)
        self.assertIn("--pipeline.model.continue_cull_post_densification=False", command)
        self.assertEqual(command[command.index("--max-num-iterations") + 1], "30000")
        self.assertGreater(profiles.PROFILES["splatfacto-cinematic"]["approx_gpu_gb"],
                           profiles.PROFILES["splatfacto-balanced"]["approx_gpu_gb"])

    def test_profile_rejects_unknown_profile_or_resource_overrun(self):
        with self.assertRaises(ValueError):
            profiles.training_command("/tmp/a", "/tmp/out", "unknown")
        with self.assertRaises(ValueError):
            profiles.training_command("/tmp/a", "/tmp/out", "nerfacto-preview", max_iterations=1000001)
        with self.assertRaises(ValueError):
            profiles.training_command("/tmp/a", "/tmp/out", "nerfacto-preview", train_split_fraction=1.0)

    def test_worker_exposes_db_audit_and_profile_selection(self):
        import inspect
        code = inspect.getsource(worker.run)
        self.assertIn("audit_database", code)
        self.assertIn("training_command", code)
        self.assertIn("appearance_profile", code)


if __name__ == "__main__":
    unittest.main()
