"""Real Chromium smoke test for the isolated Babylon WebGL2 preview."""
import functools
import io
import wave
import http.server
import json
import os
from pathlib import Path
import socketserver
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(os.environ.get("BABYLON_SITE_DIR", Path(__file__).resolve().parents[1] / "dist-babylon"))
assert (ROOT / "babylon-preview.html").exists(), "Build the Babylon preview before testing"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, format, *args):
        pass

class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

with Server(("127.0.0.1", 0), Handler) as server:
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_port}/babylon-preview.html"
    out = Path(os.environ.get("BABYLON_QA_DIR", tempfile.gettempdir())) / "river-babylon-webgl2"
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=[
            "--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"
        ])
        try:
            for name, viewport in [("desktop", {"width": 1280, "height": 800}),
                                   ("mobile", {"width": 390, "height": 844})]:
                page = browser.new_page(viewport=viewport, device_scale_factor=1)
                errors = []
                page.on("pageerror", lambda err: errors.append(str(err)))
                page.goto(url, wait_until="networkidle", timeout=60000)
                try:
                    page.wait_for_function("document.getElementById('status').textContent.includes('WebGL2') && window.__RIVER_BABYLON_QA__?.frames >= 3 && window.__RIVER_BABYLON_QA__?.activeMeshes > 0", timeout=30000)
                except Exception:
                    print(json.dumps({"startup_failure": name, "errors": errors,
                        "status": page.locator("#status").inner_text(),
                        "qa": page.evaluate("window.__RIVER_BABYLON_QA__ || null")}, default=str))
                    page.screenshot(path=str(out / f"{name}-startup-failure.png"))
                    raise
                version = page.evaluate("""() => {
                  const canvas = document.getElementById('babylon-world');
                  const gl = canvas.getContext('webgl2');
                  return {webgl2: gl instanceof WebGL2RenderingContext,
                          width: gl.drawingBufferWidth, height: gl.drawingBufferHeight,
                          version: gl.getParameter(gl.VERSION), render: window.__RIVER_BABYLON_QA__};
                }""")
                assert version["webgl2"] and version["width"] > 0 and version["height"] > 0 and version["render"]["frames"] >= 3 and version["render"]["meshCount"] >= 3 and version["render"]["activeMeshes"] > 0, version
                # Source-admitted geography is more meaningful than the old fabricated-box mesh count.
                page.wait_for_function("window.__RIVER_BABYLON_QA__?.geography?.state === 'source-plotted'", timeout=30000)
                geo = page.evaluate("window.__RIVER_BABYLON_QA__.geography")
                assert geo["sourceImageryYear"] == 2023, geo
                assert geo["roadSegments"] > 0 and geo["buildingOutlines"] > 0, geo
                assert geo["horizontalCRS"] == "EPSG:4326", geo
                assert geo["verticalDatumVerified"] is False and geo["registered3DTiles"] == 0, geo
                page.wait_for_function("window.__RIVER_BABYLON_QA__?.heroState !== 'loading'", timeout=45000)
                hero = page.evaluate("window.__RIVER_BABYLON_QA__")
                assert hero["heroState"] == "rigged", hero
                assert hero["heroBoneCount"] == 27, hero
                assert hero["heroClipCount"] >= 13, hero
                assert hero["heroPbrMaterials"] >= 1, hero
                assert hero["heroMeshCount"] >= 1, hero
                # Babylon now runs the canonical family game rules, not a separate scoring demo.
                page.wait_for_function("window.__RIVER_BABYLON_QA__?.activities?.rules === 'canonical-ValleyCore'", timeout=10000)
                activities = page.evaluate("window.__RIVER_BABYLON_QA__.activities")
                assert activities["wildlifeSpecies"] == 3 and activities["recipes"] == 6, activities
                for control in ["fishing-cast", "fishing-reel", "farm-action", "cook-action", "hunting-track"]:
                    assert page.locator("#" + control).count() == 1, control
                assert not errors, errors
                for setting in ("low", "high", "cinematic"):
                    page.locator("#quality").select_option(setting)
                    assert setting in page.locator("#status").inner_text()
                # Exercise the actual Babylon game loop, movement and day/night control.
                page.wait_for_function("window.__RIVER_BABYLON_QA__?.playable === true && window.__RIVER_BABYLON_QA__?.playerPosition", timeout=30000)
                start_x = page.evaluate("window.__RIVER_BABYLON_QA__.playerPosition.x")
                if name == "desktop":
                    page.locator("#babylon-world").click(position={"x": 700, "y": 500})
                    page.keyboard.down("a")
                    page.wait_for_timeout(1300)
                    page.keyboard.up("a")
                else:
                    left = page.locator('[data-move="left"]')
                    left.scroll_into_view_if_needed()
                    bounds = left.bounding_box()
                    page.mouse.move(bounds["x"] + bounds["width"]/2, bounds["y"] + bounds["height"]/2)
                    page.mouse.down()
                    page.wait_for_timeout(1300)
                    page.mouse.up()
                end_x = page.evaluate("window.__RIVER_BABYLON_QA__.playerPosition.x")
                assert end_x < start_x - 0.1, {"viewport": name, "start": start_x, "end": end_x}
                # Walk to the actual river activity marker and cast via visible game controls.
                # Keep the original 1100ms real-time bite/tension contract in unit tests.
                # SwiftShader may render far below display refresh rate. Move in bounded
                # increments and observe actual game position, not elapsed wall time.
                reached_pier = False
                for _ in range(24):
                    if page.locator("#fishing-cast").is_enabled():
                        reached_pier = True
                        break
                    position_x = page.evaluate("window.__RIVER_BABYLON_QA__.playerPosition.x")
                    if position_x <= -54:
                        break  # Never keep walking outside the pier's activation radius.
                    if name == "desktop":
                        page.keyboard.down("a")
                        page.wait_for_timeout(600)
                        page.keyboard.up("a")
                    else:
                        left = page.locator('[data-move="left"]')
                        bounds = left.bounding_box()
                        page.mouse.move(bounds["x"] + bounds["width"]/2, bounds["y"] + bounds["height"]/2)
                        page.mouse.down()
                        page.wait_for_timeout(600)
                        page.mouse.up()
                    page.wait_for_timeout(200)
                reached_pier = reached_pier or page.locator("#fishing-cast").is_enabled()
                assert reached_pier, {"device": name, "player": page.evaluate(
                    "window.__RIVER_BABYLON_QA__.playerPosition"), "activity": page.evaluate(
                    "window.__RIVER_BABYLON_QA__.activities")}

                page.locator("#gameplay-panel").evaluate("(panel) => panel.open = true")
                page.locator("#fishing-cast").click()
                assert "cast" in page.locator("#activity-result").inner_text().lower()
                assert "fishing" in page.locator("#activity-cue").inner_text().lower()
                page.locator("#cycle-time").click()
                page.wait_for_function("window.__RIVER_BABYLON_QA__.hour === 21", timeout=10000)
                assert "night" in page.locator("#adventure-status").inner_text()
                # Real WAV audio fixture exercises session-local File API and HTMLAudioElement playback.
                audio_buffer = io.BytesIO()
                with wave.open(audio_buffer, "wb") as wav:
                    wav.setnchannels(1)
                    wav.setsampwidth(2)
                    wav.setframerate(22050)
                    wav.writeframes(b"\\x00\\x00" * 22050)
                page.locator("#media-panel").evaluate("(panel) => panel.open = true")
                page.locator("#soundtrack-input").set_input_files({
                    "name": "qa-tone.wav", "mimeType": "audio/wav", "buffer": audio_buffer.getvalue()
                })
                assert "1 local track" in page.locator("#soundtrack-status").inner_text()
                page.locator("#soundtrack-play").click()
                page.wait_for_function("document.getElementById('soundtrack-player').currentTime > 0.05", timeout=10000)
                page.locator("#soundtrack-stop").click()
                assert page.locator("#soundtrack-player").evaluate("(audio) => audio.paused")
                page.screenshot(path=str(out / f"{name}-webgl2.png"))
                print(json.dumps({"viewport": name, "context": version, "status": "render-smoke-passed"}))
                page.close()
        finally:
            browser.close()
    server.shutdown()
