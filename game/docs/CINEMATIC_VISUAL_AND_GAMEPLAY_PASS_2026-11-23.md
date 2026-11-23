# Cinematic Visual + Gameplay Pass — 2026-11-23

## Intent
Cinematic, photoreal-*leaning* family game art — not survey accuracy. Offline-first.

## Branch
`feat/visual-workers-wind-foam-20261123`

## Visual / rendering
| Module | Upgrade |
|--------|---------|
| `river-water.js` | V2: wind secondary waves, shore foam band, quality-tier detail |
| `graphics-quality.js` | GPU wind sway on instanced meadow (`onBeforeCompile`) |
| `model-prep-worker.js` | Worker: foliage matrix pack, facade batch, LOD descriptors; inline fallback |
| Existing | Building/foliage `render-workers.js`, cinematic lighting/dressing |

## Gameplay
| Module | Upgrade |
|--------|---------|
| `activities.js` | Fish bite windows, hunt aim hints, farm plot states, cookable list |
| `wildlife.js` | Deer/turkey/rabbit ambient layer + Scout-aligned tracking hints |

## Wiring
1. Add before `game.js` in `index.html`:
   - `src/model-prep-worker.js`
   - `src/activities.js`
   - `src/wildlife.js`
2. `sw.js` inventory already lists the three modules (retirement worker only).
3. Main loop:
   - Grass: `update(x,z,{ quality, season, timeMs: stamp })`
   - Water: `ValleyRiverWater.update(mat, stamp, weather, time, quality, { wind, shoreZ })`
   - Optional facade worker: `ValleyModelPrep.channel('facade').submit({ kind:'facade', buildings, seedBase, onResult })`
   - Wildlife every 2–3s: `ValleyWildlife.spawnAround(player.x, player.z, { timeOfDay: time })`
   - Minigames: `ValleyActivities.createFishRound` / `stepFish` / `reelFish` (and hunt/farm/cook helpers)

## Non-goals
- SSR / reflection render targets (mobile + offline size)
- Ecological survey claims
- Service-worker caching of gameplay HTML
