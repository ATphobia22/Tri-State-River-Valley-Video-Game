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

## Additional A–Z developer module inventory (2026-11-22)

The following are **selection guidance**, not a claim that a binary module,
plugin, SDK, or editor has been installed. Verify each module's actual
availability and supported public API against the pinned UE 5.8 source
checkout before adding any Build.cs dependency. Modules from Engine/Developer,
Engine/Editor, Programs, and Plugins have different host restrictions.

| Task | Relevant modules from the additional list | Safe integration path |
| --- | --- | --- |
| Character mesh import and repair | AssetTools, MeshDescriptionOperations, MeshBuilder, MeshUtilities, MeshReductionInterface, SkeletalMeshUtilitiesCommon, MeshBoneReduction | Editor asset-import/reduction tools; keep optimized GLB as a separately validated browser export |
| Animation authoring | AnimationDataController, AnimationWidgets | Use supported animation editing APIs in Editor; review bone names, retarget poses and all 13 required browser actions |
| Material and texture processing | MaterialBaking, MaterialUtilities, TextureBuild, TextureBuildUtilities, TextureCompressor | Editor material bake and texture compression; verify normals, alpha, roughness, color space and output budgets |
| Large-world optimization | HierarchicalLODUtilities, NaniteBuilder, NaniteUtilities, GeometryProcessingInterfaces | Optional Unreal HLOD/Nanite authoring, not Three.js runtime features; test fallback and source geometry |
| Automated quality gates | FunctionalTesting, AutomationController, AutomationDriver, AutomationWindow, CQTest, ScreenShotComparison, ScreenShotComparisonTools | Native editor/automation tests and GPU screenshot comparisons on a licensed UE runner; browser CI remains authoritative for the published game |
| Profiling and logs | TraceAnalysis, TraceInsights, TraceInsightsCore, TraceInsightsFrontend, TraceServices, TraceTools, ProfileVisualizer, LogVisualizer, OutputLog, CollisionAnalyzer | Profile actual UE scenes on a suitable machine; record GPU, VRAM, FPS, CPU and hardware |
| Cooking and packaging | DerivedDataCache, IoStoreUtilities, PakFileUtilities, CookMetadata, TargetPlatform, TurnkeyIO, LauncherServices, TextureFormat | Invoke UAT/BuildCookRun and installed target platforms; independently launch the packaged Windows binary |
| Editor productivity | ToolMenus, ToolWidgets, CollectionManager, DirectoryWatcher, FileUtilities, SourceControl, UnsavedAssetsTracker | Optional Editor extensions only when there is a concrete recurring task |
| Specialized/avoid by default | BlankModule, BSPUtils, CookedEditor, DatasmithExporterUI, Horde, UbaCoordinatorHorde, ShaderFormatOpenGL, SlackIntegrations, Zen | Do not enable blindly: examples, internal services, platform-specific or distributed-build infrastructure |

**Important:** An Unreal Editor module name is not evidence that it is a
standalone installable plugin. Some modules are private implementation details
or unavailable in a particular installed engine build. The UE 5.8 project
deliberately has no C++ Modules array, and none of the modules above should
be injected into a Runtime target to make an editor QA script work.

### Concrete follow-up acceptance criteria

1. Import the *actual* River candidate skeletal source into /Game/River,
   run the existing Editor Python QA receipt, and fix any missing animation
   clips without weakening the exact-name gate.
2. Produce front/side/rear/three-quarter screenshots and inspect rig deformation,
   gaiter, glasses, hair, cloth and PBR materials under repeatable lighting.
3. Build reduced-LOD game GLB exports; run the existing strict candidate
   audit, browser visual matrix, offline save-slot replay and deterministic
   generator tests before replacing the current browser asset.
4. If UE runtime is pursued separately, run BuildCookRun with a pinned UE 5.8
   installation, inspect the cook log, and launch the packaged Windows game
   without Editor modules. The current optional art lab does not satisfy
   that runtime requirement.

## Runtime-module inventory (third A–X list)

These entries are **Unreal Engine modules**, not a package manifest for the
browser game. A module may be engine-runtime, editor-only, platform-specific,
experimental, optional plugin-provided, or unavailable in the installed build.
Use the UE 5.8 engine source and target rules to establish actual availability
before enabling one. This section records intended integration boundaries;
it does not install, compile or execute Unreal modules.

