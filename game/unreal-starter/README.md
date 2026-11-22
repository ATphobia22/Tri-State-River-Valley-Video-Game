# River Valley Unreal Engine 5.8 Art Lab (optional)

This is a **Blueprint-only Unreal Editor authoring project**, not a port of the
playable River Valley browser game, not a packaged Unreal executable and not
part of Tri-State Systems Manager. Unreal Engine 5.8, a configured Windows
editor, and the source character asset are needed to actually import and
render in Unreal. None are installed by this repository.

## Open and inspect River

1. On a Windows machine with an authorized UE 5.8 installation, open
   `RiverValleyArtLab.uproject`. Enable the **Python Editor Script Plugin** and
   **Editor Scripting Utilities** if the Editor requests it; both are declared
   for this optional project only.
2. Before importing any **candidate replacement**, inspect it outside Unreal:

   ```bash
   python game/tools/audit_river_candidate.py path/to/candidate.glb \
     --baseline-manifest game/assets/models/river_explorer_manifest.json \
     --max-triangles 25000 --strict
   ```

   The current game's baseline has 27 joints and 13 animation actions. The
   separately described 69,120-triangle / 13-bone / 6-clip high-resolution
   master is **not** an automatically compatible replacement. It needs a
   separate lower-LOD game mesh, rig retargeting, animation coverage, visual
   signoff and deterministically updated source generator.
3. For a **review-only import**, use the Content Browser's **Import** action and
   Unreal **Interchange** to import a chosen GLB/FBX into `/Game/River`.
   In the import options, explicitly inspect *Skeletal Meshes*, *Animations*,
   *Materials* and *Textures*. Their availability and exact results depend on
   the source data and your installed UE 5.8 import pipeline. Do not use
   **Import Into Level** as a substitute for a skeletal-asset verification.
4. Choose **Tools → Execute Python Script** and run
   `Content/Python/river_valley_art_review.py`.
   It reads imported assets in `/Game/River`, compares **exact**
   animation asset names against the in-game GLB manifest, and writes an
   inspectable JSON receipt to
   `Saved/RiverQA/river_asset_review.json`.
   Asset import, rename and mapping must happen in the editor; this script
   does **not** auto-import, write Unreal packages, change skeletal rigs,
   or publish a build. An absent/mismatched clip fails the check.
5. Inspect the resulting Skeletal Mesh, Skeleton and animations in the Unreal
   editors. Check pose axes, feet, hand/tool grips, eyeglass transparency,
   face gaiter, normal/roughness maps, collision, physics and LODs.
   Compare front / three-quarter / side / rear camera views with the original
   River illustrations. A catalog receipt is not a rendered proof.
6. Keep separate proof of build/cook/package/launch on Windows before claiming
   Unreal Shipping support. The browser game's current offline HTML, PWA
   service worker, runtime GLB and CI remain unchanged by this lab.

## Editor modules from the proposed A–W inventory

The listed names are generally **built-in UE editor modules**, not a catalog
of separate installable packages. Do not add all of them to a game Build.cs
or install arbitrary substitutes with matching names. Some are internal,
platform-specific, version-dependent, or not pertinent to this game's scope.

| Priority | Useful editor tools/modules | River Valley authoring use |
| --- | --- | --- |
| High | Persona, SkeletalMeshEditor, SkeletonEditor, AnimationEditor, AnimGraph, AnimationBlueprintEditor, AnimationModifiers | Bone hierarchy, action review, IK and rig retargeting |
| High | MaterialEditor, TextureEditor, MeshPaint, ClothPainter, ClothingSystemEditor | Face gaiter, glass lenses, PBR and cloth work |
| High | PhysicsAssetEditor, GameplayDebuggerEditor, RewindDebuggerInterface | Collision, movement and animation debugging |
| High | LevelEditor, LandscapeEditor, FoliageEdit, HierarchicalLODOutliner, WorldPartitionEditor | Optional UE landscape, vegetation and world streaming |
| Medium | Sequencer, MovieSceneTools, CurveEditor, EnvironmentLightingViewer, AdvancedPreviewScene | Character turnaround, cinematics and lighting |
| Medium | BlueprintGraph, BlueprintEditorLibrary, BehaviorTreeEditor, DataLayerEditor | Optional future Unreal gameplay prototypes |
| Usually unnecessary | EditorStyle, EditorWidgets, Toolbar/ContentBrowser internals, code-generation dialogs, specialized legacy/editor widgets | Do not depend on these without a specific tooling requirement |

**No UE C++ runtime or Editor module dependencies are added by this project.**
A future custom Editor plugin, if justified, must declare `Type: Editor` and keep
any editor-only imports/dependencies out of a Runtime or Shipping target.
The provided list ends with a truncated `WorldPartitionEdi`; the relevant
world-building editor tooling should be checked against the installed UE
version rather than treating that shortened string as a valid dependency.

## Proof and limitations

- Pure Python inventory logic can be tested without an Unreal installation:
  `python -m unittest discover -s game/unreal-starter/tests -p 'test_*.py' -v`.
- That test exercises policy logic and project isolation only; it does not
  execute UE Editor Python, import River, check an Unreal plugin installation,
  compile an animation blueprint, render on GPU or package a Windows game.
- The GLB must still be integrated separately into the **Three.js** game by
  updating its deterministic model generator, manifest, offline bundle,
  hosted bundle, browser tests and PWA cache. This art-lab project does not
  wire itself into the live website.

References: Epic Games official Unreal Engine 5.8 documentation on Editor
Modules, Plugins, Python Editor scripting, Skeletal Meshes and Interchange
Import (https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-editor-modules-for-customizing-the-editor-in-unreal-engine,
https://dev.epicgames.com/documentation/en-us/unreal-engine/scripting-the-unreal-editor-using-python,
https://dev.epicgames.com/documentation/unreal-engine/interchange-import-reference-in-unreal-engine).
