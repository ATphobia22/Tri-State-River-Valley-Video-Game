from pathlib import Path
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json,sys
r=Path(__file__).resolve().parent.parent
soup=BeautifulSoup((r/'River_Valley_Family_Adventure_OFFLINE.html').read_text(),'html.parser')
shim=soup.new_tag('script');shim.string="""const _saved={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return _saved[k]??null},setItem(k,v){_saved[k]=String(v)},removeItem(k){delete _saved[k]}}});"""
soup.head.insert(0,shim)
results={};errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 for width,height in [(1280,720),(390,844)]:
  page=b.new_page(viewport={'width':width,'height':height},is_mobile=width<500,has_touch=width<500);mode='mobile' if width<500 else 'desktop'
  page.on('pageerror',lambda exc:errors.append(str(exc)))
  page.set_content(str(soup),wait_until='domcontentloaded',timeout=60000);page.wait_for_timeout(550)
  page.locator('#playBtn').click();page.wait_for_timeout(450)
  def check(k,ok):results[f'{mode}_{k}']=bool(ok)
  page.locator('#settingsBtn').click();check('settings_open',page.locator('#panel').evaluate("el=>el.classList.contains('open')"))
  page.locator('#terrainDetail').select_option('low');check('lod_setting',page.evaluate("window.RiverValleyDebug.getState().terrainSetting==='low'"))
  page.locator('#visualEffects').select_option('lite');check('effects_setting',page.locator('#visualEffects').input_value()=='lite')
  page.locator('#season').select_option('autumn');page.locator('#weather').select_option('mist');check('weather_season',page.locator('#weather').input_value()=='mist' and page.locator('#season').input_value()=='autumn')
  page.locator('#installOfflineBtn').click();check('offline_guide',page.locator('#toast').is_visible())
  page.locator('#closePanel').click();check('settings_close',not page.locator('#panel').evaluate("el=>el.classList.contains('open')"))
  before=page.locator('#missionList').is_visible();page.locator('#toggleMissions').click();check('missions_toggle',page.locator('#missionList').is_visible()!=before)
  for id in ['hunt','fish','cook']:
   page.locator(f'#{id}Btn').click();page.wait_for_timeout(220);check(f'{id}_scene',page.locator('#activityScene').count()==1)
   pixels=page.locator('#activityScene').evaluate("el=>{const c=el.getContext('2d');let x=c.getImageData(480,160,1,1).data;return Array.from(x);}")
   check(f'{id}_drawn',pixels[3]>0)
   page.locator('#closeActivity').click()
  page.locator('#saveBtn').click() if page.locator('#saveBtn').is_visible() else None
  check('saved',page.evaluate("!!localStorage.getItem('river-family-adventure-v1-slot-0')"))
  page.close()
 b.close()
print(json.dumps({'checks':results,'errors':errors},indent=2));
if errors or not all(results.values()):sys.exit(1)
