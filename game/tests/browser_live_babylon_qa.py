"""Independent HTTPS-site Chromium smoke test; no geographic admission implied."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

URL = "https://atphobia22.github.io/Tri-State-River-Valley-Video-Game/babylon/babylon-preview.html"


def validate_url(value):
    parsed = urlsplit(value)
    expected = urlsplit(URL)
    if (parsed.scheme, parsed.netloc, parsed.path, parsed.query, parsed.fragment) != (
        expected.scheme, expected.netloc, expected.path, "", ""
    ):
        raise ValueError("QA target must be the known public Babylon Pages URL")
    return value


def verify(page, device, output):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    response = page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    assert response is not None and response.status == 200, "Public preview must return HTTP 200"
    page.wait_for_function("""() => {
        const q = window.__RIVER_BABYLON_QA__;
        return q?.frames >= 5 && q.activeMeshes > 0 && q.playable === true && q.playerPosition;
    }""", timeout=45000)
    data = page.evaluate("""() => {
        const gl = document.getElementById('babylon-world')?.getContext('webgl2');
        const q = window.__RIVER_BABYLON_QA__;
        return { webgl2: gl instanceof WebGL2RenderingContext, frames: q.frames,
          activeMeshes: q.activeMeshes, meshCount: q.meshCount,
          playerPosition: q.playerPosition, status: document.getElementById('status')?.textContent };
    }""")
    assert data["webgl2"] and data["meshCount"] >= 25, (device, data)
    assert "registered tiles: 0" in data["status"], "Unregistered tiles must remain absent"
    start = data["playerPosition"]["x"]
    if device == "mobile":
        button = page.locator('[data-move="left"]')
        button.scroll_into_view_if_needed()
        bounds = button.bounding_box()
        assert bounds is not None
        x, y = bounds["x"] + bounds["width"] / 2, bounds["y"] + bounds["height"] / 2
        cdp = page.context.new_cdp_session(page)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"id": 1, "x": x, "y": y}]})
        try:
            page.wait_for_timeout(1100)
        finally:
            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    else:
        page.locator("#babylon-world").click(position={"x": 700, "y": 500})
        page.keyboard.down("a")
        try:
            page.wait_for_timeout(1100)
        finally:
            page.keyboard.up("a")
    end = page.evaluate("window.__RIVER_BABYLON_QA__.playerPosition.x")
    assert end < start - 0.1, (device, start, end)
    page.locator("#cycle-time").click()
    page.wait_for_function("window.__RIVER_BABYLON_QA__?.hour === 21", timeout=10000)
    assert "night" in page.locator("#adventure-status").inner_text()
    assert not errors, (device, errors)
    output.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(output / (device + "-live-webgl2.png")), full_page=True)
    return {"device": device, "url": URL, "http": response.status, "renderer": data,
            "movement_delta_x": end - start, "night": True, "errors": errors}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=URL)
    parser.add_argument("--output", default="live-babylon-evidence")
    args = parser.parse_args()
    validate_url(args.url)
    output = Path(args.output)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=[
            "--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist"
        ])
        try:
            records = []
            for name, viewport in [("desktop", {"width": 1280, "height": 800}),
                                   ("mobile", {"width": 390, "height": 844})]:
                context = browser.new_context(viewport=viewport, is_mobile=name == "mobile",
                                              has_touch=name == "mobile")
                try:
                    records.append(verify(context.new_page(), name, output))
                finally:
                    context.close()
            (output / "report.json").write_text(json.dumps(records, indent=2))
            print(json.dumps({"status": "passed", "devices": [r["device"] for r in records]}))
        finally:
            browser.close()


if __name__ == "__main__":
    main()
