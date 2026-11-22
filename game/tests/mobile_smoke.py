from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from pathlib import Path
import json,sys
root=Path(__file__).resolve().parent.parent
bs=BeautifulSoup((root/'River_Valley_Family_Adventure_OFFLINE.html').read_text(),'html.parser')
shim=bs.new_tag('script')
shim.string="const __store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return __store[k]||null},setItem(k,v){__store[k]=String(v)}}});"
bs.head.insert(0,shim)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else p.chromium.executable_path),args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
 problems=[]
 page.on('pageerror',lambda e:problems.append(str(e)))
 page.set_content(str(bs),wait_until='domcontentloaded',timeout=45000)
 page.wait_for_timeout(1300)
 page.screenshot(path=str(root/'docs/04-mobile-start.png'))
 page.locator('#playBtn').click()
 page.wait_for_timeout(1000)
 start=page.evaluate('window.RiverValleyDebug.getState()')
 controls=page.locator('#touchControls').is_visible()
 map_show=page.locator('#atlas').is_visible()
 page.locator('#driveBtn').click()
 page.wait_for_timeout(300)
 mode=page.evaluate('window.RiverValleyDebug.getState().mode')
 page.screenshot(path=str(root/'docs/05-mobile-play.png'))
 result={'mobile_started':start['started'],'touch_controls_visible':controls,'atlas_visible':map_show,'car_mode':mode,'errors':problems}
 print(json.dumps(result,indent=2))
 browser.close()
 if not start['started'] or not controls or not map_show or mode!='drive' or problems:sys.exit(1)
