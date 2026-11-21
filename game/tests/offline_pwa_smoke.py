from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
import threading, json, os, sys
r=Path(__file__).resolve().parent.parent
os.chdir(r)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Quiet)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://localhost:{server.server_address[1]}/game.html'
result={'url':url};errors=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  ctx=b.new_context(service_workers='allow')
  page=ctx.new_page();page.on('pageerror',lambda err:errors.append(str(err)))
  page.goto(url,wait_until='domcontentloaded',timeout=30000)
  page.wait_for_function('navigator.serviceWorker.controller!==null || !!navigator.serviceWorker.ready',timeout=15000)
  page.wait_for_timeout(900)
  result['registered']=page.evaluate("navigator.serviceWorker.getRegistrations().then(x=>x.map(y=>y.scope))")
  result['cache_keys']=page.evaluate("caches.keys()")
  result['cached_html']=page.evaluate("caches.open('rva-game-1.4.0').then(c=>c.match('/game.html')).then(Boolean)")
  ctx.set_offline(True)
  page.goto(url,wait_until='domcontentloaded',timeout=15000)
  result['offline_game_present']=page.locator('#playBtn').count()==1
  page.locator('#playBtn').click()
  result['offline_started']=page.evaluate('window.RiverValleyDebug.getState().started')
  b.close()
except Exception as e:result['error']=str(e)
finally:server.shutdown()
print(json.dumps({'results':result,'page_errors':errors},indent=2))
if result.get('error') or not result.get('offline_started') or not result.get('cached_html') or errors: sys.exit(1)
