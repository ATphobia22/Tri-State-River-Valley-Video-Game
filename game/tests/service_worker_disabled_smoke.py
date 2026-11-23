"""Browser smoke: no service-worker registrations, no game caches, local saves survive a normal online reload.

Run against a freshly built hosted game or Pages-root site. The standalone
downloaded HTML remains playable without networking; the hosted site does not.
"""
from __future__ import annotations
import argparse
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args: object) -> None:
        pass


def run(site_dir: Path, entry: str) -> dict:
    site_dir = site_dir.resolve()
    if entry not in {"game.html", "index.html"}:
        raise ValueError("Only hosted game or Pages-root entry may be tested")
    html_path = site_dir / entry
    if not html_path.is_file():
        raise FileNotFoundError(str(html_path))
    html = html_path.read_text(encoding="utf-8")
    if "serviceWorker.register(" in html:
        raise AssertionError("Hosted game still registers a service worker")
    if "serviceWorker.getRegistrations()" not in html:
        raise AssertionError("Hosted game is missing cleanup of earlier registrations")
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(site_dir)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_port}/{entry}"
    errors: list[str] = []
    report = {"entry": entry, "url": url, "serviceWorkersDisabled": False}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
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
                async_check = """async () => {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    const scope = new URL('./', location.href).href;
                    const names = await caches.keys();
                    return {
                        registrations: regs.filter(r => r.scope === scope).length,
                        controlled: !!navigator.serviceWorker.controller,
                        legacyCaches: names.filter(n => n.startsWith('rva-game-') ||
                            n.startsWith('river-valley-family-'))
                    };
                }"""
                def assert_disabled() -> None:
                    state = page.evaluate(async_check)
                    if state["registrations"] or state["controlled"] or state["legacyCaches"]:
                        raise AssertionError(f"Service worker still active: {state}")
                assert_disabled()
                page.locator("#playBtn").click(timeout=15000)
                page.wait_for_function(
                    "() => window.RiverValleyDebug.getState().started === true",
                    timeout=20000,
                )
                page.locator("#countyBtn").click(timeout=15000)
                page.locator('#countyRegionList [data-region="new-harmony"]').click(timeout=15000)
                page.locator("#countyVisit").click(timeout=15000)
                page.wait_for_function(
                    "() => window.RiverValleyDebug.getState().countyRegion === 'new-harmony'",
                    timeout=15000,
                )
                page.locator("#scoutBtn").click(timeout=15000)
                if not page.locator("#scoutPanel").is_visible():
                    raise AssertionError("Scout panel unavailable")
                page.locator('#scoutPanel [data-scout="pet"]').click(timeout=15000)
                page.wait_for_function(
                    "() => window.RiverValleyDebug.getState().scoutBond >= 1",
                    timeout=15000,
                )
                page.locator("#scoutClose").click(timeout=15000)
                page.reload(wait_until="domcontentloaded", timeout=60000)
                page.wait_for_function(
                    "() => !!window.RiverValleyDebug && !!document.querySelector('#resumeBtn')",
                    timeout=60000,
                )
                assert_disabled()
                if not page.locator("#resumeBtn").is_enabled():
                    raise AssertionError("Saved adventure did not survive normal online reload")
                page.locator("#resumeBtn").click(timeout=20000)
                page.wait_for_function(
                    "() => window.RiverValleyDebug.getState().started === true",
                    timeout=20000,
                )
                state = page.evaluate("window.RiverValleyDebug.getState()")
                if state["countyRegion"] != "new-harmony" or state["scoutBond"] < 1:
                    raise AssertionError("County and Scout progress did not survive browser reload")
                if errors:
                    raise AssertionError(f"Uncaught browser errors: {errors}")
                report.update(
                    serviceWorkersDisabled=True,
                    countyRegion=state["countyRegion"],
                    scoutBond=state["scoutBond"],
                    onlineReloadPassed=True,
                    pageErrors=errors,
                )
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-dir", type=Path, default=ROOT)
    parser.add_argument("--entry", choices=("game.html", "index.html"), default="game.html")
    args = parser.parse_args()
    print(json.dumps({"passed": True, "browser": run(args.site_dir, args.entry)}, indent=2))


if __name__ == "__main__":
    main()
