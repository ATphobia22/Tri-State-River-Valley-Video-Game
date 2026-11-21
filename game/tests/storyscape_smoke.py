from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import json,sys
root=Path(__file__).parent.parent
soup=BeautifulSoup((root/'River_Valley_Family_Adventure_OFFLINE.html').read_text(),'html.parser')
shim=soup.new_tag('script');shim.string="""const __store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__store[k]??null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k]}});""";soup.head.insert(0,shim)
checks={};errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 for label,config in [('desktop',{'viewport':{'width':1280,'height':720}}),('mobile',{'viewport':{'width':390,'height':844},'is_mobile':True,'has_touch':True})]:
  page=b.new_page(**config);page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(str(soup),wait_until='domcontentloaded',timeout=60000);page.wait_for_timeout(350)
  page.locator('#playBtn').click();page.locator('#settingsBtn').click();page.locator('#openCinema').click();page.locator('#openStage').click();page.wait_for_timeout(320)
  checks[label+'_open']=page.locator('#stagePanel').evaluate('e=>e.classList.contains("open")')
  checks[label+'_pixels']=page.locator('#stageCanvas').evaluate('e=>{let a=e.getContext("2d").getImageData(0,0,e.width,e.height).data;return [a[0],a[1],a[2],a[3],a[a.length-1]]}')
  for choice in ['riverfront','farm','woods']:
   page.locator('#stageScene').select_option(choice);page.wait_for_timeout(120)
   checks[label+'_'+choice]=page.evaluate('window.RiverValleyDebug.getState().backdropLocation')==choice
  page.screenshot(path=str(root/f'docs/v15-{label}-backdrop.png'))
  page.locator('#closeStage').click();checks[label+'_closed']=not page.locator('#stagePanel').evaluate('e=>e.classList.contains("open")')
  page.close()
 b.close()
print(json.dumps({'checks':checks,'errors':errors},indent=2));assert not errors and all(v for v in checks.values())
