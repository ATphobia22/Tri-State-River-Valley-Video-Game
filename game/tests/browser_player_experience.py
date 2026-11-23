"""Validate real paused game behavior, local UX settings and touch/gamepad fallback.

Software WebGL proves browser behavior; this is NOT physical iPhone Safari testing.
"""
from __future__ import annotations
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

GAME = Path(__file__).resolve().parents[1]


def check():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(GAME)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, executable_path=os.environ.get('RIVER_CHROME'),
                args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            context = browser.new_context(viewport={'width': 1280, 'height': 800})
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda exc: errors.append(str(exc)))
            page.goto(f'http://127.0.0.1:{server.server_port}/game.html', wait_until='domcontentloaded', timeout=60000)
            page.wait_for_function("!!window.RiverValleyDebug?.getState()?.heroModel", timeout=60000)
            page.locator('#playBtn').click()
            page.wait_for_function("window.RiverValleyDebug.getState().started")
            page.keyboard.press('Escape')
            page.wait_for_function("window.RiverValleyDebug.getState().paused")
            assert page.locator('#pauseOverlay').is_visible()
            before = page.evaluate("({x:RiverValleyDebug.getState().x,z:RiverValleyDebug.getState().z})")
            page.keyboard.down('w')
            page.wait_for_timeout(250)
            page.keyboard.up('w')
            after = page.evaluate("({x:RiverValleyDebug.getState().x,z:RiverValleyDebug.getState().z})")
            assert before == after, f'Player moved during pause: {before}, {after}'
            page.locator('[data-player-pref="highContrast"]').check()
            page.locator('[data-player-pref="leftHandedTouch"]').check()
            assert page.locator('body').evaluate("(el)=>el.classList.contains('ux-high-contrast')")
            assert page.locator('body').evaluate("(el)=>el.classList.contains('ux-left-handed')")
            page.locator('#pauseSave').click()
            page.keyboard.press('Escape')
            page.wait_for_function("!window.RiverValleyDebug.getState().paused")
            page.reload(wait_until='domcontentloaded')
            page.wait_for_function("!!window.RiverValleyDebug?.getState()?.playerExperience")
            stored = page.evaluate("RiverValleyDebug.getState().playerExperience")
            assert stored['highContrast'] and stored['leftHandedTouch'], stored
            page.locator('#playBtn').click()
            page.evaluate("""() => {
              const buttons=Array.from({length:18},()=>({pressed:false}));
              window.__uxPad={connected:true,mapping:'standard',axes:[0,0],buttons};
              Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__uxPad]});
            }""")
            page.wait_for_function("window.RiverValleyDebug.getState().gamepadConnected", timeout=12000)
            page.evaluate("window.__uxPad.buttons[9].pressed=true")
            page.wait_for_function("window.RiverValleyDebug.getState().paused", timeout=12000)
            page.evaluate("window.__uxPad.buttons[9].pressed=false")
            page.wait_for_timeout(130)
            page.evaluate("window.__uxPad.buttons[1].pressed=true")
            page.wait_for_function("!window.RiverValleyDebug.getState().paused", timeout=12000)
            assert not errors, errors
            # Resize the already-running WebGL page: a second SwiftShader world can
            # stall CI due to software-renderer memory contention. Dedicated
            # browser_hero_smoke.py already boots a phone-sized game separately.
            page.set_viewport_size({'width': 844, 'height': 390})
            touch=page.evaluate("""() => {
              const controls=document.getElementById('touchControls');
              controls.style.display='flex'; // CSS geometry only on desktop browser
              const button=controls.querySelector('.dpad button');
              const rect=button.getBoundingClientRect();
              return {width:rect.width,height:rect.height,
                direction:getComputedStyle(controls).flexDirection};
            }""")
            assert touch['width']>=48 and touch['height']>=48, touch
            assert touch['direction']=='row-reverse', touch
            context.close();browser.close()
    finally:
        server.shutdown();server.server_close()


if __name__=='__main__':
    check()
