"""Software OpenGL via Mesa Xvfb: actual WebGL draw path, not a mocked renderer.
No geographic or device-hardware accuracy claim. Intended for optional Linux QA.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, sys
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent.parent
soup=BeautifulSoup((root/'River_Valley_Family_Adventure_OFFLINE.html').read_text(),'html.parser')
# allow saving in the isolated synthetic document
stub=soup.new_tag('script');stub.string="""const __gameStore={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__gameStore[k]??null,setItem:(k,v)=>__gameStore[k]=String(v),removeItem:k=>delete __gameStore[k]}});""";soup.head.insert(0,stub)
errs=[];msgs=[];result={}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--use-gl=angle','--use-angle=gl','--ignore-gpu-blocklist','--enable-webgl','--disable-dev-shm-usage'])
 pg=browser.new_page(viewport={'width':1280,'height':800},device_scale_factor=1)
 pg.on('pageerror',lambda e:errs.append(str(e)))
 pg.on('console',lambda m:msgs.append(str(m.text)) if m.type=='error' else None)
 pg.set_content(str(soup),wait_until='domcontentloaded',timeout=60000)
 pg.wait_for_timeout(1800)
 result['initial']=pg.evaluate('window.RiverValleyDebug?.getState()')
 pg.locator('#playBtn').click()
 pg.wait_for_timeout(1100)
 result['started']=pg.evaluate('window.RiverValleyDebug.getState()')
 pg.screenshot(path=str(root/'docs/v17-3d-real-webgl-start.png'))
 print(json.dumps({'mode':result['started'].get('renderMode'),'worldSites':result['started'].get('worldSites'),'terrain':result['started'].get('terrainTiles'),'errors':errs,'consoleErrors':msgs[:3]},indent=2))
 browser.close()
if errs or result['started'].get('renderMode')!='webgl':sys.exit(1)
