#!/usr/bin/env python3
"""Allowlisted, repeatable Nerfstudio train profiles for review-only scene appearance.

Never starts a GPU job from import. Splatfacto models are appearance representations,
not a source of collision meshes or physical survey measurements.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

# Approximate GPU RAM values are published Nerfstudio figures for Splatfacto.
# Nerfacto requirements vary with dataset and CUDA/PyTorch versions.
PROFILES = {
    "nerfacto-preview": {
        "method": "nerfacto", "iterations": 2500,
        "approx_gpu_gb": None, "tier": "fast visual diagnostic",
        "method_flags": (),
    },
    "splatfacto-balanced": {
        "method": "splatfacto", "iterations": 15000,
        "approx_gpu_gb": 6, "tier": "interactive scene appearance",
        "method_flags": (),
    },
    "splatfacto-cinematic": {
        "method": "splatfacto-big", "iterations": 30000,
        "approx_gpu_gb": 12, "tier": "cinematic appearance review",
        "method_flags": (
            "--pipeline.model.cull_alpha_thresh=0.005",
            "--pipeline.model.continue_cull_post_densification=False",
        ),
    },
}


def profile_for_appearance(appearance):
    if appearance == "nerfacto":
        return "nerfacto-preview"
    if appearance == "gsplat":
        return "splatfacto-balanced"
    raise ValueError("Expected Nerfacto or gsplat appearance engine")


def training_command(dataset, output_dir, profile,
                     *, max_iterations=None, eval_mode="fraction",
                     train_split_fraction=0.9, eval_interval=8):
    if profile not in PROFILES:
        raise ValueError(f"Unknown Nerfstudio profile: {profile}")
    p = PROFILES[profile]
    iterations = p["iterations"] if max_iterations is None else max_iterations
    if not isinstance(iterations, int) or not 100 <= iterations <= 100000:
        raise ValueError("Nerfstudio iteration budget must be 100..100000")
    if eval_mode not in ("fraction", "interval", "filename"):
        raise ValueError("Evaluation split must hold out identifiable views")
    if not isinstance(train_split_fraction, (float, int)) or not (
        0.5 <= train_split_fraction <= 0.95
    ):
        raise ValueError("Nerfstudio training fraction must be 0.5..0.95")
    if not isinstance(eval_interval, int) or not 2 <= eval_interval <= 100:
        raise ValueError("Nerfstudio evaluation interval must be 2..100")
    data = str(Path(dataset).resolve())
    output = str(Path(output_dir).resolve())
    args = [
        "ns-train", p["method"],
        "--vis", "tensorboard",  # local logs, not a public training viewer
        "--output-dir", output,
        "--experiment-name", "river-valley-appearance",
        "--max-num-iterations", str(iterations),
        *p["method_flags"],
        "--data", data,
        "nerfstudio-data",
        "--eval-mode", eval_mode,
    ]
    if eval_mode == "fraction":
        args += ["--train-split-fraction", format(float(train_split_fraction), ".3g")]
    elif eval_mode == "interval":
        args += ["--eval-interval", str(eval_interval)]
    return args


def describe_profiles():
    return {name: {
        "method": item["method"],
        "iterations": item["iterations"],
        "approx_gpu_gb": item["approx_gpu_gb"],
        "tier": item["tier"],
        "requires_cuda": True,
        "runtime": "EXTERNAL_COMPUTE_ONLY",
        "automatic_game_promotion": False,
    } for name, item in PROFILES.items()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--profile", choices=sorted(PROFILES))
    parser.add_argument("--dataset", type=Path)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--iterations", type=int)
    parser.add_argument("--eval-mode", choices=("fraction", "interval", "filename"),
                        default="fraction")
    args = parser.parse_args()
    if args.list:
        print(json.dumps(describe_profiles(), indent=2))
        return
    if not args.profile or not args.dataset or not args.output_dir:
        parser.error("Provide --profile, --dataset and --output-dir, or --list")
    print(json.dumps({
        "command": training_command(args.dataset, args.output_dir, args.profile,
                                    max_iterations=args.iterations,
                                    eval_mode=args.eval_mode),
        "profile": args.profile, "status": "PLAN_ONLY_NOT_EXECUTED",
    }, indent=2))


if __name__ == "__main__":
    main()
