"""Applied Nerfstudio Splatfacto / nerfacto configuration presets for River Valley.

Incorporates documented Splatfacto and Nerfacto options from Nerfstudio docs:
- splatfacto / splatfacto-big
- cull_alpha_thresh, continue_cull_post_densification, use_scale_regularization
- FullImageDatamanager, COLMAP SfM point initialization
- nerfacto / nerfacto-big / nerfacto-huge
"""
from __future__ import annotations
from typing import Any

SPLATFACTO_DEFAULT = {
    "method": "splatfacto",
    "max_num_iterations": 30000,
    "pipeline.model.cull_alpha_thresh": 0.1,
    "pipeline.model.continue_cull_post_densification": True,
    "pipeline.model.use_scale_regularization": False,
    "pipeline.model.background_color": "random",
    "pipeline.model.warmup_length": 500,
    "pipeline.model.refine_every": 100,
    "pipeline.datamanager.dataparser.load_3D_points": True,
    "viewer.quit-on-train-completion": True,
}

SPLATFACTO_HIGH_QUALITY = {
    **SPLATFACTO_DEFAULT,
    "method": "splatfacto-big",
    "pipeline.model.cull_alpha_thresh": 0.005,
    "pipeline.model.continue_cull_post_densification": False,
    "pipeline.model.use_scale_regularization": True,
}

NERFACTO_DEFAULT = {
    "method": "nerfacto",
    "max_num_iterations": 30000,
    "mixed_precision": True,
    "pipeline.model.eval_num_rays_per_chunk": 1 << 15,
    "viewer.quit-on-train-completion": True,
}

NERFACTO_HUGE = {
    **NERFACTO_DEFAULT,
    "method": "nerfacto-huge",
    "max_num_iterations": 40000,
}

PRESETS = {
    "gsplat": SPLATFACTO_DEFAULT,
    "gsplat-hq": SPLATFACTO_HIGH_QUALITY,
    "nerfacto": NERFACTO_DEFAULT,
    "nerfacto-huge": NERFACTO_HUGE,
}

def build_ns_train_argv(preset: str, data: str, output_dir: str, max_iters: int | None = None) -> list[str]:
    if preset not in PRESETS and preset not in ("gsplat", "nerfacto"):
        raise ValueError(f"Unknown appearance preset: {preset}")
    key = "gsplat" if preset == "gsplat" else preset
    cfg = dict(PRESETS.get(key, SPLATFACTO_DEFAULT))
    method = cfg.pop("method")
    if max_iters is not None:
        cfg["max_num_iterations"] = max_iters
    argv = ["ns-train", method, "--data", data, "--output-dir", output_dir]
    for k, v in cfg.items():
        if isinstance(v, bool):
            argv.extend([f"--{k}", str(v)])
        else:
            argv.extend([f"--{k}", str(v)])
    return argv

def describe_presets() -> dict[str, Any]:
    return {name: dict(cfg) for name, cfg in PRESETS.items()}
