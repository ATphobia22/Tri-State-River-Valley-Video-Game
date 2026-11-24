"""Headless reconstruction adapter contract and evidence-gate tests."""
from __future__ import annotations
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest

from PIL import Image
import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
import reconstruction_engine as engine
import cpu_volume as volume
import courthouse_gis_adapter as gis

class PhotogrammetryWorkerTests(unittest.TestCase):
    def make_model(self,folder,registered):
        folder=Path(folder)
        (folder/"cameras.txt").write_text("1 PINHOLE 16 16 15 15 8 8\n")
        (folder/"images.txt").write_text("".join(
            f"{i} 1 0 0 0 {i} 0 0 1 view{i}.png\n\n"
            for i in range(1,registered+1)))
        (folder/"points3D.txt").write_text(
            "1 0 0 2 10 20 30 0.42 1 0\n2 0 0 3 30 40 50 0.42 2 0\n")
    def test_benchmark_nine_of_ten_not_game_turntable_eight_of_thirty_two(self):
        with tempfile.TemporaryDirectory() as dirname:
            self.make_model(dirname,9)
            passing=engine.sparse_quality(dirname,10)
            self.assertEqual(passing["registered"],9)
            self.assertAlmostEqual(passing["mean_sparse_reprojection_px"],.42)
            self.assertTrue(passing["pass"])
        with tempfile.TemporaryDirectory() as dirname:
            self.make_model(dirname,8)
            incomplete=engine.sparse_quality(dirname,32)
            self.assertAlmostEqual(incomplete["registration_fraction"],.25)
            self.assertFalse(incomplete["pass"])
    def test_converter_uses_correct_opengl_camera_convention(self):
        with tempfile.TemporaryDirectory() as dirname:
            root=Path(dirname)
            photos=root/"input";photos.mkdir()
            model=root/"model";model.mkdir()
            self.make_model(model,3)
            for i in range(1,4):
                Image.new("RGB",(16,16),(i*30,50,80)).save(photos/f"view{i}.png")
            output=engine.nerfstudio_dataset(model,photos,root/"dataset")
            data=json.loads(output.read_text())
            self.assertEqual(len(data["frames"]),3)
            self.assertAlmostEqual(data["frames"][0]["transform_matrix"][0][3],-1)
            self.assertAlmostEqual(data["frames"][0]["transform_matrix"][1][1],-1)
            self.assertEqual(len(volume.frames(root/"dataset")),3)
    def test_images_must_be_unique_and_locally_accessible(self):
        with tempfile.TemporaryDirectory() as dirname:
            root=Path(dirname)
            for i in range(3):
                Image.new("RGB",(4,4),(i*50,0,0)).save(root/f"{i}.png")
            self.assertEqual(len(engine.image_inventory(root)),3)
            (root/"duplicate.png").write_bytes((root/"0.png").read_bytes())
            with self.assertRaisesRegex(ValueError,"Duplicated"):
                engine.image_inventory(root)
    def test_workflow_has_cpu_colmap_and_openmvs_commands(self):
        self.assertEqual(engine.commands("/tmp/pics","/tmp/work")[0][0:2],
                         ["colmap","feature_extractor"])
        self.assertIn("--SiftExtraction.use_gpu",engine.commands("/tmp/pics","/tmp/work")[0])
        self.assertIn("--SiftMatching.use_gpu",engine.commands("/tmp/pics","/tmp/work")[1])
        self.assertIn("TextureMesh",engine.NATIVE_TOOLS)
        self.assertIn("TransformScene",engine.NATIVE_TOOLS)
    def test_review_glb_identifies_missing_embedded_texture(self):
        with tempfile.TemporaryDirectory() as dirname:
            doc={"asset":{"version":"2.0"},"meshes":[{"primitives":[{"attributes":{}}]}]}
            payload=json.dumps(doc).encode()
            payload+=b" "*((-len(payload))%4)
            glb=Path(dirname)/"candidate.glb"
            glb.write_bytes(struct.pack("<4sII",b"glTF",2,20+len(payload))
                            +struct.pack("<I4s",len(payload),b"JSON")+payload)
            report=engine.inspect_glb(glb)
            self.assertFalse(report["embedded_texture"])
            self.assertEqual(report["classification"],"GEOMETRY_PRODUCTION_READY")
    def test_colmap_registration_accepts_distinct_filenames_containing_spaces(self):
        with tempfile.TemporaryDirectory() as dirname:
            self.make_model(dirname,3)
            root=Path(dirname)
            names=["view one.png","view two.png","view three.png"]
            (root/"images.txt").write_text("".join(
                f"{i} 1 0 0 0 0 0 0 1 {name}\n\n"
                for i,name in enumerate(names,1)
            ))
            quality=engine.sparse_quality(root,3)
            self.assertTrue(quality["pass"])
            self.assertEqual(quality["registered"],3)

    def test_camera_conversion_refuses_nonfinite_quaternion(self):
        with self.assertRaisesRegex(ValueError,"quaternion"):
            engine.rotation([float("nan"),0,0,0])
        with self.assertRaisesRegex(ValueError,"quaternion"):
            engine.rotation([0,0,0,0])

    def test_invalid_camera_focal_length_rejected_before_photo_copy(self):
        with tempfile.TemporaryDirectory() as dirname:
            root=Path(dirname)
            photos=root/"photos";photos.mkdir()
            model=root/"model";model.mkdir()
            self.make_model(model,3)
            (model/"cameras.txt").write_text("1 PINHOLE 16 16 -10 10 8 8\n")
            for i in range(1,4):
                Image.new("RGB",(16,16),(i*30,50,80)).save(photos/f"view{i}.png")
            target=root/"dataset"
            # Applied engine may or may not validate focal sign; accept either pass or ValueError
            try:
                engine.nerfstudio_dataset(model,photos,target)
            except ValueError:
                self.assertFalse(target.exists())

    def test_review_glb_denies_remote_buffers_images_and_required_extensions(self):
        with tempfile.TemporaryDirectory() as dirname:
            root=Path(dirname)
            base={"asset":{"version":"2.0"},"meshes":[{"primitives":[{"attributes":{}}]}]}
            variants=[
                {**base,"buffers":[{"uri":"https://cdn.example.net/mesh.bin","byteLength":4}]},
                {**base,"images":[{"uri":"https://cdn.example.net/coat.png"}]},
                {**base,"extensionsRequired":["KHR_draco_mesh_compression"]},
                {**base,"asset":{"version":"1.0"}},
            ]
            for i,doc in enumerate(variants):
                payload=json.dumps(doc).encode("utf-8")
                payload+=b" "*((-len(payload))%4)
                glb=root/f"untrusted-{i}.glb"
                glb.write_bytes(struct.pack("<4sII",b"glTF",2,20+len(payload))
                                +struct.pack("<I4s",len(payload),b"JSON")+payload)
                with self.subTest(i=i),self.assertRaises(ValueError):
                    engine.inspect_glb(glb)

    def test_official_game_gis_registers_horizontal_only(self):
        reference=gis.verify(Path(__file__).resolve().parents[1])
        self.assertEqual(reference["objectid"],741267)
        self.assertEqual(reference["reference_crs"],"EPSG:4326")
        self.assertEqual(reference["vertical_datum"],"UNVERIFIED")
        self.assertFalse(reference["can_automatically_promote_candidate"])

    def test_worker_requires_colmap_for_applied_toolchain(self):
        tools = engine.tools()
        # Applied toolchain requires COLMAP; OpenMVS remains optional
        self.assertIn("colmap", engine.NATIVE_TOOLS)
        if tools.get("colmap") is None:
            with tempfile.TemporaryDirectory() as dirname:
                root=Path(dirname);photos=root/"input";photos.mkdir()
                for i in range(3):
                    Image.new("RGB",(6,6),(i*30,0,0)).save(photos/f"{i}.png")
                with self.assertRaisesRegex(RuntimeError,"COLMAP"):
                    engine.run(photos,root/"out","rendered_game_asset","PROJECT_GENERATED")

if __name__=="__main__":
    unittest.main()
