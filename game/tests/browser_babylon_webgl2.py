"""Real Chromium smoke test for the isolated Babylon WebGL2 preview."""
import functools
import http.server
import json
import os
from pathlib import Path
import socketserver
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "dist-babylon"
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
                page.wait_for_function("document.getElementById('status').textContent.includes('WebGL2')", timeout=30000)
                version = page.evaluate("""() => {
                  const canvas = document.getElementById('babylon-world');
                  const gl = canvas.getContext('webgl2');
                  return {webgl2: gl instanceof WebGL2RenderingContext,
                          width: gl.drawingBufferWidth, height: gl.drawingBufferHeight,
                          version: gl.getParameter(gl.VERSION)};
                }""")
                assert version["webgl2"] and version["width"] > 0 and version["height"] > 0, version
                assert not errors, errors
                for setting in ("low", "high", "cinematic"):
                    page.locator("#quality").select_option(setting)
                    assert setting in page.locator("#status").inner_text()
                page.screenshot(path=str(out / f"{name}-webgl2.png"))
                print(json.dumps({"viewport": name, "context": version, "status": "render-smoke-passed"}))
                page.close()
        finally:
            browser.close()
    server.shutdown()