| River Valley system | Candidate runtime modules | Conditions |
| --- | --- | --- |
| Core game objects and input | Core, CoreUObject, Engine, InputCore, ApplicationCore, Projects, DeveloperSettings | Baseline dependencies only for a **future native Unreal game target**; the current art lab has no C++ runtime target |
| River skeletal animation | AnimationCore, AnimGraphRuntime, Constraints, PhysicsCore, ClothingSystemRuntimeCommon, ClothingSystemRuntimeInterface | Evaluate imported skeletal mesh, animation blueprint, skin deformation, and clothing support on a UE runner; do not infer GLB compatibility from module availability |
| Walking, vehicles and collision | Chaos, ChaosCore, ChaosSolverEngine, ChaosVehiclesCore, ChaosVehiclesEngine, NavigationSystem, GameplayTasks, GameplayTags, AIModule | Optional native physics/AI prototype; game browser collision, driving and NPC systems remain implemented in JavaScript |
| Terrain, buildings and geometry | Landscape, Foliage, GeometryCore, GeometryFramework, MeshDescription, StaticMeshDescription, SkeletalMeshDescription, ISMPool | Optional native world authoring; distinguish art terrain from survey-grade or regulatory GIS |
| Cinematics, UI and effects | CinematicCamera, LevelSequence, MovieScene, MovieSceneTracks, UMG, Slate, SlateCore, Niagara (when plugin present), ColorManagement | Cinematic/viewport prototype only; confirm native scene and package evidence separately |
| Audio | AudioMixer, AudioMixerCore, AudioExtensions, SignalProcessing, AudioAnalyzer, VorbisAudioDecoder, OpusAudioDecoder | Choose engine-supported platform audio codecs; no requirement to bundle all decoders |
| Rendering and optimization | RenderCore, RHI, RHICore, Renderer, D3D12RHI, VulkanRHI, MaterialShaderQualitySettings, ImageCore | RHI/platform backends depend on target hardware; do not hard-code every backend or CUDA |
| Asset pipeline | AssetRegistry, InterchangeCore, InterchangeEngine, ImageWrapper, ImageWriteQueue, Json, JsonUtilities, Serialization | Import/catalog/export tools may be editor-dependent; runtime reads only packaged assets |
| Runtime testing and diagnostics | AutomationTest, AutomationMessages, AutomationWorker, TraceLog, HardwareSurvey, PerfCounters | Execute UE native tests and profile real hardware independently of the existing browser CI |
| Optional save/network | HTTP, SSL, Sockets, Networking, NetCore, NetworkReplayStreaming, PakFile | Not necessary for offline-first single-player game; no remote service or login should be required |

### Explicit exclusions and special cases

- **WebBrowser, WebBrowserTexture, CEF3Utils, WebSockets, HttpServer:**
  do not add as a dependency to the offline-native target; the user requires
  native offline execution rather than a hidden browser/server.
- **Advertising, Analytics*, FriendsAndChat, XMPP, Voice, Online/telemetry
  services:** not needed for anonymous, offline-first gameplay. No new
  analytics, ads, identity, or tracking services are enabled.
- **CUDA, D3D12RHI, VulkanRHI, OpenGLDrv, NullDrv, SlateNullRenderer:**
  platform-specific or headless/render-backend choices, not universal
  dependencies; select and test only the actual supported target.
- **AutoRTFM, VerseCompiler, uLang*, NNE, MassEntity, IrisCore, StateStream,
  VirtualProduction, AugmentedReality, HeadMountedDisplay, EyeTracker:**
  specialized or optional technology. No game requirement justifies
  enabling them in this art lab.
- **BuildPatchServices, BackgroundHTTP, IoStoreOnDemandCore, StreamingFile,
  InstallBundleManager, NetworkFileSystem:** remote/dynamic delivery is not
  required for the offline game; preserve local asset packaging.
- **AudioCaptureCore, AudioCaptureRtAudio, LiveLinkInterface,
  LiveLinkAnimationCore:** potential future motion/audio capture tools,
  not required for the current character asset and not enabled by default.
- **BinkAudioDecoder, RadAudioDecoder, AdpcmAudioDecoder, AVEncoder, AVIWriter:**
  codec or encoding choices that must be licensed and tested when used.
  Do not add them merely because the module name appears in an inventory.

### Native-engine dependency gate

Before adding a runtime Build.cs or .uproject C++ module, require a concrete
UE-specific feature, a supported UE 5.8 API, a module dependency audit,
a clean Editor compile, cook, package and a network-disabled Windows launch.
Keep Editor, Developer and Program modules out of Shipping. A successful
browser game CI run validates **only the existing browser game** and the
optional art-lab's static policy tests, not an Unreal native executable.
