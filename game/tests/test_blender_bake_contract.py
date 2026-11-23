import importlib.util, pathlib, unittest
p=pathlib.Path(__file__).parents[1]/"tools"/"blender_bake_hero.py"
spec=importlib.util.spec_from_file_location("bake",p)
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)

class BlenderBakeContract(unittest.TestCase):
    def test_orm_channels_are_linear_and_independent(self):
        ao=[.2,.3,.4,1,.7,.8,.9,1]
        rough=[.1,.6,.2,1,.9,.4,.2,1]
        result=b.pack_orm_pixels(ao,rough,0.25)
        self.assertEqual(list(result),[.2,.1,.25,1,.7,.9,.25,1])
        with self.assertRaisesRegex(ValueError,"different lengths"):b.pack_orm_pixels(ao,[1,1,1,1],.5)
        with self.assertRaisesRegex(ValueError,"metallic"):b.pack_orm_pixels(ao,rough,2)
    def test_requires_original_27_names_and_13_animations_not_generic_joint_numbers(self):
        self.assertEqual(len(b.REQUIRED_BONES),27)
        self.assertEqual(len(b.REQUIRED_CLIPS),13)
        self.assertIn("RightHand",b.REQUIRED_BONES)
        with self.assertRaisesRegex(ValueError,"Missing bones"):
            b.check_name_contract([f"Joint_{i}" for i in range(27)],b.REQUIRED_CLIPS)
        with self.assertRaisesRegex(ValueError,"Missing actions"):
            b.check_name_contract(b.REQUIRED_BONES,["Idle"])
    def test_glb_output_must_be_embedded_normal_orm_and_complete_animation(self):
        img=lambda i:{"bufferView":i,"mimeType":"image/png"}
        doc={"asset":{"version":"2.0"},"skins":[{"joints":list(range(27))}],
             "nodes":[{"name":name} for name in b.REQUIRED_BONES],
             "animations":[{"name":name} for name in b.REQUIRED_CLIPS],
             "images":[img(i) for i in range(3)],
             "materials":[{"pbrMetallicRoughness":{"baseColorTexture":{"index":0},
               "metallicRoughnessTexture":{"index":2}},"normalTexture":{"index":1},
               "occlusionTexture":{"index":2}}],
             "textures":[{"source":0},{"source":1},{"source":2}],
             "buffers":[{"byteLength":500}]}
        b.verify_export_json(doc)
        doc["images"][2]["uri"]="external.png"
        with self.assertRaisesRegex(ValueError,"External"):b.verify_export_json(doc)
        del doc["images"][2]["uri"]
        doc["animations"]=doc["animations"][:1]
        with self.assertRaisesRegex(ValueError,"Missing actions"):b.verify_export_json(doc)

if __name__=="__main__":unittest.main()
