#!/usr/bin/env python3
"""Controlled *software Chromium* scene/preset/mode matrix, not iPhone FPS proof.

All scenarios use the same game runtime and locally hosted release, with the
same viewport and a normalized movement interval. These measurements can expose
regressions/relative draw-call costs. Do not equate SwiftShader timings with
Safari/Metal GPU performance or compare the FPS to iPhone absolute values.
"""
import argparse
import json
import threading
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SCENES = [
    ("downtown", "courthouse"),
    ("farmland", "farm"),
    ("woods", "oak"),
    ("riverbank", "riverfront"),
]
PRESETS = [
    ("full", "full", "high"),
    ("balanced", "full", "medium"),
    ("performance", "lite", "low"),
]


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", type=int, default=90, help="Observed frames per condition")
    ap.add_argument("--output", type=Path, default=Path("/tmp/river-valley-performance-matrix.json"))
    args = ap.parse_args()
    if args.frames < 18 or args.frames > 3600:
        ap.error("--frames must be between 18 and 3600")

    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    result = {"schema": "river-valley-scenario-matrix/v1",
              "capturedAt": datetime.now(timezone.utc).isoformat(),
              "renderer": "Chromium SwiftShader (software WebGL)",
              "hardwareComparableToIPhone": False,
              "viewport": {"width": 900, "height": 670, "dpr": 1},
              "frameSamplesPerScenario": args.frames,
              "conditions": []}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True, args=["--no-sandbox", "--use-gl=angle",
                                     "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
            try:
                ctx = browser.new_context(viewport={"width": 900, "height": 670},
                                          device_scale_factor=1)
                page = ctx.new_page()
                errors = []
                page.on("pageerror", lambda err: errors.append(str(err)))
                page.goto(f"http://127.0.0.1:{server.server_port}/game.html",
                          wait_until="domcontentloaded", timeout=60000)
                page.wait_for_function(
                    "() => !!window.RiverValleyDebug && window.RiverValleyDebug.getState().heroSkinned",
                    timeout=60000)
                page.locator("#playBtn").click(timeout=20000)
                for scene, location in SCENES:
                    for name, effect, terrain in PRESETS:
                        for mode in ("walk", "drive"):
                            page.evaluate("""({place,effect,terrain}) => {
                              const debug=window.RiverValleyDebug;
                              debug.teleport(place);
                              for(const [id,value] of [['visualEffects',effect],['terrainDetail',terrain]]){
                                const control=document.getElementById(id);
                                control.value=value;
                                control.dispatchEvent(new Event('change',{bubbles:true}));
                              }
                            }""", {"place": location, "effect": effect, "terrain": terrain})
                            page.locator("#driveBtn" if mode == "drive" else "#walkBtn").click(timeout=30000)
                            # Leave the LOD scheduler enough time to complete a bounded swap
                            # before counting movement frames. Timeout is reported, not hidden.
                            try:
                                page.wait_for_function(
                                    "() => !window.RiverValleyDebug.getState().terrainTransition?.pending",
                                    timeout=15000)
                                settled = True
                            except Exception:
                                settled = False
                            page.evaluate("window.RiverValleyDebug.resetPerformance()")
                            page.keyboard.down("w")
                            try:
                                page.wait_for_function(
                                    "n => window.RiverValleyDebug.getState().performance.samples >= n",
                                    arg=args.frames, timeout=60000)
                            finally:
                                page.keyboard.up("w")
                            report = page.evaluate("window.RiverValleyDebug.capturePerformance()")
                            debug = page.evaluate("window.RiverValleyDebug.getState()")
                            result["conditions"].append({
                                "scene": scene, "location": location, "preset": name,
                                "effect": effect, "terrainDetail": terrain, "mode": mode,
                                "terrainSettledBeforeCapture": settled,
                                "summary": report["summary"], "diagnostics": report["diagnostics"],
                                "drawCallsAtEnd": debug["performance"]["drawCallsMax"],
                                "pixelRatio": debug["pixelRatio"], "x": debug["x"], "z": debug["z"]
                            })
                if errors:
                    raise AssertionError(f"Browser JavaScript exceptions: {errors}")
                result["passed"] = True
                result["scenariosCompleted"] = len(result["conditions"])
                ctx.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": result["passed"], "conditions": result["scenariosCompleted"],
                      "samplesPerCondition": args.frames, "output": str(args.output),
                      "disclaimer": "Software Chromium captures are NOT comparable to iPhone Safari GPU FPS."}))


if __name__ == "__main__":
    main()
