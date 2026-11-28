# Babylon.js WebGL2 game runtime

This directory contains the Babylon.js 9.37.2 WebGL2 runtime and migration surface for the fictional River Valley family adventure. It is game software, not a survey-certified digital twin.

## Current production arrangement

- The legacy Three.js game remains the complete production gameplay baseline until equivalent Babylon.js play-throughs pass.
- Babylon.js is the forward rendering/runtime target; dependencies are pinned in `game/package.json` and `game/package-lock.json`.
- The GitHub Pages build packages the playable game and the Babylon preview. Keep existing offline and hosted paths working while migration proceeds.
- The preview includes source-linked regional scene loading, artistic building masses, local media, a playable hero, shared activity/progression rules, and a bounded verified-asset transport.
- Approximate elevations, footprint-derived dimensions, artistic registration and generated geometry are permitted for game presentation. They are not survey claims.

## Game-art intake

Use `game-art-admission.mjs` for the game-only decision and `game/tests/test-game-art-admission.cjs` for regression coverage. Art can be admitted without GCP, vertical-datum, survey registration or human engineering approval. Require practical runtime usability, source/provenance, content integrity and distribution-compatible licensing. Preserve separate scientific source-data validators; they do not control game-art admission.

The admission helper is a policy contract, not a replacement for verifying actual file bytes, licensing evidence or loader compatibility. `asset-transport.mjs` verifies complete GLB/KTX2/PMTiles/tileset bytes against a supplied SHA-256 and size, with bounded same-origin requests. A digest proves byte identity only, not geographic accuracy or ownership.

## Developer workflow

From `game/`:

```sh
npm ci
npm test
npm run build:babylon-preview
npm run build
```

The suite includes Node regression tests and repository CI browser tests. Verify the current commit's workflow runs and actual Pages gameplay before calling a release complete.

## Migration completion criteria

1. Maintain Babylon.js 9.37.2, WebGL2-only rendering and pinned dependencies.
2. Finish 3D world presentation: terrain, streets, river, landmark/courthouse, detailed buildings/interiors, foliage, PBR materials, wildlife and character rigs.
3. Preserve fishing, farming, cooking, hunting, quests, inventory/progression and local saves with full gameplay parity.
4. Use adaptive LOD, instancing, KTX2/Meshopt, H3, PMTiles and the official NASA AMMOS Babylon 3D Tiles adapter where they demonstrably improve the shipped game.
5. Validate desktop/mobile browser stability, rendering, interaction, asset licensing/integrity, load time and memory budgets.
6. Remove Three.js only after parity is verified; deploy and inspect the actual Pages build after merge.

No deleted issue is required or recreated. No survey authority, regulatory certification or geographic accuracy guarantee is claimed.
