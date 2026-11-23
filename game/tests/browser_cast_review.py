"""Exercise the packaged character review game and verify benchmark attribution."""
import hashlib
import json
import os
import tempfile
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from subprocess import run
from sys import executable

from playwright.sync_api import sync_playwright

GAME = Path(__file__).resolve().parents[1]


def smoke(directory):
    page_file = directory / 'character-review.html'
    run([executable, str(GAME/'tools/build_character_review.py'), str(page_file)], check=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(directory)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                executable_path=os.environ.get('RIVER_CHROME'), headless=True,
                args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
            )
            page = browser.new_page(viewport={'width': 844, 'height': 390})
            errors = []
            page.on('pageerror', lambda exc: errors.append(str(exc)))
            page.goto(f'http://127.0.0.1:{server.server_port}/{page_file.name}')
            page.wait_for_function("""() => {
                const s=window.RiverValleyDebug?.getState();
                return s?.heroLOD==='CUSTOM' && s.heroClipCount===13 && s.heroBoneCount===27 &&
                    s.heroEmbeddedTextures.loaded===3 && s.scoutRigReady;
            }""", timeout=60000)
            page.locator('#playBtn').click()
            page.evaluate("document.getElementById('walkBtn').click()")
            page.wait_for_function("window.RiverValleyDebug.getState().started")
            if not page.evaluate("window.RiverValleyDebug.getState().scoutRigAction"):
                page.evaluate("document.getElementById('petBtn').click()")
            page.keyboard.down('w')
            try:
                page.wait_for_function("['Walk','Run'].includes(window.RiverValleyDebug.getState().scoutRigAction)",timeout=30000)
            finally:
                page.keyboard.up('w')
            with page.expect_download() as exported:
                page.evaluate("document.getElementById('exportPerf').click()")
            report = json.loads(Path(exported.value.path()).read_text())
            for name in ('river', 'scout'):
                model = GAME / 'art/character-review' / (name + '.glb')
                assert report['characterReview'][name+'AtExport'] == hashlib.sha256(model.read_bytes()).hexdigest()
            assert report['characterReview']['scoutVisible'] and report['summary']['samples'] > 0
            page.evaluate("document.getElementById('clearCustomScout').click()")
            assert not page.evaluate("window.RiverValleyDebug.getState().scoutRigReady")
            assert not errors, errors
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    with tempfile.TemporaryDirectory() as tmp:
        smoke(Path(tmp))
