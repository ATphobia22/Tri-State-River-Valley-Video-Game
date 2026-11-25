# Hybrid graphics and optional local inference: implementation contract

## Current increment
- Existing Three.js WebGL renderer remains the production renderer. No global API monkey patch or additional GPUDevice is created.
- Streaming policy exports a model footprint estimator, application-level workload reservation ledger, and hysteretic resolution governor. Only the resolution governor and corrected texture accounting are wired into gameplay in this increment. The model estimator and reservation ledger are not an inference engine.
- Scale applies to the existing pixel-ratio ceiling, not CSS display dimensions. Low FPS for three consecutive observations reduces scale by 0.10; high FPS for eight observations restores 0.05. Existing observation interval is approximately four seconds. Floor 0.50, ceiling 1.00. Hidden/invalid observations do not change scale. This is conventional dynamic resolution, not temporal or neural super-resolution.
- Browser debug state reports whether WebGPU is exposed and whether shared memory is usable; neither is a successful adapter/device test.
- Compressed cube texture mip payloads are summed per face; uncompressed explicit mip estimates retain a conservative RGBA floor.

## Implementation gates
1. Inventory source textures, licenses, color spaces, alpha, normal maps and existing GLB extensions; preserve originals. Encode pilot textures as standardized KTX2 ETC1S (color) or UASTC (normals/high quality) using pinned Basis/KTX tools. Validate files, loader version, hardware format selection and RGBA fallback. Compare visual quality, network size, decoded mip bytes and actual frame time. Do not ship experimental XUASTC until loader support is demonstrated.
2. Test native WebGPU renderer in an independent opt-in harness with matching camera traces, assets, lighting, shadows, water and materials. GL2GPU is a research comparison, not a transparent guarantee. Keep only one rendering backend active.
3. Implement bounded, reusable staging slots; release after GPU submission completion; cancel stale tile requests; use transferable ArrayBuffers if cross-origin isolation is unavailable. SharedArrayBuffer is shared CPU memory, not GPU aliasing. Separate GPUDevices cannot be assumed to share resources. Use timestamp-query only after feature detection; use wall-clock frame timing otherwise.
4. Evaluate temporal upscaling only when motion, depth, jitter, reactive masks and history reset behavior (teleports/scene changes) are valid. Compare spatial baseline first.
5. Local NPC inference must be opt-in. Select a small licensed model with a browser-compatible runtime and quantization format. Account for actual weight buffers, KV cache, workspace, transient copies and model load peaks. Reserve graphics headroom before model loading, bound context and concurrency, cancel work, release only after backend resources are destroyed. Keep deterministic dialogue fallback and simulation state independent of model output. Fractional bit counts are planning estimates, not a claim of a supported packed layout. AI does not control persistent authoritative state without schema validation.
6. Release gates: CI, online/offline browser smoke, save migration, device-loss/recovery, sustained frame p95/p99, peak allocation estimates, hardware measurements, compressed asset quality and deployed Pages checks.

## Reference material
- https://github.com/yudshj/GL2GPU — WWW 2025 research translator.
- https://github.com/BinomialLLC/basis_universal — upstream texture encoder/transcoder; review KTX2 support status.
- https://github.com/Oefenweb/ktx-basis-universal — alternate fork reference; prefer pinned upstream tooling.
- https://threejs.org/docs/pages/KTX2Loader.html — supported-format transcoding interface; match installed Three.js revision.
- https://greggman.github.io/webgpu-memory/ — allocation estimates, not driver-reported VRAM.
- https://github.com/pmndrs/upscaler — temporal reconstruction input contracts.
- https://github.com/huggingface/kernels — Python/PyTorch-oriented kernels, not proof of browser WGSL execution.
- https://github.com/back2matching/turboquant — CUDA/PyTorch KV compression research and benchmarks, not browser performance evidence.
- https://github.com/hannes-sistemica/browser-llm-webgpu — browser inference proof of concept.
- https://www.w3.org/TR/webgpu/ — resource, mapping and queue semantics.
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer — isolation requirements.

No dependency was vendored, model downloaded, asset converted, or GPU hardware benchmark run in this increment. All capacity policies require measurements on target devices.
