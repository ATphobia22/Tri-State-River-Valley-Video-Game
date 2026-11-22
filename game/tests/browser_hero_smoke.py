"""Headless Chromium acceptance test of the actual self-contained Three.js game.

Requires playwright + local browser dependencies. Runs with software WebGL, which
proves browser initialization but NOT GPU hardware frame-rate performance.
"""
from __future__ import annotations

import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("RVA_BROWSER_ARTIFACTS", "/tmp/river-hero-visual-qa"))
OUT.mkdir(parents=True, exist_ok=True)


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        return


def inspect(page, *, mobile: bool):
    issues = []
    page.on("pageerror", lambda exc: issues.append(str(exc)))
    page.goto(f"{SERVER_URL}/game.html", wait_until="domcontentloaded", timeout=55_000)
    page.wait_for_function(
        "() => !!window.RiverValleyDebug && window.RiverValleyDebug.getState().heroModel",
        timeout=55_000,
    )
    state = lambda: page.evaluate("window.RiverValleyDebug.getState()")
    assert state()["renderMode"] == "webgl", "WebGL fallback cannot validate hero stage"
    assert state()["heroParts"] >= 10
    assert state()["heroSkinned"] is True, "Rigged GLB did not instantiate: procedural fallback used"
    assert state()["heroBoneCount"] >= 17
    assert state()["heroClipCount"] >= 9

    page.locator("#playBtn").click(timeout=15_000)
    page.wait_for_function(
        "() => window.RiverValleyDebug.getState().started === true",
        timeout=15_000,
    )
    page.locator("#settingsBtn").click(timeout=12_000)
    page.locator("#heroStudioOpen").click(timeout=12_000)
    page.wait_for_function(
        "() => { const state = window.RiverValleyDebug.getState(); "
        "return state.heroInspection && state.heroPreviewReady; }",
        timeout=15_000,
    )
    assert page.locator("#heroStudio").is_visible()
    assert page.locator("#touchControls").is_hidden() if mobile else True

    prefix = "mobile" if mobile else "desktop"
    page.screenshot(path=str(OUT / f"{prefix}-studio-idle.png"))
    for pose in ["fish", "cook", "hunt", "sprint", "drive"]:
        page.locator("#heroPose").select_option(pose)
        # On software WebGL in GitHub Actions, a frame can exceed 100 ms.
        # Require the rendered game state to reach the desired pose, rather
        # than relying on an arbitrary wall-clock delay.
        page.wait_for_function(
            "(expected) => window.RiverValleyDebug.getState().heroState === expected",
            arg=pose,
            timeout=15_000,
        )
    page.locator("#heroPose").select_option("idle")
    page.wait_for_timeout(350)
    page.screenshot(path=str(OUT / f"{prefix}-studio-reset.png"))
    page.locator("#heroStudioClose").click(timeout=10_000)
    assert state()["heroInspection"] is False
    page.locator("#driveBtn").click(timeout=12_000)
    page.wait_for_function(
        "() => { const state = window.RiverValleyDebug.getState(); "
        "return state.mode === 'drive' && state.heroState === 'drive'; }",
        timeout=15_000,
    )
    assert not issues, f"Uncaught page errors: {issues}"
    return dict(mobile=mobile, webgl=True, heroModel=True, heroParts=state()["heroParts"], heroSkinned=state()["heroSkinned"], heroClips=state()["heroClipCount"],
                studioOpened=True, posesTested=5, driveWorks=True,
                pageErrors=issues, screenshotFolder=str(OUT))


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(ROOT)))
    SERVER_URL = f"http://127.0.0.1:{server.server_port}"
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=[
                "--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
            ])
            try:
                checks = []
                for mobile, size in ((False, (900, 670)), (True, (390, 844))):
                    context = browser.new_context(
                        viewport={"width": size[0], "height": size[1]},
                        device_scale_factor=1, is_mobile=mobile, has_touch=mobile,
                    )
                    try:
                        checks.append(inspect(context.new_page(), mobile=mobile))
                    finally:
                        context.close()
                print(json.dumps({"passed": True, "results": checks}, indent=2))
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
