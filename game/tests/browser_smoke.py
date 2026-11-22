from playwright.sync_api import sync_playwright
from pathlib import Path
from bs4 import BeautifulSoup
import json, sys, traceback
root=Path(__file__).parent.parent
soup=BeautifulSoup((root/'index.html').read_text(),'html.parser')
for tag in soup.find_all('script',src=True):
    source=(root/tag['src']).read_text()
    tag.attrs.pop('src')
    tag.string=source
shim=soup.new_tag('script')
shim.string="""const __storage={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return Object.prototype.hasOwnProperty.call(__storage,k)?__storage[k]:null},setItem(k,v){__storage[k]=String(v)},removeItem(k){delete __storage[k]}}});"""
soup.head.insert(0,shim)
html=str(soup)
errors=[];results={}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else p.chromium.executable_path),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-features=WebRtcHideLocalIpsWithMdns'])
    page=browser.new_page(viewport={'width':1365,'height':790},device_scale_factor=1)
    page.on('console',lambda msg: errors.append(('console',msg.text)) if msg.type=='error' else None)
    page.on('pageerror',lambda err: errors.append(('pageerror',str(err))))
    try:
        page.set_content(html,timeout=45000,wait_until='domcontentloaded')
        page.wait_for_timeout(4500)
        results['title']=page.title()
        results['hero_visible']=page.locator('#start').is_visible()
        results['three_present']=page.evaluate("typeof THREE === 'object'")
        results['data_buildings']=page.evaluate("window.VALLEY_DATA.buildings.length")
        results['data_roads']=page.evaluate("window.VALLEY_DATA.roads.length")
        results['debug']=page.evaluate('window.RiverValleyDebug.getState()')
        page.screenshot(path=str(root/'docs/01-start.png'))
        page.locator('#playerName').fill('Family Test')
        page.locator('#playBtn').click()
        page.wait_for_timeout(1600)
        results['started']=page.evaluate('window.RiverValleyDebug.getState()')
        page.locator('#mapBtn').click()
        page.wait_for_timeout(850)
        results['map_mode']=page.evaluate('window.RiverValleyDebug.getState().renderMode')
        page.screenshot(path=str(root/'docs/02-atlas.png'))
        page.evaluate('window.RiverValleyDebug.teleport("courthouse")')
        page.wait_for_timeout(480)
        results['context_visible']=page.locator('#context').is_visible()
        if page.locator('#context').is_visible():
            page.locator('#interactBtn').click()
            results['mission_after']=page.evaluate('window.RiverValleyDebug.getState()')
        page.evaluate('window.RiverValleyDebug.teleport("farm")')
        page.wait_for_timeout(380)
        if page.locator('#context').is_visible():
            page.locator('#interactBtn').click()
            page.wait_for_timeout(300)
            page.locator('#interactBtn').click()
            results['farm_open']=page.locator('#farmPanel').is_visible()
            if results['farm_open']:
                page.locator('#farmGrid button').first.click()
                results['farm_sowed']='🌱' in page.locator('#farmGrid button').first.inner_text()
                page.locator('#farmDone').click()
        # Build the family cottage after earning coins through completed discoveries.
        page.evaluate('window.RiverValleyDebug.teleport("oak")')
        page.wait_for_timeout(380)
        if page.locator('#context').is_visible():
            page.locator('#interactBtn').click()  # Collect Oak Grove memory
            page.wait_for_timeout(400)
            page.locator('#interactBtn').click()  # Construct cottage for 250 coins
            results['homestead_built']=page.evaluate('window.RiverValleyDebug.getState().homestead')
        page.locator('#settingsBtn').click()
        results['settings_visible']=page.locator('#panel').is_visible()
        page.locator('#season').select_option('autumn')
        page.locator('#weather').select_option('rain')
        page.locator('#saveBtn').click()
        results['saved']=page.evaluate("!!localStorage.getItem('river-family-adventure-v1-slot-0')")
        page.screenshot(path=str(root/'docs/03-atlas-playing.png'))
    except Exception as e:
        errors.append(('exception',repr(e)))
        traceback.print_exc()
    finally:
        results['errors']=errors
        print(json.dumps(results,indent=2,ensure_ascii=False))
        browser.close()
    if any(x[0] in ('pageerror','exception') for x in errors) or not results.get('started',{}).get('started') or results.get('mission_after',{}).get('stamps') != 1 or results.get('saved') is not True or results.get('farm_open') is not True or results.get('farm_sowed') is not True or results.get('homestead_built') is not True:
        sys.exit(1)
