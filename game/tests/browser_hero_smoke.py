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
    assert state()["heroBoneCount"] >= 27
    assert state()["heroClipCount"] >= 9
    assert state()["heroTexturedMeshes"] >= 6, "Character material maps missing"
    page.wait_for_function(
        "() => {const t=window.RiverValleyDebug.getState().heroEmbeddedTextures;"
        "return !!t && t.expected===8 && t.loaded===8 && t.failed===0;}",
        timeout=45_000,
    )
    assert state()["heroEmbeddedTextures"]["loaded"] == 8, "Baked GLB images never reached the playable skinned materials"
    assert state()["heroGaiterPrintReady"] is True, "Skull-print fabric not rendered"
    assert state()["heroFootContacts"] is not None, "Terrain contact solver missing"
    assert state()["groundShadowReady"] is True, "Player contact shadow mesh missing"
    assert state()["motionState"] is not None, "Kinematic locomotion controller missing"
    assert state()["heroHeightOffset"] == 0, "Explorer starts floating above the ground"
    assert page.locator("#touchJump").count() == 1, "Touch jump control unavailable"

    page.locator("#playBtn").click(timeout=15_000)
    page.wait_for_function(
        "() => window.RiverValleyDebug.getState().started === true",
        timeout=15_000,
    )
    page.locator("#settingsBtn").click(timeout=12_000)
    # Quality settings must swap the actual playable skinned GLB, not merely its label.
    target = "LOD1" if mobile else "LOD0"
    assert state()["heroLOD"] == target, "Incorrect default gameplay character LOD"
    for quality,expected in (("cinematic","LOD0"),("lite","LOD2"),("full",target)):
        page.locator("#visualEffects").select_option(quality,timeout=15_000)
        page.wait_for_function(
            "(expected) => window.RiverValleyDebug.getState().heroLOD === expected",
            arg=expected,timeout=20_000,
        )
        assert state()["heroSkinned"] is True, "LOD swap activated the blocky procedural fallback"
    page.locator("#heroStudioOpen").click(timeout=12_000)
    page.wait_for_function(
        "() => { const state = window.RiverValleyDebug.getState(); "
        "return state.heroInspection && state.heroPreviewReady; }",
        timeout=15_000,
    )
    assert page.locator("#heroStudio").is_visible()
    page.wait_for_function(
        "() => {const t=window.RiverValleyDebug.getState().heroStudioEmbeddedTextures;"
        "return !!t && t.expected===8 && t.loaded===8 && t.failed===0;}",
        timeout=45_000,
    )
    page.locator("#heroShowSkeleton").check(timeout=15_000)
    assert state()["heroRigOverlay"] is True, "Studio skeleton overlay did not activate"
    assert state()["heroStudioSkeletonBones"] == 27, "Skeleton inspector must observe all 27 real bones"
    assert state()["heroBoneCount"] == 27, "Live rig differs from claimed GLB bone count"
    prefix = "mobile" if mobile else "desktop"
    page.screenshot(path=str(OUT / f"{prefix}-27-joint-live-skeleton.png"))
    page.locator("#heroShowSkeleton").uncheck(timeout=15_000)
    assert state()["heroRigOverlay"] is False, "Skeleton overlay leaked into normal render"
    assert page.locator("#touchControls").is_hidden() if mobile else True

    prefix = "mobile" if mobile else "desktop"
    page.screenshot(path=str(OUT / f"{prefix}-studio-idle.png"))
    for angle in ["front", "three-quarter", "side", "back"]:
        page.locator("#heroAngle").select_option(angle)
        page.wait_for_function(
            "(expected) => window.RiverValleyDebug.getState().heroPreviewAngle === expected",
            arg=angle, timeout=15000,
        )
        page.evaluate("document.getElementById('heroStudio').style.opacity='0'")
        page.wait_for_timeout(120)
        page.screenshot(path=str(OUT / f"{prefix}-river-{angle}-turnaround.png"))
        page.evaluate("document.getElementById('heroStudio').style.opacity=''")
    page.locator("#heroAngle").select_option("front")
    page.locator("#heroStudioToggle").click()
    assert page.locator("#heroStudio").evaluate("(el) => el.classList.contains('is-minimized')")
    page.screenshot(path=str(OUT / f"{prefix}-river-controls-collapsed.png"))
    page.locator("#heroStudioToggle").click()
    assert not page.locator("#heroStudio").evaluate("(el) => el.classList.contains('is-minimized')")

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
        if pose in ("fish", "cook", "hunt"):
            page.locator("#heroFocus").select_option("right-hand")
            page.wait_for_function(
                "() => window.RiverValleyDebug.getState().heroPreviewFocus === 'right-hand'",
                timeout=10_000,
            )
            page.screenshot(path=str(OUT / f"{prefix}-rig-{pose}-right-hand.png"))
            # Suppress only the DOM pose controls while preserving the active
            # 3D inspector render; capture the actual skinned fingers unobscured.
            page.evaluate("document.getElementById('heroStudio').style.opacity='0'")
            page.wait_for_timeout(160)
            page.screenshot(path=str(OUT / f"{prefix}-rig-{pose}-grip-clean.png"))
            page.evaluate("document.getElementById('heroStudio').style.opacity=''")
        elif pose == "sprint":
            page.locator("#heroFocus").select_option("boots")
            page.screenshot(path=str(OUT / f"{prefix}-rig-sprint-boots.png"))
            page.evaluate("document.getElementById('heroStudio').style.opacity='0'")
            page.wait_for_timeout(160)
            page.screenshot(path=str(OUT / f"{prefix}-rig-sprint-boots-clean.png"))
            page.evaluate("document.getElementById('heroStudio').style.opacity=''")
    # Visually inspect the CURRENT skinned, self-contained GLB against the
    # user-supplied face-covering and glasses reference sheets.
    page.locator("#heroFocus").select_option("face")
    page.locator("#heroPose").select_option("idle")
    page.wait_for_function(
        "() => window.RiverValleyDebug.getState().heroPreviewFocus === 'face'",
        timeout=10000,
    )
    page.screenshot(path=str(OUT / f"{prefix}-river-face-covering.png"))
    page.evaluate("document.getElementById('heroStudio').style.opacity='0'")
    page.wait_for_timeout(160)
    page.screenshot(path=str(OUT / f"{prefix}-river-face-clean.png"))
    page.evaluate("document.getElementById('heroStudio').style.opacity=''")
    page.locator("#heroFocus").select_option("full")
    page.locator("#heroPose").select_option("idle")
    page.wait_for_timeout(350)
    page.screenshot(path=str(OUT / f"{prefix}-studio-reset.png"))
    # Import the genuine second-quality skinned GLB via the same local file picker
    # used on iPhone Safari, then verify the gameplay model actually changes.
    page.locator("#customHeroFile").set_input_files(str(ROOT / "assets/models/river_explorer_lod2.glb"))
    page.wait_for_function(
        "() => window.RiverValleyDebug.getState().heroCustomGLB === true",
        timeout=20_000,
    )
    assert state()["heroSkinned"] is True
    assert state()["heroLOD"] == "CUSTOM"
    assert state()["heroBoneCount"] == 27
    assert state()["heroClipCount"] == 13
    page.screenshot(path=str(OUT / f"{prefix}-local-import-rigged-playable.png"))
    page.locator("#clearCustomHero").click(timeout=15_000)
    page.wait_for_function(
        "() => window.RiverValleyDebug.getState().heroCustomGLB === false",
        timeout=20_000,
    )
    assert state()["heroSkinned"] is True, "Restoring the built-in game rig failed"
    page.locator("#heroStudioClose").click(timeout=10_000)
    assert state()["heroInspection"] is False
    # User-supplied collectible references have eight original wardrobe prototypes,
    # but family/memorial sets never masquerade as playable character models.
    page.locator("#familyCastOpen").click(timeout=12_000)
    assert page.locator("#familyCastPanel").is_visible()
    assert page.locator("#familyCastGrid .familyCastCard").count() == 10
    assert page.locator("#familyCastGrid .castPrototypeSelect").count() == 8
    page.locator("#familyCastGrid .castPrototypeSelect").first.click(timeout=12_000)
    page.wait_for_function(
        "() => window.RiverValleyDebug.getState().castPrototypeId === 'pete-yeida'",
        timeout=20_000,
    )
    assert state()["heroSkinned"] is True, "Family prototype destroyed the animation rig"
    assert state()["heroBoneCount"] == 27
    page.screenshot(path=str(OUT / f"{prefix}-pete-yeida-prototype-selection.png"))
    page.locator("#familyCastOriginal").click(timeout=12_000)
    page.wait_for_function(
        "() => window.RiverValleyDebug.getState().castPrototypeId === null",
        timeout=20_000,
    )
    page.locator("#familyCastClose").click(timeout=12_000)
    assert page.locator("#familyCastPanel").is_hidden()
    # County guide is a real source-backed map over the same playable engine.
    assert state()["countyBoundaryVertices"] >= 150
    page.locator("#countyBtn").click(timeout=12_000)
    assert page.locator("#countyPanel").is_visible()
    assert page.locator("#countyRegionList [data-region]").count() == 5
    page.screenshot(path=str(OUT / f"{prefix}-posey-county-atlas.png"))
    page.locator('#countyRegionList [data-region="new-harmony"]').click(timeout=10_000)
    page.locator("#countyVisit").click(timeout=10_000)
    assert state()["countyRegion"] == "new-harmony"
    assert "new-harmony" in state()["countyVisited"]
    assert state()["countyVignettes"]["regionVignettes"] == 4
    page.screenshot(path=str(OUT / f"{prefix}-new-harmony-vignette.png"))
    page.locator("#scoutBtn").click(timeout=12_000)
    assert page.locator("#scoutPanel").is_visible()
    page.locator('#scoutPanel [data-scout="pet"]').click(timeout=10_000)
    assert state()["scoutBond"] >= 1
    page.locator("#scoutClose").click(timeout=10_000)
    page.locator("#driveBtn").click(timeout=12_000)
    page.wait_for_function(
        "() => { const state = window.RiverValleyDebug.getState(); "
        "return state.mode === 'drive' && state.heroState === 'drive'; }",
        timeout=15_000,
    )
    assert not issues, f"Uncaught page errors: {issues}"
    return dict(mobile=mobile, webgl=True, heroModel=True, heroParts=state()["heroParts"], heroSkinned=state()["heroSkinned"], heroClips=state()["heroClipCount"],
                studioOpened=True, posesTested=5, countyAtlasVerified=True, countyVignettes=4, scoutBondTested=True, driveWorks=True,
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
