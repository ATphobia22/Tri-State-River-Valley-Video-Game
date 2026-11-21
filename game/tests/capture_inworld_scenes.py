"""Record authentic Mesa software-OpenGL world frames for a gameplay showcase.
These are actual rendered screenshots, not full motion-capture video frames.
"""
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
soup=BeautifulSoup((root/'River_Valley_Family_Adventure_OFFLINE.html').read_text(),'html.parser')
stub=soup.new_tag('script');stub.string="""window.__store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__store[k]??null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k]}});""";soup.head.insert(0,stub)
images=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--use-gl=angle','--use-angle=gl','--ignore-gpu-blocklist','--enable-webgl','--disable-dev-shm-usage'])
 pg=b.new_page(viewport={'width':1280,'height':720})
 pg.on('pageerror',lambda e: errors.append(str(e)))
 pg.set_content(str(soup),wait_until='domcontentloaded',timeout=45000)
 pg.evaluate("document.getElementById('playBtn').click()")
 for label,init in [
  ('explore',"document.getElementById('missions').style.display='none';RiverValleyDebug.closeWorldActivity();"),
  ('hunting',"RiverValleyDebug.openWorldActivity('hunt');RiverValleyDebug.worldAction('track');"),
  ('fishing',"RiverValleyDebug.openWorldActivity('fish');RiverValleyDebug.worldAction('cast');"),
  ('farming',"RiverValleyDebug.teleport('farm');RiverValleyDebug.complete();RiverValleyDebug.openWorldActivity('farm');RiverValleyDebug.worldAction('plot');"),
  ('cooking',"RiverValleyDebug.openWorldActivity('cook');")
 ]:
  pg.evaluate(init)
  pg.wait_for_timeout(900)
  path=root/'docs'/f'v17-3d-{label}.png'
  pg.screenshot(path=str(path),timeout=20000)
  images.append(str(path))
 b.close()
print(json.dumps({'images':images,'errors':errors}))
if errors: raise SystemExit(1)
