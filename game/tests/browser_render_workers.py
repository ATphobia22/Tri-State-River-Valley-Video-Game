"""Exercise the actual WebGL release, including its standalone and inline paths."""
import functools
import http.server
import os
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(
    http.server.SimpleHTTPRequestHandler, directory=root))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH'), args=[
            '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        for offline, fallback in [(False, False), (True, False), (True, True)]:
            context = browser.new_context(offline=offline, viewport={'width':800, 'height':600})
            if fallback:
                context.add_init_script('window.Worker = undefined')
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            url = (root/'River_Valley_Family_Adventure_OFFLINE.html').as_uri() if offline else (
                f'http://127.0.0.1:{server.server_port}/game.html')
            page.goto(url, wait_until='domcontentloaded', timeout=90000)
            page.wait_for_function('''() => {
                const s = window.RiverValleyDebug?.getState();
                return s?.renderMode === "webgl" && s.vegetation?.trees > 0 &&
                  s.renderWorkers.buildings.completed > 0 && s.renderWorkers.foliage.completed > 0;
            }''', timeout=90000)
            state = page.evaluate('RiverValleyDebug.getState().renderWorkers')
            for kind in ('buildings', 'foliage'):
                assert state[kind]['mode'] == ('inline' if fallback else 'worker'), state
            assert not errors, errors
            print('PASS', url.split('/')[-1], state, flush=True)
            context.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
