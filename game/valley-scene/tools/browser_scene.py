"""Exercise the published WebGL scene and its downloaded HTML in Chromium."""
import functools
import http.server
import json
import os
from pathlib import Path
import tempfile
import threading
from playwright.sync_api import sync_playwright
from package_scene import package

with tempfile.TemporaryDirectory() as folder, sync_playwright() as pw:
    root = Path(folder)
    package(root)
    for name in ('river','bill_tucker','scout'):
        blob = (root/'assets'/(name+'.glb')).read_bytes()
        length = int.from_bytes(blob[12:16], 'little')
        header = json.loads(blob[20:20+length])
        assert 'KHR_draco_mesh_compression' in header['extensionsRequired'], name
        assert any('normalTexture' in m and
                   {'baseColorTexture','metallicRoughnessTexture'} <= m['pbrMetallicRoughness'].keys()
                   for m in header['materials']), name
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=root)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH'), args=[
        '--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for offline in (False, True):
        context = browser.new_context(offline=offline, viewport={'width':900,'height':580})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda ex: (errors.append(str(ex)), print('PAGE ERROR:', str(ex), flush=True)))
        page.on('console', lambda msg: print('BROWSER '+msg.type+': '+msg.text, flush=True) if msg.type in ('error','warning') else None)
        url = (root/'valley-offline.html').as_uri() if offline else f'http://127.0.0.1:{server.server_port}/'
        page.goto(url, wait_until='domcontentloaded')
        page.wait_for_timeout(3500)
        print('BOOT:', page.locator('#status').inner_text(), 'SCENE:', page.evaluate('Boolean(window.ValleyScene)'), flush=True)
        if errors:raise AssertionError('Browser initialization error: '+repr(errors))
        page.wait_for_function('window.ValleyScene?.diagnostics().fineTiles > 0',timeout=120000)
        def diag():
            return page.evaluate('ValleyScene.diagnostics()')
        d = diag()
        assert sorted(a['bones'] for a in d['actors']) == [16,27,27], d
        assert len(d['landmarks']) == 2 and d['drawCalls'] > 0 and not d['streamError'], d
        output = Path(os.getenv('SCENE_EVIDENCE','/tmp/river-hero-visual-qa'))
        output.mkdir(parents=True,exist_ok=True)
        page.screenshot(path=str(output / ('cast-offline.png' if offline else 'cast-town.png')))
        page.keyboard.down('ArrowUp')
        page.wait_for_function("ValleyScene.diagnostics().actors.every(a=>a.clip==='Walk')")
        page.keyboard.up('ArrowUp')
        page.locator('#land').click()
        page.wait_for_function("document.querySelector('#land').getAttribute('aria-pressed')==='true'")
        page.screenshot(path=str(output/'town-parcels.png'))
        page.select_option('#place','county')
        page.wait_for_function("ValleyScene.diagnostics().rebases>0 && ValleyScene.diagnostics().fineTiles===0",timeout=30000)
        page.screenshot(path=str(output/'county.png'))
        page.locator('summary').click()
        with page.expect_download() as download:
            page.locator('#report').click()
        report=json.loads(Path(download.value.path()).read_text())
        assert report['assets']['river.glb'] and report['samples'] and not errors,(report,errors)
        print('PASS','offline' if offline else 'hosted',d,flush=True)
        context.close()
    browser.close()
    server.shutdown()
