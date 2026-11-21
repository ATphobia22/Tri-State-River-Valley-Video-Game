# Optional Unity terrain data handoff

This folder is **not a complete Unity project** or a native compiled game. In a new, private Unity project (not a Tri-State Systems Manager repository), copy the `Assets/RiverValley/` directory to your Unity `Assets/` tree and select **River Valley → Import Mount Vernon Preview Terrain**. Unity compiles the script as an Editor-only importer. The generated preview terrain is not connected to the HTML game's mechanics; you must create the Unity gameplay scenes, controls, roads and buildings separately.

The 257 × 257 R16 file is little endian and derives from the source 200 × 200 grid. Terrain elevation units and vertical datum are **not independently established**; this is visual game terrain, not engineering evidence. Unity Editor compilation, platform builds and rendered frames were **not** verified here. The import tool creates a new unique TerrainData asset rather than overwriting existing assets.
