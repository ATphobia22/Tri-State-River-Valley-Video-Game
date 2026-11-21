from playwright.sync_api import sync_playwright
from pathlib import Path
from bs4 import BeautifulSoup
import json,sys
root=Path(__file__).resolve().parent.parent
soup=BeautifulSoup((root/'index.html').read_text(),'html.parser')
for tag in soup.find_all('script',src=True):
    raw=(root/tag['src']).read_text()
    tag.attrs.pop('src');tag.string=raw
shim=soup.new_tag('script')
shim.string="""const __store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return __store[k]??null},setItem(k,v){__store[k]=String(v)},removeItem(k){delete __store[k]}}});"""
soup.head.insert(0,shim)
errors=[];result={}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 for viewport in [{'width':1340,'height':790},{'width':390,'height':844}]:
  name='mobile' if viewport['width']<500 else 'desktop';pg=b.new_page(viewport=viewport,is_mobile=(name=='mobile'),has_touch=(name=='mobile'))
  pg.on('pageerror',lambda x:errors.append(str(x)))
  pg.set_content(str(soup),wait_until='domcontentloaded',timeout=45000);pg.wait_for_timeout(1800)
  pg.locator('#playBtn').click();pg.wait_for_timeout(800)
  pg.locator('#huntBtn').click();pg.locator('#trackAnimal').click();pg.wait_for_timeout(180)
  pct=float(pg.locator('.targetAnimal').get_attribute('style').split(':')[1].strip().replace('%;','').replace('%',''))
  pg.locator('#aimSlider').evaluate('(el, val)=>{el.value=val;el.dispatchEvent(new Event("input",{bubbles:true}))}',round(pct))
  pg.locator('#takeShot').click()
  result[name+'_hunt_success']=pg.evaluate("window.RiverValleyDebug.getState().inventory.game") == 1
  pg.locator('#closeActivity').click()
  pg.locator('#fishBtn').click();pg.locator('#castBtn').click()
  pg.wait_for_function("document.getElementById('biteMessage').textContent.includes('BITE!')",timeout=8000,polling=20)
  pg.locator('#reelBtn').click()
  result[name+'_fish_success']=pg.evaluate("window.RiverValleyDebug.getState().inventory.fish") == 1
  pg.locator('#closeActivity').click()
  pg.evaluate("window.RiverValleyDebug.teleport('farm')");pg.wait_for_timeout(200)
  pg.locator('#interactBtn').click();pg.wait_for_timeout(100);pg.locator('#interactBtn').click()
  pg.locator('#farmGrid button').first.click();pg.wait_for_timeout(8450);pg.locator('#farmGrid button').first.click()
  result[name+'_corn_harvested']=pg.evaluate("window.RiverValleyDebug.getState().inventory.corn") == 1
  pg.locator('#farmDone').click()
  pg.locator('#cookBtn').click()
  result[name+'_recipe_enabled']=pg.locator('[data-recipe="fishFry"]').is_enabled()
  pg.locator('[data-recipe="fishFry"]').click()
  result[name+'_cooked']=pg.evaluate("window.RiverValleyDebug.getState().inventory.meals") == 1
  result[name+'_saved']=pg.evaluate("!!localStorage.getItem('river-family-adventure-v1-slot-0')")
  pg.screenshot(path=str(root/f'docs/{name}-activities.png'))
  pg.close()
 b.close()
print(json.dumps({'checks':result,'errors':errors},indent=2))
if errors or not all(result.values()):sys.exit(1)
