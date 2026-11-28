# Game-art admission contract — fictional entertainment only

This gate applies **only** to game rendering assets. It does not classify source data as survey-accurate and does not modify scientific/geodetic release validators. Reconstructed Mount Vernon and Posey County imagery, building approximations, artistic geometry, and unregistered preview content may enter gameplay when technically usable, source-recorded, integrity-checked, and licensed for distribution.

## Working order

1. Read the latest main SHA and changed-file history; do not duplicate existing game systems.
2. Create or find source assets and record identifiers, provenance, license and redistribution rights.
3. Check asset file hashes and glTF/texture validity; use the `assessGameArt` contract for the game-only admission decision.
4. Integrate into Babylon.js WebGL2 and keep Three.js until equivalent end-to-end gameplay passes.
5. Validate performance, memory, interaction, saves and responsive screenshots in actual browsers.
6. Only then deploy, inspect Pages and merge eligible work with tested head SHA.

## Independent contracts

- **Game art:** `game/babylon-preview/game-art-admission.mjs`, checked by `game/tests/test-game-art-admission.cjs`. Missing survey GCP, precise elevations and unverified vertical datums **never** cause rejection.
- **Scientific control archive:** Existing geographic-release/GCP validation may flag source data as unsuitable for scientific claims. Such results do not override game-art acceptance.
- **Build:** `npm --prefix game ci --ignore-scripts`, `npm --prefix game test`, `npm --prefix game run build:babylon-preview`, plus existing hosted/offline packaging and Chromium checks.
- **Materials:** PBR assets should track normal/roughness/albedo and mip/LOD budgets; KTX2 and Meshopt are optional optimizations subject to decoded asset parity.
- **Standards:** Use glTF 2.0, WebGL2 and applicable 3D Tiles/PMTiles formats where technically valid. No survey certification, regulatory approval or formal engineering attestation is claimed.

The game should not require Vaisala/Xweather telemetry or Runway generation during normal play. Optional imported images/models must pass distribution and runtime checks.
