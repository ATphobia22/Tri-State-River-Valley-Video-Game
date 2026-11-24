# Online-first roadmap completion — 2026-11-23

Policy: **online-first cinematic streaming**, offline single-file HTML as **backup**.

## Applied from modern browser-game research

| Reference | Technique applied |
|-----------|-------------------|
| Slow Roads | Aggressive online cell streaming + look-ahead |
| Townscaper | Instanced prop density via biome streamer online budgets |
| WebGPU Nürburgring Drift / FLOAT | Rapier for vehicles optional; capsule/BVH for character |
| MapLibre + PMTiles | Optional online reference map pack (`maplibre-reference.js`) |
| Shining / Noomo | Cinematic director HUD + lighting looks (existing) |

## Deliverables

1. **Streaming** — `streaming-policy.js` mode `online-first` / `offline-backup`
2. **Biome algorithms** — online load 1400 / unload 1800 / maxTrees 1600
3. **Physics bake-off** — capsule/BVH locomotion, Rapier optional vehicles
4. **MapLibre/PMTiles** — mounts only online when libs present; OSM attribution
5. **Hand/tool IK** — grip suite for fish/hunt/cook/drive/farm
6. **GPU evidence** — schema for real-device captures

## Real-device evidence

```js
const e = ValleyGpuEvidence.fromFrameProbe(
  RiverValleyDebug.capturePerformance(),
  null,
  { quality: 'cinematic', streaming: RiverValleyDebug.getState().streamingPolicy }
);
console.log(JSON.stringify(e, null, 2));
```

## Licenses

MapLibre/PMTiles BSD-3; Rapier Apache-2.0 (optional); three-mesh-bvh MIT (conceptual).
