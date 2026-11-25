# Optional local NPC inference pilot

This opt-in guide is independent of authoritative gameplay and saves. It is not a required game dependency.

- Runtime: Transformers.js 3.8.1, pinned documented browser distribution via jsDelivr.
- Model: onnx-community/SmolLM2-135M-Instruct-ONNX, revision b8a5c0f183b78c55955a5364f610c36668b5e681, q4 ONNX weights (180,581,125 bytes per model API), source model HuggingFaceTB/SmolLM2-135M-Instruct (Apache-2.0). Runtime and tokenizer downloads add to the weight size.
- No automatic model, runtime or worker allocation at boot. The player must consent and click Ask. Secure hosted browsers only. CPU/Wasm or WebGPU selected explicitly; WebGPU capability exposure is not proof of a working adapter.
- The worker uses the browser's local generation pipeline; no hosted inference endpoint is called. The third-party runtime and model host are contacted for asset downloads. Do not include confidential input in the experimental guide. Third-party runtime bytes are version-pinned but not independently vendored or SRI-verified here.
- Limit question to 256 characters, game context to 700, generated tokens to 48, displayed answer to 600 characters, one request at a time. Treat output as untrusted text, never HTML or state mutations. Terminate on completion, cancel, error, timeout or page exit. Keep deterministic game guide fallback.
- Provisional application planning cap: 1 GiB, reserve 384 MiB for graphics and 512 MiB per model job. Estimate scene allocation plus framebuffer overhead before admission, recheck during rendering, and reduce internal rendering scale under sustained compute pressure. These are not physical VRAM measurements or hard GPU allocation guarantees.
- Offline HTML remains self-contained for the base game; optional model runtime is not guaranteed offline. Model cache is browser-managed and may be evicted.
- Release gates: verify pinned runtime and model license/security, successful live inference on real WebGPU and CPU/Wasm devices, memory peaks and recovery, network privacy and user consent, cancellation and fallback, browser rendering and saved-game regression. Do not claim a model benchmark or successful inference solely from mocked controller tests.

References: https://huggingface.co/docs/transformers.js/installation ; https://huggingface.co/docs/transformers.js/en/guides/dtypes ; https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX ; https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct .
