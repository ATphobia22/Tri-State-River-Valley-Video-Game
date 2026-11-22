"""Verify real installed offline PWA gameplay, save slots, county travel and Scout.

Runs only against a local static file server and never requires an internet
connection, API key or developer-mode browser extension. Uses the browser's
actual service worker and CacheStorage rather than assuming an asset is cached
because a script contains its filename.

Examples:
  python game/tests/offline_pwa_smoke.py --site-dir game --entry game.html
  python game/tests/offline_pwa_smoke.py --site-dir _site --entry index.html
"""
from __future__ import annotations

import argparse
import json
import re
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

DEFAULT_ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args: object) -> None:
        return


def run(site_dir: Path, entry: str) -> dict:
    site_dir = site_dir.resolve()
    if entry not in {"game.html", "index.html"}:
        raise ValueError("Only the hosted or Pages-root game entry may be tested")
    if not (site_dir / entry).is_file():
        raise FileNotFoundError(f"Game entry missing: {site_dir / entry}")
    worker_path = site_dir / "game-sw.js"
    worker = worker_path.read_text(encoding="utf-8")
    match = re.search(r"const CACHE='([^']+)'", worker)
    if not match or not match.group(1).startswith("rva-game-"):
        raise AssertionError("Worker lacks a current versioned offline cache")
    cache_name = match.group(1)

    httpd = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(site_dir))
    )
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{httpd.server_port}/{entry}"
    errors: list[str] = []
    report = {"entry": entry, "cache": cache_name, "url": url, "networkDisabled": False}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--use-gl=angle",
                    "--use-angle=swiftshader",
                    "--enable-unsafe-swiftshader",
                ],
            )
            try:
                context = browser.new_context(
                    viewport={"width": 980, "height": 720},
                    service_workers="allow",
                )
                page = context.new_page()
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_function(
                    "() => !!window.RiverValleyDebug && !!document.querySelector('#playBtn')",
                    timeout=60000,
                )
                # Await the actual, activated worker and *its* cached navigation.
                page.wait_for_function(
                    """async expected => {
                      const reg = await navigator.serviceWorker.ready;
                      const storage = await caches.open(expected);
                      const response = await storage.match(location.pathname);
                      return !!reg.active && !!response && response.ok;
                    }""",
                    arg=cache_name,
                    timeout=60000,
                )
                report["cachedHtml"] = True
                page.locator("#playBtn").click(timeout=15000)
                page.wait_for_function(
                    "() => window.RiverValleyDebug.getState().started === true",
                    timeout=20000,
                )
                page.locator("#countyBtn").click(timeout=15000)
                page.locator(
                    '#countyRegionList [data-region="new-harmony"]'
                ).click(timeout=15000)
                page.locator("#countyVisit").click(timeout=15000)
                page.wait_for_function(
                    "() => window.RiverValleyDebug.getState().countyRegion === 'new-harmony'",
                    timeout=15000,
                )
                page.locator("#scoutBtn").click(timeout=15000)
                if not page.locator("#scoutPanel").is_visible():
                    raise AssertionError("Scout commands missing from playable game")
                page.locator('#scoutPanel [data-scout="pet"]').click(timeout=15000)
                page.wait_for_function(
                    "() => window.RiverValleyDebug.getState().scoutBond >= 1",
                    timeout=15000,
                )
                report["onlineCountyAndScout"] = True
                page.locator("#scoutClose").click(timeout=15000)

                # This is the evidence: a *new* navigation without a network.
                context.set_offline(True)
                report["networkDisabled"] = True
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_function(
                    "() => !!window.RiverValleyDebug && !!document.querySelector('#resumeBtn')",
                    timeout=60000,
                )
                if not page.locator("#resumeBtn").is_enabled():
                    raise AssertionError("Saved adventure did not survive offline reload")
                page.locator("#resumeBtn").click(timeout=20000)
                page.wait_for_function(
                    "() => window.RiverValleyDebug.getState().started === true",
                    timeout=20000,
                )
                state = page.evaluate("window.RiverValleyDebug.getState()")
                if state["countyRegion"] != "new-harmony":
                    raise AssertionError("County location was not restored offline")
                if "new-harmony" not in state["countyVisited"]:
                    raise AssertionError("County exploration progress was lost")
                if state["scoutBond"] < 1:
                    raise AssertionError("Scout bond did not persist after offline restart")
                if page.locator("#countyBtn").count() != 1:
                    raise AssertionError("County atlas unavailable offline")
                if errors:
                    raise AssertionError(f"Uncaught browser exceptions: {errors}")
                report.update(
                    offlineStarted=True,
                    countyRegion=state["countyRegion"],
                    scoutBond=state["scoutBond"],
                    countyVisited=state["countyVisited"],
                    renderMode=state["renderMode"],
                    pageErrors=errors,
                )
            finally:
                browser.close()
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=5)
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-dir", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--entry", choices=("game.html", "index.html"), default="game.html")
    args = parser.parse_args()
    result = run(args.site_dir, args.entry)
    print(json.dumps({"passed": True, "offlineReplay": result}, indent=2))


if __name__ == "__main__":
    main()
