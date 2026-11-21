from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import json,sys
root=Path(__file__).parent.parent
soup=BeautifulSoup((root/'River_Valley_Family_Adventure_OFFLINE.html').read_text(),'html.parser')
# The isolated about:blank document denies native localStorage; provide deterministic in-memory storage.
shim=soup.new_tag('script');shim.string="""const __store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__store[k]??null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k]}});""";soup.head.insert(0,shim)
errors=[];checks={}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 for label,device in [('desktop',{'viewport':{'width':1280,'height':720}}),('mobile',{'viewport':{'width':390,'height':844},'is_mobile':True,'has_touch':True})]:
  page=b.new_page(**device);page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content(str(soup),wait_until='domcontentloaded',timeout=60000);page.wait_for_timeout(850)
  checks[label+'_api']=bool(page.evaluate('window.ValleyDirector && window.RiverValleyDebug'))
  page.locator('#playBtn').click();page.wait_for_timeout(200)
  page.locator('#settingsBtn').click();page.locator('#openCinema').click()
  checks[label+'_director_visible']=page.locator('#cinemaPanel').evaluate('(e)=>e.classList.contains("open")')
  page.locator('#cineLook').select_option('storm');page.wait_for_timeout(240)
  state=page.evaluate('window.RiverValleyDebug.getState()')
  checks[label+'_storm']=state['cinema']['look']=='storm' and page.evaluate('document.body.classList.contains("rainy")')
  image=page.locator('#cinemaFX').evaluate('e=>{const c=e.getContext("2d"),a=c.getImageData(0,0,e.width,e.height).data;let k=0;for(let i=3;i<a.length;i+=4)if(a[i])k++;return k;}')
  checks[label+'_fx_pixels']=image>10
  page.locator('#cineQuality').select_option('lite');checks[label+'_quality']=page.evaluate('window.RiverValleyDebug.getState().cinema.quality')=='lite'
  page.locator('#cineStats').check();page.wait_for_timeout(920);checks[label+'_stats']=page.locator('#perfHUD').evaluate('(e)=>e.classList.contains("visible")&&e.textContent.includes("FPS")')
  checks[label+'_persist']=page.evaluate("JSON.parse(localStorage.getItem('river-valley-vfx-director')).showStats")
  page.locator('#cineNight').click();checks[label+'_night']=page.evaluate('window.RiverValleyDebug.getState().cinema.look')=='lantern'
  page.locator('#closeCinema').click();checks[label+'_close']=not page.locator('#cinemaPanel').evaluate('(e)=>e.classList.contains("open")')
  page.screenshot(path=str(root/f'docs/v15-{label}-cinema.png'))
  page.close()
 b.close()
print(json.dumps({'checks':checks,'errors':errors},indent=2))
if errors or not all(checks.values()):sys.exit(1)
